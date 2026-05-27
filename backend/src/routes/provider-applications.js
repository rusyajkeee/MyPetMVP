import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authMiddleware, attachUser } from '../middleware/auth.js';

const router = Router();

const applySchema = z.object({
  businessName: z.string().min(2, 'Название организации обязательно'),
  address: z.string().min(3, 'Адрес обязателен'),
  phone: z.string().optional(),
  description: z.string().optional(),
});

// GET /provider-applications/my — current user checks their own application status
router.get('/my', authMiddleware, attachUser, async (req, res, next) => {
  try {
    const app = await prisma.providerApplication.findUnique({ where: { userId: req.userId } });
    res.json(app || null);
  } catch (e) {
    next(e);
  }
});

// POST /provider-applications — USER submits an application to become a provider
router.post('/', authMiddleware, attachUser, async (req, res, next) => {
  try {
    if (req.role !== 'USER') {
      return res.status(400).json({ error: 'Only regular users can apply.' });
    }

    const data = applySchema.parse(req.body);

    const existing = await prisma.providerApplication.findUnique({ where: { userId: req.userId } });

    if (existing?.status === 'PENDING') {
      return res.status(400).json({ error: 'У вас уже есть заявка на рассмотрении.' });
    }
    if (existing?.status === 'APPROVED') {
      return res.status(400).json({ error: 'Ваша заявка уже одобрена.' });
    }

    let app;
    if (existing) {
      // Re-apply after rejection
      app = await prisma.providerApplication.update({
        where: { userId: req.userId },
        data: { ...data, status: 'PENDING', adminNote: null },
      });
    } else {
      app = await prisma.providerApplication.create({
        data: { userId: req.userId, ...data },
      });
    }

    // Notify all admins
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          title: 'Новая заявка провайдера',
          body: `${data.businessName} подал(а) заявку на регистрацию.`,
        })),
      });
    }

    res.status(201).json(app);
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: e.errors?.[0]?.message });
    next(e);
  }
});

export default router;
