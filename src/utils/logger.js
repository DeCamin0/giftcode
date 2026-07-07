const levels = ['debug', 'info', 'warn', 'error'];

function format(level, message, meta) {
  const timestamp = new Date().toISOString();
  const suffix = meta ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${suffix}`;
}

function createLogger() {
  const minLevel = process.env.LOG_LEVEL || 'info';
  const minIndex = levels.indexOf(minLevel);
  const effectiveMin = minIndex === -1 ? 1 : minIndex;

  function log(level, message, meta) {
    const index = levels.indexOf(level);
    if (index < effectiveMin) return;
    const line = format(level, message, meta);
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  }

  return {
    debug: (message, meta) => log('debug', message, meta),
    info: (message, meta) => log('info', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    error: (message, meta) => log('error', message, meta),
  };
}

module.exports = createLogger();
