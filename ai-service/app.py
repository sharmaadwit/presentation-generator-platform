from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncio
import os
from dotenv import load_dotenv

from services.presentation_generator import PresentationGenerator
from services.web_scraper import WebScraper
from services.slide_analyzer import SlideAnalyzer
from services.content_matcher import ContentMatcher
from services.controlled_source_manager import ControlledSourceManager
from models.database import DatabaseManager

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Presentation Generator AI Service",
    description="AI-powered service for scraping, analyzing, and generating presentations",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
db_manager = DatabaseManager()
web_scraper = WebScraper()
slide_analyzer = SlideAnalyzer()
content_matcher = ContentMatcher()
presentation_generator = PresentationGenerator()
controlled_source_manager = ControlledSourceManager()

# Pydantic models
class PresentationRequest(BaseModel):
    presentationId: str
    useCase: str
    customer: str
    industry: str
    targetAudience: Optional[str] = None
    presentationLength: str = "medium"
    style: str = "professional"
    additionalRequirements: Optional[str] = None

class ScrapingRequest(BaseModel):
    query: str
    industry: str
    maxResults: int = 20

class SlideExtractionRequest(BaseModel):
    presentationId: str
    urls: List[str]

class GenerationProgress(BaseModel):
    stage: str
    progress: int
    message: str
    estimatedTimeRemaining: Optional[int] = None

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "presentation-generator-ai",
        "version": "1.0.0"
    }

# Generate presentation endpoint
@app.post("/generate")
async def generate_presentation(request: PresentationRequest, background_tasks: BackgroundTasks):
    try:
        # Start generation process in background
        background_tasks.add_task(
            generate_presentation_async,
            request.presentationId,
            request.dict()
        )
        
        return {
            "status": "accepted",
            "presentationId": request.presentationId,
            "message": "Presentation generation started"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Discover presentations endpoint
@app.post("/scraping/discover")
async def discover_presentations(request: ScrapingRequest):
    """DISABLED: Web scraping is not permitted in this controlled knowledge base system"""
    return {
        "results": [],
        "message": "Web scraping is disabled. This system only uses uploaded, approved content from the controlled knowledge base.",
        "warning": "Please upload relevant presentations to expand the knowledge base instead of requesting external content."
    }

# Extract slides endpoint
@app.post("/scraping/extract")
async def extract_slides(request: SlideExtractionRequest):
    """DISABLED: External URL extraction is not permitted in this controlled knowledge base system"""
    return {
        "slides": [],
        "message": "External URL extraction is disabled. This system only processes uploaded files from the controlled knowledge base.",
        "warning": "Please upload presentation files directly instead of providing external URLs."
    }

# Upload processing endpoint
@app.post("/upload/process")
async def process_uploaded_file(request: dict):
    """Process uploaded presentation file and extract slides for knowledge base"""
    try:
        upload_id = request.get('uploadId')
        file_path = request.get('filePath')
        mime_type = request.get('mimeType')
        title = request.get('title', 'Untitled')
        description = request.get('description', '')
        industry = request.get('industry', 'General')
        tags = request.get('tags', [])
        
        if not upload_id or not file_path:
            raise HTTPException(status_code=400, detail="Missing required fields: uploadId and filePath")
        
        # Extract slides from uploaded file
        slides = await controlled_source_manager.extract_slides_from_source(upload_id, file_path)
        
        return {
            "message": "File processed successfully",
            "slides": slides,
            "totalSlides": len(slides),
            "uploadId": upload_id,
            "title": title,
            "industry": industry
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process uploaded file: {str(e)}")

# Get generation progress
@app.get("/progress/{presentation_id}")
async def get_progress(presentation_id: str):
    try:
        progress = await db_manager.get_generation_progress(presentation_id)
        return progress
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Main generation function
async def generate_presentation_async(presentation_id: str, request_data: Dict[str, Any]):
    """Main async function to handle presentation generation using ONLY uploaded content"""
    try:
        # Update progress: Discovering
        await db_manager.update_progress(
            presentation_id,
            "discovering",
            10,
            "Searching approved knowledge base for relevant content..."
        )
        
        # Step 1: Get approved sources from knowledge base (NO WEB SCRAPING)
        search_query = f"{request_data['useCase']} {request_data['industry']} {request_data['customer']}"
        approved_sources = await controlled_source_manager.get_approved_sources(
            industry=request_data['industry'],
            tags=request_data.get('tags', []),
            limit=20
        )
        
        if not approved_sources:
            await db_manager.update_progress(
                presentation_id,
                "failed",
                0,
                "No approved content found in knowledge base. Please upload relevant presentations first."
            )
            return
        
        # Update progress: Extracting
        await db_manager.update_progress(
            presentation_id,
            "extracting",
            30,
            f"Found {len(approved_sources)} approved sources. Extracting slides..."
        )
        
        # Step 2: Extract slides from approved uploaded sources only
        all_slides = []
        for source in approved_sources[:10]:  # Limit to top 10
            try:
                slides = await controlled_source_manager.get_source_slides(source['id'])
                all_slides.extend(slides)
            except Exception as e:
                print(f"Failed to extract slides from approved source {source['id']}: {e}")
                continue
        
        if not all_slides:
            await db_manager.update_progress(
                presentation_id,
                "failed",
                0,
                "No slides found in approved sources. Please ensure presentations are properly processed."
            )
            return
        
        # Update progress: Analyzing
        await db_manager.update_progress(
            presentation_id,
            "analyzing",
            60,
            f"Analyzing {len(all_slides)} slides from approved knowledge base..."
        )
        
        # Step 3: Analyze and match slides
        matched_slides = await content_matcher.match_slides(
            slides=all_slides,
            use_case=request_data['useCase'],
            customer=request_data['customer'],
            industry=request_data['industry'],
            target_audience=request_data.get('targetAudience'),
            style=request_data['style']
        )
        
        # Update progress: Generating
        await db_manager.update_progress(
            presentation_id,
            "generating",
            80,
            f"Generating presentation with {len(matched_slides)} selected slides..."
        )
        
        # Step 4: Generate final presentation
        presentation_data = await presentation_generator.generate_presentation(
            slides=matched_slides,
            presentation_id=presentation_id,
            request_data=request_data
        )
        
        # Update progress: Finalizing
        await db_manager.update_progress(
            presentation_id,
            "finalizing",
            95,
            "Finalizing presentation..."
        )
        
        # Step 5: Save presentation and update status
        await db_manager.save_presentation(
            presentation_id=presentation_id,
            slides=matched_slides,
            presentation_data=presentation_data,
            status="completed"
        )
        
        # Final progress update
        await db_manager.update_progress(
            presentation_id,
            "completed",
            100,
            "Presentation generation completed successfully!"
        )
        
    except Exception as e:
        print(f"Error generating presentation {presentation_id}: {e}")
        await db_manager.update_progress(
            presentation_id,
            "failed",
            0,
            f"Generation failed: {str(e)}"
        )
        await db_manager.update_presentation_status(presentation_id, "failed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
