export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogContext = Record<string, unknown>;

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

const LEVEL_ORDER: readonly LogLevel[] = ['debug', 'info', 'warn', 'error'];

export function createConsoleLogger(minLevel: LogLevel = 'info'): Logger {
  const log = (level: LogLevel) => (message: string, context?: LogContext) => {
    if (LEVEL_ORDER.indexOf(level) < LEVEL_ORDER.indexOf(minLevel)) return;
    const suffix = context ? ` ${JSON.stringify(context)}` : '';
    const line = `[${level.toUpperCase()}] ${message}${suffix}`;
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  };
  return { debug: log('debug'), info: log('info'), warn: log('warn'), error: log('error') };
}

export const silentLogger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};
