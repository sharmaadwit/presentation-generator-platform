import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { scrapingController } from '../controllers/scrapingController';

const router = Router();

// All scraping routes require authentication
router.use(authenticateToken);

// Discover presentations
router.post('/discover',
  asyncHandler(scrapingController.discoverPresentations)
);

// Get scraping status
router.get('/status/:taskId',
  asyncHandler(scrapingController.getScrapingStatus)
);

// Extract slides from URLs
router.post('/extract',
  asyncHandler(scrapingController.extractSlides)
);

export { router as scrapingRoutes };
