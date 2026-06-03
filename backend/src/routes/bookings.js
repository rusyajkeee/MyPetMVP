import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, attachUser, requireRole } from '../middleware/auth.js';

const router = Router();
const statusEnum = z.enum(['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
const allowedStatusTransitions = {
  PENDING: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

const createBookingSchema = z.object({
  serviceId: z.string().min(1),
  petId: z.string().optional(),
  scheduledAt: z.string().datetime({ offset: true }),
  notes: z.string().optional(),
  staffId: z.string().optional(),
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
    // Check if provider has staff
    const providerStaff = await prisma.staff.findMany({
      where: { providerId: service.providerId },
      select: { id: true, name: true },
    });
    const hasStaff = providerStaff.length > 0;

    let booking;
    try {
      booking = await prisma.$transaction(async (tx) => {
        let assignedStaffId = data.staffId || null;

        if (hasStaff) {
          if (assignedStaffId) {
            const staffMember = providerStaff.find(s => s.id === assignedStaffId);
            if (!staffMember) throw Object.assign(new Error('STAFF_NOT_FOUND'), { status: 400 });
            const conflict = await tx.booking.findFirst({
              where: { staffId: assignedStaffId, scheduledAt, status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] } },
            });
            if (conflict) throw Object.assign(new Error('SLOT_TAKEN'), { status: 409 });
          } else {
            // Auto-assign: find first available staff member
            const busyRows = await tx.booking.findMany({
              where: {
                staffId: { in: providerStaff.map(s => s.id) },
                scheduledAt,
                status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] },
              },
              select: { staffId: true },
            });
            const busySet = new Set(busyRows.map(b => b.staffId));
            const freeStaff = providerStaff.find(s => !busySet.has(s.id));
            if (!freeStaff) throw Object.assign(new Error('SLOT_TAKEN'), { status: 409 });
            assignedStaffId = freeStaff.id;
          }
        } else {
          // No staff — provider-level conflict check
          const conflict = await tx.booking.findFirst({
            where: { providerId: service.providerId, scheduledAt, status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] } },
          });
          if (conflict) throw Object.assign(new Error('SLOT_TAKEN'), { status: 409 });
        }

        return tx.booking.create({
          data: {
            userId: req.userId,
            providerId: service.providerId,
            serviceId: service.id,
            petId: data.petId,
            staffId: assignedStaffId,
            scheduledAt,
            notes: data.notes,
            status: 'PENDING',
          },
          include: {
            service: true,
            provider: { include: { user: { select: { firstName: true, lastName: true } } } },
            pet: true,
            staff: { select: { id: true, name: true, role: true } },
          },
        });
      }, { isolationLevel: 'Serializable' });
    } catch (e) {
      if (e.message === 'SLOT_TAKEN') {
        return res.status(409).json({ error: 'This time slot is already booked. Please choose another time.' });
      }
      if (e.message === 'STAFF_NOT_FOUND') {
        return res.status(400).json({ error: 'Staff member not found.' });
      }
      // PostgreSQL serialization failure (two concurrent bookings for same slot)
      if (e.code === 'P2034' || e.code === '40001') {
        return res.status(409).json({ error: 'This time slot is already booked. Please choose another time.' });
      }
      throw e;
    }
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
 *     summary: List bookings for the current user role
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
 *     summary: Update booking status (provider, user for cancel, admin)
 */
router.patch('/:id/status', authMiddleware, attachUser, async (req, res, next) => {
  try {
    const parsed = statusEnum.parse(req.body?.status);
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id }, include: { user: true, provider: true } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    if (req.role === 'PROVIDER') {
      const provider = await prisma.provider.findUnique({ where: { userId: req.userId } });
      if (booking.providerId !== provider?.id) return res.status(403).json({ error: 'Not your booking' });
    } else if (req.role === 'USER') {
      if (booking.userId !== req.userId) return res.status(403).json({ error: 'Not your booking' });
      if (parsed !== 'CANCELLED') return res.status(403).json({ error: 'Users can only cancel bookings' });
    }

    if (req.role !== 'ADMIN' && !allowedStatusTransitions[booking.status]?.includes(parsed)) {
      return res.status(400).json({ error: `Cannot transition from ${booking.status} to ${parsed}` });
    }

    const now = new Date();
    const updateData = {
      status: parsed,
      acceptedAt: parsed === 'ACCEPTED' ? now : booking.acceptedAt,
      startedAt: parsed === 'IN_PROGRESS' ? now : booking.startedAt,
      completedAt: parsed === 'COMPLETED' ? now : booking.completedAt,
      cancelledAt: parsed === 'CANCELLED' ? now : booking.cancelledAt,
    };
    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: updateData,
      include: { service: true, provider: { include: { user: true } }, user: true, pet: true },
    });
    
    if (req.userId !== booking.userId) {
      await prisma.notification.create({
        data: {
          userId: booking.userId,
          title: 'Booking status updated',
          body: `Your booking is now ${parsed}.`,
        },
      });
    } else {
      await prisma.notification.create({
        data: {
          userId: booking.provider.userId,
          title: 'Booking cancelled by user',
          body: `Booking has been cancelled by the user.`,
        },
      });
    }
    res.json(updated);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Invalid status' });
    next(e);
  }
});

const vetMedicalCardSchema = z.object({
  allergies:       z.string().optional().nullable(),
  chronicDiseases: z.string().optional().nullable(),
  medications:     z.string().optional().nullable(),
  vaccinations:    z.string().optional().nullable(),
  pastIllnesses:   z.string().optional().nullable(),
  notes:           z.string().optional().nullable(),
  lastVetVisit:    z.string().datetime({ offset: true }).optional().nullable(),
});

const VET_STATUSES = ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'];

async function assertVetBooking(req, res) {
  const provider = await prisma.provider.findUnique({ where: { userId: req.userId } });
  if (!provider) { res.status(403).json({ error: 'Provider profile not found' }); return null; }
  if (provider.category !== 'VETERINARY') {
    res.status(403).json({ error: 'Only veterinary providers can access pet medical cards.' }); return null;
  }
  const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
  if (!booking) { res.status(404).json({ error: 'Booking not found' }); return null; }
  if (booking.providerId !== provider.id) { res.status(403).json({ error: 'Not your booking' }); return null; }
  if (!VET_STATUSES.includes(booking.status)) {
    res.status(403).json({ error: 'Medical card accessible only during/after accepted appointment' }); return null;
  }
  if (!booking.petId) { res.status(404).json({ error: 'No pet linked to this booking' }); return null; }
  return { provider, booking };
}

router.get('/:id/pet-medical-card', authMiddleware, attachUser, requireRole('PROVIDER', 'ADMIN'), async (req, res, next) => {
  try {
    const ctx = await assertVetBooking(req, res);
    if (!ctx) return;
    const card = await prisma.petMedicalCard.findUnique({ where: { petId: ctx.booking.petId } });
    res.json(card || null);
  } catch (e) { next(e); }
});

router.put('/:id/pet-medical-card', authMiddleware, attachUser, requireRole('PROVIDER', 'ADMIN'), async (req, res, next) => {
  try {
    const ctx = await assertVetBooking(req, res);
    if (!ctx) return;
    const data = vetMedicalCardSchema.parse(req.body);
    const card = await prisma.petMedicalCard.upsert({
      where: { petId: ctx.booking.petId },
      create: { petId: ctx.booking.petId, ...data, lastVetVisit: data.lastVetVisit ? new Date(data.lastVetVisit) : null },
      update: { ...data, lastVetVisit: data.lastVetVisit ? new Date(data.lastVetVisit) : null },
    });
    res.json(card);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message });
    next(e);
  }
});

export default router;
