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
 * /admin/provider-applications:
 *   get:
 *     summary: List all provider applications
 */
router.get('/provider-applications', async (req, res, next) => {
  try {
    const apps = await prisma.providerApplication.findMany({
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } } },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });
    res.json(apps);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /admin/provider-applications/:id:
 *   patch:
 *     summary: Approve or reject a provider application
 */
router.patch('/provider-applications/:id', async (req, res, next) => {
  try {
    const { status, adminNote } = req.body || {};
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });
    }

    const application = await prisma.providerApplication.findUnique({
      where: { id: req.params.id },
      include: { user: true },
    });
    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (application.status !== 'PENDING') {
      return res.status(400).json({ error: `Application is already ${application.status.toLowerCase()}` });
    }

    if (status === 'APPROVED') {
      await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: application.userId }, data: { role: 'PROVIDER' } });
        await tx.provider.upsert({
          where: { userId: application.userId },
          create: {
            userId: application.userId,
            businessName: application.businessName,
            address: application.address,
            category: application.category || 'VETERINARY',
            verified: true,
            verifiedAt: new Date(),
          },
          update: {
            businessName: application.businessName,
            address: application.address,
            category: application.category || 'VETERINARY',
            verified: true,
            verifiedAt: new Date(),
          },
        });
        await tx.providerApplication.update({
          where: { id: req.params.id },
          data: { status: 'APPROVED', adminNote: adminNote || null },
        });
        await tx.notification.create({
          data: {
            userId: application.userId,
            title: 'Заявка одобрена! 🎉',
            body: 'Ваша заявка на регистрацию провайдера одобрена. Выйдите и войдите снова, чтобы перейти в режим провайдера.',
          },
        });
      });
    } else {
      await prisma.providerApplication.update({
        where: { id: req.params.id },
        data: { status: 'REJECTED', adminNote: adminNote || null },
      });
      await prisma.notification.create({
        data: {
          userId: application.userId,
          title: 'Заявка отклонена',
          body: adminNote || 'Ваша заявка была отклонена. Вы можете подать её повторно.',
        },
      });
    }

    const updated = await prisma.providerApplication.findUnique({
      where: { id: req.params.id },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    });
    res.json(updated);
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
