import { Router } from 'express';
import * as stockController from '../controllers/stockController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';

const router = Router();

router.get(
  '/overview',
  authMiddleware,
  requireRole('admin', 'owner', 'manager', 'cashier'),
  stockController.getOverview
);

router.get(
  '/expiry',
  authMiddleware,
  requireRole('admin', 'owner', 'manager', 'cashier'),
  stockController.getBatchExpiry
);

export default router;

