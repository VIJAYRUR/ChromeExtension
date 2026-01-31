const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class Logger {
  constructor(context, minLevel = 'INFO') {
    this.context = context;
    this.minLevel = LOG_LEVELS[minLevel] || LOG_LEVELS.INFO;
  }

  log(level, message, meta = {}) {
    if (LOG_LEVELS[level] < this.minLevel) return;

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      context: this.context,
      message,
      ...meta
    };

    const formatted = `[${timestamp}] [${this.context}:${level}] ${message}`;

    switch (level) {
      case 'ERROR':
        console.error(formatted, meta);
        break;
      case 'WARN':
        console.warn(formatted, meta);
        break;
      default:
        console.log(formatted, meta);
    }

    // Future: Send to logging service (CloudWatch, DataDog, etc.)
    // this.sendToExternalLogger(logEntry);
  }

  debug(message, meta) {
    this.log('DEBUG', message, meta);
  }

  info(message, meta) {
    this.log('INFO', message, meta);
  }

  warn(message, meta) {
    this.log('WARN', message, meta);
  }

  error(message, meta) {
    this.log('ERROR', message, meta);
  }
}

module.exports = Logger;
