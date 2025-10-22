from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncio
import os
import json
from dotenv import load_dotenv

from services.presentation_generator import PresentationGenerator
from services.pdf_generator import PDFGenerator
from services.pptx_generator import PPTXGenerator
from services.web_scraper import WebScraper
from services.slide_analyzer import SlideAnalyzer
# from services.content_matcher import ContentMatcher  # COMMENTED OUT: Using content generation instead
from services.controlled_source_manager import ControlledSourceManager
from models.database import DatabaseManager

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Presentation Generator AI Service",
    description="AI-powered service for scraping, analyzing, and generating presentations",
    version="1.0.0"
)

# CORS middleware - Updated for production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:3001", 
        "http://localhost:5000",
        "http://localhost:5001",
        "http://localhost:8000",
        "http://localhost:8001",
        "http://localhost:8002",
        os.getenv("FRONTEND_URL", ""),
        os.getenv("BACKEND_URL", "")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
db_manager = DatabaseManager()
web_scraper = WebScraper()
slide_analyzer = SlideAnalyzer()
# content_matcher = ContentMatcher()  # COMMENTED OUT: Using content generation instead
presentation_generator = PresentationGenerator()
pdf_generator = PDFGenerator()
pptx_generator = PPTXGenerator()
controlled_source_manager = ControlledSourceManager()

# Database connection startup event
@app.on_event("startup")
async def startup_event():
    """Initialize database connection on startup"""
    try:
        await db_manager.connect()
        await controlled_source_manager.connect()
        print("✅ Database connected successfully")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        # Don't fail startup, but log the error

@app.on_event("shutdown")
async def shutdown_event():
    """Close database connection on shutdown"""
    try:
        await db_manager.close()
        await controlled_source_manager.close()
        print("✅ Database connection closed")
    except Exception as e:
        print(f"❌ Error closing database: {e}")

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
    outputFormat: str = "pdf"  # "pdf" or "pptx"

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
        slides = await controlled_source_manager.extract_slides_from_source(upload_id, file_path, industry)
        
        # Store the source information in presentation_sources table
        await controlled_source_manager.store_presentation_source(
            source_id=upload_id,
            title=title,
            description=description,
            industry=industry,
            tags=tags,
            file_path=file_path,
            mime_type=mime_type
        )
        
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

# Generate embeddings endpoint
@app.post("/embeddings/generate")
async def generate_embedding(request: dict):
    """Generate embedding for given content"""
    try:
        content = request.get('content', '')
        if not content:
            raise HTTPException(status_code=400, detail="Content is required")
        
        # For now, use a simple text-based embedding
        # In production, you would use a proper embedding model like OpenAI's text-embedding-ada-002
        embedding = generate_simple_embedding(content)
        
        return {
            "embedding": embedding,
            "dimensions": len(embedding),
            "content_length": len(content)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate embedding: {str(e)}")

def generate_simple_embedding(content: str) -> list:
    """Generate a simple embedding for content (placeholder implementation)"""
    # This is a simplified embedding generation
    # In production, use OpenAI's embedding API or similar
    
    # Clean and normalize content
    import re
    import hashlib
    
    # Remove special characters and normalize
    clean_content = re.sub(r'[^\w\s]', '', content.lower())
    words = clean_content.split()
    
    # Create a simple hash-based embedding
    content_hash = hashlib.md5(content.encode()).hexdigest()
    
    # Generate 384-dimensional vector (common embedding size)
    embedding = []
    for i in range(384):
        # Use hash and position to generate deterministic values
        seed = int(content_hash[i % len(content_hash)], 16) + i
        value = (seed % 1000) / 1000.0 - 0.5  # Normalize to [-0.5, 0.5]
        embedding.append(value)
    
    return embedding

async def find_relevant_content(query_embedding: List[float], industry: str = None, limit: int = 10) -> List[Dict[str, Any]]:
    """Find relevant content from training data using embeddings (replaces find_similar_slides)"""
    try:
        # Convert embedding to string for database query
        embedding_str = json.dumps(query_embedding)
        
        # Build query with industry filter
        if industry:
            query = """
                SELECT 
                    se.id,
                    se.content,
                    se.slide_type,
                    se.relevance_score,
                    ss.title,
                    ss.images,
                    ss.formatting,
                    ss.layout_info,
                    ps.title as source_title,
                    ps.industry
                FROM slide_embeddings se
                JOIN source_slides ss ON se.slide_id = ss.id
                JOIN presentation_sources ps ON se.source_id = ps.id
                WHERE ps.industry = $1
                ORDER BY se.relevance_score DESC
                LIMIT $2
            """
            params = [industry, limit]
        else:
            query = """
                SELECT 
                    se.id,
                    se.content,
                    se.slide_type,
                    se.relevance_score,
                    ss.title,
                    ss.images,
                    ss.formatting,
                    ss.layout_info,
                    ps.title as source_title,
                    ps.industry
                FROM slide_embeddings se
                JOIN source_slides ss ON se.slide_id = ss.id
                JOIN presentation_sources ps ON se.source_id = ps.id
                ORDER BY se.relevance_score DESC
                LIMIT $1
            """
            params = [limit]
        
        result = await db_manager.query(query, params)
        
        print(f"🔍 RELEVANT CONTENT SEARCH:")
        print(f"   - Industry filter: {industry}")
        print(f"   - Limit: {limit}")
        print(f"   - Found: {len(result)} content items")
        
        # Parse JSON fields from database
        for content in result:
            # Parse images JSON string to Python objects
            if content.get('images'):
                if isinstance(content['images'], str):
                    try:
                        content['images'] = json.loads(content['images'])
                        print(f"   📸 Parsed images JSON for content {content.get('id', 'unknown')}")
                    except json.JSONDecodeError as e:
                        print(f"   ⚠️ Failed to parse images JSON: {e}")
                        content['images'] = []
                elif isinstance(content['images'], list):
                    # Already parsed
                    pass
            else:
                content['images'] = []
            
            # Parse formatting JSON
            if content.get('formatting'):
                if isinstance(content['formatting'], str):
                    try:
                        content['formatting'] = json.loads(content['formatting'])
                        print(f"   🎨 Parsed formatting JSON for content {content.get('id', 'unknown')}")
                    except json.JSONDecodeError as e:
                        print(f"   ⚠️ Failed to parse formatting JSON: {e}")
                        content['formatting'] = {}
                elif isinstance(content['formatting'], dict):
                    # Already parsed
                    pass
            else:
                content['formatting'] = {}
            
            # Parse layout_info JSON
            if content.get('layout_info'):
                if isinstance(content['layout_info'], str):
                    try:
                        content['layout_info'] = json.loads(content['layout_info'])
                    except json.JSONDecodeError as e:
                        print(f"   ⚠️ Failed to parse layout_info JSON: {e}")
                        content['layout_info'] = {}
                elif isinstance(content['layout_info'], dict):
                    # Already parsed
                    pass
            else:
                content['layout_info'] = {}
        
        # Log image information for each content item
        for i, content in enumerate(result):
            images_count = len(content.get('images', []))
            print(f"   📸 Content {i+1}: {images_count} images available")
            if images_count > 0:
                for j, img in enumerate(content.get('images', [])):
                    img_title = img.get('title', f'Image {j+1}')
                    img_type = img.get('type', 'unknown')
                    has_data = bool(img.get('image_data') or img.get('image_blob'))
                    print(f"      - {img_title} (type: {img_type}, has_data: {has_data})")
        
        return result
        
    except Exception as e:
        print(f"Error finding relevant content: {e}")
        return []

# COMMENTED OUT: Old matching function - replaced with content generation
async def find_similar_slides(query_embedding: list, industry: str = None, limit: int = 20) -> list:
    """Find similar slides using vector similarity search"""
    try:
        # Calculate cosine similarity between query and stored embeddings
        # For now, we'll use a simple similarity calculation
        # In production, you'd use a proper vector database like Pinecone or Weaviate
        
        query = """
        SELECT 
            se.id,
            se.content,
            se.slide_type,
            se.relevance_score,
            ps.title as source_title,
            ps.industry,
            COALESCE(ps.tags, ARRAY[]::text[]) as tags,
            COALESCE(ss.images, '[]'::jsonb) as images,
            COALESCE(ss.formatting, '{}'::jsonb) as formatting,
            COALESCE(ss.layout_info, '{}'::jsonb) as layout_info
        FROM slide_embeddings se
        JOIN presentation_sources ps ON se.source_id = ps.id
        LEFT JOIN source_slides ss ON se.slide_id = ss.id
        WHERE ps.status IN ('approved', 'trained')
        """
        
        params = []
        param_count = 1
        
        if industry:
            query += " AND ps.industry = $1"
            params.append(industry)
            param_count = 2
        
        query += f" ORDER BY se.relevance_score DESC LIMIT ${param_count}"
        params.append(limit)
        
        result = await db_manager.query(query, params)
        
        # Convert to slide format expected by presentation generator
        slides = []
        for row in result:
            # Ensure we have proper defaults for visual data
            images_data = row.get('images') or []
            formatting_data = row.get('formatting') or {}
            layout_data = row.get('layout_info') or {}
            
            # Parse JSON data if it's a string
            if isinstance(images_data, str):
                try:
                    import json
                    images_data = json.loads(images_data)
                except:
                    images_data = []
            
            if isinstance(formatting_data, str):
                try:
                    import json
                    formatting_data = json.loads(formatting_data)
                except:
                    formatting_data = {}
                    
            if isinstance(layout_data, str):
                try:
                    import json
                    layout_data = json.loads(layout_data)
                except:
                    layout_data = {}
            
            slides.append({
                'id': row['id'],
                'content': row['content'],
                'slide_type': row['slide_type'],
                'relevance_score': float(row['relevance_score']),
                'source_title': row['source_title'],
                'industry': row['industry'],
                'tags': row['tags'] or [],
                'action': 'copy_exact',  # Use pre-trained content as-is
                'images': images_data,
                'formatting': formatting_data,
                'layout_info': layout_data
            })
        
        return slides
        
    except Exception as e:
        print(f"Error finding similar slides: {e}")
        return []

# Main generation function
async def generate_presentation_async(presentation_id: str, request_data: Dict[str, Any]):
    """Main async function to handle presentation generation using ONLY uploaded content"""
    try:
        # Check if we have trained embeddings available
        has_embeddings = await check_trained_embeddings()
        
        if has_embeddings:
            # Use pre-trained embeddings for faster generation
            return await generate_with_embeddings(presentation_id, request_data)
        else:
            # Fall back to traditional generation
            return await generate_without_embeddings(presentation_id, request_data)
            
    except Exception as e:
        print(f"Error in generate_presentation_async: {e}")
        await db_manager.update_progress(
            presentation_id,
            "failed",
            0,
            f"Generation failed: {str(e)}"
        )

async def check_trained_embeddings() -> bool:
    """Check if we have trained embeddings available"""
    try:
        # Query database to check if we have any embeddings
        result = await db_manager.query(
            "SELECT COUNT(*) as count FROM slide_embeddings LIMIT 1"
        )
        return result[0]['count'] > 0 if result else False
    except Exception as e:
        print(f"Error checking embeddings: {e}")
        return False

async def generate_with_embeddings(presentation_id: str, request_data: Dict[str, Any]):
    """Generate presentation using pre-trained embeddings for faster processing"""
    try:
        # Update progress: Discovering
        await db_manager.update_progress(
            presentation_id,
            "discovering",
            10,
            "Searching trained knowledge base for relevant content..."
        )
        
        # Generate query embedding for semantic search
        search_query = f"{request_data['useCase']} {request_data['industry']} {request_data['customer']}"
        query_embedding = generate_simple_embedding(search_query)
        
        print(f"🔍 SEARCH QUERY: {search_query}")
        print(f"📊 QUERY EMBEDDING DIMENSIONS: {len(query_embedding)}")
        
        # COMMENTED OUT: Old matching logic - replaced with content generation
        # Find similar slides using vector similarity
        # similar_slides = await find_similar_slides(
        #     query_embedding,
        #     industry=request_data['industry'],
        #     limit=20
        # )
        
        # NEW APPROACH: Find relevant content and generate new slides
        print(f"🔍 SEARCHING FOR RELEVANT CONTENT...")
        
        # Find relevant training content using embeddings
        relevant_content = await find_relevant_content(
            query_embedding,
            industry=request_data['industry'],
            limit=10
        )
        
        print(f"🎯 FOUND {len(relevant_content)} RELEVANT CONTENT ITEMS")
        
        if not relevant_content:
            print("❌ NO RELEVANT CONTENT FOUND")
            await db_manager.update_progress(
                presentation_id,
                "failed",
                0,
                "No relevant content found in trained knowledge base. Please train the system first."
            )
            return
        
        # Log each content item found with details
        for i, content in enumerate(relevant_content):
            print(f"📄 CONTENT {i+1}:")
            print(f"   - ID: {content.get('id', 'N/A')}")
            print(f"   - Type: {content.get('slide_type', 'N/A')}")
            print(f"   - Relevance Score: {content.get('relevance_score', 'N/A')}")
            print(f"   - Source: {content.get('source_title', 'N/A')}")
            print(f"   - Industry: {content.get('industry', 'N/A')}")
            print(f"   - Content Preview: {content.get('content', 'N/A')[:100]}...")
            print(f"   - Images: {len(content.get('images', []))} visual elements")
            if content.get('images'):
                for j, img in enumerate(content['images']):
                    print(f"      📸 Image {j+1}: {img.get('title', 'Untitled')} (type: {img.get('type', 'unknown')})")
            print()
        
        # Update progress: Content Generation
        await db_manager.update_progress(
            presentation_id,
            "generating",
            50,
            f"Found {len(relevant_content)} relevant content items. Generating new slides..."
        )
        
        # Generate new slides based on relevant content
        from services.content_generator import ContentGenerator
        content_generator = ContentGenerator()
        generated_slides = await content_generator.generate_new_slides(
            relevant_content, 
            request_data
        )
        
        print(f"✅ GENERATED {len(generated_slides)} NEW SLIDES")
        
        # Use the generated slides
        matched_slides = generated_slides
        
        # Update progress: Generating
        await db_manager.update_progress(
            presentation_id,
            "generating",
            80,
            f"Generating presentation with {len(matched_slides)} selected slides..."
        )
        
        # Log action breakdown
        action_counts = {}
        for slide in matched_slides:
            action = slide.get('action', 'copy_exact')
            action_counts[action] = action_counts.get(action, 0) + 1
        
        print(f"📊 ACTION BREAKDOWN:")
        for action, count in action_counts.items():
            print(f"   - {action}: {count} slides")
        
        # Calculate estimated AI token usage
        copy_exact_count = action_counts.get('copy_exact', 0)
        minor_enhancement_count = action_counts.get('minor_enhancement', 0)
        full_generation_count = action_counts.get('full_generation', 0)
        
        estimated_tokens = (minor_enhancement_count * 50) + (full_generation_count * 200)
        print(f"💰 ESTIMATED AI TOKEN USAGE: {estimated_tokens} tokens")
        print(f"   - Copy Exact: {copy_exact_count} slides (0 tokens)")
        print(f"   - Minor Enhancement: {minor_enhancement_count} slides (~{minor_enhancement_count * 50} tokens)")
        print(f"   - Full Generation: {full_generation_count} slides (~{full_generation_count * 200} tokens)")
        
        # Generate final presentation based on output format
        output_format = request_data.get('outputFormat', 'pdf').lower()
        print(f"🚀 GENERATING PRESENTATION IN {output_format.upper()} FORMAT...")
        
        if output_format == 'pptx':
            presentation_data = await pptx_generator.generate_presentation(
                slides=matched_slides,
                presentation_id=presentation_id,
                request_data=request_data
            )
        else:  # Default to PDF
            presentation_data = await pdf_generator.generate_presentation(
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
        
        # Save presentation and update status
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
            "Presentation generated successfully using trained knowledge base!"
        )
        
    except Exception as e:
        print(f"Error in generate_with_embeddings: {e}")
        await db_manager.update_progress(
            presentation_id,
            "failed",
            0,
            f"Generation failed: {str(e)}"
        )

async def generate_without_embeddings(presentation_id: str, request_data: Dict[str, Any]):
    """Original generation method without embeddings"""
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
        
        # Step 3: Analyze and match slides (DISABLED - using content generation instead)
        # matched_slides = await content_matcher.match_slides(
        #     slides=all_slides,
        #     use_case=request_data['useCase'],
        #     customer=request_data['customer'],
        #     industry=request_data['industry'],
        #     target_audience=request_data.get('targetAudience'),
        #     style=request_data['style']
        # )
        
        # Fallback: Use slides as-is for now
        matched_slides = all_slides[:5]  # Limit to 5 slides
        
        # Update progress: Generating
        await db_manager.update_progress(
            presentation_id,
            "generating",
            80,
            f"Generating presentation with {len(matched_slides)} selected slides..."
        )
        
        # Step 4: Generate final presentation based on output format
        output_format = request_data.get('outputFormat', 'pdf').lower()
        print(f"🚀 GENERATING PRESENTATION IN {output_format.upper()} FORMAT...")
        
        if output_format == 'pptx':
            presentation_data = await pptx_generator.generate_presentation(
                slides=matched_slides,
                presentation_id=presentation_id,
                request_data=request_data
            )
        else:  # Default to PDF
            presentation_data = await pdf_generator.generate_presentation(
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
    port = int(os.getenv("PORT", 8000))
    print(f"🔧 PORT ENVIRONMENT VARIABLE: {os.getenv('PORT', 'NOT SET')}")
    print(f"🔧 USING PORT: {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
