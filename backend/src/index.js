import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import logger from './lib/logger.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import providerRoutes from './routes/providers.js';
import serviceRoutes from './routes/services.js';
import bookingRoutes from './routes/bookings.js';
import reviewRoutes from './routes/reviews.js';
import adminRoutes from './routes/admin.js';
import notificationRoutes from './routes/notifications.js';
import { setupSwagger } from './config/swagger.js';

const app = express();
const PORT = process.env.PORT || 4000;

logger.info('Starting MyPet API server', { port: PORT, environment: process.env.NODE_ENV || 'development' });

// Security & parsing
app.use(helmet());
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173,http://localhost:5174,http://localhost:5175').split(',');
logger.debug('Allowed origins configured', { origins: allowedOrigins });

app.use(cors({
  origin(origin, cb) {
    // Allow requests with no origin (curl, server-to-server, same-origin proxied)
    if (!origin || allowedOrigins.includes(origin)) {
      logger.debug('CORS request allowed', { origin });
      return cb(null, true);
    }
    logger.warn('CORS request blocked', { origin });
    cb(null, true); // In production, tighten this
  },
  credentials: true,
}));

app.use(express.json());
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

// Auth rate limit (stricter)
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }));
app.use('/api/auth/register', rateLimit({ windowMs: 60 * 60 * 1000, max: 5 }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Swagger
setupSwagger(app);

// Health
app.get('/api/health', (req, res) => {
  logger.info('Health check requested');
  res.json({ ok: true, ts: new Date().toISOString() });
});

// 404 & error handler
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info('✓ MyPet API server is running', {
    url: `http://localhost:${PORT}`,
    swagger: `http://localhost:${PORT}/api-docs`,
  });
});
