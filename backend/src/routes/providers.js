import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, attachUser, requireRole } from '../middleware/auth.js';

const router = Router();

const serviceCategoryEnum = z.enum(['VETERINARY', 'GROOMING', 'BOARDING', 'WALKING', 'TRANSPORT']);

/**
 * @openapi
 * /providers:
 *   get:
 *     summary: List providers (search by category, optional lat/lng)
 */
router.get('/', async (req, res, next) => {
  try {
    const category = req.query.category ? serviceCategoryEnum.safeParse(req.query.category).data : undefined;
    const where = {};
    if (category) {
      where.services = { some: { category } };
    }
    const providers = await prisma.provider.findMany({
      where: { verified: true, ...where },
      include: {
        user: { select: { firstName: true, lastName: true, avatarUrl: true } },
        services: { where: category ? { category } : undefined, take: 5 },
      },
    });
    res.json(providers);
  } catch (e) {
    next(e);
  }
});

const createProviderSchema = z.object({
  businessName: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// Protected provider routes (must be before /:id so /me is not captured as id)
router.get('/me', authMiddleware, attachUser, requireRole('PROVIDER', 'ADMIN'), async (req, res, next) => {
  try {
    const provider = await prisma.provider.findUnique({ where: { userId: req.userId }, include: { services: true } });
    if (!provider) return res.status(404).json({ error: 'Provider profile not found' });
    res.json(provider);
  } catch (e) {
    next(e);
  }
});

router.post('/me', authMiddleware, attachUser, requireRole('PROVIDER', 'ADMIN'), async (req, res, next) => {
  try {
    const data = createProviderSchema.parse(req.body);
    const provider = await prisma.provider.upsert({
      where: { userId: req.userId },
      create: { userId: req.userId, ...data },
      update: data,
      include: { user: { select: { firstName: true, lastName: true } }, services: true },
    });
    res.json(provider);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message });
    next(e);
  }
});

/**
 * @openapi
 * /providers/:id:
 *   get:
 *     summary: Get provider profile with services and avg rating
 */
router.get('/:id', async (req, res, next) => {
  try {
    const provider = await prisma.provider.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, phone: true } },
        services: true,
      },
    });
    if (!provider) return res.status(404).json({ error: 'Provider not found' });
    const reviews = await prisma.review.findMany({
      where: { providerId: provider.id },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const avgRating = reviews.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null;
    res.json({ ...provider, reviews, avgRating, reviewCount: reviews.length });
  } catch (e) {
    next(e);
  }
});

export default router;
