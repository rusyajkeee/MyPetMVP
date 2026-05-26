import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, attachUser, requireRole } from '../middleware/auth.js';
import { matchCategories } from '../lib/categorySearch.js';

const router = Router();
const categoryEnum = z.enum(['VETERINARY', 'GROOMING', 'BOARDING', 'WALKING', 'TRANSPORT']);
const AUTO_VERIFY_PROVIDERS = process.env.AUTO_VERIFY_PROVIDERS === 'true';

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * @openapi
 * /services/search:
 *   get:
 *     summary: Search services by name/description, returns services with provider info
 */
router.get('/search', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json([]);

    const lat = req.query.lat ? parseFloat(req.query.lat) : null;
    const lng = req.query.lng ? parseFloat(req.query.lng) : null;

    // Synonym/keyword matching: "стрижка" → GROOMING, "прогулка" → WALKING, etc.
    const matchedCategories = matchCategories(q);

    const services = await prisma.service.findMany({
      where: {
        provider: { OR: [{ verified: true }, { isVerified: true }] },
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          ...(matchedCategories.length > 0 ? [{ category: { in: matchedCategories } }] : []),
        ],
      },
      include: {
        provider: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            reviews: { select: { rating: true } },
          },
        },
      },
      take: 30,
    });

    const results = services.map((s) => {
      const avgRating = s.provider.reviews.length
        ? s.provider.reviews.reduce((sum, r) => sum + r.rating, 0) / s.provider.reviews.length
        : null;
      let distanceKm = null;
      if (lat && lng && s.provider.latitude && s.provider.longitude) {
        distanceKm = parseFloat(haversineKm(lat, lng, s.provider.latitude, s.provider.longitude).toFixed(1));
      }
      return {
        id: s.id,
        title: s.title,
        description: s.description,
        priceKzt: s.priceKzt,
        durationMin: s.durationMin,
        category: s.category,
        provider: {
          id: s.provider.id,
          businessName: s.provider.businessName,
          address: s.provider.address,
          avgRating: avgRating ? parseFloat(avgRating.toFixed(1)) : null,
          reviewCount: s.provider.reviews.length,
          distanceKm,
        },
      };
    });

    results.sort((a, b) =>
      lat && lng
        ? (a.provider.distanceKm ?? 9999) - (b.provider.distanceKm ?? 9999)
        : (b.provider.avgRating ?? 0) - (a.provider.avgRating ?? 0)
    );

    res.json(results);
  } catch (e) {
    next(e);
  }
});

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
