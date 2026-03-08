import { Router } from 'express';
import { CatalogoController } from '../controllers/CatalogoController';

const router = Router();

router.get('/', CatalogoController.getCatalogos);

export default router;
