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

const createStaffSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
  avatarUrl: z.string().optional(),
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
        staff: { select: { id: true, name: true, role: true } },
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

router.get('/me/analytics', authMiddleware, attachUser, requireRole('PROVIDER', 'ADMIN'), async (req, res, next) => {
  try {
    const provider = await prisma.provider.findUnique({ where: { userId: req.userId } });
    const empty = { totalRevenue: 0, totalClients: 0, totalBookings: 0, completedBookings: 0, cancelledBookings: 0, avgRating: null, topServices: [], revenueChart: [], statusBreakdown: {} };
    if (!provider) return res.json(empty);

    const period = req.query.period || 'month';
    const now = new Date();
    const sinceMap = { week: 7, month: 30, year: 365 };
    const days = sinceMap[period];
    const since = days ? new Date(now.getTime() - days * 86400000) : null;

    const where = { providerId: provider.id };
    if (since) where.scheduledAt = { gte: since };

    const bookings = await prisma.booking.findMany({
      where,
      include: { service: { select: { id: true, title: true, priceKzt: true } } },
    });

    const completed = bookings.filter(b => b.status === 'COMPLETED');

    const totalRevenue = completed.reduce((s, b) => s + (b.service?.priceKzt || 0), 0);
    const totalClients = new Set(bookings.map(b => b.userId)).size;

    // Top services by booking count
    const svcMap = {};
    for (const b of bookings) {
      if (!b.service) continue;
      const { id, title, priceKzt } = b.service;
      if (!svcMap[id]) svcMap[id] = { id, title, priceKzt, count: 0, revenue: 0 };
      svcMap[id].count++;
      if (b.status === 'COMPLETED') svcMap[id].revenue += priceKzt;
    }
    const topServices = Object.values(svcMap).sort((a, b) => b.count - a.count).slice(0, 5);

    // Revenue chart: by day (week/month) or by month (year/all)
    const groupMonth = period === 'year' || period === 'all';
    const chartMap = {};
    for (const b of completed) {
      const d = b.scheduledAt || b.createdAt;
      const key = groupMonth
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        : d.toISOString().slice(0, 10);
      chartMap[key] = (chartMap[key] || 0) + (b.service?.priceKzt || 0);
    }

    const revenueChart = [];
    if (period === 'week') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 86400000);
        const key = d.toISOString().slice(0, 10);
        revenueChart.push({ label: ['вс','пн','вт','ср','чт','пт','сб'][d.getDay()], value: chartMap[key] || 0 });
      }
    } else if (period === 'month') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 5 * 86400000);
        const key = d.toISOString().slice(0, 10);
        revenueChart.push({ label: key.slice(5).replace('-', '.'), value: Object.entries(chartMap).filter(([k]) => k <= key && k > new Date(d.getTime() - 5 * 86400000).toISOString().slice(0, 10)).reduce((s, [, v]) => s + v, 0) });
      }
    } else {
      const count = period === 'year' ? 12 : 12;
      for (let i = count - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        revenueChart.push({ label: d.toLocaleString('ru-RU', { month: 'short' }), value: chartMap[key] || 0 });
      }
    }

    // Avg rating
    const reviews = await prisma.review.findMany({ where: { providerId: provider.id }, select: { rating: true } });
    const avgRating = reviews.length > 0 ? Math.round(reviews.reduce((s, r) => s + r.rating, 0) / reviews.length * 10) / 10 : null;

    const statusBreakdown = {};
    for (const b of bookings) statusBreakdown[b.status] = (statusBreakdown[b.status] || 0) + 1;

    res.json({
      totalRevenue,
      totalClients,
      totalBookings: bookings.length,
      completedBookings: completed.length,
      cancelledBookings: bookings.filter(b => b.status === 'CANCELLED').length,
      avgRating,
      topServices,
      revenueChart,
      statusBreakdown,
    });
  } catch (e) {
    next(e);
  }
});

// Staff management — own (provider-auth required)
router.get('/me/staff', authMiddleware, attachUser, requireRole('PROVIDER', 'ADMIN'), async (req, res, next) => {
  try {
    const provider = await prisma.provider.findUnique({ where: { userId: req.userId } });
    if (!provider) return res.json([]);
    const staff = await prisma.staff.findMany({
      where: { providerId: provider.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json(staff);
  } catch (e) {
    next(e);
  }
});

router.post('/me/staff', authMiddleware, attachUser, requireRole('PROVIDER', 'ADMIN'), async (req, res, next) => {
  try {
    const data = createStaffSchema.parse(req.body);
    const provider = await prisma.provider.findUnique({ where: { userId: req.userId } });
    if (!provider) return res.status(400).json({ error: 'Provider profile not found' });
    const member = await prisma.staff.create({ data: { providerId: provider.id, ...data } });
    res.status(201).json(member);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message });
    next(e);
  }
});

router.patch('/me/staff/:staffId', authMiddleware, attachUser, requireRole('PROVIDER', 'ADMIN'), async (req, res, next) => {
  try {
    const data = createStaffSchema.partial().parse(req.body);
    const provider = await prisma.provider.findUnique({ where: { userId: req.userId } });
    if (!provider) return res.status(403).json({ error: 'Forbidden' });
    const member = await prisma.staff.findFirst({ where: { id: req.params.staffId, providerId: provider.id } });
    if (!member) return res.status(404).json({ error: 'Staff not found' });
    const updated = await prisma.staff.update({ where: { id: req.params.staffId }, data });
    res.json(updated);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message });
    next(e);
  }
});

router.delete('/me/staff/:staffId', authMiddleware, attachUser, requireRole('PROVIDER', 'ADMIN'), async (req, res, next) => {
  try {
    const provider = await prisma.provider.findUnique({ where: { userId: req.userId } });
    if (!provider) return res.status(403).json({ error: 'Forbidden' });
    const member = await prisma.staff.findFirst({ where: { id: req.params.staffId, providerId: provider.id } });
    if (!member) return res.status(404).json({ error: 'Staff not found' });
    await prisma.staff.delete({ where: { id: req.params.staffId } });
    res.json({ ok: true });
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

// Public staff list for a provider
router.get('/:id/staff', async (req, res, next) => {
  try {
    const staff = await prisma.staff.findMany({
      where: { providerId: req.params.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json(staff);
  } catch (e) {
    next(e);
  }
});

router.get('/:id/slots', async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' });
    }
    const provider = await prisma.provider.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!provider) return res.status(404).json({ error: 'Provider not found' });

    const KZ_OFFSET_MS = 5 * 60 * 60 * 1000;
    const dayStart = new Date(`${date}T00:00:00.000+05:00`);
    const dayEnd   = new Date(`${date}T23:59:59.999+05:00`);
    const now      = new Date();
    const kzNow    = new Date(now.getTime() + KZ_OFFSET_MS);
    const kzTodayDate  = kzNow.toISOString().slice(0, 10);
    const kzNowMinutes = kzNow.getUTCHours() * 60 + kzNow.getUTCMinutes();

    const staffList = await prisma.staff.findMany({
      where: { providerId: req.params.id },
      select: { id: true, name: true, role: true, avatarUrl: true },
      orderBy: { createdAt: 'asc' },
    });

    if (staffList.length > 0) {
      // Per-staff busy slots
      const booked = await prisma.booking.findMany({
        where: {
          providerId: req.params.id,
          scheduledAt: { gte: dayStart, lte: dayEnd },
          status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] },
          staffId: { in: staffList.map(s => s.id) },
        },
        select: { scheduledAt: true, staffId: true },
      });

      const staffBusyMap = new Map(); // staffId → Set<time>
      for (const b of booked) {
        const kzDate = new Date(b.scheduledAt.getTime() + KZ_OFFSET_MS);
        const h = String(kzDate.getUTCHours()).padStart(2, '0');
        const m = String(kzDate.getUTCMinutes()).padStart(2, '0');
        const time = `${h}:${m}`;
        if (!staffBusyMap.has(b.staffId)) staffBusyMap.set(b.staffId, new Set());
        staffBusyMap.get(b.staffId).add(time);
      }

      const staff = staffList.map(s => ({
        ...s,
        busySlots: Array.from(staffBusyMap.get(s.id) || []),
      }));

      const slots = BOOKING_SLOTS.map((time) => {
        const [h, m] = time.split(':').map(Number);
        const isPast = date === kzTodayDate && (h * 60 + m) <= kzNowMinutes;
        const available = !isPast && staffList.some(s => !(staffBusyMap.get(s.id) || new Set()).has(time));
        return { time, available, isPast };
      });

      res.json({ slots, staff });
    } else {
      // No staff — provider-level availability
      const booked = await prisma.booking.findMany({
        where: {
          providerId: provider.id,
          scheduledAt: { gte: dayStart, lte: dayEnd },
          status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] },
        },
        select: { scheduledAt: true },
      });

      const bookedTimes = new Set(booked.map((b) => {
        const kzDate = new Date(b.scheduledAt.getTime() + KZ_OFFSET_MS);
        const h = String(kzDate.getUTCHours()).padStart(2, '0');
        const m = String(kzDate.getUTCMinutes()).padStart(2, '0');
        return `${h}:${m}`;
      }));

      res.json({
        staff: [],
        slots: BOOKING_SLOTS.map((time) => {
          const [h, m] = time.split(':').map(Number);
          const isPast = date === kzTodayDate && (h * 60 + m) <= kzNowMinutes;
          return { time, available: !bookedTimes.has(time) && !isPast, isPast };
        }),
      });
    }
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
