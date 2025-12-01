// src/utils/cacheKeys.js
/**
 * Generador de claves de cache consistentes y organizadas
 * 
 * Estructura: prefix:entity:identifier:subresource
 * Ejemplo: backend_base:user:123:profile
 */

// Prefijos organizados por entidad
const KEY_PREFIXES = {
  USER: 'user',
  USER_LIST: 'users',
  ROLE: 'role', 
  ROLE_LIST: 'roles',
  PERMISSION: 'permission',
  AUDIT: 'audit',
  AUDIT_LIST: 'audits',
  SETTINGS: 'settings',
  SESSION: 'session',
  CACHE: 'cache',
  SYSTEM: 'system'
};

class CacheKeys {
  /**
   * ==========================================
   * CLAVES PARA USUARIOS
   * ==========================================
   */
  static user = {
    // Usuario por ID
    byId: (userId) => `${KEY_PREFIXES.USER}:${userId}`,
    
    // Usuario por email
    byEmail: (email) => `${KEY_PREFIXES.USER}:email:${this.sanitizeKey(email)}`,
    
    // Perfil completo de usuario
    profile: (userId) => `${KEY_PREFIXES.USER}:${userId}:profile`,
    
    // Permisos de usuario
    permissions: (userId) => `${KEY_PREFIXES.USER}:${userId}:permissions`,
    
    // Sesiones activas del usuario
    sessions: (userId) => `${KEY_PREFIXES.USER}:${userId}:sessions`,
    
    // Lista de usuarios con paginación y filtros
    list: (page = 1, limit = 10, filters = {}) => {
      const filterStr = Object.keys(filters).length > 0 
        ? `:filters:${this.hashObject(filters)}` 
        : '';
      return `${KEY_PREFIXES.USER_LIST}:page:${page}:limit:${limit}${filterStr}`;
    },
    
    // Búsqueda de usuarios
    search: (query, page = 1, limit = 10) => {
      const searchHash = this.hashString(query);
      return `${KEY_PREFIXES.USER_LIST}:search:${searchHash}:page:${page}:limit:${limit}`;
    }
  };

  /**
   * ==========================================
   * CLAVES PARA ROLES
   * ==========================================
   */
  static role = {
    // Rol por ID
    byId: (roleId) => `${KEY_PREFIXES.ROLE}:${roleId}`,
    
    // Rol por nombre
    byName: (roleName) => `${KEY_PREFIXES.ROLE}:name:${this.sanitizeKey(roleName)}`,
    
    // Permisos de un rol
    permissions: (roleName) => `${KEY_PREFIXES.ROLE}:${roleName}:permissions`,
    
    // Lista de todos los roles
    list: () => `${KEY_PREFIXES.ROLE_LIST}:all`,
    
    // Jerarquía de roles
    hierarchy: () => `${KEY_PREFIXES.ROLE_LIST}:hierarchy`,
    
    // Roles asignables por un rol específico
    assignableBy: (roleName) => `${KEY_PREFIXES.ROLE_LIST}:assignable:${roleName}`
  };

  /**
   * ==========================================
   * CLAVES PARA AUDITORÍA
   * ==========================================
   */
  static audit = {
    // Logs de auditoría con filtros
    logs: (filters = {}, page = 1, limit = 50) => {
      const filterStr = Object.keys(filters).length > 0 
        ? `:filters:${this.hashObject(filters)}` 
        : '';
      return `${KEY_PREFIXES.AUDIT}:logs:page:${page}:limit:${limit}${filterStr}`;
    },
    
    // Estadísticas de auditoría
    statistics: (days = 7) => `${KEY_PREFIXES.AUDIT}:stats:${days}days`,
    
    // Log específico por ID
    byId: (logId) => `${KEY_PREFIXES.AUDIT}:${logId}`,
    
    // Logs por usuario
    byUser: (userId, page = 1, limit = 50) => {
      return `${KEY_PREFIXES.AUDIT}:user:${userId}:page:${page}:limit:${limit}`;
    },
    
    // Logs por entidad
    byEntity: (entity, page = 1, limit = 50) => {
      return `${KEY_PREFIXES.AUDIT}:entity:${entity}:page:${page}:limit:${limit}`;
    }
  };

  /**
   * ==========================================
   * CLAVES PARA CONFIGURACIÓN
   * ==========================================
   */
  static settings = {
    // Configuración por clave
    byKey: (key) => `${KEY_PREFIXES.SETTINGS}:${key}`,
    
    // Todas las configuraciones
    all: () => `${KEY_PREFIXES.SETTINGS}:all`,
    
    // Configuración por categoría
    byCategory: (category) => `${KEY_PREFIXES.SETTINGS}:category:${category}`
  };

  /**
   * ==========================================
   * CLAVES PARA SESIONES
   * ==========================================
   */
  static session = {
    // Sesión por token
    byToken: (token) => `${KEY_PREFIXES.SESSION}:token:${this.hashString(token)}`,
    
    // Sesiones por usuario
    byUserId: (userId) => `${KEY_PREFIXES.SESSION}:user:${userId}`,
    
    // Sesión activa del usuario
    active: (userId) => `${KEY_PREFIXES.SESSION}:${userId}:active`,
    
    // Lista de sesiones activas
    activeList: () => `${KEY_PREFIXES.SESSION}:active:all`
  };

  /**
   * ==========================================
   * CLAVES GENERALES DEL SISTEMA
   * ==========================================
   */
  static general = {
    // Health check
    health: 'system:health',
    
    // Estadísticas del sistema
    stats: 'system:stats',
    
    // Configuración de la aplicación
    config: 'app:config',
    
    // Versión de la API
    apiVersion: 'app:version',
    
    // Features flags
    feature: (featureName) => `feature:${featureName}`
  };

  /**
   * ==========================================
   * CLAVES PARA CACHE DE RUTAS HTTP
   * ==========================================
   */
  static route = {
    // Respuesta de ruta específica
    response: (method, path, query = {}) => {
      const queryStr = Object.keys(query).length > 0 
        ? `:query:${this.hashObject(query)}` 
        : '';
      return `route:${method}:${this.sanitizeKey(path)}${queryStr}`;
    },
    
    // Lista de rutas cacheadas
    list: 'routes:cached'
  };

  /**
   * ==========================================
   * UTILIDADES PARA INVALIDACIÓN
   * ==========================================
   */
  
  /**
   * Obtener patrón para invalidar todas las claves de una entidad
   */
  static getInvalidationPattern(entity) {
    const prefix = KEY_PREFIXES[entity] || entity;
    return `${prefix}:*`;
  }

  /**
   * Obtener patrón para invalidar listas de una entidad
   */
  static getListInvalidationPattern(entity) {
    const listKey = KEY_PREFIXES[`${entity}_LIST`] || `${entity}s`;
    return `${listKey}:*`;
  }

  /**
   * Invalidar toda la cache de una entidad específica
   */
  static async invalidateEntity(entity) {
    const patterns = [
      this.getInvalidationPattern(entity),
      this.getListInvalidationPattern(entity)
    ];
    
    // Esto requeriría importar CacheService, pero lo mantenemos separado
    return patterns;
  }

  /**
   * ==========================================
   * UTILIDADES INTERNAS
   * ==========================================
   */
  
  /**
   * Sanitizar clave para evitar caracteres problemáticos
   */
  static sanitizeKey(key) {
    if (typeof key !== 'string') {
      key = String(key);
    }
    return key
      .toLowerCase()
      .replace(/[^a-z0-9:_\-.]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 100); // Limitar longitud
  }

  /**
   * Generar hash simple para un string
   */
  static hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Generar hash para un objeto (para filtros)
   */
  static hashObject(obj) {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    return this.hashString(str);
  }

  /**
   * Obtener todas las categorías de claves disponibles
   */
  static getCategories() {
    return Object.keys(KEY_PREFIXES);
  }

  /**
   * Generar clave con TTL específico
   */
  static withTTL(baseKey, ttl) {
    return {
      key: baseKey,
      ttl: ttl
    };
  }
}

export default CacheKeys;