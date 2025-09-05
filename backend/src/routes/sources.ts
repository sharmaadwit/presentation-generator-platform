import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticateToken, requireSubscription } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { sourceController } from '../controllers/sourceController';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only presentation files
    const allowedTypes = [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/pdf'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PowerPoint and PDF files are allowed'));
    }
  }
});

const router = Router();

// All source routes require authentication
router.use(authenticateToken);

// Upload sources (available to all users)
router.post('/upload',
  upload.array('files', 10), // Max 10 files
  asyncHandler(sourceController.uploadSources)
);

// Get approved sources (available to all users)
router.get('/approved',
  asyncHandler(sourceController.getApprovedSources)
);

// Get all sources (admin only)
router.get('/',
  requireSubscription('admin'),
  asyncHandler(sourceController.getAllSources)
);

// Get sources by industry
router.get('/industry/:industry',
  asyncHandler(sourceController.getSourcesByIndustry)
);

// Approve source (admin only)
router.put('/:sourceId/approve',
  requireSubscription('admin'),
  asyncHandler(sourceController.approveSource)
);

// Reject source (admin only)
router.put('/:sourceId/reject',
  requireSubscription('admin'),
  asyncHandler(sourceController.rejectSource)
);

// Bulk action on sources (admin only)
router.post('/bulk-action',
  requireSubscription('admin'),
  asyncHandler(sourceController.bulkAction)
);

// Get source statistics
router.get('/stats',
  asyncHandler(sourceController.getSourceStats)
);

// Admin-only routes
router.use(requireSubscription('admin'));

// Add new source
router.post('/',
  asyncHandler(sourceController.addSource)
);

// Get pending sources for approval
router.get('/pending',
  asyncHandler(sourceController.getPendingSources)
);

// Update source status (approve/reject)
router.put('/:sourceId/status',
  asyncHandler(sourceController.updateSourceStatus)
);

// Delete source
router.delete('/:sourceId',
  asyncHandler(sourceController.deleteSource)
);

export { router as sourceRoutes };
