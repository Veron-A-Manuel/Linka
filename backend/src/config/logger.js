const winston = require('winston');
const path = require('path');
const fs = require('fs');

const DIRETORIO_LOGS = path.join(__dirname, '..', '..', 'logs');

// Criar directório de logs se não existir
if (!fs.existsSync(DIRETORIO_LOGS)) {
  fs.mkdirSync(DIRETORIO_LOGS, { recursive: true });
}

// Formato personalizado para logs
const formatoPersonalizado = winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level.toUpperCase()}] ${message}`;
  if (stack) log += `\n${stack}`;
  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`;
  }
  return log;
});

// Logger principal do sistema
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
  },
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    formatoPersonalizado
  ),
  transports: [
    // Consola (com cores em dev)
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production'
        ? winston.format.combine(winston.format.colorize(), formatoPersonalizado)
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp }) => {
              return `${timestamp} ${level}: ${message}`;
            })
          ),
    }),
    // Ficheiro de erros
    new winston.transports.File({
      filename: path.join(DIRETORIO_LOGS, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    }),
    // Ficheiro de todos os logs
    new winston.transports.File({
      filename: path.join(DIRETORIO_LOGS, 'combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
    }),
    // Ficheiro de audit (acções admin)
    new winston.transports.File({
      filename: path.join(DIRETORIO_LOGS, 'audit.log'),
      level: 'info',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(DIRETORIO_LOGS, 'exceptions.log'),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(DIRETORIO_LOGS, 'rejections.log'),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 3,
    }),
  ],
});

// Logger de auditoria (acções admin)
const auditoria = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  defaultMeta: { tipo: 'auditoria' },
  transports: [
    new winston.transports.File({
      filename: path.join(DIRETORIO_LOGS, 'audit.log'),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 15,
    }),
  ],
});

// Logger de performance
const performance = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  defaultMeta: { tipo: 'performance' },
  transports: [
    new winston.transports.File({
      filename: path.join(DIRETORIO_LOGS, 'performance.log'),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

module.exports = { logger, auditoria, performance };
