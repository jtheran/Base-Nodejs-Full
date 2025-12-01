import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../libs/jwt.js';
import prisma from '../libs/prisma.js';
import { getClientIp } from '../utils/functionsAUX.js';
import { encryptPass, matchPass } from '../libs/bcrypt.js';
import { auditLogger, logger } from '../logs/logger.js';

export const register =async (req, res) => {
    try{
        const { email, password, name, role = 'USER' } = req.body;

        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({msg: 'El usuario ya existe'})
            
        }

        const hashedPass = await encryptPass(password);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPass,
                name,
                role,
            },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                createdAt: true,
            }
        });

        return res.status(201).json({ msg: 'Usuario registrado', user });
    }catch(err){
        return res.status(500).json({ msg: 'Error Interno del Servidor: ' + err.message });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                refreshTokens: {
                    where: {
                        expiresAt: { gt: new Date() }
                    },
                }
            }
        });

        if (!user) {
            return res.status(400).json({msg: 'Credenciales inválidas'});
        }

        if (!user.isActive) {
            return res.status(400).json({msg: 'Cuenta desactivada'});
        }

        const isValidPassword = await matchPass(password, user.password);
        if (!isValidPassword) {
            throw new Error('Credenciales inválidas');
        }

        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role
        };

        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 días

        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt,
            }
        });
        
         const userResponse = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isActive: user.isActive,
        };

        if(accessToken && refreshToken){
            auditLogger.log('audit', {
                message: `login exitoso para el user: ${email}`,
                action: 'LOGIN',
                entity: user.role,
                entityId: user.id,
                userId: user.id,
                userIp: getClientIp(req),
                userAgent: req.get('User-Agent'),
                metadata: {
                    user: userResponse,
                    loginMethod: 'email and password'
                }
            });
        }

        logger.info('Usuario logueado exitosamente', {
            userId: user.id,
            action: 'LOGIN',
            email: user.email,
            userIp: getClientIp(req)
        });

        return res.status(200).json({
            msg: 'usuario logueado exitosamente',
            user: userResponse,
            accessToken,
            refreshToken,
        });

    } catch (err) {
            auditLogger.log('audit', {
            message: `Intento de login fallido para ${req.body.email}`,
            action: 'LOGIN_FAILED',
            entity: 'User',
            userIp: getClientIp(req),
            userAgent: req.get('User-Agent'),
            metadata: {
            email: req.body.email,
            reason: err.message
            }
        });

        logger.warn('Failed login attempt', {
            email: req.body.email,
            action: 'LOGIN_FAILED',
            userIp: getClientIp(req),
            error: err.message
        });
        return res.status(500).json({ msg: 'Error Interno del Servidor: ' + err.message });
    }
};

export const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if(!refreshToken){
            return res.status(400).json({msg: 'refresh token no enviado'});
        }

        const decoded = verifyRefreshToken(refreshToken);

        const storedToken = await prisma.refreshToken.findFirst({
            where: {
                token: refreshToken,
                userId: decoded.userId,
                expiresAt: { gt: new Date() }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        isActive: true,
                    }
                }
            }
        }); 

        // if (!storedToken) {
        //     return res.status(400).json({ msg: 'Refresh token inválido o expirado'});
        // }

        const payload = {
            userId: storedToken.user.id,
            email: storedToken.user.email,
            role: storedToken.user.role
        };

        const accessTokenNew = generateAccessToken(payload);
        const refreshTokenNew = generateRefreshToken(payload);

        return res.status(200).json({
            msg: 'token refrescado exitosamente',
            accessTokenNew,
            refreshTokenNew,
        });

    } catch (err) {
        return res.status(500).json({msg: 'ERROR INTERNO DEL SERVIDOR: ' + err.message });
    }
};