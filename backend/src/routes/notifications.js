import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, attachUser } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware, attachUser);

/**
 * @openapi
 * /notifications:
 *   get:
 *     summary: List current user notifications
 */
router.get('/', async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifications);
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /notifications/:id/read:
 *   patch:
 *     summary: Mark as read
 */
router.patch('/:id/read', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: { read: true },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/**
 * @openapi
 * /notifications/read-all:
 *   post:
 *     summary: Mark all as read
 */
router.post('/read-all', async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId },
      data: { read: true },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
