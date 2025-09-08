import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { userController } from '../controllers/userController';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);

// Get user profile
router.get('/profile',
  asyncHandler(userController.getProfile)
);

// Update user profile
router.put('/profile',
  asyncHandler(userController.updateProfile)
);

// Get user statistics
router.get('/stats',
  asyncHandler(userController.getUserStats)
);

// Update subscription
router.put('/subscription',
  asyncHandler(userController.updateSubscription)
);

// Reset presentation limit (for testing/development)
router.post('/reset-limit',
  asyncHandler(userController.resetPresentationLimit)
);

export { router as userRoutes };
