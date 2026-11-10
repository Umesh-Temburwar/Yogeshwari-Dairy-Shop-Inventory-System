import { Router } from 'express';
import * as brandController from '../controllers/brandController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { validateBody } from '../middleware/validate.js';
import { createBrandSchema, updateBrandSchema } from '../schemas/brandSchemas.js';

const router = Router();

router.get('/', authMiddleware, brandController.listBrands);
router.get('/:id', authMiddleware, brandController.getBrand);

router.post(
  '/',
  authMiddleware,
  requireRole('admin', 'owner', 'manager'),
  validateBody(createBrandSchema),
  brandController.createBrand
);

router.put(
  '/:id',
  authMiddleware,
  requireRole('admin', 'owner', 'manager'),
  validateBody(updateBrandSchema),
  brandController.updateBrand
);

router.delete(
  '/:id',
  authMiddleware,
  requireRole('admin', 'owner'),
  brandController.deleteBrand
);

export default router;

