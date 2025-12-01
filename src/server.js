import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { xss } from 'express-xss-sanitizer';
import { logger } from './logs/logger.js';
import hpp from 'hpp';
import http from 'http';
import config from './config/config.js';
import { getServerMetrics } from './utils/metrics.js';
import { auditMiddleware } from './middlewares/audit.middleware.js';
import { requireAdmin } from './middlewares/permission.middleware.js';
import { authenticateJWT } from './middlewares/auth.middleware.js';
import authRoutes from './routes/auth.routes.js';
import auditRoutes from './routes/audit.routes.js';
import userRoutes from './routes/user.routes.js';

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
app.get(`${config.app.apiPrefix}/${config.app.apiVersion}/system/health`, authenticateJWT, requireAdmin, (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: '🚀 Backend Base API Active',
    timestamp: new Date().toISOString(),
    environment: config.app.env,
    version: process.env.npm_package_version || '1.0.0',
  });
});

app.get(`${config.app.apiPrefix}/${config.app.apiVersion}/system/status`, authenticateJWT, requireAdmin, getServerMetrics);


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
app.use(`${config.app.apiPrefix}/${config.app.apiVersion}/data`, userRoutes);

// ==========================================
// MANEJO DE ERRORES GLOBAL
// ==========================================

app.use((err, req, res, next) => {
  logger.error('Error global no manejado', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    userId: req.user?.id
  });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    err: message,
    ...(config.app.isDevelopment && { stack: err.stack }),
  });
});

export default server;