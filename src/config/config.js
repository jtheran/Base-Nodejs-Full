import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
const templatePath = path.resolve('templates');

const config = {
  // ==========================================
  // CONFIGURACIÓN BASE
  // ==========================================
  app: {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    appUrl: process.env.APPURL || 'localhost',
    apiVersion: process.env.API_VERSION || 'v1',
    apiPrefix: process.env.API_PREFIX || '/api',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    isTest: process.env.NODE_ENV === 'test',
  },

  admin: {
    email: process.env.EMAIL_ADMIN || 'qa@lsv-tech.com',
    pass: process.env.PASS_ADMIN || 'Testing24!',
    name: process.env.NAME_ADMIN || 'Admin-NodeJS',
  },

  // ==========================================
  // AUTENTICACIÓN & JWT
  // ==========================================
  auth: {
    jwt: {
      secret: process.env.JWT_SECRET || 'zaqwer',
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      issuer: process.env.APP_URL || 'backend-base',
      audience: process.env.CLIENT_URL || 'http://localhost:3001',
    },
    refreshToken: {
      secret: process.env.JWT_REFRESH_SECRET || 'qwerty',
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    bcryptRounds: 12,
  },

  // ==========================================
  // REDIS - CACHE & COLAS
  // ==========================================
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || null,
    username: process.env.REDIS_USERNAME || null,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    keyPrefix: 'backend_base:',
    ttl: 3600, // 1 hora en segundos
  },

  // ==========================================
  // EMAIL - NODEMAILER
  // ==========================================
  email: {
    smtp: {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    },
    defaults: {
        name: process.env.EMAIL_FROM_NAME || 'Backend Base',
        address: process.env.EMAIL_FROM || 'no-reply@tuempresa.com',
    },
    templates: {
      path: `${templatePath}/emails`,
    },
  },

  // ==========================================
  // SEGURIDAD AVANZADA
  // ==========================================
  security: {
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3001'],
      credentials: process.env.CORS_CREDENTIALS === 'true',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    },
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutos
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
      skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS === 'true',
    },
    helmet: {
      contentSecurityPolicy: process.env.CONTENT_SECURITY_POLICY !== 'false',
      hsts: {
        maxAge: parseInt(process.env.HSTS_MAX_AGE, 10) || 31536000,
        includeSubDomains: true,
        preload: true,
      },
    },
  },

  // ==========================================
  // LOGGING & MONITORING
  // ==========================================
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: {
      enabled: process.env.LOG_FILE_ENABLED === 'true',
      path: process.env.LOG_FILE_PATH || 'logs',
      maxSize: process.env.LOG_FILE_MAX_SIZE || '10m',
      maxFiles: process.env.LOG_FILE_MAX_FILES || '14d',
    },
    console: {
      enabled: true,
      colorize: process.env.NODE_ENV !== 'production',
    },
  },

  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    username: process.env.MONITORING_USER || 'admin',
    password: process.env.MONITORING_PASSWORD || 'monitor',
    path: '/status',
  },


  // ==========================================
  // UPLOAD & FILES
  // ==========================================
  upload: {
    maxFileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE, 10) || 10 * 1024 * 1024, // 10MB
    allowedExtensions: process.env.UPLOAD_ALLOWED_EXTENSIONS 
      ? process.env.UPLOAD_ALLOWED_EXTENSIONS.split(',') 
      : ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
    path: process.env.UPLOAD_PATH || './public/uploads',
  },

  // ==========================================
  // FEATURE TOGGLES
  // ==========================================
  features: {
    audit: process.env.FEATURE_AUDIT_ENABLED === 'true',
    cache: process.env.FEATURE_CACHE_ENABLED === 'true',
    queue: process.env.FEATURE_QUEUE_ENABLED === 'true',
    email: process.env.FEATURE_EMAIL_ENABLED === 'true',
    websocket: process.env.FEATURE_WEBSOCKET_ENABLED === 'true',
  },
};

export default config;