import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/auth';
import { presentationRoutes } from './routes/presentations';
import { scrapingRoutes } from './routes/scraping';
import { userRoutes } from './routes/user';
import { uploadRoutes } from './routes/upload';
import { sourceRoutes } from './routes/sources';
import { analyticsRoutes } from './routes/analytics';
import { connectDatabase } from './config/database';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);


// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/presentations', presentationRoutes);
app.use('/api/scraping', scrapingRoutes);
app.use('/api/user', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/sources', sourceRoutes);
app.use('/api/analytics', analyticsRoutes);

// Serve static files from frontend build (if it exists)
const frontendBuildPath = path.join(__dirname, '../../frontend-build');
const frontendIndexPath = path.join(frontendBuildPath, 'index.html');

// Check if frontend build exists
console.log('Frontend build path:', frontendBuildPath);
console.log('Frontend index path:', frontendIndexPath);
console.log('Frontend build exists:', require('fs').existsSync(frontendIndexPath));

if (require('fs').existsSync(frontendIndexPath)) {
  console.log('Serving frontend from:', frontendBuildPath);
  app.use(express.static(frontendBuildPath));
  
  // Catch all handler: send back React's index.html file for client-side routing
  app.get('*', (req, res) => {
    console.log('Serving frontend for route:', req.path);
    res.sendFile(frontendIndexPath);
  });
} else {
  console.log('Frontend build not found, serving API-only mode');
  // Fallback: serve a simple API-only response
  app.get('*', (req, res) => {
    res.json({
      message: 'Presentation Generator API is running!',
      status: 'success',
      frontend: 'Not available - API only mode',
      endpoints: {
        health: '/health',
        api: '/api/*'
      }
    });
  });
}

// Error handling middleware
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Try to connect to database, but don't fail if it's not available
    try {
      await connectDatabase();
    } catch (dbError) {
      console.warn('Database connection failed, starting server without database:', dbError);
    }
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
