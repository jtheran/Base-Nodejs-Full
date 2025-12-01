// src/config/logger.js
import winston from 'winston';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import 'colors';
import Transport from 'winston-transport';
import prisma from '../libs/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Niveles de log personalizados
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  audit: 5
};

// Colores para cada nivel
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
  audit: 'cyan'
};

winston.addColors(logColors);

// Formato personalizado para logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let formattedMessage = `[${timestamp}]::` + `[${level}]::`;

    // Mensaje principal
    formattedMessage += `[${message}]`;
    
    // Metadata adicional
    if (Object.keys(meta).length > 0 && level !== 'audit') {
      formattedMessage += `::[${JSON.stringify(meta)}]`;
    }
    
    // Stack trace para errores
    if (stack && level === 'error') {
      formattedMessage += `::[\n${stack}]`;
    }
    
    return formattedMessage;
  })
);

// Formato específico para auditoría
const auditFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, message, action, entity, entityId, userId, userIp, userAgent }) => {
    let logMessage = `[${timestamp}]::` + ` [AUDIT]::`;
    logMessage += ` ${message}`;
    
    if (action) logMessage += ` | Action: ${action}`;
    if (entity) logMessage += ` | Entity: ${entity}`;
    if (entityId) logMessage += ` | EntityID: ${entityId}`;
    if (userId) logMessage += ` | UserID: ${userId}`;
    if (userIp) logMessage += ` | IP: ${userIp}`;
    if (userAgent) logMessage += ` | Agent: ${userAgent}`;
    
    return logMessage;
  })
);

// Transporte personalizado para Base de Datos
class PrismaTransport extends Transport {
  constructor(opts) {
    super(opts);
  }

  async log(info, callback) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    try {
      const { level, message, userId, action, entity, entityId, userIp, userAgent, metadata } = info;
      
      // Solo guardar en BD logs de nivel info, warn, error y audit
      if (['info', 'warn', 'error', 'audit'].includes(level)) {
        
        await prisma.log.create({
          data: {
            level: level.toUpperCase(),
            message,
            action: action || this.getActionFromMessage(message),
            entity,
            entityId,
            userIp,
            userAgent,
            metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
            userId: userId || undefined,
          },
        });
      }
      
    } catch (error) {
      // No usar console.log aquí para evitar recursión
      process.stderr.write(`❌ Error guardando log en BD: ${error.message}\n`);
    }

    callback();
  }

  getActionFromMessage(message) {
    const messageStr = message.toLowerCase();
    if (messageStr.includes('login')) return 'LOGIN';
    if (messageStr.includes('create') || messageStr.includes('crear')) return 'CREATE';
    if (messageStr.includes('update') || messageStr.includes('actualizar')) return 'UPDATE';
    if (messageStr.includes('delete') || messageStr.includes('eliminar')) return 'DELETE';
    if (messageStr.includes('read') || messageStr.includes('leer')) return 'READ';
    return null;
  }
}

// Transporte para archivo de auditoría
const auditFileTransport = new winston.transports.File({
  filename: `${__dirname}/audit.log`,
  level: 'audit',
  format: auditFormat,
  maxsize: 5242880, // 5MB
  maxFiles: 5,
});

// Transporte para archivo de errores
const errorFileTransport = new winston.transports.File({
  filename: `${__dirname}/error.log`,
  level: 'error',
  maxsize: 5242880, // 5MB
  maxFiles: 5,
});

// Transporte para archivo combinado
const combinedFileTransport = new winston.transports.File({
  filename: `${__dirname}/combined.log`,
  maxsize: 5242880, // 5MB
  maxFiles: 5,
});

// Transporte para consola (solo en desarrollo)
const consoleTransport = new winston.transports.Console({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.colorize({ all: true }),
    logFormat
  )
});

// Logger principal
const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'backend-base' },
  transports: [
    consoleTransport,
    errorFileTransport,
    combinedFileTransport,
    auditFileTransport,
    new PrismaTransport({ level: 'info' }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: `${__dirname}/exceptions.log` 
    }),
    consoleTransport
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: `${__dirname}/rejections.log` 
    }),
    consoleTransport
  ],
});

// Logger específico para auditoría
const auditLogger = winston.createLogger({
  levels: { audit: 0 },
  level: 'audit',
  format: auditFormat,
  transports: [
    auditFileTransport,
    new PrismaTransport({ level: 'audit' }),
  ],
});

// Crear directorio de logs si no existe
import fs from 'fs';
import path from 'path';

const logsDir = path.join(__dirname);
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export { logger, auditLogger };
