import { Router } from 'express';
import * as supplierController from '../controllers/supplierController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { validateBody } from '../middleware/validate.js';
import { createSupplierSchema, updateSupplierSchema } from '../schemas/supplierSchemas.js';

const router = Router();

router.get(
  '/',
  authMiddleware,
  requireRole('admin', 'owner', 'manager'),
  supplierController.listSuppliers
);

router.get(
  '/:id',
  authMiddleware,
  requireRole('admin', 'owner', 'manager'),
  supplierController.getSupplier
);

router.post(
  '/',
  authMiddleware,
  requireRole('admin', 'owner', 'manager'),
  validateBody(createSupplierSchema),
  supplierController.createSupplier
);

router.put(
  '/:id',
  authMiddleware,
  requireRole('admin', 'owner', 'manager'),
  validateBody(updateSupplierSchema),
  supplierController.updateSupplier
);

router.delete(
  '/:id',
  authMiddleware,
  requireRole('admin', 'owner'),
  supplierController.deleteSupplier
);

export default router;

