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

    if (!token) {
      throw createError('Access token required', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Verify user still exists
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, email, name, subscription_tier FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        throw createError('User not found', 401);
      }

      req.user = {
        id: result.rows[0].id,
        email: result.rows[0].email,
        name: result.rows[0].name,
        subscriptionTier: result.rows[0].subscription_tier
      };

      next();
    } finally {
      client.release();
    }
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(createError('Invalid token', 401));
    } else {
      next(error);
    }
  }
};

export const requireSubscription = (requiredTier: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(createError('Authentication required', 401));
      return;
    }

    const tierHierarchy = ['free', 'pro', 'enterprise'];
    const userTierIndex = tierHierarchy.indexOf(req.user.subscriptionTier);
    const requiredTierIndex = tierHierarchy.indexOf(requiredTier);

    if (userTierIndex < requiredTierIndex) {
      next(createError(`Subscription tier '${requiredTier}' required`, 403));
      return;
    }

    next();
  };
};
