import logger from '../lib/logger.js';

export const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log incoming request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    origin: req.headers.origin || 'no-origin',
    userAgent: req.headers['user-agent'],
  });

  // Intercept response
  const originalJson = res.json;
  res.json = function (data) {
    const duration = Date.now() - start;
    logger.info('Response sent', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
    return originalJson.call(this, data);
  };

  next();
};

export default requestLogger;
