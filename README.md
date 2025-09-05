# Presentation Generator Platform

AI-powered platform for automated presentation generation from existing slides.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+
- PostgreSQL (optional)

### Installation
```bash
# Install dependencies
npm run install:all

# Start development servers
npm run dev
```

### Production
```bash
# Build and start
npm run build
npm start
```

## 📁 Project Structure

```
presentation-generator-platform/
├── public/                 # HTML frontend
│   ├── index.html         # Main application
│   └── js/
│       └── app.js         # Frontend JavaScript
├── backend/               # Node.js API server
│   ├── src/
│   │   ├── controllers/   # API controllers
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Express middleware
│   │   └── index.ts       # Server entry point
│   └── package.json
├── ai-service/            # Python AI service
│   ├── app.py            # AI service entry point
│   └── requirements.txt  # Python dependencies
└── package.json          # Root package configuration
```

## 🌐 Frontend Features

- **Generate & Download**: Create AI-powered presentations
- **Upload & Analyze**: Upload existing presentations (login required)
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-time Feedback**: Progress bars and notifications

## 🔐 Authentication

- **Demo Login**: Use any email with password `letmein123`
- **Upload Features**: Requires login for file upload and analysis

## 🛠️ API Endpoints

### Generate Presentations
- `POST /api/presentations/generate` - Generate new presentation
- `GET /api/presentations/:id/download` - Download presentation

### Upload & Sources
- `POST /api/sources/upload` - Upload source files
- `GET /api/sources/approved` - Get approved sources

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

## 🚀 Deployment

The application is configured for Railway deployment with:
- **Nixpacks**: Automatic Node.js and Python detection
- **HTML Frontend**: Served by Express backend
- **Database**: PostgreSQL integration
- **AI Service**: Python service for AI functionality

## 📝 Environment Variables

Create a `.env` file with:
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
UPLOAD_DIR=./uploads
```

## 🎯 Usage

1. **Visit the application** at your deployed URL
2. **Generate presentations** using the "Generate & Download" tab
3. **Login** to access upload features
4. **Upload files** for AI analysis (authorized users only)

## 🔧 Development

```bash
# Backend development
cd backend && npm run dev

# AI service development
cd ai-service && python app.py

# Frontend development
# Edit files in public/ directory
```

## 📄 License

MIT License - see LICENSE file for details.