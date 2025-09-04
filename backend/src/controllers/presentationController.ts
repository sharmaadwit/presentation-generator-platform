import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const presentationController = {
  generatePresentation: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const {
        useCase,
        customer,
        industry,
        targetAudience,
        presentationLength = 'medium',
        style = 'professional',
        additionalRequirements
      } = req.body;

      // Check user's monthly limit
      const userResult = await client.query(
        'SELECT presentations_generated, monthly_limit FROM users WHERE id = $1',
        [req.user!.id]
      );

      if (userResult.rows.length === 0) {
        throw createError('User not found', 404);
      }

      const { presentations_generated, monthly_limit } = userResult.rows[0];
      
      if (presentations_generated >= monthly_limit) {
        throw createError('Monthly presentation limit reached', 403);
      }

      // Create presentation record
      const presentationId = uuidv4();
      const result = await client.query(
        `INSERT INTO presentations (
          id, user_id, title, description, use_case, customer, industry,
          target_audience, presentation_length, style, additional_requirements
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          presentationId,
          req.user!.id,
          `${customer} - ${industry} Presentation`,
          `Custom presentation for ${customer} in ${industry} industry`,
          useCase,
          customer,
          industry,
          targetAudience,
          presentationLength,
          style,
          additionalRequirements
        ]
      );

      // Update user's presentation count
      await client.query(
        'UPDATE users SET presentations_generated = presentations_generated + 1 WHERE id = $1',
        [req.user!.id]
      );

      // Start AI generation process (async)
      generatePresentationAsync(presentationId, req.body);

      res.status(201).json({
        presentationId,
        message: 'Presentation generation started',
        status: 'generating'
      });

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  getUserPresentations: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `SELECT p.*, 
         COUNT(s.id) as slide_count,
         MAX(s.extracted_at) as last_updated
         FROM presentations p
         LEFT JOIN slides s ON p.id = s.presentation_id
         WHERE p.user_id = $1
         GROUP BY p.id
         ORDER BY p.created_at DESC`,
        [req.user!.id]
      );

      res.json(result.rows);
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  getPresentation: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const { id } = req.params;

      // Get presentation details
      const presentationResult = await client.query(
        'SELECT * FROM presentations WHERE id = $1 AND user_id = $2',
        [id, req.user!.id]
      );

      if (presentationResult.rows.length === 0) {
        throw createError('Presentation not found', 404);
      }

      // Get slides
      const slidesResult = await client.query(
        'SELECT * FROM slides WHERE presentation_id = $1 ORDER BY order_index',
        [id]
      );

      const presentation = {
        ...presentationResult.rows[0],
        slides: slidesResult.rows
      };

      res.json(presentation);
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  getGenerationProgress: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const { id } = req.params;

      // Verify presentation belongs to user
      const presentationResult = await client.query(
        'SELECT id FROM presentations WHERE id = $1 AND user_id = $2',
        [id, req.user!.id]
      );

      if (presentationResult.rows.length === 0) {
        throw createError('Presentation not found', 404);
      }

      // Get latest progress
      const progressResult = await client.query(
        'SELECT * FROM generation_progress WHERE presentation_id = $1 ORDER BY created_at DESC LIMIT 1',
        [id]
      );

      if (progressResult.rows.length === 0) {
        res.json({
          stage: 'queued',
          progress: 0,
          message: 'Presentation is queued for generation'
        });
        return;
      }

      res.json(progressResult.rows[0]);
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  downloadPresentation: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const { id } = req.params;

      // Get presentation details
      const result = await client.query(
        'SELECT * FROM presentations WHERE id = $1 AND user_id = $2',
        [id, req.user!.id]
      );

      if (result.rows.length === 0) {
        throw createError('Presentation not found', 404);
      }

      const presentation = result.rows[0];

      if (presentation.status !== 'completed') {
        throw createError('Presentation not ready for download', 400);
      }

      if (!presentation.download_url) {
        throw createError('Download URL not available', 404);
      }

      // Redirect to download URL or serve file
      res.redirect(presentation.download_url);
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  deletePresentation: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const { id } = req.params;

      const result = await client.query(
        'DELETE FROM presentations WHERE id = $1 AND user_id = $2 RETURNING id',
        [id, req.user!.id]
      );

      if (result.rows.length === 0) {
        throw createError('Presentation not found', 404);
      }

      res.status(204).send();
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  regeneratePresentation: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const { id } = req.params;

      // Verify presentation belongs to user
      const presentationResult = await client.query(
        'SELECT * FROM presentations WHERE id = $1 AND user_id = $2',
        [id, req.user!.id]
      );

      if (presentationResult.rows.length === 0) {
        throw createError('Presentation not found', 404);
      }

      // Reset presentation status
      await client.query(
        'UPDATE presentations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['generating', id]
      );

      // Clear existing slides
      await client.query('DELETE FROM slides WHERE presentation_id = $1', [id]);

      // Start regeneration process
      const presentation = presentationResult.rows[0];
      generatePresentationAsync(id, {
        useCase: presentation.use_case,
        customer: presentation.customer,
        industry: presentation.industry,
        targetAudience: presentation.target_audience,
        presentationLength: presentation.presentation_length,
        style: presentation.style,
        additionalRequirements: presentation.additional_requirements
      });

      res.json({
        message: 'Presentation regeneration started',
        status: 'generating'
      });
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }
};

// Helper function to handle async AI generation
const generatePresentationAsync = async (presentationId: string, requestData: any): Promise<void> => {
  try {
    // Call AI service to generate presentation
    const response = await axios.post(`${AI_SERVICE_URL}/generate`, {
      presentationId,
      ...requestData
    });

    // Update presentation status based on AI service response
    const client = await pool.connect();
    try {
      await client.query(
        'UPDATE presentations SET status = $1, download_url = $2, preview_url = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
        [
          response.data.status,
          response.data.downloadUrl,
          response.data.previewUrl,
          presentationId
        ]
      );

      // Store slides if provided
      if (response.data.slides) {
        for (let i = 0; i < response.data.slides.length; i++) {
          const slide = response.data.slides[i];
          await client.query(
            `INSERT INTO slides (
              presentation_id, title, content, image_url, slide_type,
              source_presentation, relevance_score, order_index
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              presentationId,
              slide.title,
              slide.content,
              slide.imageUrl,
              slide.slideType,
              slide.sourcePresentation,
              slide.relevanceScore,
              i + 1
            ]
          );
        }
      }
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('AI generation failed:', error);
    
    // Update presentation status to failed
    const client = await pool.connect();
    try {
      await client.query(
        'UPDATE presentations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['failed', presentationId]
      );
    } finally {
      client.release();
    }
  }
};
