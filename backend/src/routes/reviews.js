import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, attachUser, requireRole } from '../middleware/auth.js';

const router = Router();
const createReviewSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

/**
 * @openapi
 * /reviews:
 *   post:
 *     summary: Leave review (only for completed booking, once per booking)
 */
router.post('/', authMiddleware, attachUser, requireRole('USER', 'ADMIN'), async (req, res, next) => {
  try {
    const data = createReviewSchema.parse(req.body);
    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
      include: { review: true },
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.userId !== req.userId) return res.status(403).json({ error: 'Not your booking' });
    if (booking.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Can only review completed bookings' });
    }
    if (booking.review) return res.status(400).json({ error: 'Already reviewed' });
    const review = await prisma.review.create({
      data: {
        bookingId: booking.id,
        userId: req.userId,
        providerId: booking.providerId,
        rating: data.rating,
        comment: data.comment,
      },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    res.status(201).json(review);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message });
    next(e);
  }
});

/**
 * @openapi
 * /reviews/provider/:providerId:
 *   get:
 *     summary: List reviews for a provider
 */
router.get('/provider/:providerId', async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { providerId: req.params.providerId },
      include: { user: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(reviews);
  } catch (e) {
    next(e);
  }
});

export default router;
