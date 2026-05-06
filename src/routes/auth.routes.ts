import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { requireAuth } from '../middlewares/authMiddleware';

const router = Router();

// Todas las peticiones a /api/auth requerirán token
router.post('/sync', requireAuth, AuthController.syncUser);

export default router;
