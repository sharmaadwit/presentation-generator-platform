import { Router } from 'express';
import { authenticateToken, requireSubscription } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { presentationController } from '../controllers/presentationController';
import { validatePresentationRequest } from '../middleware/validation';

const router = Router();

// All presentation routes require authentication
router.use(authenticateToken);

// Generate new presentation
router.post('/generate', 
  validatePresentationRequest,
  asyncHandler(presentationController.generatePresentation)
);

// Get user's presentations
router.get('/', 
  asyncHandler(presentationController.getUserPresentations)
);

// Get specific presentation
router.get('/:id', 
  asyncHandler(presentationController.getPresentation)
);

// Get generation progress
router.get('/:id/progress', 
  asyncHandler(presentationController.getGenerationProgress)
);

// Download presentation
router.get('/:id/download', 
  asyncHandler(presentationController.downloadPresentation)
);

// Delete presentation
router.delete('/:id', 
  asyncHandler(presentationController.deletePresentation)
);

// Regenerate presentation (Pro+ feature)
router.post('/:id/regenerate', 
  requireSubscription('pro'),
  asyncHandler(presentationController.regeneratePresentation)
);

export { router as presentationRoutes };
