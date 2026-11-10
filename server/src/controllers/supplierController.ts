import { Request, Response, NextFunction } from 'express';
import * as supplierService from '../services/supplierService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const listSuppliers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const suppliers = await supplierService.getSuppliers();
    sendSuccess(res, suppliers);
  } catch (error) {
    next(error);
  }
};

export const getSupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const supplier = await supplierService.getSupplierById(req.params.id);
    sendSuccess(res, supplier);
  } catch (error) {
    next(error);
  }
};

export const createSupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const supplier = await supplierService.createSupplier(req.body);
    sendSuccess(res, supplier, 'Supplier created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateSupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const supplier = await supplierService.updateSupplier(req.params.id, req.body);
    sendSuccess(res, supplier, 'Supplier updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteSupplier = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await supplierService.deleteSupplier(req.params.id);
    sendSuccess(res, null, 'Supplier deleted successfully');
  } catch (error) {
    next(error);
  }
};

