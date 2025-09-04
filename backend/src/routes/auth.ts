import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authController } from '../controllers/authController';
import { validateRegistration, validateLogin } from '../middleware/validation';

const router = Router();

// Register new user
router.post('/register',
  validateRegistration,
  asyncHandler(authController.register)
);

// Login user
router.post('/login',
  validateLogin,
  asyncHandler(authController.login)
);

// Refresh token
router.post('/refresh',
  asyncHandler(authController.refreshToken)
);

// Logout user
router.post('/logout',
  asyncHandler(authController.logout)
);

// Get current user
router.get('/me',
  asyncHandler(authController.getCurrentUser)
);

export { router as authRoutes };
