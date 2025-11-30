// src/middleware/permissions.js
import { requirePermission, requireOwnership, can } from '../config/accessControl.js';
import constants from '../config/constants.js';

// ==========================================
// MIDDLEWARES ESPECÍFICOS POR RECURSO
// ==========================================

// Usuarios
export const canCreateUser = requirePermission('create', 'user');
export const canReadUser = requirePermission('read', 'user');
export const canUpdateUser = requirePermission('update', 'user');
export const canDeleteUser = requirePermission('delete', 'user');

// Perfiles (con ownership)
export const canReadProfile = [
  requirePermission('read', 'profile'),
  requireOwnership('profile', 'id')
];

export const canUpdateProfile = [
  requirePermission('update', 'profile'),
  requireOwnership('profile', 'id')
];

// Roles
export const canReadRoles = requirePermission('read', 'role');
export const canUpdateRoles = requirePermission('update', 'role');
export const canCreateRoles = requirePermission('create', 'role');
export const canDeleteRoles = requirePermission('delete', 'role');

// Auditoría
export const canReadAudit = requirePermission('read', 'audit');
export const canCreateAudit = requirePermission('create', 'audit');

// Configuración del sistema
export const canReadSettings = requirePermission('read', 'settings');
export const canUpdateSettings = requirePermission('update', 'settings');

// ==========================================
// MIDDLEWARES PARA ACCIONES COMPLEJAS
// ==========================================

/**
 * Middleware para verificar permisos dinámicos basados en parámetros
 */
export const dynamicPermission = (getAction, getResource) => {
  return (req, res, next) => {
    try {
      const action = typeof getAction === 'function' ? getAction(req) : getAction;
      const resource = typeof getResource === 'function' ? getResource(req) : getResource;
      
      const userRole = req.user?.role || constants.ROLES.USER;
      const result = can(userRole, action, resource);
      
      if (!result.granted) {
        return res.status(403).json({
          error: result.error,
          code: result.code,
          required: { action, resource },
          currentRole: userRole
        });
      }
      
      req.permission = result;
      next();
    } catch (error) {
      return res.status(500).json({
        error: 'Error en verificación dinámica de permisos',
        message: error.message
      });
    }
  };
};

/**
 * Middleware para recursos anidados (ej: /users/:userId/posts)
 */
export const nestedResourcePermission = (parentResource, childResource, actions) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const parentId = req.params.userId || req.params.id;
      
      // Si el usuario está accediendo a sus propios recursos
      if (parentId === user.id) {
        // Verificar permisos para recursos propios
        const ownPermission = can(user.role, actions.own, childResource);
        if (ownPermission.granted) {
          req.permission = ownPermission;
          return next();
        }
      }
      
      // Verificar permisos para recursos de otros
      const anyPermission = can(user.role, actions.any, childResource);
      if (anyPermission.granted) {
        req.permission = anyPermission;
        return next();
      }
      
      return res.status(403).json({
        error: 'Permisos insuficientes para el recurso anidado',
        code: 'NESTED_RESOURCE_PERMISSION_DENIED',
        parentResource,
        childResource,
        actions
      });
      
    } catch (error) {
      return res.status(500).json({
        error: 'Error verificando permisos de recurso anidado',
        message: error.message
      });
    }
  };
};

/**
 * Middleware para operaciones por lote
 */
export const batchOperationPermission = (action, resource) => {
  return (req, res, next) => {
    try {
      const userRole = req.user?.role;
      const items = req.body.items || [];
      
      // Verificar permisos para cada item en el lote
      for (const item of items) {
        const result = can(userRole, action, resource, { item });
        if (!result.granted) {
          return res.status(403).json({
            error: `No tienes permisos para ${action} ${resource} en el item: ${item.id}`,
            code: 'BATCH_OPERATION_DENIED',
            failedItem: item.id
          });
        }
      }
      
      next();
    } catch (error) {
      return res.status(500).json({
        error: 'Error verificando permisos de operación por lote',
        message: error.message
      });
    }
  };
};

// ==========================================
// MIDDLEWARES DE ADMINISTRACIÓN
// ==========================================

/**
 * Solo super administradores
 */
export const requireSuperAdmin = (req, res, next) => {
  if (req.user?.role !==  constants.ROLES.SUPER_ADMIN) {
    return res.status(403).json({
      error: 'Se requieren privilegios de Super Administrador',
      code: 'SUPER_ADMIN_REQUIRED',
      currentRole: req.user?.role
    });
  }
  next();
};

/**
 * Solo administradores y super administradores
 */
export const requireAdmin = (req, res, next) => {
  const allowedRoles = [ constants.ROLES.ADMIN,  constants.ROLES.SUPER_ADMIN];
  
  if (!allowedRoles.includes(req.user?.role)) {
    return res.status(403).json({
      error: 'Se requieren privilegios de Administrador',
      code: 'ADMIN_REQUIRED',
      currentRole: req.user?.role,
      allowedRoles
    });
  }
  next();
};

/**
 * Solo moderadores, administradores y super administradores
 */
export const requireModerator = (req, res, next) => {
  const allowedRoles = [ constants.ROLES.MODERATOR,  constants.ROLES.ADMIN,  constants.ROLES.SUPER_ADMIN];
  
  if (!allowedRoles.includes(req.user?.role)) {
    return res.status(403).json({
      error: 'Se requieren privilegios de Moderador o superior',
      code: 'MODERATOR_REQUIRED',
      currentRole: req.user?.role,
      allowedRoles
    });
  }
  next();
};

export default {
  // Permisos específicos
  canCreateUser,
  canReadUser,
  canUpdateUser,
  canDeleteUser,
  canReadProfile,
  canUpdateProfile,
  canReadRoles,
  canUpdateRoles,
  canCreateRoles,
  canDeleteRoles,
  canReadAudit,
  canCreateAudit,
  canReadSettings,
  canUpdateSettings,
  
  // Middlewares complejos
  dynamicPermission,
  nestedResourcePermission,
  batchOperationPermission,
  
  // Roles específicos
  requireSuperAdmin,
  requireAdmin,
  requireModerator
};