import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { uploadController } from '../controllers/uploadController';
import multer from 'multer';
import path from 'path';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    // Ensure directory exists
    const fs = require('fs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
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

// All upload routes require authentication
router.use(authenticateToken);

// Upload presentation file
router.post('/presentation',
  upload.single('presentation'),
  asyncHandler(uploadController.uploadPresentation)
);

// Upload multiple presentations
router.post('/presentations',
  upload.array('presentations', 10), // Max 10 files
  asyncHandler(uploadController.uploadMultiplePresentations)
);

// Get uploaded presentations
router.get('/presentations',
  asyncHandler(uploadController.getUploadedPresentations)
);

// Process uploaded presentation
router.post('/process/:uploadId',
  asyncHandler(uploadController.processUploadedPresentation)
);

// Delete uploaded presentation
router.delete('/:uploadId',
  asyncHandler(uploadController.deleteUploadedPresentation)
);

// Get all uploaded files for admin
router.get('/files',
  asyncHandler(uploadController.getAllFiles)
);

// Delete uploaded file
router.delete('/files/:fileId',
  asyncHandler(uploadController.deleteFile)
);

// Download trained document
router.get('/download/:fileId',
  asyncHandler(uploadController.downloadTrainedDocument)
);

// Get trained documents list
router.get('/trained',
  asyncHandler(uploadController.getTrainedDocuments)
);

export { router as uploadRoutes };
