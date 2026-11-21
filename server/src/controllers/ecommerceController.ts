import { Request, Response, NextFunction } from 'express';
import * as ecommerceService from '../services/ecommerceService.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { AppError } from '../utils/AppError.js';
import {
  CustomerRegisterInput,
  CustomerLoginInput,
  CustomerAddressInput,
  UpdateCustomerAddressInput,
  EcommerceProductQueryInput,
  CartValidationInput,
  CreateOrderInput,
  CancelOrderInput,
  UpdateOrderStatusInput,
  AssignRiderInput,
  UpdateStoreStatusInput,
} from '../schemas/ecommerceSchemas.js';

// Public Catalog Controllers
export const listPublicProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = req.query as unknown as EcommerceProductQueryInput;
    const result = await ecommerceService.getPublicProducts(query);
    sendSuccess(res, result, 'Public products fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const getPublicProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await ecommerceService.getPublicProductById(id);
    sendSuccess(res, product, 'Product details fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const listPublicCategories = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await ecommerceService.getPublicCategories();
    sendSuccess(res, categories, 'Categories fetched successfully');
  } catch (error) {
    next(error);
  }
};

// Customer Authentication
export const customerRegister = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = req.body as CustomerRegisterInput;
    const result = await ecommerceService.customerRegister(input);
    sendSuccess(res, result, 'Customer registered successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const customerLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = req.body as CustomerLoginInput;
    const result = await ecommerceService.customerLogin(input);
    sendSuccess(res, result, 'Customer logged in successfully');
  } catch (error) {
    next(error);
  }
};

export const getCustomerProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    sendSuccess(res, { user: req.user }, 'Profile fetched successfully');
  } catch (error) {
    next(error);
  }
};

// Customer Addresses
export const listCustomerAddresses = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    const addresses = await ecommerceService.getCustomerAddresses(req.user.id);
    sendSuccess(res, addresses, 'Customer addresses fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const createCustomerAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    const input = req.body as CustomerAddressInput;
    const address = await ecommerceService.addCustomerAddress(req.user.id, input);
    sendSuccess(res, address, 'Delivery address added successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getCustomerAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    const isStaff = ['admin', 'owner', 'manager', 'cashier', 'delivery_boy'].includes(req.user.role);
    const address = await ecommerceService.getCustomerAddressById(req.params.id, req.user.id, isStaff);
    sendSuccess(res, address, 'Address fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const updateCustomerAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    const isStaff = ['admin', 'owner', 'manager', 'cashier'].includes(req.user.role);
    const input = req.body as UpdateCustomerAddressInput;
    const address = await ecommerceService.updateCustomerAddress(req.params.id, req.user.id, input, isStaff);
    sendSuccess(res, address, 'Address updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteCustomerAddress = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    const isStaff = ['admin', 'owner', 'manager'].includes(req.user.role);
    const result = await ecommerceService.deleteCustomerAddress(req.params.id, req.user.id, isStaff);
    sendSuccess(res, result, 'Address deleted successfully');
  } catch (error) {
    next(error);
  }
};

// Cart Validation
export const validateCart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = req.body as CartValidationInput;
    const validation = await ecommerceService.validateCart(input);
    sendSuccess(res, validation, 'Cart validated successfully');
  } catch (error) {
    next(error);
  }
};

// Orders (Customer)
export const createOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Authentication required to place order', 401, 'UNAUTHORIZED');
    const input = req.body as CreateOrderInput;
    const order = await ecommerceService.createEcommerceOrder(req.user.id, req.user.email, input);
    sendSuccess(res, order, 'Order placed successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const listCustomerOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    const orders = await ecommerceService.getCustomerOrders(req.user.id);
    sendSuccess(res, orders, 'Orders fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const getOrderDetails = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    const { id } = req.params;
    const isStaff = ['admin', 'owner', 'manager', 'cashier', 'delivery_boy'].includes(req.user.role);
    const order = await ecommerceService.getOrderById(id, req.user.id, isStaff);
    sendSuccess(res, order, 'Order details fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    const { id } = req.params;
    const { reason } = req.body as CancelOrderInput;
    const result = await ecommerceService.cancelCustomerOrder(id, req.user.id, reason);
    sendSuccess(res, result, 'Order cancelled and stock restored successfully');
  } catch (error) {
    next(error);
  }
};

// Staff Admin Orders Management
export const listAdminOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { status } = req.query as { status?: string };
    const orders = await ecommerceService.getAdminOrders(status);
    sendSuccess(res, orders, 'Admin orders fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const input = req.body as UpdateOrderStatusInput;
    const staffName = req.user?.fullName || req.user?.email || 'Staff Member';
    const updated = await ecommerceService.updateOrderStatus(id, input, staffName);
    sendSuccess(res, updated, 'Order status updated successfully');
  } catch (error) {
    next(error);
  }
};

export const assignOrderRider = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const input = req.body as AssignRiderInput;
    if (!req.user) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
    const updated = await ecommerceService.assignOrderRider(id, input, req.user.id, req.user.role);
    sendSuccess(res, updated, 'Delivery rider assigned successfully');
  } catch (error) {
    next(error);
  }
};

// Store Open / Closed Status Controls (Flipkart / Blinkit Style)
export const getStoreStatus = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const status = await ecommerceService.getStoreStatus();
    sendSuccess(res, status, 'Store status fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const updateStoreStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { is_open, message, reopen_time } = req.body as UpdateStoreStatusInput;
    const updated = await ecommerceService.updateStoreStatus(is_open, message, reopen_time);
    sendSuccess(res, updated, `Online store marked as ${is_open ? 'OPEN' : 'CLOSED'}`);
  } catch (error) {
    next(error);
  }
};
