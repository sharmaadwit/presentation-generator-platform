import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import axios from 'axios';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export const scrapingController = {
  discoverPresentations: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { query, industry, maxResults = 20 } = req.body;

      // Call AI service to discover presentations
      const response = await axios.post(`${AI_SERVICE_URL}/scraping/discover`, {
        query,
        industry,
        maxResults
      });

      res.json({
        results: response.data.results,
        totalFound: response.data.results.length
      });

    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw createError(
          error.response?.data?.detail || 'Failed to discover presentations',
          error.response?.status || 500
        );
      }
      throw createError('Internal server error', 500);
    }
  },

  getScrapingStatus: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { taskId } = req.params;

      // Call AI service to get scraping status
      const response = await axios.get(`${AI_SERVICE_URL}/scraping/status/${taskId}`);

      res.json(response.data);

    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw createError(
          error.response?.data?.detail || 'Failed to get scraping status',
          error.response?.status || 500
        );
      }
      throw createError('Internal server error', 500);
    }
  },

  extractSlides: async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { urls, presentationId } = req.body;

      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        throw createError('URLs array is required', 400);
      }

      // Call AI service to extract slides
      const response = await axios.post(`${AI_SERVICE_URL}/scraping/extract`, {
        urls,
        presentationId
      });

      res.json({
        slides: response.data.slides,
        totalExtracted: response.data.slides.length
      });

    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw createError(
          error.response?.data?.detail || 'Failed to extract slides',
          error.response?.status || 500
        );
      }
      throw createError('Internal server error', 500);
    }
  }
};
