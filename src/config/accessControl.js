import { AccessControl } from 'accesscontrol';
import constants from './constant.js';

// Inicializar AccessControl
const ac = new AccessControl();

// ==========================================
// DEFINICIÓN DE ROLES Y PERMISOS
// ==========================================

// Rol: USER (Usuario básico)
ac.grant(constants.ROLES.USER)
  // Perfil propio
  .readOwn('profile')
  .updateOwn('profile')
  .deleteOwn('profile')
  
  // Contraseña propia
  .updateOwn('password')
  
  // Posts propios (ejemplo)
  .createOwn('post')
  .readOwn('post')
  .updateOwn('post')
  .deleteOwn('post')
  
  // Comentarios propios (ejemplo)
  .createOwn('comment')
  .readOwn('comment')
  .updateOwn('comment')
  .deleteOwn('comment');

// Rol: MODERATOR (Hereda de USER + permisos adicionales)
ac.grant(constants.ROLES.MODERATOR)
  .extend(constants.ROLES.USER)
  
  // Moderación de contenido
  .readAny('post')
  .updateAny('post')
  .deleteAny('post')
  
  .readAny('comment')
  .updateAny('comment')
  .deleteAny('comment')
  
  // Gestión de reportes
  .createOwn('report')
  .readAny('report')
  .updateAny('report')
  
  // Auditoría básica
  .readAny('audit');

// Rol: ADMIN (Hereda de MODERATOR + permisos de administración)
ac.grant(constants.ROLES.ADMIN)
  .extend(constants.ROLES.MODERATOR)
  
  // Gestión de usuarios
  .createAny('user')
  .readAny('user')
  .updateAny('user')
  .deleteAny('user')
  
  // Gestión de roles (excepto SUPER_ADMIN)
  .readAny('role')
  .updateAny('role')
  
  // Configuración del sistema
  .readAny('settings')
  .updateAny('settings')
  
  // Auditoría completa
  .readAny('audit')
  .createAny('audit')
  
  // Gestión de emails
  .readAny('email')
  .createAny('email');

// Rol: SUPER_ADMIN (Máximos privilegios)
ac.grant(constants.ROLES.SUPER_ADMIN)
  .extend(constants.ROLES.ADMIN)
  
  // Permisos ilimitados
  .createAny('all')
  .readAny('all')
  .updateAny('all')
  .deleteAny('all')
  
  // Gestión de roles SUPER_ADMIN
  .createAny('role')
  .updateAny('role')
  .deleteAny('role')
  
  // Configuración del sistema crítico
  .updateAny('system');

// ==========================================
// FUNCIONES UTILITARIAS
// ==========================================

/**
 * Verificar si un rol tiene permiso para una acción sobre un recurso
 */
const checkPermission = (role, action, resource, context = {}) => {
  try {
    const permission = ac.can(role)[action](resource);
    
    if (!permission.granted) {
      return {
        granted: false,
        error: `El rol '${role}' no tiene permiso para ${action} ${resource}`,
        code: 'INSUFFICIENT_PERMISSIONS'
      };
    }

    // Aplicar filtros si existen
    let filters = {};
    if (permission.attributes && permission.attributes.length > 0) {
      filters = permission.filter || {};
    }

    return {
      granted: true,
      permission,
      filters,
      attributes: permission.attributes
    };
  } catch (error) {
    return {
      granted: false,
      error: `Error verificando permisos: ${error.message}`,
      code: 'PERMISSION_CHECK_ERROR'
    };
  }
};

/**
 * Verificar múltiples permisos (al menos uno debe ser concedido)
 */
const checkAnyPermission = (role, permissions) => {
  for (const { action, resource, context } of permissions) {
    const result = checkPermission(role, action, resource, context);
    if (result.granted) {
      return result;
    }
  }
  
  return {
    granted: false,
    error: 'No se cumple ninguno de los permisos requeridos',
    code: 'NO_PERMISSIONS_GRANTED'
  };
};

/**
 * Verificar todos los permisos (todos deben ser concedidos)
 */
const checkAllPermissions = (role, permissions) => {
  const results = [];
  
  for (const { action, resource, context } of permissions) {
    const result = checkPermission(role, action, resource, context);
    if (!result.granted) {
      return result;
    }
    results.push(result);
  }
  
  return {
    granted: true,
    results,
    code: 'ALL_PERMISSIONS_GRANTED'
  };
};

/**
 * Obtener todos los permisos de un rol
 */
const getRolePermissions = (role) => {
  try {
    const grants = ac.getGrants();
    const roleGrants = grants[role];
    
    if (!roleGrants) {
      return [];
    }
    
    const permissions = [];
    
    Object.keys(roleGrants).forEach(resource => {
      Object.keys(roleGrants[resource]).forEach(action => {
        permissions.push({
          resource,
          action,
          attributes: roleGrants[resource][action].attributes
        });
      });
    });
    
    return permissions;
  } catch (error) {
    console.error('Error obteniendo permisos del rol:', error);
    return [];
  }
};

/**
 * Verificar si un rol puede realizar una acción sobre un recurso específico
 */
const can = (role, action, resource) => {
  return checkPermission(role, action, resource);
};

/**
 * Middleware generator para verificar permisos
 */
const requirePermission = (action, resource, options = {}) => {
  return (req, res, next) => {
    try {
      const userRole = req.user?.role || constants.ROLES.USER;
      
      const result = checkPermission(userRole, action, resource, {
        user: req.user,
        ...options.context
      });
      
      if (!result.granted) {
        return res.status(403).json({
          error: result.error,
          code: result.code,
          required: { action, resource },
          currentRole: userRole
        });
      }
      
      // Agregar información de permisos a la request
      req.permission = result;
      next();
    } catch (error) {
      return res.status(500).json({
        error: 'Error verificando permisos',
        message: error.message,
        code: 'PERMISSION_SYSTEM_ERROR'
      });
    }
  };
};

/**
 * Middleware para verificar ownership (cuando el usuario es dueño del recurso)
 */
const requireOwnership = (resource, idParam = 'id') => {
  return (req, res, next) => {
    try {
      const user = req.user;
      const resourceId = req.params[idParam];
      
      // Si el usuario es SUPER_ADMIN, tiene acceso completo
      if (user.role === ROLES.SUPER_ADMIN) {
        return next();
      }
      
      // Verificar si el usuario es dueño del recurso
      // Esto depende de la lógica de negocio específica
      const isOwner = checkResourceOwnership(user, resource, resourceId, req);
      
      if (!isOwner) {
        return res.status(403).json({
          error: 'No tienes permisos para acceder a este recurso',
          code: 'NOT_OWNER',
          resource,
          resourceId
        });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({
        error: 'Error verificando propiedad del recurso',
        message: error.message,
        code: 'OWNERSHIP_CHECK_ERROR'
      });
    }
  };
};

/**
 * Función helper para verificar propiedad de recursos
 * (Esta función debe ser extendida según la lógica de negocio)
 */
const checkResourceOwnership = (user, resource, resourceId, req) => {
  // Lógica básica de ownership
  switch (resource) {
    case 'profile':
    case 'password':
      // El usuario siempre es dueño de su propio perfil y contraseña
      return user.id === resourceId;
      
    case 'post':
    case 'comment':
      // Para posts y comentarios, necesitaríamos verificar en la base de datos
      // Esto es un ejemplo básico
      return user.id === req.body?.authorId || user.id === resourceId;
      
    default:
      // Por defecto, asumimos que no es el dueño
      return false;
  }
};

// Exportar todo
export {
  ac as accessControl,
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  getRolePermissions,
  can,
  requirePermission,
  requireOwnership
};


export default {
  accessControl: ac,
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  getRolePermissions,
  can,
  requirePermission,
  requireOwnership
};