import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import { logFileUpload, logFileDeletion, logFileDownload } from '../utils/analyticsLogger';
import { GoogleDriveService } from '../services/googleDriveService';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const uploadController = {
  uploadPresentation: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    let uploadId: string | undefined;
    
    try {
      console.log('🚀 Starting file upload process...');
      console.log('📋 Request body:', req.body);
      console.log('📁 Request file:', req.file ? {
        originalname: req.file.originalname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      } : 'No file');
      
      if (!req.file) {
        console.error('❌ No file uploaded');
        throw createError('No file uploaded', 400);
      }

      const { title, description, industry, tags } = req.body;
      uploadId = uuidv4();
      
      console.log('📝 Upload details:', {
        uploadId,
        title: title || req.file.originalname,
        description,
        industry,
        tags,
        originalFilename: req.file.originalname,
        storedFilename: req.file.filename,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      });

      // Upload file to Google Drive for persistent storage
      console.log('☁️ Uploading file to Google Drive...');
      const driveUrl = await GoogleDriveService.uploadFile(req.file.path, req.file.filename);
      
      // Clean up local file after Google Drive upload
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Local file cleaned up after Google Drive upload');
      }

      // Save upload record to database with Google Drive URL
      console.log('💾 Saving upload record to database...');
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
          driveUrl, // Store Google Drive URL instead of local path
          req.file.size,
          req.file.mimetype,
          title || req.file.originalname,
          description || '',
          industry || '',
          tags ? tags.split(',').map((t: string) => t.trim()) : [],
          'uploaded'
        ]
      );
      
      console.log('✅ Upload record saved successfully:', result.rows[0]);

      // Log the upload event
      console.log('📊 Logging upload event...');
      await logFileUpload(
        req.user!.id,
        uploadId,
        req.file.originalname,
        req.file.size,
        req.file.mimetype,
        industry,
        tags ? tags.split(',').map((t: string) => t.trim()) : undefined,
        undefined, // sessionId
        req.ip,
        req.get('User-Agent')
      );

      console.log('✅ Upload completed successfully!');
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
      console.error('❌ Upload failed:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        uploadId: uploadId || 'Not generated',
        filename: req.file?.originalname || 'No file'
      });
      
      // Clean up uploaded file if database operation fails
      if (req.file && fs.existsSync(req.file.path)) {
        console.log('🧹 Cleaning up uploaded file due to error');
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
  },

  // Get all uploaded files for admin
  getAllFiles: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();

    try {
      const result = await client.query(`
        SELECT 
          ps.id,
          ps.title as original_filename,
          COALESCE(ps.metadata->>'fileSize', '0')::bigint as file_size,
          'presentation' as file_type,
          ps.file_path,
          ps.status as upload_status,
          ps.created_at,
          ps.updated_at,
          ps.industry,
          ps.tags,
          ps.uploaded_by as user_id,
          us.name as user_name,
          us.email as user_email
        FROM presentation_sources ps
        LEFT JOIN users us ON ps.uploaded_by = us.id
        WHERE ps.source_type = 'uploaded'
        ORDER BY ps.created_at DESC
      `);

      const files = result.rows.map(file => ({
        id: file.id,
        originalName: file.original_filename,
        size: file.file_size,
        type: file.file_type,
        path: file.file_path,
        status: file.upload_status,
        createdAt: file.created_at,
        updatedAt: file.updated_at,
        industry: file.industry,
        tags: file.tags,
        userId: file.user_id,
        userName: file.user_name,
        userEmail: file.user_email
      }));

      res.json({ files });

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  // Download trained document
  downloadTrainedDocument: async (req: AuthRequest, res: Response): Promise<void> => {
    const { fileId } = req.params;
    const client = await pool.connect();

    try {
      // Get file details
      const fileResult = await client.query(
        `SELECT 
          ps.id,
          ps.title,
          ps.file_path,
          ps.metadata,
          ps.industry,
          ps.tags,
          ps.status,
          ps.created_at,
          u.name as uploaded_by_name
        FROM presentation_sources ps
        LEFT JOIN users u ON ps.uploaded_by = u.id
        WHERE ps.id = $1 AND ps.source_type = $2`,
        [fileId, 'uploaded']
      );

      if (fileResult.rows.length === 0) {
        throw createError('File not found', 404);
      }

      const file = fileResult.rows[0];

      // Resolve file path - handle both relative and absolute paths
      let filePath = file.file_path;
      
      console.log(`🔍 Original file path: ${filePath}`);
      console.log(`📁 Current working directory: ${process.cwd()}`);
      console.log(`📁 Is absolute path: ${path.isAbsolute(filePath)}`);

      // If it's an absolute path that starts with /app/uploads, try relative to backend
      if (filePath.startsWith('/app/uploads/')) {
        const relativePath = filePath.replace('/app/uploads/', '');
        filePath = path.resolve(process.cwd(), 'uploads', relativePath);
        console.log(`🔄 Converted absolute path to relative: ${filePath}`);
      } else if (!path.isAbsolute(filePath)) {
        // If it's a relative path, make it absolute from the current working directory
        filePath = path.resolve(process.cwd(), filePath);
        console.log(`🔄 Resolved relative path: ${filePath}`);
      }

      console.log(`🔍 Looking for file at: ${filePath}`);
      console.log(`📁 File exists: ${fs.existsSync(filePath)}`);

      // If file doesn't exist at the resolved path, try alternative locations
      if (!fs.existsSync(filePath)) {
        console.log(`🔄 Trying alternative paths...`);
        
        // Extract just the filename from the original path
        const fileName = path.basename(file.file_path);
        console.log(`📄 Filename: ${fileName}`);
        
        // Try with different base directories
        const alternativePaths = [
          path.resolve(process.cwd(), 'uploads', fileName), // Backend/uploads/filename
          path.resolve(process.cwd(), '..', 'uploads', fileName), // Parent/uploads/filename
          path.resolve('/app', 'uploads', fileName), // /app/uploads/filename
          path.resolve('/app', 'backend', 'uploads', fileName), // /app/backend/uploads/filename
        ];

        for (const altPath of alternativePaths) {
          console.log(`🔍 Trying alternative path: ${altPath}`);
          if (fs.existsSync(altPath)) {
            console.log(`✅ Found file at: ${altPath}`);
            filePath = altPath;
            break;
          }
        }

        // If still not found, check what files actually exist in upload directories
        const uploadDirs = [
          '/app/uploads',
          '/app/backend/uploads',
          path.resolve(process.cwd(), 'uploads'),
          path.resolve(process.cwd(), '..', 'uploads'),
        ];

        console.log(`🔍 Searching for file: ${fileName}`);
        for (const uploadDir of uploadDirs) {
          console.log(`📂 Checking upload directory: ${uploadDir}`);
          if (fs.existsSync(uploadDir)) {
            const files = fs.readdirSync(uploadDir);
            console.log(`📋 Files in ${uploadDir}:`, files.slice(0, 10)); // Show first 10 files
            console.log(`📊 Total files in ${uploadDir}: ${files.length}`);
            
            // Check if our target file is in this directory
            if (files.includes(fileName)) {
              const foundPath = path.resolve(uploadDir, fileName);
              console.log(`✅ Found target file in ${uploadDir}: ${foundPath}`);
              filePath = foundPath;
              break;
            } else {
              console.log(`❌ Target file ${fileName} not found in ${uploadDir}`);
            }
          } else {
            console.log(`❌ Directory does not exist: ${uploadDir}`);
          }
        }

        // If still not found, search for files with similar names
        if (!fs.existsSync(filePath)) {
          console.log(`🔍 Searching for files with similar names...`);
          for (const uploadDir of uploadDirs) {
            if (fs.existsSync(uploadDir)) {
              const files = fs.readdirSync(uploadDir);
              const similarFiles = files.filter(f => f.includes('files-1757064510663') || f.includes('140791562'));
              if (similarFiles.length > 0) {
                console.log(`🔍 Found similar files in ${uploadDir}:`, similarFiles);
              }
            }
          }
        }
      }

      // Final check if file exists
      if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found at: ${filePath}`);
        console.error(`❌ Original path: ${file.file_path}`);
        console.error(`❌ Current working directory: ${process.cwd()}`);
        throw createError('File not found on server', 404);
      }

      // Get file stats
      const stats = fs.statSync(filePath);
      const fileSize = stats.size;

      // Determine MIME type based on file extension
      const ext = path.extname(filePath).toLowerCase();
      let mimeType = 'application/octet-stream';
      
      switch (ext) {
        case '.pptx':
          mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
          break;
        case '.ppt':
          mimeType = 'application/vnd.ms-powerpoint';
          break;
        case '.pdf':
          mimeType = 'application/pdf';
          break;
      }

      // Set response headers
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Length', fileSize);
      res.setHeader('Content-Disposition', `attachment; filename="${file.title}${ext}"`);
      res.setHeader('Cache-Control', 'no-cache');

      // Log download event
      await logFileDownload(
        req.user!.id,
        fileId,
        file.title,
        fileSize,
        mimeType,
        file.industry,
        file.tags,
        req.ip,
        req.get('User-Agent')
      );

      // Stream file to response
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      fileStream.on('error', (error) => {
        console.error('Error streaming file:', error);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error downloading file' });
        }
      });

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  // Get trained documents list with download info
  getTrainedDocuments: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();

    try {
      const { status = 'trained', page = 1, limit = 20 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const result = await client.query(`
        SELECT 
          ps.id,
          ps.title,
          ps.description,
          ps.industry,
          ps.tags,
          ps.status,
          ps.file_path,
          ps.created_at,
          ps.updated_at,
          u.name as uploaded_by_name,
          u.email as uploaded_by_email,
          COUNT(se.id) as embedding_count,
          CASE 
            WHEN ps.file_path IS NOT NULL AND ps.file_path != '' THEN true 
            ELSE false 
          END as is_downloadable
        FROM presentation_sources ps
        LEFT JOIN users u ON ps.uploaded_by = u.id
        LEFT JOIN slide_embeddings se ON ps.id = se.source_id
        WHERE ps.source_type = 'uploaded' 
        AND ps.status = $1
        GROUP BY ps.id, ps.title, ps.description, ps.industry, ps.tags, 
                 ps.status, ps.file_path, ps.created_at, ps.updated_at, 
                 u.name, u.email
        ORDER BY ps.created_at DESC
        LIMIT $2 OFFSET $3
      `, [status, Number(limit), offset]);

      // Get total count
      const countResult = await client.query(
        'SELECT COUNT(*) as total FROM presentation_sources WHERE source_type = $1 AND status = $2',
        ['uploaded', status]
      );

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / Number(limit));

      const documents = result.rows.map(doc => ({
        id: doc.id,
        title: doc.title,
        description: doc.description,
        industry: doc.industry,
        tags: doc.tags,
        status: doc.status,
        isDownloadable: doc.is_downloadable,
        embeddingCount: parseInt(doc.embedding_count),
        uploadedBy: {
          name: doc.uploaded_by_name,
          email: doc.uploaded_by_email
        },
        createdAt: doc.created_at,
        updatedAt: doc.updated_at
      }));

      res.json({
        documents,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1
        }
      });

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  // Delete uploaded file
  deleteFile: async (req: AuthRequest, res: Response): Promise<void> => {
    const { fileId } = req.params;
    const client = await pool.connect();

    try {
      // Get file details
      const fileResult = await client.query(
        'SELECT * FROM presentation_sources WHERE id = $1 AND source_type = $2',
        [fileId, 'uploaded']
      );

      if (fileResult.rows.length === 0) {
        res.status(404).json({ message: 'File not found' });
        return;
      }

      const file = fileResult.rows[0];

      // Delete file from filesystem
      if (file.file_path) {
        const fs = require('fs');
        const path = require('path');
        const filePath = path.join(process.cwd(), file.file_path);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      // Log file deletion
      await logFileDeletion(
        req.user!.id,
        fileId,
        file.title || 'Unknown file',
        parseInt(file.metadata?.fileSize) || 0,
        'presentation',
        'Admin deletion',
        undefined,
        req.ip,
        req.get('User-Agent')
      );

      // Delete from database
      await client.query(
        'DELETE FROM presentation_sources WHERE id = $1',
        [fileId]
      );

      res.json({ message: 'File deleted successfully' });

    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }
};
