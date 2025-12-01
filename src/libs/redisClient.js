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
        
        this.validateConfig();
        this.init();
        RedisClient.instance = this;
    }

    /**
     * Validar configuración antes de inicializar
     */
    validateConfig() {
        logger.debug('🔍 Validando configuración Redis...', {
            host: redisConfig.host,
            port: redisConfig.port,
            portType: typeof redisConfig.port,
            db: redisConfig.db
        });

        // Validar que port sea un número
        if (!redisConfig.port || isNaN(redisConfig.port)) {
            throw new Error(`Puerto Redis inválido: ${redisConfig.port}. Debe ser un número.`);
        }

        // Validar rango del puerto
        if (redisConfig.port < 1 || redisConfig.port > 65535) {
            throw new Error(`Puerto Redis fuera de rango: ${redisConfig.port}. Debe estar entre 1 y 65535.`);
        }

        // Validar host
        if (!redisConfig.host || typeof redisConfig.host !== 'string') {
            throw new Error(`Host Redis inválido: ${redisConfig.host}`);
        }

        logger.info('✅ Configuración Redis validada correctamente');
    }

    /**
     * Inicializar el cliente Redis
     */
    init() {
        try {
            logger.info('🚀 Inicializando cliente Redis...', {
                host: redisConfig.host,
                port: redisConfig.port,
                db: redisConfig.db,
                cluster: redisConfig.cluster
            });

            let options = {};

            // Configuración diferente para clúster vs standalone
            if (redisConfig.cluster && redisConfig.clusterNodes) {
                logger.info('🔄 Configurando Redis en modo CLUSTER');
                options = {
                    redisOptions: {
                        host: redisConfig.host,
                        port: redisConfig.port,
                        username: redisConfig.username,
                        password: redisConfig.password,
                        db: redisConfig.db,
                        connectTimeout: redisConfig.connectTimeout,
                        enableReadyCheck: redisConfig.enableReadyCheck,
                        keyPrefix: redisConfig.keyPrefix
                    },
                    clusters: redisConfig.clusterNodes,
                    retryDelayOnFailover: redisConfig.retryDelayOnFailover,
                    maxRetriesPerRequest: redisConfig.maxRetriesPerRequest
                };
                this.client = new Redis.Cluster(options.clusters, options.redisOptions);
            } else {
                logger.info('🔄 Configurando Redis en modo STANDALONE');
                options = {
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
                    enableAutoPipelining: true,
                    maxLoadingRetryTime: 10000
                };

                // ¡ESTO ES CRÍTICO! Asegurar que port sea número
                options.port = Number(redisConfig.port);
                options.db = Number(redisConfig.db);

                this.client = new Redis(options);
            }

            this.setupEventListeners();

            if (!redisConfig.lazyConnect) {
                this.connect();
            }

        } catch (error) {
            logger.error('❌ Error FATAL inicializando Redis client', {
                error: error.message,
                stack: error.stack,
                host: redisConfig.host,
                port: redisConfig.port,
                config: {
                    portType: typeof redisConfig.port,
                    portValue: redisConfig.port,
                    dbType: typeof redisConfig.db,
                    dbValue: redisConfig.db
                }
            });
            
            // No lanzar error si Redis no es crítico
            if (process.env.REDIS_CRITICAL === 'true') {
                throw error;
            }
            
            // En modo no crítico, crear cliente dummy
            this.createDummyClient();
        }
    }

    /**
     * Crear cliente dummy para cuando Redis no está disponible
     */
    createDummyClient() {
        logger.warn('⚠️ Creando cliente Redis dummy (sin conexión real)');
        
        this.client = {
            status: 'dummy',
            connected: false,
            
            // Métodos dummy que simulan Redis
            get: async (key) => {
                logger.debug('Dummy Redis GET', { key });
                return null;
            },
            
            set: async (key, value, ...args) => {
                logger.debug('Dummy Redis SET', { key, value: typeof value });
                return 'OK';
            },
            
            ping: async () => {
                return 'PONG (dummy)';
            },
            
            quit: async () => {
                return true;
            },
            
            disconnect: () => {
                return true;
            }
        };
        
        this.isConnected = false;
    }

    /**
     * Configurar listeners de eventos Redis
     */
    setupEventListeners() {
        this.client.on('connect', () => {
            this.isConnected = true;
            this.connectionAttempts = 0;
            logger.info('✅ Conectado a Redis', {
                host: redisConfig.host,
                port: redisConfig.port,
                db: redisConfig.db,
                status: this.client.status
            });
        });

        this.client.on('ready', () => {
            logger.info('🎯 Redis listo para recibir comandos', {
                status: this.client.status,
                host: redisConfig.host
            });
        });

        this.client.on('error', (error) => {
            this.isConnected = false;
            
            // No loguear errores de conexión dummy
            if (this.client.status !== 'dummy') {
                logger.error('❌ Error de Redis', {
                    error: error.message,
                    code: error.code,
                    host: redisConfig.host,
                    port: redisConfig.port
                });
            }
        });

        this.client.on('close', () => {
            this.isConnected = false;
            logger.warn('🔌 Conexión a Redis cerrada');
        });

        this.client.on('reconnecting', (delay) => {
            logger.warn('🔄 Reconectando a Redis', {
                delay,
                attempt: this.connectionAttempts + 1,
                host: redisConfig.host
            });
        });

        this.client.on('end', () => {
            this.isConnected = false;
            logger.warn('🔚 Conexión a Redis finalizada');
        });

        // Debug en desarrollo
        if (process.env.NODE_ENV === 'development' && this.client.monitor) {
            this.client.on('monitor', (time, args, source, database) => {
                if (args[0] !== 'ping') { // Filtrar pings frecuentes
                    logger.debug('📊 Comando Redis', {
                        command: args[0],
                        args: args.slice(1),
                        database,
                        time
                    });
                }
            });
        }
    }

    /**
     * Conectar manualmente
     */
    async connect() {
        try {
            if (this.client.status === 'dummy') {
                logger.warn('⚠️ Cliente Redis dummy - no se puede conectar');
                return false;
            }

            if (this.isConnected) {
                logger.debug('Redis ya está conectado');
                return true;
            }

            logger.info('🔗 Conectando a Redis...', {
                host: redisConfig.host,
                port: redisConfig.port
            });

            // Para ioredis, no necesitamos connect() explícito si no usamos lazyConnect
            // Simplemente verificar conexión
            await this.client.ping();
            
            this.isConnected = true;
            logger.info('✅ Conexión Redis verificada');
            
            return true;
            
        } catch (error) {
            logger.error('❌ Error verificando conexión Redis', {
                error: error.message,
                host: redisConfig.host,
                port: redisConfig.port
            });
            
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Método helper para pruebas
     */
    async testConnection() {
        try {
            const startTime = Date.now();
            const pong = await this.client.ping();
            const responseTime = Date.now() - startTime;
            
            logger.info('🧪 Test de conexión Redis exitoso', {
                response: pong,
                responseTime: `${responseTime}ms`,
                host: redisConfig.host,
                port: redisConfig.port
            });
            
            return {
                success: true,
                responseTime,
                message: `Redis responde correctamente en ${responseTime}ms`
            };
            
        } catch (error) {
            logger.error('🧪 Test de conexión Redis fallido', {
                error: error.message,
                host: redisConfig.host,
                port: redisConfig.port
            });
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    // ... el resto de tus métodos permanecen igual ...
    getClient() { return this.client; }
    isReady() { return this.isConnected && this.client.status === 'ready'; }
    
    getStatus() {
        return {
            status: this.client?.status || 'not_initialized',
            connected: this.isConnected,
            ready: this.isReady(),
            host: redisConfig.host,
            port: redisConfig.port,
            db: redisConfig.db,
            attempts: this.connectionAttempts,
            isDummy: this.client?.status === 'dummy'
        };
    }
    
    async healthCheck() {
        if (this.client?.status === 'dummy') {
            return {
                status: 'dummy',
                message: 'Redis en modo dummy (sin conexión real)',
                warning: 'Redis no está disponible, usando cliente simulado'
            };
        }
        
        // Resto del código de healthCheck...
        // ... (mantén tu implementación actual)
    }
    
    // ... resto de métodos sin cambios ...
}

// Crear instancia singleton
const redisClient = new RedisClient();

// Auto-test al iniciar (opcional)
if (process.env.NODE_ENV !== 'test') {
    setTimeout(async () => {
        try {
            await redisClient.testConnection();
        } catch (error) {
            // Silencioso en producción
            if (process.env.NODE_ENV === 'development') {
                console.warn('Redis auto-test fallido:', error.message);
            }
        }
    }, 2000);
}

export default redisClient;