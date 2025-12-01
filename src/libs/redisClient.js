// src/utils/redisClient.js
import Redis from 'ioredis';
import redisConfig from '../config/redis.js';
import { logger } from '../logs/logger.js';

class RedisClient {
  constructor() {
    if (RedisClient.instance) {
      return RedisClient.instance;
    }

    this.client = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 3;
    
    this.init();
    RedisClient.instance = this;
  }

  /**
   * Inicializar el cliente Redis
   */
  init() {
    try {
      // Configuración para Redis
      logger.debug('🚀 Iniciando conexión Redis...', {
        host: redisConfig.host,
        port: redisConfig.port,
        db: redisConfig.db
      });

      const options = {
        host: redisConfig.host,
        port: redisConfig.port,
        username: redisConfig.username,
        password: redisConfig.password,
        db: redisConfig.db,
        retryDelayOnFailover: redisConfig.retryDelayOnFailover,
        maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
        lazyConnect: redisConfig.lazyConnect,
        connectTimeout: redisConfig.connectTimeout,
        enableReadyCheck: redisConfig.enableReadyCheck,
        keyPrefix: redisConfig.keyPrefix,
        
        // Estrategia de reintento personalizada
        retryStrategy: (times) => {
          this.connectionAttempts = times;
          console.log(`🔄 Intento ${times} de conexión a Redis...`);
          
          if (times > this.maxConnectionAttempts) {
            logger.error('❌ Demasiados intentos de conexión a Redis', {
              attempts: times,
              host: redisConfig.host,
              port: redisConfig.port
            });
            return null; // Detener reintentos
          }
          
          const delay = Math.min(times * 100, 3000);
          logger.warn(`🔄 Reintentando conexión a Redis (intento ${times})`, {
            delay,
            host: redisConfig.host
          });
          
          return delay;
        }
      };

      // Crear cliente Redis
      this.client = new Redis(options);

      // Configurar event listeners
      this.setupEventListeners();

      // Forzar conexión inmediata
      this.connect();

      logger.info('🔄 Inicializando cliente Redis...', {
        host: redisConfig.host,
        port: redisConfig.port,
        db: redisConfig.db
      });

    } catch (error) {
      logger.error('❌ Error inicializando Redis client', {
        error: error.message,
        host: redisConfig.host,
        port: redisConfig.port
      });
      throw error;
    }
  }

  /**
   * Configurar listeners de eventos Redis
   */
  setupEventListeners() {
    // Evento: Conexión exitosa
    this.client.on('connect', () => {
      this.isConnected = true;
      this.connectionAttempts = 0;
      logger.info('✅ Conectado a Redis', {
        host: redisConfig.host,
        port: redisConfig.port,
        db: redisConfig.db
      });
    });

    // Evento: Listo para usar
    this.client.on('ready', () => {
      logger.info('🚀 Redis listo para recibir comandos');
    });

    // Evento: Error de conexión
    this.client.on('error', (error) => {
      this.isConnected = false;
      logger.error('❌ Error de Redis', {
        error: error.message,
        code: error.code,
        host: redisConfig.host,
        port: redisConfig.port
      });
    });

    // Evento: Conexión cerrada
    this.client.on('close', () => {
      this.isConnected = false;
      logger.warn('🔌 Conexión a Redis cerrada');
    });

    // Evento: Reconectando
    this.client.on('reconnecting', (delay) => {
      logger.warn('🔄 Reconectando a Redis', {
        delay,
        attempt: this.connectionAttempts + 1
      });
    });

    // Evento: Fin de reconexión
    this.client.on('end', () => {
      this.isConnected = false;
      logger.warn('🔚 Conexión a Redis finalizada');
    });

    // Evento: Monitoreo de comandos (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      this.client.on('monitor', (time, args, source, database) => {
        logger.debug('📊 Comando Redis ejecutado', {
          command: args[0],
          arguments: args.slice(1),
          database,
          executionTime: time
        });
      });
    }
  }

  /**
   * Obtener el cliente Redis
   */
  getClient() {
    if (!this.client) {
      throw new Error('Redis client no ha sido inicializado');
    }
    
    if (!this.isConnected) {
      throw new Error('Redis client no está conectado');
    }
    
    return this.client;
  }

  /**
   * Verificar si Redis está conectado y listo
   */
  isReady() {
    return this.isConnected && this.client && this.client.status === 'ready';
  }

  /**
   * Verificar estado de conexión
   */
  getStatus() {
    if (!this.client) {
      return 'not_initialized';
    }
    
    return {
      status: this.client.status,
      connected: this.isConnected,
      ready: this.isReady(),
      host: redisConfig.host,
      port: redisConfig.port,
      attempts: this.connectionAttempts
    };
  }

  /**
   * Conectar manualmente (útil para lazyConnect)
   */
  async connect() {
    try {
      if (!this.client) {
        throw new Error('Redis client no inicializado');
      }
      
      if (this.isConnected) {
        logger.debug('Redis ya está conectado');
        return true;
      }
      
      await this.client.connect();
      return true;
      
    } catch (error) {
      logger.error('Error conectando a Redis', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Desconectar de Redis
   */
  async disconnect() {
    try {
      if (this.client) {
        await this.client.quit();
        this.isConnected = false;
        logger.info('🔌 Desconectado de Redis correctamente');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error desconectando de Redis', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Forzar desconexión (sin esperar comandos pendientes)
   */
  async forceDisconnect() {
    try {
      if (this.client) {
        this.client.disconnect();
        this.isConnected = false;
        logger.warn('🔌 Desconexión forzada de Redis');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('Error en desconexión forzada de Redis', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Health check de Redis
   */
  async healthCheck() {
    try {
      if (!this.isReady()) {
        return {
          status: 'down',
          message: 'Redis no está conectado',
          details: this.getStatus()
        };
      }

      // Test básico de ping
      const startTime = Date.now();
      await this.client.ping();
      const responseTime = Date.now() - startTime;

      // Obtener información básica
      const info = await this.client.info();
      const keysCount = await this.client.dbsize();

      return {
        status: 'healthy',
        message: 'Redis está funcionando correctamente',
        responseTime: `${responseTime}ms`,
        keysCount,
        version: info.split('\r\n').find(line => line.startsWith('redis_version:'))?.split(':')[1] || 'unknown',
        uptime: info.split('\r\n').find(line => line.startsWith('uptime_in_seconds:'))?.split(':')[1] || 'unknown',
        connectedClients: info.split('\r\n').find(line => line.startsWith('connected_clients:'))?.split(':')[1] || 'unknown',
        memoryUsage: info.split('\r\n').find(line => line.startsWith('used_memory_human:'))?.split(':')[1] || 'unknown'
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Error en health check de Redis',
        error: error.message,
        details: this.getStatus()
      };
    }
  }

  /**
   * Ejecutar comando personalizado (útil para debugging)
   */
  async executeCommand(command, ...args) {
    try {
      if (!this.isReady()) {
        throw new Error('Redis no está disponible');
      }

      const result = await this.client[command](...args);
      
      logger.debug('🔧 Comando Redis ejecutado', {
        command,
        args,
        result: typeof result === 'object' ? JSON.stringify(result).substring(0, 100) : result
      });
      
      return result;

    } catch (error) {
      logger.error('Error ejecutando comando Redis', {
        command,
        args,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Limpiar toda la cache (¡PELIGROSO! Solo para desarrollo)
   */
  async flushAll() {
    try {
      if (!this.isReady()) {
        throw new Error('Redis no está disponible');
      }

      await this.client.flushall();
      logger.warn('🗑️  Toda la cache de Redis ha sido limpiada');
      return true;

    } catch (error) {
      logger.error('Error limpiando cache de Redis', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Limpiar base de datos específica
   */
  async flushDb(dbIndex = null) {
    try {
      if (!this.isReady()) {
        throw new Error('Redis no está disponible');
      }

      const targetDb = dbIndex !== null ? dbIndex : redisConfig.db;
      
      // Cambiar a la base de datos objetivo si es necesario
      if (dbIndex !== null) {
        await this.client.select(dbIndex);
      }
      
      await this.client.flushdb();
      
      // Volver a la base de datos original si cambiamos
      if (dbIndex !== null) {
        await this.client.select(redisConfig.db);
      }

      logger.warn('🗑️  Base de datos Redis limpiada', {
        database: targetDb
      });
      return true;

    } catch (error) {
      logger.error('Error limpiando base de datos Redis', {
        database: dbIndex,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Obtener estadísticas detalladas
   */
  async getDetailedStats() {
    try {
      if (!this.isReady()) {
        throw new Error('Redis no está disponible');
      }

      const [info, slowlog, config] = await Promise.all([
        this.client.info(),
        this.client.slowlog('get', 10), // Últimos 10 comandos lentos
        this.client.config('GET', '*')
      ]);

      return {
        basic: await this.healthCheck(),
        slowCommands: slowlog,
        configuration: config,
        detailedInfo: this.parseRedisInfo(info)
      };

    } catch (error) {
      logger.error('Error obteniendo estadísticas detalladas de Redis', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Parsear información de Redis
   */
  parseRedisInfo(infoString) {
    const lines = infoString.split('\r\n');
    const sections = {};
    let currentSection = '';

    lines.forEach(line => {
      if (line.startsWith('#')) {
        currentSection = line.replace('# ', '').toLowerCase();
        sections[currentSection] = {};
      } else if (line.includes(':')) {
        const [key, value] = line.split(':');
        if (currentSection && sections[currentSection]) {
          sections[currentSection][key] = value;
        }
      }
    });

    return sections;
  }
}

// Crear instancia singleton
const redisClient = new RedisClient();

export default redisClient;