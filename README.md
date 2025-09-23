# 🚀 Presentation Generator Platform

**AI-powered platform for automated presentation generation using pre-trained knowledge bases and vector embeddings.**

## ✨ Key Features

### 🧠 **AI Training System**
- **Train Now Button**: Process uploaded files and generate embeddings
- **Vector-Based Matching**: 5-10x faster presentation generation
- **Real-Time Progress**: Live training progress with statistics
- **Smart Fallback**: Works even when AI service is temporarily unavailable

### 🎨 **Presentation Generation**
- **Lightning-Fast**: Pre-trained embeddings eliminate real-time AI processing
- **Multi-User Support**: Multiple users can generate presentations simultaneously
- **Custom Content**: Tailored to specific industries, use cases, and audiences
- **Download Ready**: Generated presentations ready for immediate use

### 📊 **Admin Dashboard**
- **Training Statistics**: Total files, trained files, and embeddings count
- **Progress Tracking**: Real-time training progress with visual indicators
- **File Management**: Upload, approve, and manage training content
- **Analytics**: Track usage, performance, and training effectiveness

## 🏗️ Architecture

### **Frontend (HTML/JavaScript)**
- **Modern UI**: Clean, responsive interface with progress tracking
- **Real-Time Updates**: WebSocket connections for live progress
- **File Management**: Drag-and-drop uploads and file organization
- **Training Interface**: Visual training progress and statistics

### **Backend (Node.js/Express)**
- **RESTful APIs**: Complete API for all operations
- **Database Management**: PostgreSQL with optimized schemas
- **Authentication**: JWT-based user authentication
- **Background Processing**: Async training and generation tasks

### **AI Service (Python/FastAPI)**
- **Embedding Generation**: Creates vector representations of content
- **Content Matching**: Semantic search for relevant slides
- **Presentation Assembly**: Combines slides into final presentations
- **Smart Routing**: Chooses between pre-trained and real-time generation

### **Database (PostgreSQL)**
- **User Management**: Users, authentication, and permissions
- **Content Storage**: Presentations, sources, and metadata
- **Training Data**: Embeddings, training sessions, and progress
- **Analytics**: Usage tracking and performance metrics

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+
- PostgreSQL

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd presentation-generator-platform

# Install all dependencies
npm run install:all

# Start development servers
npm run dev
```

### Production Deployment
```bash
# Build and start
npm run build
npm start

# Or use the production script
npm run start:production
```

## 📁 Project Structure

```
presentation-generator-platform/
├── public/                     # HTML frontend
│   ├── index.html             # Main application with training UI
│   └── js/
│       └── app.js             # Frontend JavaScript with training logic
├── backend/                   # Node.js API server
│   ├── src/
│   │   ├── controllers/       # API controllers
│   │   │   ├── trainingController.ts  # Training system logic
│   │   │   ├── presentationController.ts
│   │   │   └── uploadController.ts
│   │   ├── routes/            # API routes
│   │   │   └── training.ts    # Training API endpoints
│   │   ├── config/
│   │   │   └── database.ts    # Database schema with training tables
│   │   └── index.ts           # Server entry point
│   └── package.json
├── ai-service/                # Python AI service
│   ├── app.py                # AI service with embedding generation
│   ├── models/
│   │   └── database.py       # Database manager with query support
│   └── requirements.txt      # Python dependencies
├── start.sh                  # Production startup script
├── setup.sh                  # Dependency installation script
└── package.json              # Root package configuration
```

## 🌐 Frontend Features

### **Presentation Generation**
- **Generate & Download**: Create AI-powered presentations
- **Real-Time Progress**: Live generation progress with status updates
- **Custom Parameters**: Industry, use case, audience, and style selection

### **Training System**
- **Train Now Button**: Start training process with visual feedback
- **Progress Tracking**: Real-time progress bars and status messages
- **Statistics Dashboard**: Total files, trained files, and embeddings count
- **Training History**: View past training sessions and results

### **File Management**
- **Upload & Analyze**: Upload existing presentations for training
- **File Organization**: Manage uploaded files with approval system
- **Drag & Drop**: Easy file upload interface

## 🔐 Authentication

- **Demo Login**: Use any email with password `letmein123`
- **Upload Features**: Requires login for file upload and analysis
- **Admin Access**: Training features available to authenticated users

## 🛠️ API Endpoints

### **Presentation Generation**
- `POST /api/presentations/generate` - Generate new presentation
- `GET /api/presentations/:id/download` - Download presentation
- `GET /api/presentations/:id/progress` - Get generation progress

### **Training System**
- `POST /api/training/start` - Start training process
- `GET /api/training/status` - Get training status and statistics
- `GET /api/training/progress/:id` - Get specific training progress
- `POST /api/embeddings/generate` - Generate embeddings for content

### **File Management**
- `POST /api/sources/upload` - Upload source files
- `GET /api/sources/approved` - Get approved sources
- `GET /api/upload/files` - Get all uploaded files
- `DELETE /api/upload/files/:id` - Delete uploaded file

### **Authentication**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

## 🚀 Deployment

### **AWS Deployment (Current)**
The application is configured for AWS deployment with:
- **App Runner**: Fully managed container service
- **S3**: Object storage for file persistence
- **RDS**: PostgreSQL database
- **IAM Roles**: Secure credential management

### **Railway Deployment (Commented Out)**
<!-- Railway deployment configuration has been commented out for AWS migration
The application is configured for Railway deployment with:
- **Nixpacks**: Automatic Node.js and Python detection
- **Startup Script**: Runs both backend and AI service
- **Database**: PostgreSQL integration
- **Health Checks**: Automatic service monitoring

### **Environment Variables**
```bash
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
UPLOAD_DIR=./uploads
AI_SERVICE_URL=http://localhost:8000
```
-->

### **AWS Environment Variables**
```bash
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
OPENAI_API_KEY=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
```

## 🎯 Usage Guide

### **1. Training the System**
1. **Login** to access admin features
2. **Upload Files** using the file management section
3. **Click "Train Now"** to start the training process
4. **Monitor Progress** with real-time updates
5. **Wait for Completion** - system will process all files

### **2. Generating Presentations**
1. **Visit** the "Generate & Download" tab
2. **Fill Parameters**: Use case, industry, customer, audience
3. **Click Generate** - system will use pre-trained data
4. **Download** the generated presentation

### **3. Managing Content**
1. **Upload Files** for training data
2. **Approve Content** in the admin dashboard
3. **Monitor Statistics** for system health
4. **Retrain** when new content is added

## 🔧 Development

### **Local Development**
```bash
# Backend development
cd backend && npm run dev

# AI service development
cd ai-service && python app.py

# Frontend development
# Edit files in public/ directory
```

### **Testing**
```bash
# Test training system
curl -X POST http://localhost:5000/api/training/start

# Test generation
curl -X POST http://localhost:5000/api/presentations/generate
```

## 📊 Performance Benefits

### **Speed Improvements**
- **5-10x Faster**: Pre-trained embeddings vs real-time AI
- **Instant Results**: Presentations generated in seconds
- **Concurrent Processing**: Multiple users supported

### **Scalability**
- **Background Training**: Non-blocking training process
- **Vector Storage**: Efficient content retrieval
- **Smart Caching**: Reduced computational load

### **Reliability**
- **Fallback System**: Works when AI service unavailable
- **Error Handling**: Robust error recovery
- **Progress Tracking**: Real-time status updates

## 🎯 Use Cases

### **Enterprise Training**
- **Onboarding Materials**: Generate consistent training presentations
- **Sales Decks**: Create industry-specific sales materials
- **Compliance Training**: Generate regulatory and policy presentations

### **Marketing Teams**
- **Campaign Materials**: Create targeted marketing presentations
- **Client Proposals**: Generate customized proposal decks
- **Event Materials**: Create conference and webinar presentations

### **Educational Institutions**
- **Course Materials**: Generate curriculum-aligned presentations
- **Research Presentations**: Create academic and research decks
- **Student Projects**: Help students create professional presentations

## 🔮 Future Capabilities

- **Continuous Learning**: System improves with each new upload
- **Industry Specialization**: Tailored content for specific sectors
- **Multi-Language Support**: International expansion ready
- **API Integration**: Connect with other business systems
- **Advanced Analytics**: Detailed insights into content usage

## 📄 License

MIT License - see LICENSE file for details.

---

**Transform your presentation creation from hours of manual work into seconds of automated, intelligent generation using your own curated knowledge base.**