import { Router } from 'express';
import * as categoryController from '../controllers/categoryController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { validateBody } from '../middleware/validate.js';
import { createCategorySchema, updateCategorySchema } from '../schemas/categorySchemas.js';

const router = Router();

// Everyone logged in can view categories
router.get('/', authMiddleware, categoryController.listCategories);
router.get('/:id', authMiddleware, categoryController.getCategory);

// Only admin, owner, manager can manage categories
router.post(
  '/',
  authMiddleware,
  requireRole('admin', 'owner', 'manager'),
  validateBody(createCategorySchema),
  categoryController.createCategory
);

router.put(
  '/:id',
  authMiddleware,
  requireRole('admin', 'owner', 'manager'),
  validateBody(updateCategorySchema),
  categoryController.updateCategory
);

router.delete(
  '/:id',
  authMiddleware,
  requireRole('admin', 'owner'),
  categoryController.deleteCategory
);

export default router;

