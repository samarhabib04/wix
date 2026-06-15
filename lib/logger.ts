type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.isDevelopment) {
      return level === 'ERROR';
    }
    return true;
  }

  private formatMessage(prefix: string, message: string, data?: any): void {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    if (data !== undefined) {

    } else {

    }
  }

  error(message: string, error?: any): void {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    if (error !== undefined) {
      console.error(`[${timestamp}] ❌ ${message}`, error);
    } else {
      console.error(`[${timestamp}] ❌ ${message}`);
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('WARN')) {
      this.formatMessage('⚠️', message, data);
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('INFO')) {
      this.formatMessage('ℹ️', message, data);
    }
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('DEBUG')) {
      this.formatMessage('🔍', message, data);
    }
  }

  auth(message: string, data?: any): void {
    if (this.shouldLog('DEBUG')) {
      this.formatMessage('🔐', message, data);
    }
  }

  data(message: string, data?: any): void {
    if (this.shouldLog('DEBUG')) {
      this.formatMessage('📊', message, data);
    }
  }

  success(message: string, data?: any): void {
    if (this.shouldLog('INFO')) {
      this.formatMessage('✅', message, data);
    }
  }
}

export const logger = new Logger();

