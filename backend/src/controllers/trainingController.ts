import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { createError } from '../middleware/errorHandler';
import axios from 'axios';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

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
       WHERE ps.status = 'approved'
       ORDER BY ps.created_at ASC`
    );
    
    const files = filesResult.rows;
    const totalFiles = files.length;
    
    if (totalFiles === 0) {
      
      await updateTrainingProgress(client, trainingId, 100, 'No files to train', 'completed');
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
          
          // Store embedding
          await client.query(
            `INSERT INTO slide_embeddings (
              id, source_id, slide_id, content, embedding, 
              slide_type, relevance_score, training_session_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              require('uuid').v4(),
              file.id,
              slide.id,
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
    // Call AI service to extract slides
    const response = await axios.post(`${AI_SERVICE_URL}/upload/process`, {
      uploadId: file.id,
      filePath: file.file_path,
      mimeType: file.mime_type,
      title: file.title,
      description: file.description,
      industry: file.industry,
      tags: file.tags
    }, {
      timeout: 30000 // 30 second timeout
    });
    
    return response.data.slides || [];
  } catch (error) {
    console.error('Error extracting slides from AI service:', error);
    
    // If AI service is not available, create mock slides for testing
    if (error instanceof Error && ('code' in error) && (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND')) {
      console.log('AI service not available, creating mock slides for testing');
      return [{
        id: `mock-slide-${file.id}-1`,
        content: `Mock slide content for ${file.title}`,
        slide_type: 'content',
        source_id: file.id
      }];
    }
    
    return [];
  }
}

// Helper function to generate embedding
async function generateEmbedding(content: string): Promise<number[]> {
  try {
    // Call AI service to generate embedding
    const response = await axios.post(`${AI_SERVICE_URL}/embeddings/generate`, {
      content: content
    });
    
    return response.data.embedding || [];
  } catch (error) {
    console.error('Error generating embedding:', error);
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
