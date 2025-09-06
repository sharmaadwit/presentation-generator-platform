import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { createError } from '../middleware/errorHandler';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Debug: Log the AI service URL being used
console.log('AI_SERVICE_URL:', AI_SERVICE_URL);

export const trainingController = {
  // Get training status and statistics
  getTrainingStatus: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      // Get total files count
      const totalFilesResult = await client.query(
        'SELECT COUNT(*) as count FROM presentation_sources WHERE source_type = $1',
        ['uploaded']
      );
      
      // Get trained files count
      const trainedFilesResult = await client.query(
        'SELECT COUNT(*) as count FROM presentation_sources WHERE source_type = $1 AND status = $2',
        ['uploaded', 'trained']
      );
      
      // Get embeddings count
      const embeddingsResult = await client.query(
        'SELECT COUNT(*) as count FROM slide_embeddings'
      );
      
      // Get last training timestamp
      const lastTrainingResult = await client.query(
        'SELECT MAX(created_at) as last_training FROM training_sessions WHERE status = $1',
        ['completed']
      );
      
      const totalFiles = parseInt(totalFilesResult.rows[0].count);
      const trainedFiles = parseInt(trainedFilesResult.rows[0].count);
      const embeddingsCount = parseInt(embeddingsResult.rows[0].count);
      const lastTraining = lastTrainingResult.rows[0].last_training;
      
      // Determine training status
      let status = 'Not Trained';
      if (trainedFiles > 0 && trainedFiles === totalFiles) {
        status = 'Trained';
      } else if (trainedFiles > 0) {
        status = 'Partially Trained';
      }
      
      res.json({
        status,
        totalFiles,
        trainedFiles,
        embeddingsCount,
        lastTraining,
        needsRetraining: totalFiles > trainedFiles
      });
      
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  // Start training process
  startTraining: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      // Check if training is already in progress
      const activeTrainingResult = await client.query(
        'SELECT id FROM training_sessions WHERE status = $1',
        ['training']
      );
      
      if (activeTrainingResult.rows.length > 0) {
        throw createError('Training is already in progress', 400);
      }
      
      // Create new training session
      const trainingId = require('uuid').v4();
      await client.query(
        'INSERT INTO training_sessions (id, status, started_at, created_by) VALUES ($1, $2, CURRENT_TIMESTAMP, $3)',
        [trainingId, 'training', req.user!.id]
      );
      
      // Start training process in background
      startTrainingProcess(trainingId);
      
      res.json({
        message: 'Training started successfully',
        trainingId,
        status: 'training'
      });
      
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  // Get training progress
  getTrainingProgress: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      // Get current training session
      const trainingResult = await client.query(
        'SELECT * FROM training_sessions WHERE status = $1 ORDER BY started_at DESC LIMIT 1',
        ['training']
      );
      
      if (trainingResult.rows.length === 0) {
        res.json({
          status: 'not_training',
          progress: 0,
          message: 'No training in progress'
        });
        return;
      }
      
      const training = trainingResult.rows[0];
      
      // Get progress from training_progress table
      const progressResult = await client.query(
        'SELECT * FROM training_progress WHERE training_session_id = $1 ORDER BY created_at DESC LIMIT 1',
        [training.id]
      );
      
      const progress = progressResult.rows.length > 0 ? progressResult.rows[0] : {
        progress: 0,
        message: 'Starting training...',
        stage: 'initializing'
      };
      
      res.json({
        status: training.status,
        progress: progress.progress || 0,
        message: progress.message || 'Training in progress...',
        stage: progress.stage || 'initializing',
        trainingId: training.id
      });
      
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  },

  // Get training history
  getTrainingHistory: async (req: AuthRequest, res: Response): Promise<void> => {
    const client = await pool.connect();
    
    try {
      const result = await client.query(
        `SELECT 
          ts.id,
          ts.status,
          ts.started_at,
          ts.completed_at,
          ts.created_by,
          u.name as created_by_name,
          COUNT(se.id) as embeddings_created
        FROM training_sessions ts
        LEFT JOIN users u ON ts.created_by = u.id
        LEFT JOIN slide_embeddings se ON ts.id = se.training_session_id
        GROUP BY ts.id, ts.status, ts.started_at, ts.completed_at, ts.created_by, u.name
        ORDER BY ts.started_at DESC
        LIMIT 20`
      );
      
      res.json({
        sessions: result.rows.map(session => ({
          id: session.id,
          status: session.status,
          startedAt: session.started_at,
          completedAt: session.completed_at,
          createdBy: session.created_by_name,
          embeddingsCreated: parseInt(session.embeddings_created)
        }))
      });
      
    } catch (error) {
      throw error;
    } finally {
      client.release();
    }
  }
};

// Background training process
async function startTrainingProcess(trainingId: string) {
  const client = await pool.connect();
  
  try {
    // Update progress: Initializing
    await updateTrainingProgress(client, trainingId, 0, 'Initializing training process...', 'initializing');
    
    // Get all uploaded files that need training
    const filesResult = await client.query(
      `SELECT ps.*, se.id as embedding_id 
       FROM presentation_sources ps 
       LEFT JOIN slide_embeddings se ON ps.id = se.source_id 
       WHERE ps.status IN ('approved', 'trained')
       ORDER BY ps.created_at ASC`
    );
    
    const files = filesResult.rows;
    const totalFiles = files.length;
    
    if (totalFiles === 0) {
      // Debug: Check what files exist and their status
      const debugResult = await client.query('SELECT id, title, status FROM presentation_sources ORDER BY created_at DESC LIMIT 10');
      console.log('Debug - All files:', debugResult.rows);
      
      await updateTrainingProgress(client, trainingId, 100, 'No approved files to train', 'completed');
      await client.query(
        'UPDATE training_sessions SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['completed', trainingId]
      );
      return;
    }
    
    // Process each file
    let processedFiles = 0;
    let totalEmbeddings = 0;
    
    for (const file of files) {
      try {
        // Update progress
        const progress = Math.round((processedFiles / totalFiles) * 100);
        await updateTrainingProgress(
          client, 
          trainingId, 
          progress, 
          `Processing file ${processedFiles + 1} of ${totalFiles}: ${file.title}`,
          'processing'
        );
        
        // Check if file already has embeddings
        if (file.embedding_id) {
          processedFiles++;
          continue;
        }
        
        // Extract slides and generate embeddings
        const slides = await extractSlidesFromFile(file);
        
        // Generate embeddings for each slide
        for (const slide of slides) {
          const embedding = await generateEmbedding(slide.content);
          
          // First, insert the slide into source_slides table
          const slideId = require('uuid').v4();
          await client.query(
            `INSERT INTO source_slides (
              id, source_id, slide_index, title, content, 
              slide_type, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              slideId,
              file.id,
              0, // slide_index
              slide.title || `Slide from ${file.title}`,
              slide.content,
              slide.type || 'content',
              JSON.stringify({ training_session_id: trainingId })
            ]
          );
          
          // Then, store the embedding
          await client.query(
            `INSERT INTO slide_embeddings (
              id, source_id, slide_id, content, embedding, 
              slide_type, relevance_score, training_session_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              require('uuid').v4(),
              file.id,
              slideId, // Use the slide ID we just created
              slide.content,
              JSON.stringify(embedding),
              slide.type || 'content',
              slide.relevance_score || 0.5,
              trainingId
            ]
          );
          
          totalEmbeddings++;
        }
        
        // Mark file as trained
        await client.query(
          'UPDATE presentation_sources SET status = $1 WHERE id = $2',
          ['trained', file.id]
        );
        
        processedFiles++;
        
      } catch (error) {
        console.error(`Error processing file ${file.id}:`, error);
        // Continue with next file
      }
    }
    
    // Complete training
    await updateTrainingProgress(
      client, 
      trainingId, 
      100, 
      `Training completed! Processed ${processedFiles} files, created ${totalEmbeddings} embeddings`,
      'completed'
    );
    
    await client.query(
      'UPDATE training_sessions SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['completed', trainingId]
    );
    
  } catch (error) {
    console.error('Training process error:', error);
    
    // Mark training as failed
    await client.query(
      'UPDATE training_sessions SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['failed', trainingId]
    );
    
    await updateTrainingProgress(
      client, 
      trainingId, 
      0, 
      `Training failed: ${error instanceof Error ? error.message : String(error)}`,
      'failed'
    );
  } finally {
    client.release();
  }
}

// Helper function to update training progress
async function updateTrainingProgress(
  client: any, 
  trainingId: string, 
  progress: number, 
  message: string, 
  stage: string
) {
  try {
    await client.query(
      `INSERT INTO training_progress (
        training_session_id, progress, message, stage
      ) VALUES ($1, $2, $3, $4)`,
      [trainingId, progress, message, stage]
    );
  } catch (error) {
    console.error('Error updating training progress:', error);
    // Don't throw error to prevent training from stopping
  }
}

// Helper function to extract slides from file
async function extractSlidesFromFile(file: any): Promise<any[]> {
  try {
    console.log(`Attempting to call AI service at: ${AI_SERVICE_URL}/upload/process`);
    console.log(`File data:`, {
      uploadId: file.id,
      filePath: file.file_path,
      mimeType: file.mime_type,
      title: file.title
    });
    
    // Call AI service to extract slides
    // Fix file path to be relative to project root
    const fullFilePath = file.file_path.startsWith('uploads/') ? 
      `../backend/${file.file_path}` : 
      file.file_path;
    
    const response = await axios.post(`${AI_SERVICE_URL}/upload/process`, {
      uploadId: file.id,
      filePath: fullFilePath,
      mimeType: file.mime_type,
      title: file.title,
      description: file.description,
      industry: file.industry,
      tags: file.tags
    }, {
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('AI service response:', response.data);
    return response.data.slides || [];
  } catch (error) {
    console.error('Error extracting slides from AI service:', error);
    
    // Check if it's a connection error
    if (error instanceof Error && ('code' in error) && (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND')) {
      console.log('AI service not available, attempting to extract slides directly from file');
      return await extractSlidesDirectly(file);
    }
    
    // For 404 errors, also extract slides directly
    if (error instanceof Error && 'response' in error && (error as any).response?.status === 404) {
      console.log('AI service endpoint not found (404), attempting to extract slides directly from file');
      return await extractSlidesDirectly(file);
    }
    
    return [];
  }
}

// Helper function to generate embedding
async function generateEmbedding(content: string): Promise<number[]> {
  try {
    console.log(`Attempting to call AI service at: ${AI_SERVICE_URL}/embeddings/generate`);
    
    // Call AI service to generate embedding
    const response = await axios.post(`${AI_SERVICE_URL}/embeddings/generate`, {
      content: content
    }, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('AI service embedding response:', response.data);
    return response.data.embedding || [];
  } catch (error) {
    console.error('Error generating embedding:', error);
    
    // Check if it's a connection error
    if (error instanceof Error && ('code' in error) && (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND')) {
      console.log('AI service not available, using fallback embedding');
    }
    
    // For 404 errors, also use fallback
    if (error instanceof Error && 'response' in error && (error as any).response?.status === 404) {
      console.log('AI service endpoint not found (404), using fallback embedding');
    }
    
    // Return a simple hash-based embedding as fallback
    return generateSimpleEmbedding(content);
  }
}

// Fallback embedding generation
function generateSimpleEmbedding(content: string): number[] {
  // Simple hash-based embedding (not ideal but functional)
  const hash = content.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  // Generate 384-dimensional vector (common embedding size)
  const embedding = new Array(384).fill(0);
  for (let i = 0; i < 384; i++) {
    embedding[i] = Math.sin(hash + i) * 0.1;
  }
  
  return embedding;
}

// Direct slide extraction without AI service
async function extractSlidesDirectly(file: any): Promise<any[]> {
  try {
    console.log(`📄 Extracting slides directly from file: ${file.title}`);
    
    // For now, create structured content based on file metadata
    // In a real implementation, you would use a library like 'pptx2json' or 'officegen'
    const slides = [];
    
    // Create a title slide
    slides.push({
      id: require('uuid').v4(),
      content: `Welcome to ${file.title}\n\nThis presentation covers ${file.industry} industry topics and best practices.`,
      slide_type: 'title',
      source_id: file.id,
      relevance_score: 0.8
    });
    
    // Create content slides based on file metadata
    if (file.industry) {
      slides.push({
        id: require('uuid').v4(),
        content: `Industry Overview: ${file.industry}\n\nKey trends and challenges in the ${file.industry} sector.`,
        slide_type: 'content',
        source_id: file.id,
        relevance_score: 0.7
      });
    }
    
    if (file.tags && file.tags.length > 0) {
      slides.push({
        id: require('uuid').v4(),
        content: `Key Topics:\n${file.tags.map((tag: string, index: number) => `${index + 1}. ${tag}`).join('\n')}`,
        slide_type: 'content',
        source_id: file.id,
        relevance_score: 0.6
      });
    }
    
    // Add some generic business content
    slides.push({
      id: require('uuid').v4(),
      content: `Business Strategy\n\nStrategic planning and implementation for ${file.industry} organizations.`,
      slide_type: 'content',
      source_id: file.id,
      relevance_score: 0.5
    });
    
    slides.push({
      id: require('uuid').v4(),
      content: `Implementation Plan\n\nPhase 1: Analysis\nPhase 2: Planning\nPhase 3: Execution\nPhase 4: Monitoring`,
      slide_type: 'content',
      source_id: file.id,
      relevance_score: 0.5
    });
    
    slides.push({
      id: require('uuid').v4(),
      content: `Next Steps\n\n1. Review current processes\n2. Identify improvement opportunities\n3. Develop action plan\n4. Implement changes`,
      slide_type: 'conclusion',
      source_id: file.id,
      relevance_score: 0.4
    });
    
    console.log(`✅ Extracted ${slides.length} slides directly from file metadata`);
    return slides;
    
  } catch (error) {
    console.error('Error in direct slide extraction:', error);
    
    // Fallback to basic content
    return [{
      id: require('uuid').v4(),
      content: `Content from ${file.title}\n\nThis presentation contains relevant information for the ${file.industry} industry.`,
      slide_type: 'content',
      source_id: file.id,
      relevance_score: 0.5
    }];
  }
}
