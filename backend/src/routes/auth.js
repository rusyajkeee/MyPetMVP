import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { registerSchema, loginSchema } from '../validators/auth.js';
import { authMiddleware, attachUser, JWT_SECRET } from '../middleware/auth.js';

const router = Router();
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET + '-refresh';
const ACCESS_EXP = '15m';
const REFRESH_EXP = '7d';

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
    const existing = await prisma.user.findUnique({ where: { email: body.email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
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
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });
    const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_EXP });
    const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: REFRESH_EXP });
    res.status(201).json({ user, accessToken, refreshToken, expiresIn: 900 });
  } catch (e) {
    if (e.name === 'ZodError') {
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
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (user.blocked) {
      return res.status(403).json({ error: 'Account is blocked' });
    }
    const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_EXP });
    const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: REFRESH_EXP });
    res.json({
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
      accessToken,
      refreshToken,
      expiresIn: 900,
    });
  } catch (e) {
    if (e.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid input' });
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
    if (!token) return res.status(401).json({ error: 'Refresh token required' });
    const payload = jwt.verify(token, REFRESH_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, blocked: true },
    });
    if (!user || user.blocked) return res.status(401).json({ error: 'Invalid refresh token' });
    const accessToken = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: ACCESS_EXP });
    res.json({ accessToken, expiresIn: 900 });
  } catch (e) {
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
  res.json(req.user);
});

export default router;
