import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, attachUser, requireRole } from '../middleware/auth.js';

const router = Router();
const categoryEnum = z.enum(['VETERINARY', 'GROOMING', 'BOARDING', 'WALKING', 'TRANSPORT']);
const AUTO_VERIFY_PROVIDERS = process.env.AUTO_VERIFY_PROVIDERS === 'true';

/**
 * @openapi
 * /services:
 *   get:
 *     summary: List services (filter by category, providerId)
 */
router.get('/', async (req, res, next) => {
  try {
    const category = req.query.category ? categoryEnum.safeParse(req.query.category).data : undefined;
    const providerId = req.query.providerId || undefined;
    const where = {};
    if (category) where.category = category;
    if (providerId) where.providerId = providerId;
    // For public listing, only show services from verified providers
    if (!providerId) {
      where.provider = { verified: true };
    }
    const services = await prisma.service.findMany({
      where,
      include: {
        provider: {
          include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
        },
      },
    });
    res.json(services);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /services/:id:
 *   get:
 *     summary: Get service by id
 */
router.get('/:id', async (req, res, next) => {
  try {
    const service = await prisma.service.findUnique({
      where: { id: req.params.id },
      include: {
        provider: {
          include: { user: { select: { firstName: true, lastName: true, avatarUrl: true, phone: true } } },
        },
      },
    });
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json(service);
  } catch (e) {
    next(e);
  }
});

// Provider: create/update/delete services (coerce numbers from form/JSON)
// durationMin: allow null so "no duration" is stored as null, not coerced to 0
const createServiceSchema = z.object({
  category: categoryEnum,
  title: z.string().min(1).trim(),
  description: z.string().optional().nullable(),
  priceKzt: z.coerce.number().int().min(0),
  durationMin: z.union([z.coerce.number().int().min(0), z.null()]).optional(),
  imageUrl: z.string().url().optional().nullable(),
});

router.post('/', authMiddleware, attachUser, requireRole('PROVIDER', 'ADMIN'), async (req, res, next) => {
  try {
    const provider = await prisma.provider.findUnique({ where: { userId: req.userId } });
    if (!provider) return res.status(403).json({ error: 'Provider profile required' });
    const data = createServiceSchema.parse(req.body);

    const providerId = provider.id;
    if (AUTO_VERIFY_PROVIDERS && !provider.verified) {
      await prisma.provider.update({
        where: { id: provider.id },
        data: { verified: true, verifiedAt: provider.verifiedAt || new Date() },
      });
    }

    const service = await prisma.service.create({
      data: { ...data, providerId },
    });
    res.status(201).json(service);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message });
    next(e);
  }
});

router.patch('/:id', authMiddleware, attachUser, requireRole('PROVIDER', 'ADMIN'), async (req, res, next) => {
  try {
    const provider = await prisma.provider.findUnique({ where: { userId: req.userId } });
    if (!provider) return res.status(403).json({ error: 'Provider profile required' });
    const parsed = createServiceSchema.partial().parse(req.body);
    const data = Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined));
    const service = await prisma.service.updateMany({
      where: { id: req.params.id, providerId: provider.id },
      data,
    });
    if (service.count === 0) return res.status(404).json({ error: 'Service not found' });
    const updated = await prisma.service.findUnique({ where: { id: req.params.id } });
    res.json(updated);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message });
    next(e);
  }
});

router.delete('/:id', authMiddleware, attachUser, requireRole('PROVIDER', 'ADMIN'), async (req, res, next) => {
  try {
    const provider = await prisma.provider.findUnique({ where: { userId: req.userId } });
    if (!provider) return res.status(403).json({ error: 'Provider profile required' });
    const result = await prisma.service.deleteMany({
      where: { id: req.params.id, providerId: provider.id },
    });
    if (result.count === 0) return res.status(404).json({ error: 'Service not found' });
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});

export default router;
