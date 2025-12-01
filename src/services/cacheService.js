// src/services/cacheService.js
import redisClient from '../libs/redisClient.js';
import { logger } from '../logs/logger.js';
import redisConfig from '../config/redis.js';

class CacheService {
  /**
   * Obtener valor de cache
   */
  static async get(key) {
    try {
      if (!redisClient.isReady()) {
        logger.debug('Redis no disponible, omitiendo cache', { key });
        return null;
      }

      const client = redisClient.getClient();
      const value = await client.get(key);

      if (value) {
        logger.debug('✅ Cache HIT', { key });
        
        try {
          // Intentar parsear como JSON, si falla devolver como string
          return JSON.parse(value);
        } catch {
          return value;
        }
      }

      logger.debug('❌ Cache MISS', { key });
      return null;

    } catch (error) {
      logger.error('Error obteniendo de cache', {
        key,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Guardar valor en cache
   */
  static async set(key, value, ttl = null) {
    try {
      if (!redisClient.isReady()) {
        logger.debug('Redis no disponible, omitiendo guardado en cache', { key });
        return false;
      }

      const client = redisClient.getClient();
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
      const actualTTL = ttl || redisConfig.defaultTTL.MEDIUM;

      if (actualTTL > 0) {
        await client.setex(key, actualTTL, stringValue);
      } else {
        await client.set(key, stringValue);
      }

      logger.debug('💾 Guardado en cache', {
        key,
        ttl: actualTTL
      });

      return true;

    } catch (error) {
      logger.error('Error guardando en cache', {
        key,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Eliminar clave de cache
   */
  static async delete(key) {
    try {
      if (!redisClient.isReady()) {
        return false;
      }

      const client = redisClient.getClient();
      const result = await client.del(key);

      logger.debug('🗑️  Eliminado de cache', { key, deleted: result > 0 });
      return result > 0;

    } catch (error) {
      logger.error('Error eliminando de cache', {
        key,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Eliminar múltiples claves por patrón
   */
  static async deleteByPattern(pattern) {
    try {
      if (!redisClient.isReady()) {
        return 0;
      }

      const client = redisClient.getClient();
      const keys = await client.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      const deletedCount = await client.del(...keys);
      
      logger.debug('🗑️  Eliminado por patrón', {
        pattern,
        keys: keys.length,
        deleted: deletedCount
      });

      return deletedCount;

    } catch (error) {
      logger.error('Error eliminando por patrón', {
        pattern,
        error: error.message
      });
      return 0;
    }
  }

  /**
   * Obtener múltiples valores
   */
  static async mget(keys) {
    try {
      if (!redisClient.isReady()) {
        return keys.map(() => null);
      }

      const client = redisClient.getClient();
      const values = await client.mget(...keys);

      return values.map(value => {
        if (!value) return null;
        
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      });

    } catch (error) {
      logger.error('Error en mget', {
        keys,
        error: error.message
      });
      return keys.map(() => null);
    }
  }

  /**
   * Guardar múltiples valores
   */
  static async mset(keyValuePairs, ttl = null) {
    try {
      if (!redisClient.isReady()) {
        return false;
      }

      const client = redisClient.getClient();
      const pipeline = client.pipeline();
      const actualTTL = ttl || redisConfig.defaultTTL.MEDIUM;

      for (const [key, value] of Object.entries(keyValuePairs)) {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        
        if (actualTTL > 0) {
          pipeline.setex(key, actualTTL, stringValue);
        } else {
          pipeline.set(key, stringValue);
        }
      }

      await pipeline.exec();
      
      logger.debug('💾 Múltiples guardados en cache', {
        keys: Object.keys(keyValuePairs).length,
        ttl: actualTTL
      });

      return true;

    } catch (error) {
      logger.error('Error en mset', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Incrementar valor
   */
  static async increment(key, by = 1) {
    try {
      if (!redisClient.isReady()) {
        return null;
      }

      const client = redisClient.getClient();
      const result = await client.incrby(key, by);

      logger.debug('🔢 Incrementado valor en cache', { key, by, result });
      return result;

    } catch (error) {
      logger.error('Error incrementando valor', {
        key,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Decrementar valor
   */
  static async decrement(key, by = 1) {
    try {
      if (!redisClient.isReady()) {
        return null;
      }

      const client = redisClient.getClient();
      const result = await client.decrby(key, by);

      logger.debug('🔽 Decrementado valor en cache', { key, by, result });
      return result;

    } catch (error) {
      logger.error('Error decrementando valor', {
        key,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Obtener tiempo de expiración
   */
  static async getTTL(key) {
    try {
      if (!redisClient.isReady()) {
        return -2;
      }

      const client = redisClient.getClient();
      return await client.ttl(key);

    } catch (error) {
      logger.error('Error obteniendo TTL', {
        key,
        error: error.message
      });
      return -2;
    }
  }

  /**
   * Establecer tiempo de expiración
   */
  static async expire(key, ttl) {
    try {
      if (!redisClient.isReady()) {
        return false;
      }

      const client = redisClient.getClient();
      const result = await client.expire(key, ttl);

      logger.debug('⏰ TTL establecido', { key, ttl, result });
      return result;

    } catch (error) {
      logger.error('Error estableciendo TTL', {
        key,
        ttl,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Verificar si una clave existe
   */
  static async exists(key) {
    try {
      if (!redisClient.isReady()) {
        return false;
      }

      const client = redisClient.getClient();
      const result = await client.exists(key);

      return result === 1;

    } catch (error) {
      logger.error('Error verificando existencia', {
        key,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Obtener todas las claves por patrón
   */
  static async keys(pattern = '*') {
    try {
      if (!redisClient.isReady()) {
        return [];
      }

      const client = redisClient.getClient();
      return await client.keys(pattern);

    } catch (error) {
      logger.error('Error obteniendo claves', {
        pattern,
        error: error.message
      });
      return [];
    }
  }

  /**
   * Renombrar una clave
   */
  static async rename(oldKey, newKey) {
    try {
      if (!redisClient.isReady()) {
        return false;
      }

      const client = redisClient.getClient();
      await client.rename(oldKey, newKey);

      logger.debug('🏷️  Clave renombrada', { oldKey, newKey });
      return true;

    } catch (error) {
      logger.error('Error renombrando clave', {
        oldKey,
        newKey,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Obtener información de la cache
   */
  static async getCacheInfo() {
    try {
      if (!redisClient.isReady()) {
        return { 
          connected: false,
          message: 'Redis no está disponible'
        };
      }

      const client = redisClient.getClient();
      const [info, keysCount, memoryInfo] = await Promise.all([
        client.info(),
        client.dbsize(),
        client.info('memory')
      ]);

      // Parsear información de memoria
      const memoryLines = memoryInfo.split('\r\n');
      const memoryData = {};
      memoryLines.forEach(line => {
        const [key, value] = line.split(':');
        if (key && value) {
          memoryData[key] = value;
        }
      });

      // Parsear estadísticas
      const infoLines = info.split('\r\n');
      const stats = {};
      infoLines.forEach(line => {
        const [key, value] = line.split(':');
        if (key && value) {
          stats[key] = value;
        }
      });

      return {
        connected: true,
        keysCount,
        memory: {
          used: memoryData.used_memory,
          human: memoryData.used_memory_human,
          peak: memoryData.used_memory_peak,
          peak_human: memoryData.used_memory_peak_human
        },
        stats: {
          hits: stats.keyspace_hits,
          misses: stats.keyspace_misses,
          hitRate: stats.keyspace_hits && stats.keyspace_misses ? 
            (parseInt(stats.keyspace_hits) / (parseInt(stats.keyspace_hits) + parseInt(stats.keyspace_misses)) * 100).toFixed(2) + '%' : '0%'
        },
        clients: {
          connected: stats.connected_clients,
          blocked: stats.blocked_clients
        }
      };

    } catch (error) {
      logger.error('Error obteniendo info de cache', {
        error: error.message
      });
      return { 
        connected: false,
        error: error.message 
      };
    }
  }

  /**
   * Limpiar toda la cache (¡PELIGROSO! Solo para desarrollo)
   */
  static async flushAll() {
    try {
      if (!redisClient.isReady()) {
        return false;
      }

      const client = redisClient.getClient();
      await client.flushall();

      logger.warn('🗑️  Toda la cache ha sido limpiada');
      return true;

    } catch (error) {
      logger.error('Error limpiando cache', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Health check de Redis
   */
  static async healthCheck() {
    try {
      if (!redisClient.isReady()) {
        return {
          status: 'down',
          message: 'Redis no está conectado'
        };
      }

      const client = redisClient.getClient();
      await client.ping(); // Test básico de conexión

      const info = await this.getCacheInfo();

      return {
        status: 'healthy',
        message: 'Redis está funcionando correctamente',
        ...info
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Error en la conexión con Redis',
        error: error.message
      };
    }
  }
}

export default CacheService;