import { Router } from 'express';
import { validate, validationSchemas } from '../middlewares/validation.middleware.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { login, refreshToken, register } from '../controllers/auth.controller.js';

const router = Router();

router.post('/login' , validate(validationSchemas.login), login);

router.post('/register', validate(validationSchemas.register), register);

router.post('/refresh-token', authenticateJWT, validate(validationSchemas.refreshToken), refreshToken);


export default router;