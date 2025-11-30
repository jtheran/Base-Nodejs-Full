// src/services/auditService.js
import prisma from '../libs/prisma.js';
import { logger } from '../logs/logger.js';

/**
* Crear registro de auditoría manualmente
*/
export const createAuditLog = async (req, res) => {
    try {
        const {
            action,
            entity,
            entityId,
            userId,
            userIp,
            userAgent,
            oldData,
            newData,
        } = req.body;

        // Crear en la tabla AuditLog (si existe)
        const auditLog = await prisma.auditLog.create({
            data: {
                action,
                entity,
                entityId,
                userId,
                userIp,
                userAgent,
                oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : undefined,
                newData: newData ? JSON.parse(JSON.stringify(newData)) : undefined,
                },
                include: {
                user: {
                    select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true
                    }
                }
            }
        });

        // También registrar en el logger
        logger.info('log de auditoria creado exitosamente', {
            action,
            entity,
            entityId,
            userId,
            userIp,
            userAgent,
        });

        return res.status(201).json({ msg: 'log de auditoria creado exitosamente', auditLog });

    } catch (err) {
        logger.error('Error creating audit log', {
            error: err.message,
            action,
            entity,
            entityId,
            userId,
            userIp,
            userAgent,
        });
      return res.status(500).json({msg: 'ERROR INTERNO DEL SERVIDOR: ' + err.message});
    }
}

/**
* Obtener logs de auditoría con filtros
*/
export const getAuditLogs = async (req, res) => {
    try {
        const { filters = {}, pagination = {} } = req.params;  
        const {
            action,
            entity,
            entityId,
            userId,
            startDate,
            endDate,
            search
        } = filters;

        const {
            page = 1,
            limit = 50,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = pagination;

        const skip = (page - 1) * limit;

        const where = {};

        if (action) where.action = action;
        if (entity) where.entity = entity;
        if (entityId) where.entityId = entityId;
        if (userId) where.userId = userId;

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        if (search) {
            where.OR = [
            { entity: { contains: search, mode: 'insensitive' } },
            { action: { contains: search, mode: 'insensitive' } },
            { userIp: { contains: search, mode: 'insensitive' } },
            { userAgent: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
            include: {
                user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true
                }
                }
            }
            }),
            prisma.auditLog.count({ where })
        ]);

        const auditLogs = {
            logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };

        logger.info('lista de logs de auditorias', {
            action,
            entity,
            entityId,
            userId,
            userAgent,
        });
        return res.status(200).json({msg: 'lista de logs de auditorias ', auditLogs });

    } catch (error) {
        logger.error('Error lista de logs de auditorias ', {
            error: err.message,
            action,
            entity,
            entityId,
            userId,
            userIp,
            userAgent,
        });
        return res.status(500).json({msg: 'ERROR INTERNO DEL SERVIDOR: ' + err.message});
    }
}

/**
* Obtener logs del sistema (desde la tabla Log)
*/
export const getSystemLogs = async (req, res) => {
    try {
        const { filters = {}, pagination = {} } = req.params;  
        const {
            level,
            action,
            entity,
            userId,
            startDate,
            endDate,
            search
        } = filters;

        const {
            page = 1,
            limit = 100,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = pagination;

        const skip = (page - 1) * limit;

        const where = {};

        if (level) where.level = level;
        if (action) where.action = action;
        if (entity) where.entity = entity;
        if (userId) where.userId = userId;

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        if (search) {
            where.OR = [
            { message: { contains: search, mode: 'insensitive' } },
            { entity: { contains: search, mode: 'insensitive' } },
            { action: { contains: search, mode: 'insensitive' } },
            { userIp: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [logs, total] = await Promise.all([
            prisma.log.findMany({
            where,
            skip,
            take: limit,
            orderBy: { [sortBy]: sortOrder },
            include: {
                user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true
                }
                }
            }
            }),
            prisma.log.count({ where })
        ]);

        const auditLogs =  {
            logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };

        logger.info('lista de logs de auditorias del sistema', {
            action,
            entity,
            userId,
            userAgent,
        });
        return res.status(200).json({msg: 'lista de logs de auditorias del sistema', auditLogs });

    } catch (error) {
        logger.error('Error lista de logs de auditorias del sistema', {
            error: err.message,
            action,
            entity,
            entityId,
            userId,
            userIp,
            userAgent,
        });
        return res.status(500).json({msg: 'ERROR INTERNO DEL SERVIDOR: ' + err.message});
    }
  }

/**
* Limpiar logs antiguos
*/
export const cleanupOldLogs = async (req, res) => {
    try {
        const { retentionDays } = req.params;
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const [auditLogsDeleted, systemLogsDeleted] = await Promise.all([
            prisma.auditLog.deleteMany({
            where: {
                createdAt: { lt: cutoffDate }
            }
            }),
            prisma.log.deleteMany({
            where: {
                createdAt: { lt: cutoffDate },
                level: { not: 'ERROR' } // Mantener errores por más tiempo
            }
            })
        ]);
        
        const logsDelete =  {
            auditLogsDeleted: auditLogsDeleted.count,
            systemLogsDeleted: systemLogsDeleted.count
        };

        logger.info('logs de auditoria eliminados', {
            auditLogsDeleted: auditLogsDeleted.count,
            systemLogsDeleted: systemLogsDeleted.count,
            retentionDays,
            cutoffDate
        });
        return res.status(200).json({ msg: 'logs de auditoria eliminados', logsDelete });
        
    } catch (error) {
       logger.error('Error logs de auditoria eliminados', {
            error: err.message,
            systemLogsDeleted: systemLogsDeleted.count,
            retentionDays,
            cutoffDate
        });
        return res.status(500).json({msg: 'ERROR INTERNO DEL SERVIDOR: ' + err.message});
    }
}

/**
* Obtener estadísticas de logs
*/
export const getLogStatistics = async (req, res) => {
    try {
        const { days = 7 } = req.params;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const [levelStats, actionStats, entityStats] = await Promise.all([
            // Estadísticas por nivel
            prisma.log.groupBy({
            by: ['level'],
            where: {
                createdAt: { gte: startDate }
            },
            _count: {
                _all: true
            }
            }),

            // Estadísticas por acción
            prisma.auditLog.groupBy({
            by: ['action'],
            where: {
                createdAt: { gte: startDate }
            },
            _count: {
                _all: true
            }
            }),

            // Estadísticas por entidad
            prisma.auditLog.groupBy({
            by: ['entity'],
            where: {
                createdAt: { gte: startDate }
            },
            _count: {
                _all: true
            }
            })
        ]);

        const auditLogs =  {
            period: `${days} days`,
            levelStats,
            actionStats,
            entityStats
        };

        logger.info('lista de estadisticas de logs de auditoria', {
            period: `${days} days`,
            levelStats,
            actionStats,
            entityStats
        });
        return res.status(200).json({ msg: 'lista de estadisticas de logs de auditoria', auditLogs });

    }catch(err) {
        logger.error('Error estadisiticas de logs de auditoria', {
            error: err.message,
            systemLogsDeleted: systemLogsDeleted.count,
            retentionDays,
            cutoffDate
        });
        return res.status(500).json({msg: 'ERROR INTERNO DEL SERVIDOR: ' + err.message});
    }
}

