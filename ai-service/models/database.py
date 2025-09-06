import os
import asyncio
import asyncpg
import json
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self):
        self.connection_pool = None
        self.database_url = os.getenv('DATABASE_URL', 'postgresql://localhost:5432/presentation_generator')
    
    async def connect(self):
        """Connect to the database"""
        try:
            self.connection_pool = await asyncpg.create_pool(
                self.database_url,
                min_size=1,
                max_size=10,
                command_timeout=60
            )
            logger.info("Connected to database")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise e
    
    async def close(self):
        """Close database connection"""
        if self.connection_pool:
            await self.connection_pool.close()
    
    async def query(self, query: str, params: List[Any] = None):
        """Execute a query and return results"""
        if not self.connection_pool:
            logger.error("Database not connected")
            return []
        
        try:
            async with self.connection_pool.acquire() as conn:
                if params:
                    rows = await conn.fetch(query, *params)
                else:
                    rows = await conn.fetch(query)
                
                # Convert rows to list of dictionaries
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Database query error: {e}")
            raise e
    
    async def update_progress(
        self,
        presentation_id: str,
        stage: str,
        progress: int,
        message: str,
        estimated_time_remaining: Optional[int] = None
    ):
        """Update generation progress for a presentation"""
        
        if not self.connection_pool:
            logger.error("Database not connected - cannot update progress")
            return
        
        try:
            async with self.connection_pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO generation_progress 
                    (presentation_id, stage, progress, message, estimated_time_remaining)
                    VALUES ($1, $2, $3, $4, $5)
                """, presentation_id, stage, progress, message, estimated_time_remaining)
                
        except Exception as e:
            logger.error(f"Error updating progress: {e}")
    
    async def get_generation_progress(self, presentation_id: str) -> Dict[str, Any]:
        """Get latest generation progress for a presentation"""
        
        if not self.connection_pool:
            logger.error("Database not connected - cannot get progress")
            return {
                'stage': 'error',
                'progress': 0,
                'message': 'Database not connected',
                'estimatedTimeRemaining': None,
                'timestamp': datetime.utcnow().isoformat()
            }
        
        try:
            async with self.connection_pool.acquire() as conn:
                row = await conn.fetchrow("""
                    SELECT stage, progress, message, estimated_time_remaining, created_at
                    FROM generation_progress
                    WHERE presentation_id = $1
                    ORDER BY created_at DESC
                    LIMIT 1
                """, presentation_id)
                
                if row:
                    return {
                        'stage': row['stage'],
                        'progress': row['progress'],
                        'message': row['message'],
                        'estimatedTimeRemaining': row['estimated_time_remaining'],
                        'timestamp': row['created_at'].isoformat()
                    }
                else:
                    return {
                        'stage': 'queued',
                        'progress': 0,
                        'message': 'Presentation is queued for generation',
                        'estimatedTimeRemaining': None,
                        'timestamp': datetime.utcnow().isoformat()
                    }
                    
        except Exception as e:
            logger.error(f"Error getting progress: {e}")
            return {
                'stage': 'error',
                'progress': 0,
                'message': 'Error retrieving progress',
                'estimatedTimeRemaining': None,
                'timestamp': datetime.utcnow().isoformat()
            }
    
    async def save_presentation(
        self,
        presentation_id: str,
        slides: List[Dict[str, Any]],
        presentation_data: Dict[str, Any],
        status: str
    ):
        """Save presentation data and slides to database"""
        
        try:
            async with self.connection_pool.acquire() as conn:
                async with conn.transaction():
                    # Update presentation status
                    preview_urls = presentation_data.get('previewUrls', [])
                    preview_urls_str = json.dumps(preview_urls) if isinstance(preview_urls, list) else str(preview_urls)
                    
                    await conn.execute("""
                        UPDATE presentations 
                        SET status = $1, download_url = $2, preview_url = $3, updated_at = CURRENT_TIMESTAMP
                        WHERE id = $4
                    """, status, presentation_data.get('filepath'), preview_urls_str, presentation_id)
                    
                    # Save slides
                    for i, slide in enumerate(slides):
                        await conn.execute("""
                            INSERT INTO slides (
                                presentation_id, title, content, image_url, slide_type,
                                source_presentation, relevance_score, order_index
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        """, 
                        presentation_id,
                        slide.get('title', ''),
                        slide.get('content', ''),
                        slide.get('imageUrl', ''),
                        slide.get('slideType', 'content'),
                        slide.get('sourcePresentation', ''),
                        slide.get('relevanceScore', 0.0),
                        i + 1
                        )
                    
        except Exception as e:
            logger.error(f"Error saving presentation: {e}")
            raise e
    
    async def update_presentation_status(self, presentation_id: str, status: str):
        """Update presentation status"""
        
        try:
            async with self.connection_pool.acquire() as conn:
                await conn.execute("""
                    UPDATE presentations 
                    SET status = $1, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $2
                """, status, presentation_id)
                
        except Exception as e:
            logger.error(f"Error updating presentation status: {e}")
    
    async def get_presentation_slides(self, presentation_id: str) -> List[Dict[str, Any]]:
        """Get slides for a presentation"""
        
        try:
            async with self.connection_pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT * FROM slides 
                    WHERE presentation_id = $1 
                    ORDER BY order_index
                """, presentation_id)
                
                return [dict(row) for row in rows]
                
        except Exception as e:
            logger.error(f"Error getting presentation slides: {e}")
            return []
    
    async def save_scraping_results(
        self,
        presentation_id: str,
        results: List[Dict[str, Any]]
    ):
        """Save scraping results to database"""
        
        try:
            async with self.connection_pool.acquire() as conn:
                for result in results:
                    await conn.execute("""
                        INSERT INTO scraping_results (
                            presentation_id, url, title, description, 
                            slide_count, industry, relevance_score
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """, 
                    presentation_id,
                    result.get('url', ''),
                    result.get('title', ''),
                    result.get('description', ''),
                    result.get('slideCount', 0),
                    result.get('industry', ''),
                    result.get('relevanceScore', 0.0)
                    )
                    
        except Exception as e:
            logger.error(f"Error saving scraping results: {e}")
    
    async def get_scraping_results(self, presentation_id: str) -> List[Dict[str, Any]]:
        """Get scraping results for a presentation"""
        
        try:
            async with self.connection_pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT * FROM scraping_results 
                    WHERE presentation_id = $1 
                    ORDER BY relevance_score DESC
                """, presentation_id)
                
                return [dict(row) for row in rows]
                
        except Exception as e:
            logger.error(f"Error getting scraping results: {e}")
            return []
