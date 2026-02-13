import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, attachUser, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware, attachUser, requireRole('ADMIN'));

/**
 * @openapi
 * /admin/stats:
 *   get:
 *     summary: Dashboard statistics
 */
router.get('/stats', async (req, res, next) => {
  try {
    const [userCount, providerCount, bookingCount, pendingProviders] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.provider.count({ where: { verified: true } }),
      prisma.booking.count(),
      prisma.provider.count({ where: { verified: false } }),
    ]);
    res.json({
      users: userCount,
      providers: providerCount,
      bookings: bookingCount,
      pendingProviderVerifications: pendingProviders,
    });
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /admin/providers/pending:
 *   get:
 *     summary: List unverified providers
 */
router.get('/providers/pending', async (req, res, next) => {
  try {
    const list = await prisma.provider.findMany({
      where: { verified: false },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } }, services: true },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /admin/providers:
 *   get:
 *     summary: List all providers (for admin)
 */
router.get('/providers', async (req, res, next) => {
  try {
    const list = await prisma.provider.findMany({
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } }, services: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /admin/providers/:id/verify:
 *   post:
 *     summary: Verify provider
 */
router.post('/providers/:id/verify', async (req, res, next) => {
  try {
    const provider = await prisma.provider.update({
      where: { id: req.params.id },
      data: { verified: true, verifiedAt: new Date() },
      include: { user: true },
    });
    await prisma.notification.create({
      data: {
        userId: provider.userId,
        title: 'Provider verified',
        body: 'Your provider account has been verified.',
      },
    });
    res.json(provider);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /admin/users/:id/block:
 *   post:
 *     summary: Block user
 */
router.post('/users/:id/block', async (req, res, next) => {
  try {
    const { reason } = req.body || {};
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { blocked: true, blockedAt: new Date(), blockedReason: reason || null },
    });
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: 'Account blocked',
        body: reason || 'Your account has been blocked.',
      },
    });
    res.json(user);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /admin/users/:id/unblock:
 *   post:
 *     summary: Unblock user
 */
router.post('/users/:id/unblock', async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { blocked: false, blockedAt: null, blockedReason: null },
    });
    res.json(user);
  } catch (e) {
    next(e);
  }
});

export default router;
