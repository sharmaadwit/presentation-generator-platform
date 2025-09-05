import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';
import { createError } from './errorHandler';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    subscriptionTier: string;
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    // Dummy authentication - allow access with any token or no token
    req.user = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'dummy@example.com',
      name: 'Dummy User',
      subscriptionTier: 'free'
    };
    next();
  } catch (error) {
    // Even if there's an error, allow access for dummy auth
    req.user = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'dummy@example.com',
      name: 'Dummy User',
      subscriptionTier: 'free'
    };
    next();
  }
};

export const requireSubscription = (requiredTier: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    // Dummy subscription check - always allow access
    next();
  };
};
