import { Router } from 'express';
import { authenticateToken, requireSubscription } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { analyticsController } from '../controllers/analyticsController';

const router = Router();

// All analytics routes require authentication
router.use(authenticateToken);

// Get dashboard metrics
router.get('/dashboard',
  asyncHandler(analyticsController.getDashboardMetrics)
);

// Get industry analytics
router.get('/industry/:industry',
  asyncHandler(analyticsController.getIndustryAnalytics)
);

// Get regional team analytics
router.get('/regional-team/:team',
  asyncHandler(analyticsController.getRegionalTeamAnalytics)
);

// Get source usage analytics
router.get('/sources',
  asyncHandler(analyticsController.getSourceUsageAnalytics)
);

// Get user activity analytics
router.get('/users',
  asyncHandler(analyticsController.getUserActivityAnalytics)
);

export { router as analyticsRoutes };
