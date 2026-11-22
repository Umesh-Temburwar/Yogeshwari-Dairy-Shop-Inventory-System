import { Router } from 'express';
import * as ecommerceController from '../controllers/ecommerceController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/rbacMiddleware.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  customerRegisterSchema,
  customerLoginSchema,
  customerAddressSchema,
  updateCustomerAddressSchema,
  ecommerceProductQuerySchema,
  cartValidationSchema,
  createOrderSchema,
  cancelOrderSchema,
  updateOrderStatusSchema,
  assignRiderSchema,
  updateStoreStatusSchema,
} from '../schemas/ecommerceSchemas.js';

const router = Router();

// ============================================================================
// 1. PUBLIC E-COMMERCE ENDPOINTS (No Authentication Required)
// ============================================================================
router.get(
  '/products',
  validateQuery(ecommerceProductQuerySchema),
  ecommerceController.listPublicProducts
);

router.get(
  '/products/:id',
  ecommerceController.getPublicProduct
);

router.get(
  '/categories',
  ecommerceController.listPublicCategories
);

// Store Open/Close Status (Flipkart/YogiMart Style)
router.get(
  '/store-status',
  ecommerceController.getStoreStatus
);

router.post(
  '/auth/register',
  validateBody(customerRegisterSchema),
  ecommerceController.customerRegister
);

router.post(
  '/auth/login',
  validateBody(customerLoginSchema),
  ecommerceController.customerLogin
);

router.post(
  '/cart/validate',
  validateBody(cartValidationSchema),
  ecommerceController.validateCart
);

// ============================================================================
// 2. CUSTOMER PROTECTED ENDPOINTS (Requires Customer Authentication)
// ============================================================================
router.get(
  '/auth/me',
  authMiddleware,
  ecommerceController.getCustomerProfile
);

router.get(
  '/addresses',
  authMiddleware,
  ecommerceController.listCustomerAddresses
);

router.get(
  '/addresses/:id',
  authMiddleware,
  ecommerceController.getCustomerAddress
);

router.post(
  '/addresses',
  authMiddleware,
  validateBody(customerAddressSchema),
  ecommerceController.createCustomerAddress
);

router.put(
  '/addresses/:id',
  authMiddleware,
  validateBody(updateCustomerAddressSchema),
  ecommerceController.updateCustomerAddress
);

router.delete(
  '/addresses/:id',
  authMiddleware,
  ecommerceController.deleteCustomerAddress
);

router.post(
  '/orders',
  authMiddleware,
  validateBody(createOrderSchema),
  ecommerceController.createOrder
);

router.get(
  '/orders',
  authMiddleware,
  ecommerceController.listCustomerOrders
);

router.get(
  '/orders/:id',
  authMiddleware,
  ecommerceController.getOrderDetails
);

router.post(
  '/orders/:id/cancel',
  authMiddleware,
  validateBody(cancelOrderSchema),
  ecommerceController.cancelOrder
);

// ============================================================================
// 3. STAFF / ADMIN ORDER MANAGEMENT (Restricted to Staff Roles)
// ============================================================================
router.get(
  '/admin/orders',
  authMiddleware,
  requireRole('admin', 'owner', 'manager', 'cashier', 'delivery_boy'),
  ecommerceController.listAdminOrders
);

router.patch(
  '/admin/orders/:id/status',
  authMiddleware,
  requireRole('admin', 'owner', 'manager', 'cashier', 'delivery_boy'),
  validateBody(updateOrderStatusSchema),
  ecommerceController.updateOrderStatus
);

router.post(
  '/admin/orders/:id/assign-rider',
  authMiddleware,
  requireRole('admin', 'owner', 'manager', 'cashier'),
  validateBody(assignRiderSchema),
  ecommerceController.assignOrderRider
);

router.patch(
  '/admin/store-status',
  authMiddleware,
  requireRole('admin', 'owner', 'manager'),
  validateBody(updateStoreStatusSchema),
  ecommerceController.updateStoreStatus
);

export default router;
