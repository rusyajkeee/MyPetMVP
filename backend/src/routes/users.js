import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, attachUser } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware, attachUser);

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

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

router.get('/bookings', async (req, res, next) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.userId },
      include: {
        service: true,
        provider: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } },
        pet: true,
        review: true,
      },
      orderBy: { scheduledAt: 'desc' },
    });
    res.json(bookings);
  } catch (e) {
    next(e);
  }
});

router.get('/pets', async (req, res, next) => {
  try {
    const pets = await prisma.pet.findMany({
      where: { ownerId: req.userId },
      include: { medicalCard: { select: { id: true } } },
      orderBy: { createdAt: 'desc' },
    });
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

// ─── Pet Medical Card ────────────────────────────────────────────────────────

const medicalCardSchema = z.object({
  allergies: z.string().optional().nullable(),
  chronicDiseases: z.string().optional().nullable(),
  medications: z.string().optional().nullable(),
  vaccinations: z.string().optional().nullable(),
  pastIllnesses: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  lastVetVisit: z.string().datetime({ offset: true }).optional().nullable(),
});

async function assertPetOwner(req, res) {
  const pet = await prisma.pet.findUnique({ where: { id: req.params.petId } });
  if (!pet) { res.status(404).json({ error: 'Pet not found' }); return null; }
  if (pet.ownerId !== req.userId) { res.status(403).json({ error: 'Forbidden' }); return null; }
  return pet;
}

router.get('/pets/:petId/medical-card', async (req, res, next) => {
  try {
    const pet = await assertPetOwner(req, res);
    if (!pet) return;
    const card = await prisma.petMedicalCard.findUnique({ where: { petId: req.params.petId } });
    res.json(card || null);
  } catch (e) {
    next(e);
  }
});

router.put('/pets/:petId/medical-card', async (req, res, next) => {
  try {
    const pet = await assertPetOwner(req, res);
    if (!pet) return;
    const data = medicalCardSchema.parse(req.body);
    const card = await prisma.petMedicalCard.upsert({
      where: { petId: req.params.petId },
      create: {
        petId: req.params.petId,
        ...data,
        lastVetVisit: data.lastVetVisit ? new Date(data.lastVetVisit) : null,
      },
      update: {
        ...data,
        lastVetVisit: data.lastVetVisit ? new Date(data.lastVetVisit) : null,
      },
    });
    res.json(card);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message });
    next(e);
  }
});

router.delete('/pets/:petId/medical-card', async (req, res, next) => {
  try {
    const pet = await assertPetOwner(req, res);
    if (!pet) return;
    await prisma.petMedicalCard.deleteMany({ where: { petId: req.params.petId } });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

export default router;
