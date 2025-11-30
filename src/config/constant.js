// src/config/constants.js
const constants = {
  // Roles de usuario
  ROLES: {
    USER: 'USER',
    MODERATOR: 'MODERATOR', 
    ADMIN: 'ADMIN',
    SUPER_ADMIN: 'SUPER_ADMIN',
  },

  // Permisos de acceso
  PERMISSIONS: {
    // Usuarios
    USER_CREATE: 'user:create',
    USER_READ: 'user:read',
    USER_UPDATE: 'user:update',
    USER_DELETE: 'user:delete',
    
    // Roles
    ROLE_CREATE: 'role:create',
    ROLE_READ: 'role:read',
    ROLE_UPDATE: 'role:update',
    ROLE_DELETE: 'role:delete',
    
    // Auditoría
    AUDIT_READ: 'audit:read',
    
    // Sistema
    SYSTEM_MANAGE: 'system:manage',
  },

  // Estados de email
  EMAIL_STATUS: {
    PENDING: 'PENDING',
    SENT: 'SENT',
    FAILED: 'FAILED',
    DELIVERED: 'DELIVERED',
  },

  // Tipos de notificación
  NOTIFICATION_TYPES: {
    INFO: 'INFO',
    WARNING: 'WARNING',
    ERROR: 'ERROR',
    SUCCESS: 'SUCCESS',
  },

  // Colas de trabajo
  QUEUES: {
    EMAIL: 'email',
    NOTIFICATION: 'notification',
    REPORT: 'report',
    CLEANUP: 'cleanup',
  },

  // Eventos WebSocket
  SOCKET_EVENTS: {
    NOTIFICATION: 'notification',
    USER_STATUS: 'user_status',
    MESSAGE: 'message',
  },

  // Acciones de auditoría
  AUDIT_ACTIONS: {
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
    DELETE: 'DELETE',
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    ACCESS: 'ACCESS',
  },

  // Entidades auditables
  AUDIT_ENTITIES: {
    USER: 'User',
    ROLE: 'Role',
    PERMISSION: 'Permission',
    NOTIFICATION: 'Notification',
    EMAIL: 'Email',
  },

  // Códigos de error
  ERROR_CODES: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  },

  // Expresiones regulares
  REGEX: {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    PHONE: /^\+?[\d\s\-\(\)]{10,}$/,
    URL: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
  },

  // Límites
  LIMITS: {
    PAGINATION: {
      DEFAULT_LIMIT: 10,
      MAX_LIMIT: 100,
    },
    PASSWORD: {
      MIN_LENGTH: 8,
      MAX_LENGTH: 128,
    },
    USER: {
      NAME_MIN_LENGTH: 2,
      NAME_MAX_LENGTH: 50,
      EMAIL_MAX_LENGTH: 255,
    },
  },

  // Formatos de fecha
  DATE_FORMATS: {
    ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
    DATABASE: 'YYYY-MM-DD HH:mm:ss',
    DISPLAY: 'DD/MM/YYYY HH:mm',
  },

  // Configuración de cache
  CACHE_KEYS: {
    USER: (userId) => `user:${userId}`,
    USER_PERMISSIONS: (userId) => `user:${userId}:permissions`,
    ROLES: 'roles:all',
    SETTINGS: 'settings:all',
  },

  // Tiempos de expiración de cache (segundos)
  CACHE_TTL: {
    USER: 3600, // 1 hora
    USER_PERMISSIONS: 1800, // 30 minutos
    ROLES: 86400, // 24 horas
    SETTINGS: 3600, // 1 hora
    GENERAL: 300, // 5 minutos
  },
};

export default constants;