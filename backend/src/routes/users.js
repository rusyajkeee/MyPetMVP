import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, attachUser, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware, attachUser);

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

/**
 * @openapi
 * /users/profile:
 *   get:
 *     summary: Get current user profile
 */
router.get('/profile', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true, role: true,
        avatarUrl: true, tosAccepted: true, emailVerified: true, createdAt: true,
        provider: { select: { id: true, businessName: true, verified: true } },
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /users/profile:
 *   patch:
 *     summary: Update profile
 */
router.patch('/profile', async (req, res, next) => {
  try {
    const data = updateProfileSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.userId },
      data,
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatarUrl: true },
    });
    res.json(user);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message });
    next(e);
  }
});

/**
 * @openapi
 * /users/bookings:
 *   get:
 *     summary: Current user's booking history
 */
router.get('/bookings', async (req, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.userId },
      include: {
        service: true,
        provider: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
        pet: true,
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
 * /users/pets:
 *   get:
 *     summary: Current user's pets
 */
router.get('/pets', async (req, res, next) => {
  try {
    const pets = await prisma.pet.findMany({ where: { ownerId: req.userId }, orderBy: { createdAt: 'desc' } });
    res.json(pets);
  } catch (e) {
    next(e);
  }
});

const addPetSchema = z.object({
  name: z.string().min(1),
  breed: z.string().optional(),
  species: z.string().optional(),
  gender: z.string().optional(),
  age: z.string().optional(),
  weight: z.string().optional(),
  height: z.string().optional(),
  color: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

/**
 * @openapi
 * /users/pets:
 *   post:
 *     summary: Add pet
 */
router.post('/pets', async (req, res, next) => {
  try {
    const data = addPetSchema.parse(req.body);
    const pet = await prisma.pet.create({
      data: { ...data, ownerId: req.userId },
    });
    res.status(201).json(pet);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message });
    next(e);
  }
});

export default router;
