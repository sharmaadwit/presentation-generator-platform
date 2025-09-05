import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { logFileUpload, logFileDeletion } from '../utils/analyticsLogger';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const uploadController = {
  uploadPresentation: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      if (!req.file) {
        throw createError('No file uploaded', 400);
      }

      const { title, description, industry, tags } = req.body;
      const uploadId = uuidv4();

      // Save upload record to database
      const result = await client.query(
        `INSERT INTO uploaded_presentations (
          id, user_id, original_filename, stored_filename, file_path, 
          file_size, mime_type, title, description, industry, tags, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          uploadId,
          req.user!.id,
          req.file.originalname,
          req.file.filename,
          req.file.path,
          req.file.size,
          req.file.mimetype,
          title || req.file.originalname,
          description || '',
          industry || '',
          tags ? tags.split(',').map((t: string) => t.trim()) : [],
          'uploaded'
        ]
      );

      // Log the upload event
      await logFileUpload(
        req.user!.id,
        uploadId,
        req.file.originalname,
        req.file.size,
        req.file.mimetype,
        industry,
        tags ? tags.split(',').map((t: string) => t.trim()) : undefined,
        req.sessionID,
        req.ip,
        req.get('User-Agent')
      );

      res.status(201).json({
        uploadId,
        message: 'Presentation uploaded successfully',
        file: {
          originalName: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype
        }
      });

    } catch (error) {
      // Clean up uploaded file if database operation fails
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      throw error;
    } finally {
      client.release();
    }
  },

  uploadMultiplePresentations: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        throw createError('No files uploaded', 400);
      }

      const uploadResults = [];

      for (const file of files) {
        const uploadId = uuidv4();
        
        // Save upload record to database
        const result = await client.query(
          `INSERT INTO uploaded_presentations (
            id, user_id, original_filename, stored_filename, file_path, 
            file_size, mime_type, title, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *`,
          [
            uploadId,
            req.user!.id,
            file.originalname,
            file.filename,
            file.path,
            file.size,
            file.mimetype,
            file.originalname,
            'uploaded'
          ]
        );

        uploadResults.push({
          uploadId,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype
        });
      }

      res.status(201).json({
        message: `${files.length} presentations uploaded successfully`,
        uploads: uploadResults
      });

    } catch (error) {
      // Clean up uploaded files if database operation fails
      const files = req.files as Express.Multer.File[];
      if (files) {
        files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      throw error;
    } finally {
      client.release();
    }
  },

  getUploadedPresentations: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `SELECT id, original_filename, title, description, industry, tags, 
                file_size, mime_type, status, created_at, processed_at
         FROM uploaded_presentations 
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [req.user!.id]
      );

      res.json(result.rows);

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  processUploadedPresentation: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const { uploadId } = req.params;

      // Get upload details
      const uploadResult = await client.query(
        'SELECT * FROM uploaded_presentations WHERE id = $1 AND user_id = $2',
        [uploadId, req.user!.id]
      );

      if (uploadResult.rows.length === 0) {
        throw createError('Upload not found', 404);
      }

      const upload = uploadResult.rows[0];

      // Update status to processing
      await client.query(
        'UPDATE uploaded_presentations SET status = $1 WHERE id = $2',
        ['processing', uploadId]
      );

      // Send to AI service for processing
      try {
        const response = await axios.post(`${AI_SERVICE_URL}/upload/process`, {
          uploadId,
          filePath: upload.file_path,
          mimeType: upload.mime_type,
          title: upload.title,
          description: upload.description,
          industry: upload.industry,
          tags: upload.tags
        });

        // Update status to processed
        await client.query(
          'UPDATE uploaded_presentations SET status = $1, processed_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['processed', uploadId]
        );

        res.json({
          message: 'Presentation processed successfully',
          slides: response.data.slides,
          totalSlides: response.data.totalSlides
        });

      } catch (aiError) {
        // Update status to failed
        await client.query(
          'UPDATE uploaded_presentations SET status = $1 WHERE id = $2',
          ['failed', uploadId]
        );

        throw createError('Failed to process presentation', 500);
      }

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  deleteUploadedPresentation: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const { uploadId } = req.params;

      // Get upload details
      const uploadResult = await client.query(
        'SELECT file_path FROM uploaded_presentations WHERE id = $1 AND user_id = $2',
        [uploadId, req.user!.id]
      );

      if (uploadResult.rows.length === 0) {
        throw createError('Upload not found', 404);
      }

      const filePath = uploadResult.rows[0].file_path;

      // Delete from database
      await client.query(
        'DELETE FROM uploaded_presentations WHERE id = $1 AND user_id = $2',
        [uploadId, req.user!.id]
      );

      // Delete file from filesystem
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.status(204).send();

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }
};
