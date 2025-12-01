import prisma from '../libs/prisma.js';
import { logger } from '../logs/logger.js';
import CacheService from '../services/cacheService.js';
import CacheKeys from '../utils/cacheKeys.js';

export const getUsers = async (req, res) => {
    try{
        const { page = 1, limit = 10, filters = {} } = req.query;
        const cacheKey = CacheKeys.user.list(page, limit, filters);
        const where = {};
        const cachedUsers = await CacheService.get(cacheKey);
        if (cachedUsers) {
            logger.debug('📦 Usuarios obtenidos de cache', {
                page,
                limit,
                cacheKey,
                total: cachedUsers.pagination.total
            });
            return res.status(200).json({msg: 'usuarios obtenidos del cache', users: cachedUsers});
        }

        logger.debug('🔄 Cache miss, obteniendo usuarios de BD', {
            page,
            limit,
            filters,
            cacheKey
        });

        if(filters != {}){
            if(filters.role)where.role = filters.role;
            if(filters.isActive)where.isActive = filters.isActive;
            if(filters.name)where.name = filters.name;
        }

        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            prisma.user.findMany({
            skip,
            take: limit,
            where,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: 'desc' }
            }),
            prisma.user.count({ where })
        ]);

        const result = {
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            },
            filters: filters,
            source: 'database', // Para debugging
            cachedAt: new Date().toISOString()
        };

        await CacheService.set(cacheKey, result, 300);
        logger.debug('💾 Lista de usuarios guardada en cache', {
            page,
            limit,
            cacheKey,
            totalUsers: total
        });
        return res.status(200).json({msg: 'lista de usuarios ontenida exitosamente', result });

    }catch(err){
        logger.error('Error obteniendo lista de usuarios', {
            error: err.message
        });
        return res.status(500).json({msg: 'ERROR INTERNO DEL SERVIDOR: ' + err.message });
    }
}

/**
* Actualizar usuario (invalida cache automáticamente)
*/
export const updateUser = async(req, res) => {
    try {
        const { id } = req.params;
        const { name, active } = req.body;

        const updated = {};
        if(name)updated.name = name;
        if(active)updated.active = active;

        const updatedUser = await prisma.user.update({
            where: {
                id
            },
            data: updated
        });

        logger.info('Usuario actualizado exitosamente', {
            userId: id,
            updatedFields: Object.keys(updated)
        });

        return res.status(200).json({
            success: true,
            message: 'Usuario actualizado exitosamente',
            user: updatedUser,
        });

    } catch (err) {
        logger.error('Error actualizando usuario', {
            userId: req.params.id,
            error: err.message
        });
        return res.status(500).json({
            msg: 'ERROR INTERNO DEL SERVIDOR',
            error: err.message
        });
    }
}
