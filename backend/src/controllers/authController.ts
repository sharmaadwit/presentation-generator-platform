import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

export const authController = {
  register: async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const { email, password, name } = req.body;

      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        throw createError('User with this email already exists', 409);
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const userId = uuidv4();
      const result = await client.query(
        `INSERT INTO users (id, email, password_hash, name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, name, created_at`,
        [userId, email, passwordHash, name]
      );

      const user = result.rows[0];

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        token
      });

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  login: async (req: Request, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const { email, password } = req.body;

      // Find user
      const result = await client.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        throw createError('Invalid email or password', 401);
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        throw createError('Invalid email or password', 401);
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          subscriptionTier: user.subscription_tier,
          presentationsGenerated: user.presentations_generated,
          monthlyLimit: user.monthly_limit
        },
        token
      });

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  refreshToken: async (req: Request, res: Response): Promise<void> => {
    const { token } = req.body;

    if (!token) {
      throw createError('Refresh token required', 400);
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      
      // Generate new token
      const newToken = jwt.sign(
        { userId: decoded.userId, email: decoded.email },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Token refreshed successfully',
        token: newToken
      });

    } catch (error) {
      throw createError('Invalid refresh token', 401);
    }
  },

  logout: async (req: Request, res: Response): Promise<void> => {
    // In a stateless JWT system, logout is handled client-side
    // by removing the token from storage
    res.json({
      message: 'Logout successful'
    });
  },

  getCurrentUser: async (req: AuthRequest, res: Response): Promise<void> => {
    res.json({
      user: req.user
    });
  }
};
