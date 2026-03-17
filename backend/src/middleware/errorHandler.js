import logger from '../lib/logger.js';

export function notFound(req, res, next) {
  logger.warn('Route not found', { method: req.method, path: req.path });
  res.status(404).json({ error: 'Not found' });
}

export function errorHandler(err, req, res, next) {
  logger.error('Request error', {
    method: req.method,
    path: req.path,
    message: err.message,
    stack: err.stack,
  });
  const status = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ error: message });
}
