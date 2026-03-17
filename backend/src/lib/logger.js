const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'] || 1;

const formatLog = (level, message, data = {}) => {
  const timestamp = new Date().toISOString();
  const logData = Object.keys(data).length > 0 ? JSON.stringify(data) : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message} ${logData}`.trim();
};

export const logger = {
  debug: (message, data) => {
    if (LOG_LEVELS.debug >= currentLevel) {
      console.log(formatLog('debug', message, data));
    }
  },
  info: (message, data) => {
    if (LOG_LEVELS.info >= currentLevel) {
      console.log(formatLog('info', message, data));
    }
  },
  warn: (message, data) => {
    if (LOG_LEVELS.warn >= currentLevel) {
      console.warn(formatLog('warn', message, data));
    }
  },
  error: (message, data) => {
    if (LOG_LEVELS.error >= currentLevel) {
      console.error(formatLog('error', message, data));
    }
  },
};

export default logger;
