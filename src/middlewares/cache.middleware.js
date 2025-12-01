// src/middleware/routeCache.js
import CacheService from '../services/cacheService.js';
import { logger } from '../config/logger.js';

/**
 * Middleware para cache de respuestas HTTP a nivel de ruta
 */
export const routeCache = (ttl = 300, customKey = null) => {
  return async (req, res, next) => {
    // Solo cachear métodos GET
    if (req.method !== 'GET') {
      return next();
    }

    // No cachear si hay usuario autenticado (datos personalizados)
    if (req.user) {
      return next();
    }

    const cacheKey = customKey 
      ? customKey 
      : `route:${req.method}:${req.originalUrl}`;

    try {
      // Intentar obtener de cache
      const cachedResponse = await CacheService.get(cacheKey);
      
      if (cachedResponse) {
        logger.debug('Respuesta de ruta obtenida de cache', {
          route: req.originalUrl,
          cacheKey
        });

        return res.json(cachedResponse);
      }

      // Interceptar la respuesta
      const originalJson = res.json;
      
      res.json = function(data) {
        // Restaurar método original
        res.json = originalJson;

        // Solo cachear respuestas exitosas
        if (res.statusCode >= 200 && res.statusCode < 300) {
          CacheService.set(cacheKey, data, ttl)
            .then(() => {
              logger.debug('Respuesta de ruta guardada en cache', {
                route: req.originalUrl,
                cacheKey,
                ttl
              });
            })
            .catch(error => {
              logger.error('Error guardando respuesta en cache', {
                route: req.originalUrl,
                error: error.message
              });
            });
        }

        return originalJson.call(this, data);
      };

      next();

    } catch (error) {
      logger.error('Error en middleware de cache de ruta', {
        route: req.originalUrl,
        error: error.message
      });
      next();
    }
  };
};

/**
 * Middleware para invalidar cache de rutas específicas
 */
export const invalidateRouteCache = (patterns = []) => {
  return async (req, res, next) => {
    const originalSend = res.send;

    res.send = async function(data) {
      res.send = originalSend;

      try {
        // Invalidar cache en métodos que modifican datos
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            for (const pattern of patterns) {
              const deletedCount = await CacheService.deleteByPattern(pattern);
              
              if (deletedCount > 0) {
                logger.debug('Cache de ruta invalidada', {
                  pattern,
                  deleted: deletedCount,
                  route: req.originalUrl
                });
              }
            }

            // Invalidar también la ruta específica
            const routeKey = `route:GET:${req.baseUrl}/*`;
            await CacheService.deleteByPattern(routeKey);
          }
        }
      } catch (error) {
        logger.error('Error invalidando cache de ruta', {
          patterns,
          error: error.message
        });
      }

      return originalSend.call(this, data);
    };

    next();
  };
};