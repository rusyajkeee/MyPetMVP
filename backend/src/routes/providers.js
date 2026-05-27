import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, attachUser, requireRole } from '../middleware/auth.js';

const router = Router();

const serviceCategoryEnum = z.enum(['VETERINARY', 'GROOMING', 'BOARDING', 'WALKING', 'TRANSPORT']);
const providerCategoryEnum = z.enum(['VETERINARY', 'GROOMING', 'BOARDING', 'TRAINING']);
const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(1).max(50).optional().default(5),
  category: providerCategoryEnum.optional(),
  topRated: z.coerce.boolean().optional().default(false),
});

/**
 * @openapi
 * /providers:
 *   get:
 *     summary: List providers (search by category)
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

// Helper for distance calculation
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * @openapi
 * /providers/nearby:
 *   get:
 *     summary: Search nearby providers within a radius
 */
router.get('/nearby', async (req, res, next) => {
  try {
    const query = nearbyQuerySchema.parse(req.query);
    const where = {
      latitude: { not: null },
      longitude: { not: null },
      OR: [{ verified: true }, { isVerified: true }],
    };
    if (query.category) where.category = query.category;

    const providers = await prisma.provider.findMany({
      where,
      include: {
        user: { select: { firstName: true, lastName: true, avatarUrl: true } },
        services: { take: 5 },
        reviews: { select: { rating: true } },
      },
    });

    const nearbyProviders = providers
      .map(p => {
        const distanceKm = haversine(query.lat, query.lng, p.latitude, p.longitude);
        const avgRating = p.reviews.length ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length : null;
        return {
          id: p.id,
          businessName: p.businessName || (p.user.firstName + ' ' + p.user.lastName),
          latitude: p.latitude,
          longitude: p.longitude,
          lat: p.latitude,
          lng: p.longitude,
          distanceKm: parseFloat(distanceKm.toFixed(2)),
          category: p.category,
          rating: avgRating ? parseFloat(avgRating.toFixed(1)) : null,
          avgRating: avgRating ? parseFloat(avgRating.toFixed(1)) : null,
          reviewCount: p.reviews.length,
          address: p.address,
          isVerified: p.isVerified || p.verified,
          user: p.user,
          services: p.services,
          description: p.description,
          phone: p.user?.phone || null,
        };
      })
      .filter(p => p.distanceKm <= query.radius)
      .sort((a, b) => {
        if (query.topRated) {
          const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
          if (ratingDiff !== 0) return ratingDiff;
        }
        return a.distanceKm - b.distanceKm;
      });

    res.json(nearbyProviders);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid nearby query' });
    next(e);
  }
});

const createProviderSchema = z.object({
  businessName: z.string().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  category: providerCategoryEnum.optional(),
});

// Protected provider routes (must be before /:id so /me is not captured as id)

router.get('/me/bookings', authMiddleware, attachUser, requireRole('PROVIDER', 'ADMIN'), async (req, res, next) => {
  try {
    const provider = await prisma.provider.findUnique({ where: { userId: req.userId } });
    if (!provider) return res.json([]);
    const bookings = await prisma.booking.findMany({
      where: { providerId: provider.id },
      include: {
        service: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        pet: true,
        review: { select: { id: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    });
    // Normalize: rename user → customer so the mobile provider UI works
    res.json(bookings.map(b => ({ ...b, customer: b.user, user: undefined })));
  } catch (e) {
    next(e);
  }
});

router.get('/me/stats', authMiddleware, attachUser, requireRole('PROVIDER', 'ADMIN'), async (req, res, next) => {
  try {
    const provider = await prisma.provider.findUnique({ where: { userId: req.userId } });
    if (!provider) return res.json({ pendingCount: 0, todayCount: 0, completedCount: 0, revenue: 0 });
    const bookings = await prisma.booking.findMany({
      where: { providerId: provider.id },
      include: { service: { select: { priceKzt: true } } },
    });
    const todayStr = new Date().toISOString().slice(0, 10);
    res.json({
      pendingCount: bookings.filter(b => b.status === 'PENDING').length,
      todayCount: bookings.filter(b =>
        b.scheduledAt?.toISOString().slice(0, 10) === todayStr &&
        (b.status === 'ACCEPTED' || b.status === 'IN_PROGRESS')
      ).length,
      completedCount: bookings.filter(b => b.status === 'COMPLETED').length,
      revenue: bookings
        .filter(b => b.status === 'COMPLETED')
        .reduce((sum, b) => sum + (b.service?.priceKzt || 0), 0),
    });
  } catch (e) {
    next(e);
  }
});

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

const BOOKING_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

router.get('/:id/slots', async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' });
    }
    const provider = await prisma.provider.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!provider) return res.status(404).json({ error: 'Provider not found' });

    const KZ_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC+5

    // Query bookings for the full Kazakhstan calendar day
    const dayStart = new Date(`${date}T00:00:00.000+05:00`);
    const dayEnd   = new Date(`${date}T23:59:59.999+05:00`);
    const booked = await prisma.booking.findMany({
      where: {
        providerId: provider.id,
        scheduledAt: { gte: dayStart, lte: dayEnd },
        status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] },
      },
      select: { scheduledAt: true },
    });

    // Convert stored UTC times → KZ times for comparison with slot labels
    const bookedTimes = new Set(booked.map((b) => {
      const kzDate = new Date(b.scheduledAt.getTime() + KZ_OFFSET_MS);
      const h = String(kzDate.getUTCHours()).padStart(2, '0');
      const m = String(kzDate.getUTCMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    }));

    // Past-slot check: use current Kazakhstan time
    const now   = new Date();
    const kzNow = new Date(now.getTime() + KZ_OFFSET_MS);
    const kzTodayDate  = kzNow.toISOString().slice(0, 10);
    const kzNowMinutes = kzNow.getUTCHours() * 60 + kzNow.getUTCMinutes();

    res.json({
      slots: BOOKING_SLOTS.map((time) => {
        const [h, m] = time.split(':').map(Number);
        const isPast = date === kzTodayDate && (h * 60 + m) <= kzNowMinutes;
        return { time, available: !bookedTimes.has(time) && !isPast };
      }),
    });
  } catch (e) {
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
