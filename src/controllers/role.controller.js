// src/services/roleService.js
import { 
  accessControl, 
  getRolePermissions, 
  checkPermission 
} from '../config/accesscontrol.js';
import constants from '../config/constants.js';

/**
* Obtener todos los roles disponibles
*/
export const getAvailableRoles = async (req, res) => {
    try{
        if(!constants.ROLES){
            return res.status(400).json({msg: 'no existen roles '});
        }

        const roles = Object.values(constants.ROLES);
        return res.status(200).json({msg: 'lista de roles', roles });
    }catch(err){
        return res.status(500).json({msg: 'ERROR INTERNO DEL SERVIDOR: ' + err.message});
    }
}

/**
* Obtener permisos de un rol específico
*/
export const getRoleDetails = async (req, res) => {
    try{
        const { role } = req.params;
        if (!role || !Object.values(constants.ROLES).includes(role)) {
            return res.status(400).json({msg: `Rol '${role}' no válido o no enviado`});
        }

        const permissions = getRolePermissions(role);
        const grants = accessControl.getGrants();
        const roleGrants = grants[role] || {};

        return res.status(200).json(
        {   
            msg: 'detalles del rol',
            role,
            permissions,
            grants: roleGrants,
            inheritedFrom: this.getInheritedRoles(role)
        }
        );
    }catch(err){
        return res.status(500).json({msg: 'ERROR INTERNO DEL SERVIDOR: ' + err.message});
    }
}

/**
* Obtener roles de los que hereda un rol
*/
export const getInheritedRoles = async(req, res) => {
    try{
        const { role } = req.params;

        if(!role || !Object.values(constants.ROLES).includes(role)){
            return res.status(400).json({msg: `Rol '${role}' no válido o no enviado`})
        }

        const inheritance = {
            [constants.ROLES.USER]: [],
            [constants.ROLES.MODERATOR]: [constants.ROLES.USER],
            [constants.ROLES.ADMIN]: [constants.ROLES.MODERATOR, constants.ROLES.USER],
            [constants.ROLES.SUPER_ADMIN]: [constants.ROLES.ADMIN, constants.ROLES.MODERATOR, constants.ROLES.USER]
        };
        const rolesHeredados = inheritance[role];
        
        return res.status(200).json({msg: '', rolesHeredados});
    }catch(err){
        return res.status(500).json({msg: 'ERROR INTERNO DEL SERVIDOR: ' + err.message});
    }
}

  /**
   * Verificar si un rol puede realizar una acción
   */
  export const canRolePerformAction = async (req, res) => {
    try{
        const { role, action, resource} = req.params;

        if(!role || !Object.values(constants.ROLES).includes(role)){
            return res.status(400).json({msg: `Rol '${role}' no válido o no enviado`})
        }

        const permisos = checkPermission(role, action, resource);

        return res.status(200),json({msg: 'permisos sobre la accion o recursos de rol', permisos});
    }catch(err){
        return res.status(500).json({msg: 'ERROR INTERNO DEL SERVIDOR: ' + err.message});
    }
    
  }

/**
* Comparar permisos entre dos roles
*/

  export const compareRoles = async(req, res) => {
    try{
        const { role1, role2 } = req.params;

        if(!role1 || !Object.values(constants.ROLES).includes(role1) || !role2 || !Object.values(constants.ROLES).includes(role2)){
            return res.status(400).json({msg: `Rol '${role1}' o '${role2}' no válido o no enviado`})
        }
        const role1Details = this.getRoleDetails(role1);
        const role2Details = this.getRoleDetails(role2);

        const role1Permissions = new Set(
        role1Details.permissions.map(p => `${p.action}:${p.resource}`)
        );
        
        const role2Permissions = new Set(
        role2Details.permissions.map(p => `${p.action}:${p.resource}`)
        );

        const uniqueToRole1 = [...role1Permissions].filter(p => !role2Permissions.has(p));
        const uniqueToRole2 = [...role2Permissions].filter(p => !role1Permissions.has(p));
        const commonPermissions = [...role1Permissions].filter(p => role2Permissions.has(p));

        const info = {
            role1,
            role2,
            comparison: {
                role1HasMore: uniqueToRole1.length > 0,
                role2HasMore: uniqueToRole2.length > 0,
                uniqueToRole1,
                uniqueToRole2,
                commonPermissions,
                totalUniqueToRole1: uniqueToRole1.length,
                totalUniqueToRole2: uniqueToRole2.length,
                totalCommon: commonPermissions.length
            }
        };

        return res.status(200).json({msg: 'Comparacion de roles realizada', info })
    }catch(err){
        return res.status(500).json({msg: 'ERROR INTERNO DEL SERVIDOR: ' + err.message});
    }
  }

/**
* Obtener todos los roles con sus permisos
*/
export const getAllRolesWithPermissions = async (req, res) => {
    try{
        if(!constants.ROLES){
            return res.status(400).json({msg: 'no existen roles '});
        }

        const roles = this.getAvailableRoles();
        
        const resultados = roles.map(role => ({
            ...this.getRoleDetails(role),
            hierarchy: this.getRoleHierarchyLevel(role)
        }));

        return res.status(200).json({msg: 'lista de roles con sus permisos', resultados});
    }catch(err){
        return res.status(500).json({msg: 'ERROR INTERNO DEL SERVIDOR: ' + err.message});
    }
}

/**
* Obtener nivel en la jerarquía de un rol
*/
export const getRoleHierarchyLevel = async (req, res) => {
    try {
        const { role } = req.params;

        if(!role || !Object.values(constants.ROLES).includes(role)){
            return res.status(400).json({msg: `Rol '${role}' no válido o no enviado`})
        }

        const hierarchy = {
            [constants.ROLES.USER]: 1,
            [constants.ROLES.MODERATOR]: 2,
            [constants.ROLES.ADMIN]: 3,
            [constants.ROLES.SUPER_ADMIN]: 4
        };

        const resultado = hierarchy[role] || 0;

        return res.status(200).json({msg: 'jerarquia del rol', resultado }); 
    }catch(err){
        return res.status(500).json({msg: 'ERROR INTERNO DEL SERVIDOR: ' + err.message});
    }
}

/**
* Verificar si un rol puede asignar otro rol
*/
export const canAssignRole = async(req, res) => {
    try{
        const { assignerRole, targetRole } = req.params;

        const assignerLevel = this.getRoleHierarchyLevel(assignerRole);
        const targetLevel = this.getRoleHierarchyLevel(targetRole);

        // Un rol solo puede asignar roles de nivel inferior
        const asignacion =  assignerLevel > targetLevel;

        if(!asignacion){
            return res.status(400).json({msg: 'no puedes asignar el rol, no tienes suficientes permisos'});
        }

        return res.status(200).json({msg: 'puedes asignar el rol', asignacion });
    }catch(err){
        return res.status(500).json({msg: 'ERROR INTERNO DEL SERVIDOR: ' + err.message});
    }
}

/**
* Obtener roles que un rol puede asignar
*/
export const getAssignableRoles = async (req, res) => {
    try{
        const { role } = req.params;

        if(!role || !Object.values(constants.ROLES).includes(role)){
            return res.status(400).json({msg: `Rol '${role}' no válido o no enviado`})
        }

        const allRoles = this.getAvailableRoles();
        const roleLevel = this.getRoleHierarchyLevel(role);

        const asignacion = allRoles.filter(r => this.getRoleHierarchyLevel(r) < roleLevel);

        return res.status(200).json({msg: 'roles que puede asignar', asignacion });
    }catch(err){
        return res.status(500).json({msg: 'ERROR INTERNO DEL SERVIDOR: ' + err.message});
    }
}
