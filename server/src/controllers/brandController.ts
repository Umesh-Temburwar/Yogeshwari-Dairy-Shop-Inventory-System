import { Request, Response, NextFunction } from 'express';
import * as brandService from '../services/brandService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const listBrands = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const brands = await brandService.getBrands();
    sendSuccess(res, brands);
  } catch (error) {
    next(error);
  }
};

export const getBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const brand = await brandService.getBrandById(req.params.id);
    sendSuccess(res, brand);
  } catch (error) {
    next(error);
  }
};

export const createBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const brand = await brandService.createBrand(req.body);
    sendSuccess(res, brand, 'Brand created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const brand = await brandService.updateBrand(req.params.id, req.body);
    sendSuccess(res, brand, 'Brand updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteBrand = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await brandService.deleteBrand(req.params.id);
    sendSuccess(res, null, 'Brand deleted successfully');
  } catch (error) {
    next(error);
  }
};

