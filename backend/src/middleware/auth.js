import jwt from 'jsonwebtoken';
import logger from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    logger.debug('Auth failed: no token provided', { path: req.path });
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    req.role = payload.role;
    logger.debug('Auth successful', { userId: payload.userId, role: payload.role, path: req.path });
    next();
  } catch (e) {
    logger.warn('Auth failed: invalid token', { error: e.message, path: req.path });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export async function attachUser(req, res, next) {
  if (!req.userId) return next();
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, blocked: true, avatarUrl: true },
    });
    if (!user || user.blocked) {
      logger.warn('User blocked or not found', { userId: req.userId });
      return res.status(403).json({ error: 'Account blocked or not found' });
    }
    req.user = user;
    logger.debug('User attached to request', { userId: user.id, email: user.email });
    next();
  } catch (e) {
    next(e);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.role || !roles.includes(req.role)) {
      logger.warn('Permission denied', { userId: req.userId, requiredRoles: roles, userRole: req.role });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    logger.debug('Permission verified', { userId: req.userId, role: req.role });
    next();
  };
}

export { JWT_SECRET };
