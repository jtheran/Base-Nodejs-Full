import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { xss } from 'express-xss-sanitizer';
import { logger } from './logs/logger.js';
import hpp from 'hpp';
import http from 'http';
import config from './config/config.js';
import { auditMiddleware } from './middlewares/audit.middleware.js';
import authRoutes from './routes/auth.routes.js';
import auditRoutes from './routes/audit.routes.js';

// ==========================================
// INICIALIZACIONES
// ==========================================
const app = express();
const server = http.createServer(app);

// ==========================================
// MIDDLEWARES DE SEGURIDAD
// ==========================================

// Helmet - Seguridad de headers
app.use(helmet({
  contentSecurityPolicy: config.security.helmet.contentSecurityPolicy,
  hsts: config.security.helmet.hsts,
}));

// CORS
app.use(cors(config.security.cors));

// Compresión
app.use(compression());

// Body parsers
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Sanitización
app.use(xss()); // XSS protection
app.use(hpp()); // Parameter pollution protection
app.use(auditMiddleware);
// ==========================================
// RUTAS BASE
// ==========================================

// Health check
app.get(`${config.app.apiPrefix}/${config.app.apiVersion}/health`, (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: '🚀 Backend Base API Active',
    timestamp: new Date().toISOString(),
    environment: config.app.env,
    version: process.env.npm_package_version || '1.0.0',
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: '🚀 Backend Base API',
    version: process.env.npm_package_version || '1.0.0',
    environment: config.app.env,
    documentation: `${config.app.appUrl}/api-docs`,
    status: 'active',
  });
});

// ==========================================
// RUTAS DE LA API
// ==========================================
app.use(`${config.app.apiPrefix}/${config.app.apiVersion}/auth`, authRoutes);
app.use(`${config.app.apiPrefix}/${config.app.apiVersion}/logs`, auditRoutes);

// ==========================================
// MANEJO DE ERRORES GLOBAL
// ==========================================

app.use((error, req, res, next) => {
  logger.error('Error global no manejado', {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id
  });

  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    ...(config.app.isDevelopment && { stack: error.stack }),
  });
});

export default server;