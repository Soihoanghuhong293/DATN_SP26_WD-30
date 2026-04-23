import express from 'express';
import { protect, restrictToAdmin } from '../middlewares/auth.middleware.js';
import * as dashboardController from '../controllers/dashboard.controller.js';

const router = express.Router();

router.get('/stats', protect, restrictToAdmin, dashboardController.getStats);
router.get('/overview', protect, restrictToAdmin, dashboardController.getAdminOverview);

export default router;
