import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { trainingController } from '../controllers/trainingController';

const router = Router();

// All training routes require authentication
router.use(authenticateToken);

// Get training status and statistics
router.get('/status',
  asyncHandler(trainingController.getTrainingStatus)
);

// Start training process
router.post('/start',
  asyncHandler(trainingController.startTraining)
);

// Get training progress
router.get('/progress',
  asyncHandler(trainingController.getTrainingProgress)
);

// Get training history
router.get('/history',
  asyncHandler(trainingController.getTrainingHistory)
);

// Clean up mock content
router.post('/cleanup',
  asyncHandler(trainingController.cleanupMockContent)
);

// Complete system cleanup
router.post('/cleanup-all',
  asyncHandler(trainingController.completeCleanup)
);

export { router as trainingRoutes };
