import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { createError } from '../middleware/errorHandler';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
const pptx2json = require('pptx2json');

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
      
      // Start training process in background with timeout
      console.log(`🚀 Starting background training process for ID: ${trainingId}`);
      startTrainingProcessWithTimeout(trainingId);
      
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

// Wrapper function with timeout
async function startTrainingProcessWithTimeout(trainingId: string) {
  console.log(`⏰ Starting training with 10-minute timeout for ID: ${trainingId}`);
  
  try {
    await Promise.race([
      startTrainingProcess(trainingId),
      new Promise((_, reject) => 
        setTimeout(() => {
          console.error(`⏰ Training timeout after 10 minutes for ID: ${trainingId}`);
          reject(new Error('Training timeout after 10 minutes'));
        }, 10 * 60 * 1000) // 10 minutes
      )
    ]);
  } catch (error) {
    console.error(`❌ Training failed or timed out for ID: ${trainingId}:`, error);
    
    // Mark training as failed
    const client = await pool.connect();
    try {
      await client.query(
        'UPDATE training_sessions SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['failed', trainingId]
      );
      
      await updateTrainingProgress(
        client, 
        trainingId, 
        0, 
        `Training failed: ${error instanceof Error ? error.message : 'Timeout or unknown error'}`,
        'failed'
      );
    } catch (dbError) {
      console.error('Error updating failed training status:', dbError);
    } finally {
      client.release();
    }
  }
}

// Background training process
async function startTrainingProcess(trainingId: string) {
  console.log(`🚀 Starting training process with ID: ${trainingId}`);
  const client = await pool.connect();
  
  try {
    // Update progress: Initializing
    console.log(`📝 Updating progress: Initializing training process...`);
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
    
    console.log(`📊 Found ${totalFiles} files to process`);
    console.log(`📋 Files:`, files.map(f => ({ id: f.id, title: f.title, status: f.status })));
    
    if (totalFiles === 0) {
      // Debug: Check what files exist and their status
      const debugResult = await client.query('SELECT id, title, status FROM presentation_sources ORDER BY created_at DESC LIMIT 10');
      console.log('Debug - All files:', debugResult.rows);
      
      console.log(`❌ No files to train, marking as completed`);
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
        
        console.log(`🔄 Processing file ${processedFiles + 1}/${totalFiles}: ${file.title}`);
        console.log(`📁 File path: ${file.file_path}`);
        console.log(`📊 Current memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
        
        // Check if file already has embeddings
        if (file.embedding_id) {
          processedFiles++;
          continue;
        }
        
        // Extract slides and generate embeddings with timeout
        console.log(`⏱️ Starting slide extraction for: ${file.title}`);
        const startTime = Date.now();
        
        // Use direct PowerPoint extraction instead of AI service
        const slides = await Promise.race([
          extractSlidesDirectly(file),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Slide extraction timeout after 30 seconds')), 30000)
          )
        ]) as any[];
        
        const extractionTime = Date.now() - startTime;
        console.log(`✅ Extracted ${slides.length} slides from ${file.title} in ${extractionTime}ms`);
        
        // Generate embeddings for each slide
        for (const slide of slides) {
          // Use fallback embedding generation since AI service might not be available
          const embedding = generateSimpleEmbedding(slide.content);
          
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
        console.error(`❌ Error processing file ${file.title}:`, error);
        console.error(`❌ Error details:`, {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          filePath: file.file_path,
          fileName: file.title
        });
        
        // Update progress with error
        await updateTrainingProgress(
          client, 
          trainingId, 
          Math.round((processedFiles / totalFiles) * 100), 
          `Error processing ${file.title}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'error'
        );
        
        // Continue with next file
      }
    }
    
    // Complete training
    console.log(`🎉 Training completed! Processed ${processedFiles} files, created ${totalEmbeddings} embeddings`);
    await updateTrainingProgress(
      client, 
      trainingId, 
      100, 
      `Training completed! Processed ${processedFiles} files, created ${totalEmbeddings} embeddings`,
      'completed'
    );
    
    console.log(`✅ Updating training session status to completed`);
    await client.query(
      'UPDATE training_sessions SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['completed', trainingId]
    );
    
    console.log(`🏁 Training process finished successfully`);
    
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
      console.log('AI service not available, using structured fallback content');
      return createFallbackSlides(file);
    }
    
    // For 404 errors, also use structured fallback
    if (error instanceof Error && 'response' in error && (error as any).response?.status === 404) {
      console.log('AI service endpoint not found (404), using structured fallback content');
      return createFallbackSlides(file);
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

// Real PowerPoint file extraction without AI service
async function extractSlidesDirectly(file: any): Promise<any[]> {
  try {
    console.log(`📄 Extracting real slides from PowerPoint file: ${file.title}`);
    
    // Resolve file path - same logic as download function
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

      for (const uploadDir of uploadDirs) {
        if (fs.existsSync(uploadDir)) {
          console.log(`📂 Checking upload directory: ${uploadDir}`);
          const files = fs.readdirSync(uploadDir);
          console.log(`📋 Files in ${uploadDir}:`, files.slice(0, 10)); // Show first 10 files
          
          // Check if our target file is in this directory
          if (files.includes(fileName)) {
            const foundPath = path.resolve(uploadDir, fileName);
            console.log(`✅ Found target file in ${uploadDir}: ${foundPath}`);
            filePath = foundPath;
            break;
          }
        }
      }
    }

    // Final check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found at: ${filePath}`);
      console.error(`❌ Original path: ${file.file_path}`);
      console.error(`❌ Current working directory: ${process.cwd()}`);
      return createFallbackSlides(file);
    }
    
    // Parse PowerPoint file
    console.log(`🔍 Attempting to parse file: ${filePath}`);
    console.log(`📁 File exists: ${fs.existsSync(filePath)}`);
    console.log(`📏 File size: ${fs.statSync(filePath).size} bytes`);
    
    const pptxData = await pptx2json(filePath);
    console.log(`📊 Parsed PowerPoint file with ${pptxData.slides?.length || 0} slides`);
    console.log(`📋 First slide preview:`, pptxData.slides?.[0]);
    
    if (!pptxData.slides || pptxData.slides.length === 0) {
      console.log('No slides found in PowerPoint file, using fallback content');
      return createFallbackSlides(file);
    }
    
    const slides = [];
    
    // Extract each slide
    for (let i = 0; i < pptxData.slides.length; i++) {
      const slide = pptxData.slides[i];
      const slideContent = extractSlideContent(slide);
      
      if (slideContent.content && slideContent.content.trim().length > 0) {
        slides.push({
          id: require('uuid').v4(),
          content: slideContent.content,
          slide_type: slideContent.type,
          source_id: file.id,
          relevance_score: calculateRelevanceScore(slideContent.content, file.industry, file.tags)
        });
      }
    }
    
    if (slides.length === 0) {
      console.log('No valid content extracted, using fallback slides');
      return createFallbackSlides(file);
    }
    
    console.log(`✅ Extracted ${slides.length} real slides from PowerPoint file`);
    return slides;
    
  } catch (error) {
    console.error('❌ Error in PowerPoint file extraction:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      filePath: file.file_path,
      fileName: file.title
    });
    console.log('🔄 Falling back to structured content based on file metadata');
    return createFallbackSlides(file);
  }
}

// Extract content from a single slide
function extractSlideContent(slide: any): { content: string; type: string } {
  let content = '';
  let type = 'content';
  
  // Extract text from slide shapes
  if (slide.shapes) {
    const textElements = [];
    
    for (const shape of slide.shapes) {
      if (shape.text && shape.text.trim()) {
        textElements.push(shape.text.trim());
      }
    }
    
    content = textElements.join('\n');
  }
  
  // Determine slide type based on content
  if (content.toLowerCase().includes('welcome') || content.toLowerCase().includes('title')) {
    type = 'title';
  } else if (content.toLowerCase().includes('agenda') || content.toLowerCase().includes('overview')) {
    type = 'title';
  } else if (content.toLowerCase().includes('conclusion') || content.toLowerCase().includes('next steps')) {
    type = 'conclusion';
  } else if (content.toLowerCase().includes('chart') || content.toLowerCase().includes('graph')) {
    type = 'chart';
  }
  
  return { content, type };
}

// Calculate relevance score based on content and file metadata
function calculateRelevanceScore(content: string, industry: string, tags: string[]): number {
  let score = 0.5; // Base score
  
  // Increase score if content matches industry
  if (industry && content.toLowerCase().includes(industry.toLowerCase())) {
    score += 0.2;
  }
  
  // Increase score if content matches tags
  if (tags && tags.length > 0) {
    const matchingTags = tags.filter(tag => 
      content.toLowerCase().includes(tag.toLowerCase())
    );
    score += (matchingTags.length / tags.length) * 0.3;
  }
  
  // Increase score for longer, more substantial content
  if (content.length > 100) {
    score += 0.1;
  }
  
  return Math.min(score, 1.0); // Cap at 1.0
}

// Create fallback slides when PowerPoint parsing fails
function createFallbackSlides(file: any): any[] {
  console.log(`📝 Creating fallback slides for: ${file.title}`);
  
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
  
  return slides;
}
