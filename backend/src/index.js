import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

import logger from './lib/logger.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Prevent unhandled errors from crashing the process
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { message: err.message, stack: err.stack });
});
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;
const HOST = '0.0.0.0';
const USE_HTTPS = process.env.USE_HTTPS !== 'false';

// Dockerized frontends reach the API through nginx, so trust the first proxy hop.
app.set('trust proxy', 1);

logger.info('Starting MyPet API server', {
  port: PORT,
  environment: process.env.NODE_ENV || 'development',
  https: USE_HTTPS,
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://localhost', 'http://192.168.1.6:*'],
    },
  },
}));

const allowedOrigins = (
  process.env.FRONTEND_URL ||
  'https://localhost,http://localhost:5173,http://localhost:5174,http://localhost:5175,http://192.168.1.6:*'
).split(',');

logger.debug('Allowed origins configured', { origins: allowedOrigins });

app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) {
      logger.debug('CORS request allowed', { origin });
      return cb(null, true);
    }

    logger.warn('CORS request blocked', { origin });
    cb(null, true);
  },
  credentials: true,
}));

app.use(express.json());
app.use(requestLogger);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  message: { error: 'Too many requests, please try again later.' },
});

app.use('/api', limiter);
app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));
app.use('/api/auth/register', rateLimit({ windowMs: 60 * 60 * 1000, max: 10 }));
app.use('/api/bookings', rateLimit({ windowMs: 60 * 1000, max: 60, message: { error: 'Too many booking requests, slow down.' } }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

setupSwagger(app);

app.use(notFound);
app.use(errorHandler);

function logStartup(protocol) {
  const baseUrl = `${protocol}://localhost:${PORT}`;
  logger.info(`MyPet API server is running (${protocol.toUpperCase()})`, {
    url: baseUrl,
    swagger: `${baseUrl}/api-docs`,
  });
}

function startServer() {
  if (USE_HTTPS) {
    const keyPath = path.join(__dirname, '../certs/key.pem');
    const certPath = path.join(__dirname, '../certs/cert.pem');

    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
      logger.error('SSL certificates not found in ./certs/');
      logger.info('Generate certificates with: npm run cert:generate');
      logger.warn('Or set USE_HTTPS=false to use HTTP for development');
      process.exit(1);
    }

    const options = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };

    https.createServer(options, app).listen(PORT, HOST, () => {
      logStartup('https');
    });

    return;
  }

  app.listen(PORT, HOST, () => {
    logStartup('http');
  });
}

startServer();
