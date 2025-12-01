// src/services/auditService.js
import prisma from '../libs/prisma.js';
import { logger } from '../logs/logger.js';
import { getClientIp } from '../utils/functionsAUX.js';

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
    // Variables para logging
    let logContext = {};
    
    try {
        // Extraer y validar parámetros
        const { 
            action,
            entity,
            entityId,
            userId,
            startDate,
            endDate,
            search,
            page = 1,
            limit = 50,
        } = req.query;

        // Preparar contexto para logs
        logContext = {
            action: action || 'all',
            entity: entity || 'all',
            entityId: entityId || 'none',
            userId: userId || 'none',
            userIp: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
            requestedBy: req.user?.id || 'anonymous'
        };

        // Validar parámetros numéricos
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(Math.max(1, parseInt(limit)), 100); // Máximo 100 registros
        const skip = (pageNum - 1) * limitNum;

        // Construir query where
        const where = {};

        // Filtros exactos
        if (action) where.action = action;
        if (entity) where.entity = entity;
        if (entityId) where.entityId = entityId;
        if (userId) where.userId = userId;

        // Filtro de fecha
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                const start = new Date(startDate);
                if (!isNaN(start)) where.createdAt.gte = start;
            }
            if (endDate) {
                const end = new Date(endDate);
                if (!isNaN(end)) where.createdAt.lte = end;
            }
        }

        // Búsqueda textual
        if (search && search.trim()) {
            where.OR = [
                { entity: { contains: search.trim(), mode: 'insensitive' } },
                { action: { contains: search.trim(), mode: 'insensitive' } },
                { userIp: { contains: search.trim(), mode: 'insensitive' } },
                { userAgent: { contains: search.trim(), mode: 'insensitive' } }
            ];
        }

        // Ejecutar consultas
        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                skip,
                take: limitNum,
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

        // Preparar respuesta
        const auditLogs = {
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum),
                hasNext: pageNum < Math.ceil(total / limitNum),
                hasPrev: pageNum > 1
            },
            filters: {
                action,
                entity,
                entityId,
                userId,
                startDate,
                endDate,
                search
            },
            logs
        };

        // Log exitoso
        logger.info('Lista de logs de auditoría obtenida exitosamente', {
            ...logContext,
            totalLogs: total,
            page: pageNum,
            limit: limitNum,
            filtersApplied: Object.keys(where).length
        });
        
        return res.status(200).json({ 
            success: true,
            message: 'Logs de auditoría obtenidos exitosamente', 
            data: auditLogs 
        });

    } catch (err) {
        // Log de error con contexto completo
        logger.error('Error crítico obteniendo logs de auditoría', {
            ...logContext,
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
        
        return res.status(500).json({ 
            success: false,
            message: 'Error interno del servidor al obtener logs de auditoría',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined,
            code: 'AUDIT_LOGS_FETCH_ERROR'
        });
    }
}

/**
* Obtener logs del sistema (desde la tabla Log)
*/
export const getSystemLogs = async (req, res) => {
    try {
        let logContext = {};

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

        logContext = {
            action: action || 'all',
            entity: entity || 'all',
            userId: userId || 'none',
            userIp: getClientIp(req),
            userAgent: req.get('User-Agent') || 'unknown',
            requestedBy: req.user?.id || 'anonymous'
        };

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
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            },
            logs
        };

        logger.info('lista de logs de auditorias del sistema', {
            ...logContext,
            totalLogs: total,
            filtersApplied: Object.keys(where).length
        });
        return res.status(200).json({msg: 'lista de logs de auditorias del sistema', auditLogs });

    } catch (err) {
        logger.error('Error lista de logs de auditorias del sistema', {
            error: err.message,
           ...logContext,
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

        const transformedLevelStats = levelStats.map(stat => ({
            level: stat.level,
            total: stat._count._all
        }));

        const transformedActionStats = actionStats.map(stat => ({
            action: stat.action,
            total: stat._count._all
        }));

        const transformedEntityStats = entityStats.map(stat => ({
            entity: stat.entity,
            total: stat._count._all
        }));

        const auditLogs =  {
            period: `${days} days`,
            levelStats: transformedLevelStats,
            actionStats: transformedActionStats,
            entityStats: transformedEntityStats
        };

        logger.info('lista de estadisticas de logs de auditoria', {
            period: `${days} days`,
            levelStats: transformedLevelStats,
            actionStats: transformedActionStats,
            entityStats: transformedEntityStats
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

