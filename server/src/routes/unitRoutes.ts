import { Router } from 'express';
import * as unitController from '../controllers/unitController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { validateBody } from '../middleware/validate.js';
import { createUnitSchema, updateUnitSchema } from '../schemas/unitSchemas.js';

const router = Router();

router.get('/', authMiddleware, unitController.listUnits);
router.get('/:id', authMiddleware, unitController.getUnit);

router.post(
  '/',
  authMiddleware,
  requireRole('admin', 'owner', 'manager'),
  validateBody(createUnitSchema),
  unitController.createUnit
);

router.put(
  '/:id',
  authMiddleware,
  requireRole('admin', 'owner', 'manager'),
  validateBody(updateUnitSchema),
  unitController.updateUnit
);

router.delete(
  '/:id',
  authMiddleware,
  requireRole('admin', 'owner'),
  unitController.deleteUnit
);

export default router;

