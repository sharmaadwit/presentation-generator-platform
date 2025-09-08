import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { createError } from '../middleware/errorHandler';

export const userController = {
  getProfile: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `SELECT id, email, name, subscription_tier, presentations_generated, 
                monthly_limit, created_at, updated_at
         FROM users WHERE id = $1`,
        [req.user!.id]
      );

      if (result.rows.length === 0) {
        throw createError('User not found', 404);
      }

      const user = result.rows[0];
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionTier: user.subscription_tier,
        presentationsGenerated: user.presentations_generated,
        monthlyLimit: user.monthly_limit,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      });

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  updateProfile: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const { name, email } = req.body;
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (name) {
        updates.push(`name = $${paramCount}`);
        values.push(name);
        paramCount++;
      }

      if (email) {
        // Check if email is already taken
        const existingUser = await client.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [email, req.user!.id]
        );

        if (existingUser.rows.length > 0) {
          throw createError('Email already in use', 409);
        }

        updates.push(`email = $${paramCount}`);
        values.push(email);
        paramCount++;
      }

      if (updates.length === 0) {
        throw createError('No valid fields to update', 400);
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(req.user!.id);

      const query = `
        UPDATE users 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, email, name, subscription_tier, presentations_generated, monthly_limit, updated_at
      `;

      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        throw createError('User not found', 404);
      }

      const user = result.rows[0];
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionTier: user.subscription_tier,
        presentationsGenerated: user.presentations_generated,
        monthlyLimit: user.monthly_limit,
        updatedAt: user.updated_at
      });

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  getUserStats: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      // Get presentation statistics
      const presentationStats = await client.query(`
        SELECT 
          COUNT(*) as total_presentations,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_presentations,
          COUNT(CASE WHEN status = 'generating' THEN 1 END) as generating_presentations,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_presentations
        FROM presentations 
        WHERE user_id = $1
      `, [req.user!.id]);

      // Get slides statistics
      const slideStats = await client.query(`
        SELECT COUNT(*) as total_slides
        FROM slides s
        JOIN presentations p ON s.presentation_id = p.id
        WHERE p.user_id = $1
      `, [req.user!.id]);

      // Get recent presentations
      const recentPresentations = await client.query(`
        SELECT id, title, status, created_at
        FROM presentations 
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 5
      `, [req.user!.id]);

      const stats = presentationStats.rows[0];
      const slides = slideStats.rows[0];

      res.json({
        presentations: {
          total: parseInt(stats.total_presentations),
          completed: parseInt(stats.completed_presentations),
          generating: parseInt(stats.generating_presentations),
          failed: parseInt(stats.failed_presentations)
        },
        slides: {
          total: parseInt(slides.total_slides)
        },
        recentPresentations: recentPresentations.rows.map(p => ({
          id: p.id,
          title: p.title,
          status: p.status,
          createdAt: p.created_at
        }))
      });

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  updateSubscription: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const { subscriptionTier } = req.body;

      if (!['free', 'pro', 'enterprise'].includes(subscriptionTier)) {
        throw createError('Invalid subscription tier', 400);
      }

      // Set monthly limits based on tier
      const monthlyLimits = {
        free: 5,
        pro: 50,
        enterprise: 500
      };

      const result = await client.query(
        `UPDATE users 
         SET subscription_tier = $1, monthly_limit = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING id, email, name, subscription_tier, monthly_limit, updated_at`,
        [subscriptionTier, monthlyLimits[subscriptionTier as keyof typeof monthlyLimits], req.user!.id]
      );

      if (result.rows.length === 0) {
        throw createError('User not found', 404);
      }

      const user = result.rows[0];
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        subscriptionTier: user.subscription_tier,
        monthlyLimit: user.monthly_limit,
        updatedAt: user.updated_at
      });

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  resetPresentationLimit: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      // Reset presentations_generated to 0 for the current user
      const result = await client.query(
        `UPDATE users 
         SET presentations_generated = 0, updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING id, email, name, subscription_tier, presentations_generated, monthly_limit`,
        [req.user!.id]
      );

      if (result.rows.length === 0) {
        throw createError('User not found', 404);
      }

      const user = result.rows[0];
      res.json({
        message: 'Presentation limit reset successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          subscriptionTier: user.subscription_tier,
          presentationsGenerated: user.presentations_generated,
          monthlyLimit: user.monthly_limit
        }
      });

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }
};
