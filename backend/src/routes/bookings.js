import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, attachUser, requireRole } from '../middleware/auth.js';

const router = Router();
const statusEnum = z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'PAID', 'COMPLETED', 'CANCELLED']);

const createBookingSchema = z.object({
  serviceId: z.string().min(1),
  petId: z.string().optional(),
  scheduledAt: z.string().datetime(),
  notes: z.string().optional(),
});

/**
 * @openapi
 * /bookings:
 *   post:
 *     summary: Create booking (user)
 */
router.post('/', authMiddleware, attachUser, requireRole('USER', 'ADMIN'), async (req, res, next) => {
  try {
    const data = createBookingSchema.parse(req.body);
    const scheduledAt = new Date(data.scheduledAt);
    const service = await prisma.service.findUnique({
      where: { id: data.serviceId },
      include: { provider: true },
    });
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (data.petId) {
      const pet = await prisma.pet.findFirst({ where: { id: data.petId, ownerId: req.userId } });
      if (!pet) return res.status(400).json({ error: 'Pet not found' });
    }
    const booking = await prisma.booking.create({
      data: {
        userId: req.userId,
        providerId: service.providerId,
        serviceId: service.id,
        petId: data.petId,
        scheduledAt,
        notes: data.notes,
        status: 'PENDING',
      },
      include: {
        service: true,
        provider: { include: { user: { select: { firstName: true, lastName: true } } } },
        pet: true,
      },
    });
    // Notify provider
    await prisma.notification.create({
      data: {
        userId: service.provider.userId,
        title: 'New booking request',
        body: `New booking for ${service.title} at ${scheduledAt.toISOString()}.`,
      },
    });
    res.status(201).json(booking);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message });
    next(e);
  }
});

/**
 * @openapi
 * /bookings:
 *   get:
 *     summary: List bookings (user: own; provider: own provider bookings; admin: all)
 */
router.get('/', authMiddleware, attachUser, async (req, res, next) => {
  try {
    const where = {};
    if (req.role === 'USER') where.userId = req.userId;
    else if (req.role === 'PROVIDER') {
      const provider = await prisma.provider.findUnique({ where: { userId: req.userId } });
      if (!provider) return res.json([]);
      where.providerId = provider.id;
    }
    const bookings = await prisma.booking.findMany({
      where,
      include: {
        service: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        provider: { include: { user: { select: { firstName: true, lastName: true } } } },
        pet: true,
        review: { select: { id: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });
    res.json(bookings);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /bookings/:id:
 *   get:
 *     summary: Get booking by id
 */
router.get('/:id', authMiddleware, attachUser, async (req, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        service: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        provider: { include: { user: true } },
        pet: true,
      },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    const isOwner = booking.userId === req.userId;
    const isProvider = booking.provider.userId === req.userId;
    if (!isOwner && !isProvider && req.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(booking);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /bookings/:id/status:
 *   patch:
 *     summary: Update booking status (provider or admin)
 */
router.patch('/:id/status', authMiddleware, attachUser, requireRole('PROVIDER', 'ADMIN'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const parsed = statusEnum.parse(status);
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id }, include: { user: true } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    const provider = await prisma.provider.findUnique({ where: { userId: req.userId } });
    if (req.role === 'PROVIDER' && booking.providerId !== provider?.id) {
      return res.status(403).json({ error: 'Not your booking' });
    }
    const updateData = { status: parsed };
    if (parsed === 'COMPLETED') updateData.completedAt = new Date();
    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: updateData,
      include: { service: true, provider: { include: { user: true } }, user: true, pet: true },
    });
    await prisma.notification.create({
      data: {
        userId: booking.userId,
        title: 'Booking status updated',
        body: `Your booking is now ${parsed}.`,
      },
    });
    res.json(updated);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Invalid status' });
    next(e);
  }
});

export default router;
