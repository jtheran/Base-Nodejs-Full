// src/utils/tokenUtils.js
import jwt from 'jsonwebtoken';
import config from '../config/config.js';

  // Generar JWT Access Token
  export function generateAccessToken(payload) {
    return jwt.sign(payload, config.auth.jwt.secret, {
      expiresIn: config.auth.jwt.expiresIn,
      issuer: config.auth.jwt.issuer,
      audience: config.auth.jwt.audience,
    });
  }

  // Generar Refresh Token
  export function generateRefreshToken(payload) {
    return jwt.sign(payload, config.auth.refreshToken.secret, {
      expiresIn: config.auth.refreshToken.expiresIn,
      issuer: config.auth.jwt.issuer,
      audience: config.auth.jwt.audience,
    });
  }

  // Verificar Access Token
  export function verifyAccessToken(token) {
    try {
      return jwt.verify(token, config.auth.jwt.secret);
    } catch (error) {
      throw new Error('Token de acceso inválido o expirado');
    }
  }

  // Verificar Refresh Token
  export function verifyRefreshToken(token) {
    try {
      const validate = jwt.verify(token, config.auth.refreshToken.secret);
      return validate;
    } catch (error) {
      throw new Error('Refresh token inválido o expirado');
    }
  }

  // Extraer token del header
  export function extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      throw new Error('Token no proporcionado');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new Error('Formato de token inválido');
    }

    return parts[1];
  }

