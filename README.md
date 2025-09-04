# 🎯 Presentation Generator Platform

An AI-powered web platform that automatically generates custom presentations by scraping existing presentations, extracting relevant slides, and creating new decks based on user-specified use cases, customers, and industries.

## ✨ Features

- **🤖 Smart Discovery**: Automatically finds relevant presentations from various sources (SlideShare, SpeakerDeck, Prezi, etc.)
- **🧠 AI-Powered Extraction**: Uses machine learning to identify and extract matching slides
- **🎨 Custom Generation**: Creates tailored presentations based on user requirements
- **🏢 Industry-Specific**: Supports multiple industries and use cases
- **⚡ Real-time Processing**: Fast generation with progress tracking
- **📊 KPI Integration**: Incorporates user-specified KPIs and markers
- **🎭 Style Customization**: Professional, creative, minimalist, and corporate styles

## 🏗️ Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **AI Service**: Python + FastAPI + OpenAI GPT
- **Database**: PostgreSQL
- **Web Scraping**: Playwright + BeautifulSoup
- **File Processing**: python-pptx, Pillow
- **ML/AI**: scikit-learn, OpenAI GPT-4 API

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.8+
- PostgreSQL 12+
- Git

### 1. Clone and Setup

```bash
git clone <repository-url>
cd presentation-generator-platform
chmod +x setup.sh
./setup.sh
```

### 2. Configure Environment

```bash
cp env.example .env
# Edit .env with your configuration
```

Required environment variables:
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/presentation_generator

# AI Services (OpenAI only)
OPENAI_API_KEY=your_openai_api_key_here

# JWT
JWT_SECRET=your_super_secret_jwt_key_here

# Service URLs
FRONTEND_URL=http://localhost:3000
AI_SERVICE_URL=http://localhost:8000
```

### 3. Setup Database

```bash
# Create PostgreSQL database
createdb presentation_generator

# The application will automatically create tables on first run
```

### 4. Start Services

```bash
# Terminal 1 - Frontend
cd frontend && npm start

# Terminal 2 - Backend
cd backend && npm run dev

# Terminal 3 - AI Service
cd ai-service && python app.py
```

### 5. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **AI Service**: http://localhost:8000

## 📁 Project Structure

```
presentation-generator-platform/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API services
│   │   └── types/          # TypeScript types
│   └── package.json
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   └── config/         # Configuration
│   └── package.json
├── ai-service/             # Python AI/ML service
│   ├── services/           # AI services
│   ├── models/             # Database models
│   └── requirements.txt
├── shared/                 # Shared types and utilities
├── generated_presentations/ # Output directory
└── docs/                   # Documentation
```

## 🔧 How It Works

### 1. User Input
Users provide:
- **Use Case**: What the presentation is for
- **Customer/Company**: Target company name
- **Industry**: Specific industry sector
- **Target Audience**: Who will view it
- **KPIs & Markers**: Key performance indicators
- **Style**: Professional, creative, minimalist, or corporate
- **Additional Requirements**: Custom specifications

### 2. Smart Discovery
- AI searches multiple presentation sources (SlideShare, SpeakerDeck, Prezi, etc.)
- Uses semantic search to find relevant presentations
- Ranks results by relevance to user requirements

### 3. Slide Extraction
- Web scraping extracts individual slides from discovered presentations
- OCR and content analysis extract text and metadata
- Images and charts are preserved and analyzed

### 4. AI Matching
- Machine learning algorithms score slides for relevance
- OpenAI/Anthropic APIs enhance content matching
- Slides are ranked and filtered based on user requirements

### 5. Presentation Generation
- Selected slides are assembled into a cohesive presentation
- Content is enhanced and customized for the target audience
- Final PowerPoint file is generated with proper formatting

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Presentations
- `POST /api/presentations/generate` - Generate new presentation
- `GET /api/presentations` - Get user's presentations
- `GET /api/presentations/:id` - Get presentation details
- `GET /api/presentations/:id/progress` - Get generation progress
- `GET /api/presentations/:id/download` - Download presentation
- `DELETE /api/presentations/:id` - Delete presentation

### Scraping
- `POST /api/scraping/discover` - Discover relevant presentations
- `POST /api/scraping/extract` - Extract slides from URLs
- `GET /api/scraping/status/:taskId` - Get scraping status

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/user/stats` - Get user statistics

## 🎨 User Interface

### Main Features
- **Intuitive Form**: Easy-to-use input form for presentation requirements
- **Real-time Progress**: Live updates during generation process
- **Presentation Dashboard**: Manage and download generated presentations
- **Responsive Design**: Works on desktop, tablet, and mobile devices

### Form Fields
- Use Case (required)
- Customer/Company Name (required)
- Industry (required, dropdown)
- Target Audience (optional)
- Presentation Length (short/medium/long)
- Style (professional/creative/minimalist/corporate)
- Additional Requirements (optional)

## 🔒 Security Features

- JWT-based authentication
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS protection
- Helmet.js security headers
- Password hashing with bcrypt

## 📈 Performance Features

- Asynchronous processing
- Background job queues
- Database connection pooling
- Caching for frequently accessed data
- Optimized image processing
- Parallel web scraping

## 🧪 Testing

```bash
# Frontend tests
cd frontend && npm test

# Backend tests
cd backend && npm test

# AI service tests
cd ai-service && python -m pytest
```

## 🚀 Deployment

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment
1. Build frontend: `cd frontend && npm run build`
2. Build backend: `cd backend && npm run build`
3. Install AI service dependencies: `cd ai-service && pip install -r requirements.txt`
4. Set up production database
5. Configure environment variables
6. Start services with PM2 or similar process manager

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `docs/` folder
- Review the API documentation at `/api/docs` when running locally

## 🔮 Roadmap

- [ ] Advanced AI content generation
- [ ] More presentation sources
- [ ] Team collaboration features
- [ ] Advanced analytics and insights
- [ ] Mobile app
- [ ] Integration with popular presentation tools
- [ ] Custom branding options
- [ ] Multi-language support
