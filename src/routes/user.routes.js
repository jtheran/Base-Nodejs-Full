import { Router } from 'express';
import { requirePermission } from '../config/accessControl.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { getUsers } from '../controllers/user.controller.js';

const router = Router();

router.use(authenticateJWT);

router.get('/users', requirePermission('read', 'user'), getUsers);

export default router;