import { Router } from 'express';
import { ApiKeyController } from '../controllers/ApiKeyController';

const router = Router();

// Endpoints internos para la gestión de tokens del panel "Mi Cuenta"
router.get('/', ApiKeyController.listarApiKeys);
router.post('/', ApiKeyController.generarApiKey);
router.delete('/:id', ApiKeyController.revocarApiKey);

export default router;
