import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { pool } from '../config/database';
import { createError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import PptxGenJS from 'pptxgenjs';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

console.log('AI_SERVICE_URL configured as:', AI_SERVICE_URL);

// Helper function to get color scheme based on presentation style
const getColorScheme = (style: string) => {
  const schemes = {
    professional: {
      primary: '1f4e79',
      secondary: '7f7f7f',
      background: 'ffffff',
      text: '2f2f2f'
    },
    creative: {
      primary: 'e74c3c',
      secondary: 'f39c12',
      background: 'f8f9fa',
      text: '2c3e50'
    },
    modern: {
      primary: '2c3e50',
      secondary: '3498db',
      background: 'ffffff',
      text: '34495e'
    },
    corporate: {
      primary: '1a365d',
      secondary: '2d3748',
      background: 'ffffff',
      text: '2d3748'
    },
    minimal: {
      primary: '000000',
      secondary: '666666',
      background: 'ffffff',
      text: '333333'
    }
  };
  
  return schemes[style as keyof typeof schemes] || schemes.professional;
};

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

      // Get slides for this presentation
      const slidesResult = await client.query(
        'SELECT * FROM slides WHERE presentation_id = $1 ORDER BY order_index',
        [id]
      );
      
      const slides = slidesResult.rows;
      
      if (slides.length === 0) {
        throw createError('No slides found for this presentation', 404);
      }

      // Generate filename based on presentation data
      const filename = `${presentation.customer}_${presentation.industry}_presentation.pptx`;
      
      // Create actual PowerPoint presentation using pptxgenjs
      const pptx = new PptxGenJS();
      
      // Set presentation properties
      pptx.author = 'Presentation Generator Platform';
      pptx.company = 'AI-Powered Presentation System';
      pptx.subject = presentation.use_case;
      pptx.title = presentation.title;
      
      // Define color scheme based on style
      const colorScheme = getColorScheme(presentation.style);
      
      // Add slides to presentation
      slides.forEach((slide, index) => {
        const slideObj = pptx.addSlide();
        
        // Set slide background
        slideObj.background = { color: colorScheme.background };
        
        if (slide.slide_type === 'title') {
          // Title slide
          slideObj.addText(slide.title, {
            x: 1,
            y: 2,
            w: 8,
            h: 1.5,
            fontSize: 32,
            bold: true,
            color: colorScheme.primary,
            align: 'center'
          });
          
          slideObj.addText(slide.content, {
            x: 1,
            y: 3.5,
            w: 8,
            h: 2,
            fontSize: 16,
            color: colorScheme.text,
            align: 'center'
          });
        } else {
          // Content slide
          slideObj.addText(slide.title, {
            x: 0.5,
            y: 0.5,
            w: 9,
            h: 0.8,
            fontSize: 24,
            bold: true,
            color: colorScheme.primary
          });
          
          // Split content into bullet points
          const bulletPoints = slide.content.split('\n').filter((line: string) => line.trim());
          let yPos = 1.5;
          
          bulletPoints.forEach((point: string) => {
            if (point.trim()) {
              slideObj.addText(`• ${point.trim()}`, {
                x: 0.8,
                y: yPos,
                w: 8.4,
                h: 0.4,
                fontSize: 14,
                color: colorScheme.text,
                bullet: true
              });
              yPos += 0.5;
            }
          });
        }
        
        // Add slide number
        slideObj.addText(`${index + 1}`, {
          x: 8.5,
          y: 6.5,
          w: 1,
          h: 0.5,
          fontSize: 12,
          color: colorScheme.secondary,
          align: 'right'
        });
      });
      
      // Generate the PowerPoint file
      const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
      
      // Set headers for PowerPoint file download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      
      // Send the actual PowerPoint file
      res.send(buffer);
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
    console.log(`🚀 Starting presentation generation for: ${presentationId}`);
    console.log(`🔗 AI Service URL: ${AI_SERVICE_URL}`);
    
    // Update presentation status to generating
    const client = await pool.connect();
    try {
      await client.query(
        'UPDATE presentations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['generating', presentationId]
      );
    } finally {
      client.release();
    }

    // Try to call AI service
    try {
      const response = await axios.post(`${AI_SERVICE_URL}/generate`, {
        presentationId,
        ...requestData
      }, {
        timeout: 10000 // 10 second timeout
      });

      console.log('✅ AI service response:', response.data);
      
      // Start polling for completion
      pollForCompletion(presentationId);
      return;
    } catch (aiError) {
      const errorMessage = aiError instanceof Error ? aiError.message : 'Unknown error';
      console.warn('⚠️ AI service not available, using fallback generation:', errorMessage);
      
      // Fallback: Create a simple presentation using the existing trained data
      await generateFallbackPresentation(presentationId, requestData);
    }
  } catch (error) {
    console.error('❌ Presentation generation failed:', error);
    
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

// Poll for presentation completion
const pollForCompletion = async (presentationId: string): Promise<void> => {
  const maxAttempts = 60; // 5 minutes max
  let attempts = 0;

  const poll = async () => {
    try {
      attempts++;
      
      // Get progress from AI service
      const progressResponse = await axios.get(`${AI_SERVICE_URL}/progress/${presentationId}`);
      const progress = progressResponse.data;
      
      console.log(`🔄 POLLING ATTEMPT ${attempts}/${maxAttempts}:`);
      console.log(`   - Stage: ${progress.stage}`);
      console.log(`   - Progress: ${progress.progress}%`);
      console.log(`   - Message: ${progress.message}`);

      if (progress.stage === 'completed') {
        console.log(`✅ PRESENTATION COMPLETED: ${presentationId}`);
        console.log(`   - Final Progress: ${progress.progress}%`);
        console.log(`   - Final Message: ${progress.message}`);
        
        // Update presentation status to completed
        const client = await pool.connect();
        try {
          await client.query(
            'UPDATE presentations SET status = $1, download_url = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            ['completed', `/api/presentations/${presentationId}/download`, presentationId]
          );
          console.log(`✅ Database updated - Presentation ready for download`);
        } finally {
          client.release();
        }
        return;
      } else if (progress.stage === 'failed') {
        console.log(`❌ PRESENTATION FAILED: ${presentationId}`);
        console.log(`   - Error Message: ${progress.message}`);
        
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
        return;
      }

      // Continue polling if not completed and not failed
      if (attempts < maxAttempts) {
        setTimeout(poll, 5000); // Poll every 5 seconds
      } else {
        // Timeout
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
    } catch (error) {
      console.error('Error polling for completion:', error);
      
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

  // Start polling after 2 seconds
  setTimeout(poll, 2000);
};

// Fallback presentation generation when AI service is not available
const generateFallbackPresentation = async (presentationId: string, requestData: any): Promise<void> => {
  try {
    console.log(`🔄 Generating fallback presentation for: ${presentationId}`);
    
    const { useCase, customer, industry, presentationLength, style } = requestData;
    
    // Create a simple text-based presentation content
    const slideCount = presentationLength === 'short' ? 5 : presentationLength === 'medium' ? 10 : 15;
    const slides = [];
    
    // Generate basic slides
    slides.push({
      title: `Welcome to ${customer}`,
      content: `This presentation covers ${useCase} for ${customer} in the ${industry} industry.`,
      slideType: 'title'
    });
    
    slides.push({
      title: 'Agenda',
      content: `1. Introduction\n2. Problem Statement\n3. Solution Overview\n4. Implementation Plan\n5. Next Steps`,
      slideType: 'content'
    });
    
    slides.push({
      title: 'Problem Statement',
      content: `Understanding the challenges faced by ${customer} in the ${industry} sector.`,
      slideType: 'content'
    });
    
    slides.push({
      title: 'Solution Overview',
      content: `Our proposed solution addresses the key challenges through innovative approaches.`,
      slideType: 'content'
    });
    
    slides.push({
      title: 'Implementation Plan',
      content: `Phase 1: Analysis\nPhase 2: Design\nPhase 3: Development\nPhase 4: Testing\nPhase 5: Deployment`,
      slideType: 'content'
    });
    
    // Add more slides based on length
    if (slideCount > 5) {
      for (let i = 6; i <= slideCount; i++) {
        slides.push({
          title: `Key Point ${i - 5}`,
          content: `Important information and insights for ${customer}.`,
          slideType: 'content'
        });
      }
    }
    
    // Create presentation file content
    const presentationContent = {
      title: `${customer} - ${industry} Presentation`,
      slides: slides,
      metadata: {
        generatedAt: new Date().toISOString(),
        presentationId: presentationId,
        style: style,
        industry: industry
      }
    };
    
    // Save presentation data to database
    const client = await pool.connect();
    try {
      // Save slides to database
      for (let i = 0; i < slides.length; i++) {
        await client.query(
          `INSERT INTO slides (id, presentation_id, title, content, slide_type, order_index, extracted_at)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
          [uuidv4(), presentationId, slides[i].title, slides[i].content, slides[i].slideType, i + 1]
        );
      }
      
      // Update presentation status to completed
      await client.query(
        'UPDATE presentations SET status = $1, download_url = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        ['completed', `/api/presentations/${presentationId}/download`, presentationId]
      );
      
      console.log(`✅ Fallback presentation completed: ${presentationId}`);
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Fallback presentation generation failed:', error);
    
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
