// src/middleware/auth.js
import { extractTokenFromHeader, verifyAccessToken } from '../libs/jwt.js';
import prisma from '../libs/prisma.js';

// Middleware de autenticación JWT
export const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);
    
    const decoded = verifyAccessToken(token);
    
    // Buscar usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      }
    });

    if (!user) {
      return res.status(401).json({
        error: 'Usuario no encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        error: 'Cuenta desactivada',
        code: 'ACCOUNT_DISABLED'
      });
    }

    // Agregar usuario a la request
    req.user = user;
    next();

  } catch (error) {
    return res.status(401).json({
      error: 'Token de autenticación inválido',
      message: error.message,
      code: 'INVALID_TOKEN'
    });
  }
};

// Middleware para verificar roles
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'No autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Permisos insuficientes',
        required: roles,
        current: req.user.role,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

