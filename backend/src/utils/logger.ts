// Log metadata only. Never pass credentials, JWTs, or complete request bodies.
function write(level: 'info' | 'warn' | 'error', message: string, context: Record<string, unknown> = {}) {
  console[level](JSON.stringify({ ...context, timestamp: new Date().toISOString(), level, message }));
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) => write('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => write('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => write('error', message, context),
};
