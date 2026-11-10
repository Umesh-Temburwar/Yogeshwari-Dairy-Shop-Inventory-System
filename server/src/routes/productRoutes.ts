import { Router } from 'express';
import * as productController from '../controllers/productController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createProductSchema, updateProductSchema, productQuerySchema } from '../schemas/productSchemas.js';

const router = Router();

router.get(
  '/',
  authMiddleware,
  requireRole('admin', 'owner', 'manager', 'cashier'),
  validateQuery(productQuerySchema),
  productController.listProducts
);

router.get(
  '/:id',
  authMiddleware,
  requireRole('admin', 'owner', 'manager', 'cashier'),
  productController.getProduct
);

router.post(
  '/',
  authMiddleware,
  requireRole('admin', 'owner', 'manager'),
  validateBody(createProductSchema),
  productController.createProduct
);

router.put(
  '/:id',
  authMiddleware,
  requireRole('admin', 'owner', 'manager'),
  validateBody(updateProductSchema),
  productController.updateProduct
);

router.delete(
  '/:id',
  authMiddleware,
  requireRole('admin', 'owner'),
  productController.deleteProduct
);

export default router;

