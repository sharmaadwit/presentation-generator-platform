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
import { trainingRoutes } from './routes/training';
import { connectDatabase } from './config/database';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);


// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:5000',
    'http://localhost:8000',
    'http://10.232.105.207:3000',
    'http://10.232.105.207:5000',
    'http://10.232.105.207:8000',
    process.env.FRONTEND_URL,
    process.env.AI_SERVICE_URL
  ].filter((url): url is string => Boolean(url)),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
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
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Logging
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: PORT,
    env: process.env.NODE_ENV || 'development'
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
app.use('/api/training', trainingRoutes);

// Serve static files from public directory
const publicPath = path.join(__dirname, '../../public');
app.use(express.static(publicPath));

// Serve simple HTML for all non-API routes
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/') || req.path === '/health') {
    return;
  }
  
  // Serve the simple HTML page
  res.sendFile(path.join(publicPath, 'index.html'));
});

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
