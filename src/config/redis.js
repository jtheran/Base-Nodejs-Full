import config from '../config/config.js';

const redisConfig = {
    // Configuración básica de conexión
    host: config.redis.host,
    port: parseInt(config.redis.port),
    password: config.redis.password,
    username: config.redis.username,
    db: config.redis.db,

    // Configuración de rendimiento
    connectTimeout: 10000,
    lazyConnect: false,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,

    // Cluster mode (si usas clúster)
    cluster: process.env.REDIS_CLUSTER === 'true' || false,
    clusterNodes: process.env.REDIS_CLUSTER_NODES 
        ? JSON.parse(process.env.REDIS_CLUSTER_NODES) 
        : null,
    // Configuración de reconnect
    retryStrategy: (times) => {
      if (times > 5) {
        console.log('❌ Demasiados intentos de reconexión a Redis');
        return null;
      }
      return Math.min(times * 200, 5000);
    },

    // Prefijo para todas las keys
    keyPrefix: config.redis.keyPrefix || 'backend_base:',

    // Tiempos de expiración por defecto (en segundos)
    defaultTTL: {
      SHORT: parseInt(process.env.CACHE_TTL_SHORT) || 300,      // 5 minutos
      MEDIUM: parseInt(process.env.CACHE_TTL_MEDIUM) || 3600,   // 1 hora
      LONG: parseInt(process.env.CACHE_TTL_LONG) || 86400,      // 24 horas
      VERY_LONG: parseInt(process.env.CACHE_TTL_VERY_LONG) || 604800 // 7 días
    }
};

// Validar configuración
if (!redisConfig.host) {
  console.warn('⚠️  REDIS_HOST no configurado, usando localhost');
}

export default redisConfig;