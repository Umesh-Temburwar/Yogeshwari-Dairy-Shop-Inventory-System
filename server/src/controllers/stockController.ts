import { Request, Response, NextFunction } from 'express';
import * as stockService from '../services/stockService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const getOverview = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = await stockService.getStockOverview();
    sendSuccess(res, data);
  } catch (error) {
    next(error);
  }
};

export const getBatchExpiry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const productId = req.query.productId as string | undefined;
    const batches = await stockService.getBatchesWithExpiry(productId);
    sendSuccess(res, batches);
  } catch (error) {
    next(error);
  }
};

