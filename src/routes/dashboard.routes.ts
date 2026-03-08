import { Router } from 'express';
import { DashboardController } from '../controllers/DashboardController';

const router = Router();

router.get('/stats', DashboardController.getStats);
router.get('/recent', DashboardController.getRecent);

export default router;
