import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';
import { logSourceUpload, logSourceDeletion } from '../utils/analyticsLogger';
import { GoogleDriveService } from '../services/googleDriveService';
import fs from 'fs';

export const sourceController = {
  // Upload presentation sources
  uploadSources: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const files = req.files as Express.Multer.File[];
      const { title, description, industry, tags, author } = req.body;
      
      if (!files || files.length === 0) {
        throw createError('No files uploaded', 400);
      }

      const uploadResults = [];

      for (const file of files) {
        const sourceId = uuidv4();
        
        console.log(`📝 Processing file: ${file.originalname}`);
        console.log(`📁 File details:`, {
          sourceId,
          originalName: file.originalname,
          filename: file.filename,
          path: file.path,
          size: file.size,
          mimetype: file.mimetype,
          title: title || file.originalname,
          industry: industry || 'General',
          tags: tags ? tags.split(',').map((t: string) => t.trim()) : []
        });
        
        // Upload file to Google Drive for persistent storage
        console.log('☁️ Uploading file to Google Drive...');
        const driveUrl = await GoogleDriveService.uploadFile(file.path, file.filename);
        
        // Clean up local file after Google Drive upload
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
          console.log('🗑️ Local file cleaned up after Google Drive upload');
        }
        
        // Save source record to database with Google Drive URL
        console.log('💾 Saving source record to database...');
        const result = await client.query(
          `INSERT INTO presentation_sources (
            id, title, description, industry, tags, file_path, 
            source_type, metadata, status, uploaded_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *`,
          [
            sourceId,
            title || file.originalname,
            description || '',
            industry || 'General', // Provide default industry if not specified
            tags ? tags.split(',').map((t: string) => t.trim()) : [],
            driveUrl, // Store Google Drive URL instead of local path
            'uploaded',
            JSON.stringify({ author, originalName: file.originalname }),
            'pending', // Requires approval
            req.user!.id
          ]
        );
        
        console.log('✅ Source record saved successfully:', result.rows[0]);

        // Log the source upload event
        await logSourceUpload(
          req.user!.id,
          sourceId,
          title || file.originalname,
          industry || 'General',
          tags ? tags.split(',').map((t: string) => t.trim()) : undefined,
          undefined, // sessionId
          req.ip,
          req.get('User-Agent')
        );

        uploadResults.push({
          sourceId,
          title: title || file.originalname,
          status: 'pending_approval'
        });
      }

      console.log('✅ All sources uploaded successfully!');
      res.status(201).json({
        message: `${files.length} sources uploaded successfully`,
        sources: uploadResults
      });

    } catch (error) {
      console.error('❌ Source upload failed:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        filesCount: (req.files as Express.Multer.File[])?.length || 0,
        filenames: (req.files as Express.Multer.File[])?.map((f: Express.Multer.File) => f.originalname) || []
      });
      throw error;
    } finally {
      client.release();
    }
  },

  // Get all sources (admin only)
  getAllSources: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const { status, industry, search } = req.query;
      
      let query = `
        SELECT ps.*, u.name as uploaded_by_name, u.email as uploaded_by_email,
               COUNT(ss.id) as slide_count
        FROM presentation_sources ps
        LEFT JOIN users u ON ps.uploaded_by = u.id
        LEFT JOIN source_slides ss ON ps.id = ss.source_id
      `;
      
      const conditions = [];
      const params = [];
      let paramCount = 0;
      
      if (status) {
        paramCount++;
        conditions.push(`ps.status = $${paramCount}`);
        params.push(status);
      }
      
      if (industry) {
        paramCount++;
        conditions.push(`ps.industry = $${paramCount}`);
        params.push(industry);
      }
      
      if (search) {
        paramCount++;
        conditions.push(`(ps.title ILIKE $${paramCount} OR ps.description ILIKE $${paramCount} OR ps.tags::text ILIKE $${paramCount})`);
        params.push(`%${search}%`);
      }
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ` GROUP BY ps.id, u.name, u.email ORDER BY ps.created_at DESC`;
      
      const result = await client.query(query, params);
      
      res.json(result.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        industry: row.industry,
        tags: row.tags || [],
        status: row.status,
        uploadedBy: row.uploaded_by_name,
        uploadedAt: row.created_at,
        approvedAt: row.approved_at,
        slideCount: parseInt(row.slide_count) || 0,
        relevanceScore: parseFloat(row.relevance_score) || 0,
        approvalNotes: row.approval_notes
      })));

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  // Get all approved presentation sources
  getApprovedSources: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT ps.*, u.name as uploaded_by_name
        FROM presentation_sources ps
        LEFT JOIN users u ON ps.uploaded_by = u.id
        WHERE ps.status = 'approved'
        ORDER BY ps.created_at DESC
      `);

      res.json(result.rows);
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  // Get sources by industry
  getSourcesByIndustry: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const { industry } = req.params;
      
      const result = await client.query(`
        SELECT ps.*, u.name as uploaded_by_name
        FROM presentation_sources ps
        LEFT JOIN users u ON ps.uploaded_by = u.id
        WHERE ps.status = 'approved' AND ps.industry = $1
        ORDER BY ps.relevance_score DESC, ps.created_at DESC
      `, [industry]);

      res.json(result.rows);
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  // Add new presentation source (admin only)
  addSource: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const {
        title,
        description,
        industry,
        tags,
        filePath,
        sourceType = 'uploaded',
        metadata = {}
      } = req.body;

      // Check if user has admin privileges
      if (req.user!.subscriptionTier !== 'admin') {
        throw createError('Admin privileges required', 403);
      }

      const sourceId = uuidv4();
      
      const result = await client.query(`
        INSERT INTO presentation_sources (
          id, title, description, industry, tags, file_path, 
          source_type, metadata, status, uploaded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        sourceId,
        title,
        description,
        industry || 'General', // Provide default industry if not specified
        tags || [],
        filePath,
        sourceType,
        JSON.stringify(metadata),
        'pending', // Requires approval
        req.user!.id
      ]);

      res.status(201).json({
        sourceId,
        message: 'Presentation source added successfully',
        status: 'pending_approval'
      });

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  // Approve/reject presentation source (admin only)
  updateSourceStatus: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const { sourceId } = req.params;
      const { status, notes } = req.body;

      // Check if user has admin privileges
      if (req.user!.subscriptionTier !== 'admin') {
        throw createError('Admin privileges required', 403);
      }

      if (!['approved', 'rejected'].includes(status)) {
        throw createError('Invalid status. Must be approved or rejected', 400);
      }

      const result = await client.query(`
        UPDATE presentation_sources 
        SET status = $1, approval_notes = $2, approved_by = $3, approved_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING *
      `, [status, notes, req.user!.id, sourceId]);

      if (result.rows.length === 0) {
        throw createError('Source not found', 404);
      }

      res.json({
        message: `Source ${status} successfully`,
        source: result.rows[0]
      });

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  // Get pending sources for approval (admin only)
  getPendingSources: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      // Check if user has admin privileges
      if (req.user!.subscriptionTier !== 'admin') {
        throw createError('Admin privileges required', 403);
      }

      const result = await client.query(`
        SELECT ps.*, u.name as uploaded_by_name
        FROM presentation_sources ps
        LEFT JOIN users u ON ps.uploaded_by = u.id
        WHERE ps.status = 'pending'
        ORDER BY ps.created_at ASC
      `);

      res.json(result.rows);
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  // Delete presentation source (admin only)
  deleteSource: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const { sourceId } = req.params;

      // Check if user has admin privileges
      if (req.user!.subscriptionTier !== 'admin') {
        throw createError('Admin privileges required', 403);
      }

      const result = await client.query(
        'DELETE FROM presentation_sources WHERE id = $1 RETURNING id',
        [sourceId]
      );

      if (result.rows.length === 0) {
        throw createError('Source not found', 404);
      }

      res.status(204).send();
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  // Get source statistics
  getSourceStats: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const stats = await client.query(`
        SELECT 
          COUNT(*) as total_sources,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_sources,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_sources,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_sources,
          COUNT(DISTINCT industry) as industries_covered
        FROM presentation_sources
      `);

      const industryBreakdown = await client.query(`
        SELECT industry, COUNT(*) as count
        FROM presentation_sources
        WHERE status = 'approved'
        GROUP BY industry
        ORDER BY count DESC
      `);

      res.json({
        overview: stats.rows[0],
        industryBreakdown: industryBreakdown.rows
      });
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  // Approve source (admin only)
  approveSource: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const { sourceId } = req.params;
      const { notes } = req.body;

      const result = await client.query(
        `UPDATE presentation_sources 
         SET status = 'approved', 
             approved_by = $1, 
             approved_at = CURRENT_TIMESTAMP,
             approval_notes = $2
         WHERE id = $3
         RETURNING *`,
        [req.user!.id, notes, sourceId]
      );

      if (result.rows.length === 0) {
        throw createError('Source not found', 404);
      }

      res.json({
        message: 'Source approved successfully',
        source: result.rows[0]
      });

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  // Reject source (admin only)
  rejectSource: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const { sourceId } = req.params;
      const { notes } = req.body;

      if (!notes) {
        throw createError('Rejection notes are required', 400);
      }

      const result = await client.query(
        `UPDATE presentation_sources 
         SET status = 'rejected', 
             approved_by = $1, 
             approved_at = CURRENT_TIMESTAMP,
             approval_notes = $2
         WHERE id = $3
         RETURNING *`,
        [req.user!.id, notes, sourceId]
      );

      if (result.rows.length === 0) {
        throw createError('Source not found', 404);
      }

      res.json({
        message: 'Source rejected successfully',
        source: result.rows[0]
      });

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  // Bulk action on sources (admin only)
  bulkAction: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const { sourceIds, action } = req.body;

      if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) {
        throw createError('Source IDs are required', 400);
      }

      if (!['approve', 'reject'].includes(action)) {
        throw createError('Invalid action. Must be approve or reject', 400);
      }

      const placeholders = sourceIds.map((_, index) => `$${index + 2}`).join(',');
      
      const result = await client.query(
        `UPDATE presentation_sources 
         SET status = $1, 
             approved_by = $2, 
             approved_at = CURRENT_TIMESTAMP
         WHERE id IN (${placeholders})
         RETURNING id, title, status`,
        [action + 'd', req.user!.id, ...sourceIds]
      );

      res.json({
        message: `${result.rows.length} sources ${action}d successfully`,
        sources: result.rows
      });

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }
};
