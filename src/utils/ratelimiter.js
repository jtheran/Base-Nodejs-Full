import rateLimit from 'express-rate-limit';
import config from '../config/config.js';

const Limiter = rateLimit({
    windowMs: config.security.rateLimit.windowMs, // 15 minutos
    max: config.security.rateLimit.max, // Máximo de intentos de login por IP
    headers: true,
    statusCode: true,
    keyGenerator: (req) => {
        return req.headers.location;
    },
    handler: (req, res) => {
        return res.status(429).json({ msg: `DEMASIADOS INTENTOS, POR FAVOR ESPERE ${config.security.rateLimit.windowMs} milisegundos`  });
    }
});

export default Limiter;
