// src/middleware/audit.js
import { auditLogger } from '../logs/logger.js';
import constants from '../config/constants.js';

/**
 * Middleware para auditoría automática de requests HTTP
 */
export const auditMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Capturar información de la request
  const auditInfo = {
    method: req.method,
    url: req.originalUrl,
    userIp: getClientIp(req),
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    userEmail: req.user?.email,
  };

  // Función para registrar la respuesta
  const logResponse = () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Determinar nivel y acción basado en el método HTTP y status code
    let level = 'info';
    let action = getActionFromMethod(req.method);
    
    if (statusCode >= 400) {
      level = statusCode >= 500 ? 'error' : 'warn';
    }

    // Determinar entidad desde la URL
    const entity = getEntityFromUrl(req.originalUrl);

    auditLogger.log('audit', {
      message: `HTTP ${req.method} ${req.originalUrl} - ${statusCode} - ${duration}ms`,
      level,
      action,
      entity,
      entityId: getEntityIdFromUrl(req.originalUrl),
      userId: req.user?.id,
      userIp: auditInfo.userIp,
      userAgent: auditInfo.userAgent,
      metadata: {
        method: req.method,
        url: req.originalUrl,
        statusCode,
        duration: `${duration}ms`,
        userAgent: auditInfo.userAgent,
        user: req.user ? {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role
        } : undefined
      }
    });
  };

  // Registrar cuando la response termina
  res.on('finish', logResponse);
  res.on('close', logResponse);

  next();
};

/**
 * Middleware para auditoría de acciones específicas
 */
export const auditAction = (action, entity, getEntityId = null) => {
  return (req, res, next) => {
    const auditData = {
      action,
      entity,
      entityId: getEntityId ? getEntityId(req) : getEntityIdFromUrl(req.originalUrl),
      userId: req.user?.id,
      userIp: getClientIp(req),
      userAgent: req.get('User-Agent'),
      metadata: {
        body: sanitizeBody(req.body),
        params: req.params,
        query: req.query,
        user: req.user ? {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role
        } : undefined
      }
    };

    // Registrar la acción de auditoría
    auditLogger.log('audit', {
      message: `${action} action on ${entity}`,
      ...auditData
    });

    next();
  };
};

/**
 * Función helper para obtener IP del cliente
 */
function getClientIp(req) {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         'unknown';
}

/**
 * Función helper para obtener acción desde método HTTP
 */
function getActionFromMethod(method) {
  const methodMap = {
    'GET': 'READ',
    'POST': 'CREATE',
    'PUT': 'UPDATE',
    'PATCH': 'UPDATE',
    'DELETE': 'DELETE'
  };
  return methodMap[method] || 'ACCESS';
}

/**
 * Función helper para obtener entidad desde URL
 */
function getEntityFromUrl(url) {
  const segments = url.split('/').filter(segment => segment);
  
  // Buscar entidades conocidas en la URL
  for (const segment of segments) {
    const entity = Object.values(constants.AUDIT_ENTITIES).find(
      e => e.toLowerCase() === segment.toLowerCase()
    );
    if (entity) return entity;
  }
  
  // Fallback: usar el primer segmento después de api/version
  const apiIndex = segments.indexOf('api');
  if (apiIndex !== -1 && segments[apiIndex + 2]) {
    return segments[apiIndex + 2].toUpperCase();
  }
  
  return 'UNKNOWN';
}

/**
 * Función helper para obtener entityId desde URL
 */
function getEntityIdFromUrl(url) {
  const segments = url.split('/').filter(segment => segment);
  
  // Asumir que el último segmento es un ID si parece serlo
  const lastSegment = segments[segments.length - 1];
  if (lastSegment && /^[0-9a-fA-F-]+$/.test(lastSegment) && lastSegment.length > 5) {
    return lastSegment;
  }
  
  return null;
}

/**
 * Sanitizar body para evitar guardar información sensible
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'refreshToken', 'authorization', 'secret'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });
  
  return sanitized;
}

export default {
  auditMiddleware,
  auditAction
};