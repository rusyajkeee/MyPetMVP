import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import logger from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { registerSchema, loginSchema } from '../validators/auth.js';
import { authMiddleware, attachUser, JWT_SECRET } from '../middleware/auth.js';

const router = Router();
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${JWT_SECRET}-refresh`;
const ACCESS_EXP = '15m';
const REFRESH_EXP = '7d';
const AUTO_VERIFY_PROVIDERS = process.env.AUTO_VERIFY_PROVIDERS === 'true';

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register (user or provider)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName, tosAccepted]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               phone: { type: string }
 *               tosAccepted: { type: boolean }
 *               role: { type: string, enum: [USER, PROVIDER] }
 *     responses:
 *       201: { description: Created }
 *       400: { description: Validation error }
 */
router.post('/register', async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    logger.info('Registration attempt', { email: body.email });

    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      logger.warn('Registration failed: email already exists', { email: body.email });
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: body.email,
          passwordHash,
          firstName: body.firstName,
          lastName: body.lastName,
          phone: body.phone,
          role: body.role,
          tosAccepted: true,
          tosAcceptedAt: new Date(),
          emailVerified: false,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });

      if (body.role === 'PROVIDER') {
        await tx.provider.create({
          data: {
            userId: createdUser.id,
            businessName: body.businessName || `${body.firstName} ${body.lastName}`.trim(),
            description: body.description,
            address: body.address,
            verified: AUTO_VERIFY_PROVIDERS,
            verifiedAt: AUTO_VERIFY_PROVIDERS ? new Date() : null,
          },
        });
      }

      return createdUser;
    });

    const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_EXP });
    const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: REFRESH_EXP });

    logger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({ user, accessToken, refreshToken, expiresIn: 900 });
  } catch (e) {
    if (e.name === 'ZodError') {
      logger.warn('Registration validation error', { errors: e.errors?.[0] });
      return res.status(400).json({ error: e.errors?.[0]?.message || 'Validation failed' });
    }

    next(e);
  }
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    logger.info('Login attempt', { email });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      logger.warn('Login failed: invalid credentials', { email });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.blocked) {
      logger.warn('Login failed: account blocked', { userId: user.id, email });
      return res.status(403).json({ error: 'Account is blocked' });
    }

    const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_EXP });
    const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: REFRESH_EXP });

    logger.info('User logged in successfully', { userId: user.id, email, role: user.role });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      accessToken,
      refreshToken,
      expiresIn: 900,
    });
  } catch (e) {
    if (e.name === 'ZodError') {
      logger.warn('Login validation error', { errors: e.errors?.[0] });
      return res.status(400).json({ error: e.errors?.[0]?.message || 'Invalid input' });
    }

    next(e);
  }
});

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.body.refreshToken || req.headers['x-refresh-token'];
    if (!token) {
      logger.warn('Refresh token missing');
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const payload = jwt.verify(token, REFRESH_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        blocked: true,
      },
    });

    if (!user || user.blocked) {
      logger.warn('Refresh failed: invalid or blocked user', { userId: payload.userId });
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_EXP });
    logger.info('Token refreshed successfully', { userId: user.id });
    res.json({ accessToken, expiresIn: 900 });
  } catch (e) {
    logger.warn('Refresh token verification failed', { error: e.message });
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Current user (protected)
 *     security: [{ bearerAuth: [] }]
 */
router.get('/me', authMiddleware, attachUser, (req, res) => {
  logger.debug('User profile requested', { userId: req.user.id });
  res.json(req.user);
});

export default router;
