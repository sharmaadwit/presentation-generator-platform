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
    try:
        results = await web_scraper.discover_presentations(
            query=request.query,
            industry=request.industry,
            max_results=request.maxResults
        )
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Extract slides endpoint
@app.post("/scraping/extract")
async def extract_slides(request: SlideExtractionRequest):
    try:
        slides = await slide_analyzer.extract_slides_from_urls(
            urls=request.urls,
            presentation_id=request.presentationId
        )
        return {"slides": slides}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
    """Main async function to handle presentation generation"""
    try:
        # Update progress: Discovering
        await db_manager.update_progress(
            presentation_id,
            "discovering",
            10,
            "Searching for relevant presentations..."
        )
        
        # Step 1: Discover relevant presentations
        search_query = f"{request_data['useCase']} {request_data['industry']} {request_data['customer']}"
        discovered_presentations = await web_scraper.discover_presentations(
            query=search_query,
            industry=request_data['industry'],
            max_results=20
        )
        
        # Update progress: Extracting
        await db_manager.update_progress(
            presentation_id,
            "extracting",
            30,
            f"Found {len(discovered_presentations)} presentations. Extracting slides..."
        )
        
        # Step 2: Extract slides from discovered presentations
        all_slides = []
        for presentation in discovered_presentations[:10]:  # Limit to top 10
            try:
                slides = await slide_analyzer.extract_slides_from_url(
                    presentation['url'],
                    presentation_id
                )
                all_slides.extend(slides)
            except Exception as e:
                print(f"Failed to extract slides from {presentation['url']}: {e}")
                continue
        
        # Update progress: Analyzing
        await db_manager.update_progress(
            presentation_id,
            "analyzing",
            60,
            f"Analyzing {len(all_slides)} slides for relevance..."
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
