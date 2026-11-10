import { Request, Response, NextFunction } from 'express';
import * as unitService from '../services/unitService.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const listUnits = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const units = await unitService.getUnits();
    sendSuccess(res, units);
  } catch (error) {
    next(error);
  }
};

export const getUnit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const unit = await unitService.getUnitById(req.params.id);
    sendSuccess(res, unit);
  } catch (error) {
    next(error);
  }
};

export const createUnit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const unit = await unitService.createUnit(req.body);
    sendSuccess(res, unit, 'Unit created successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const updateUnit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const unit = await unitService.updateUnit(req.params.id, req.body);
    sendSuccess(res, unit, 'Unit updated successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteUnit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    await unitService.deleteUnit(req.params.id);
    sendSuccess(res, null, 'Unit deleted successfully');
  } catch (error) {
    next(error);
  }
};

