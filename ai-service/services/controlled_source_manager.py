import asyncio
import asyncpg
import os
from typing import List, Dict, Any, Optional
import logging
from pptx import Presentation
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ControlledSourceManager:
    def __init__(self):
        self.database_url = os.getenv('DATABASE_URL', 'postgresql://localhost:5432/presentation_generator')
        self.connection_pool = None
    
    async def connect(self):
        """Connect to the database"""
        try:
            self.connection_pool = await asyncpg.create_pool(
                self.database_url,
                min_size=1,
                max_size=10,
                command_timeout=60
            )
            logger.info("Connected to controlled source database")
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise e
    
    async def close(self):
        """Close database connection"""
        if self.connection_pool:
            await self.connection_pool.close()
    
    async def get_approved_sources_for_industry(self, industry: str) -> List[Dict[str, Any]]:
        """Get all approved presentation sources for a specific industry"""
        try:
            async with self.connection_pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT ps.*, 
                           COUNT(ss.id) as slide_count
                    FROM presentation_sources ps
                    LEFT JOIN source_slides ss ON ps.id = ss.source_id
                    WHERE ps.status = 'approved' 
                    AND ps.industry = $1
                    GROUP BY ps.id
                    ORDER BY ps.relevance_score DESC, ps.created_at DESC
                """, industry)
                
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting approved sources: {e}")
            return []
    
    async def get_all_approved_sources(self) -> List[Dict[str, Any]]:
        """Get all approved presentation sources"""
        try:
            async with self.connection_pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT ps.*, 
                           COUNT(ss.id) as slide_count
                    FROM presentation_sources ps
                    LEFT JOIN source_slides ss ON ps.id = ss.source_id
                    WHERE ps.status = 'approved'
                    GROUP BY ps.id
                    ORDER BY ps.relevance_score DESC, ps.created_at DESC
                """)
                
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting all approved sources: {e}")
            return []
    
    async def get_source_slides(self, source_id: str) -> List[Dict[str, Any]]:
        """Get all slides from a specific approved source"""
        try:
            async with self.connection_pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT * FROM source_slides 
                    WHERE source_id = $1 
                    ORDER BY slide_index
                """, source_id)
                
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting source slides: {e}")
            return []
    
    async def extract_slides_from_source(self, source_id: str, file_path: str) -> List[Dict[str, Any]]:
        """Extract slides from a presentation file and store them in the database"""
        try:
            # Load the presentation
            prs = Presentation(file_path)
            slides = []
            
            for i, slide in enumerate(prs.slides):
                slide_data = self._extract_slide_data(slide, i)
                slide_data['source_id'] = source_id
                slides.append(slide_data)
            
            # Store slides in database
            await self._store_slides(slides)
            
            logger.info(f"Extracted {len(slides)} slides from source {source_id}")
            return slides
            
        except Exception as e:
            logger.error(f"Error extracting slides from source {source_id}: {e}")
            return []
    
    def _extract_slide_data(self, slide, index: int) -> Dict[str, Any]:
        """Extract data from a single slide"""
        slide_data = {
            'slide_index': index,
            'title': '',
            'content': '',
            'image_url': None,
            'slide_type': 'content',
            'metadata': {}
        }
        
        try:
            # Extract title
            if slide.shapes.title:
                slide_data['title'] = slide.shapes.title.text
            
            # Extract content from text boxes
            content_parts = []
            for shape in slide.shapes:
                if hasattr(shape, 'text') and shape.text:
                    if shape != slide.shapes.title:  # Don't duplicate title
                        content_parts.append(shape.text)
            
            slide_data['content'] = '\n'.join(content_parts)
            
            # Determine slide type
            slide_data['slide_type'] = self._classify_slide_type(slide_data)
            
            # Extract images (simplified - would need more complex logic for actual images)
            slide_data['metadata'] = {
                'shapes_count': len(slide.shapes),
                'has_images': any(hasattr(shape, 'image') for shape in slide.shapes)
            }
            
        except Exception as e:
            logger.error(f"Error extracting slide data: {e}")
        
        return slide_data
    
    def _classify_slide_type(self, slide_data: Dict[str, Any]) -> str:
        """Classify the type of slide based on content"""
        title = slide_data.get('title', '').lower()
        content = slide_data.get('content', '').lower()
        
        if any(word in title for word in ['title', 'agenda', 'overview']):
            return 'title'
        elif any(word in content for word in ['chart', 'graph', 'data', 'statistics']):
            return 'chart'
        elif any(word in content for word in ['quote', 'testimonial', 'feedback']):
            return 'quote'
        elif any(word in content for word in ['conclusion', 'summary', 'next steps']):
            return 'conclusion'
        else:
            return 'content'
    
    async def _store_slides(self, slides: List[Dict[str, Any]]):
        """Store extracted slides in the database"""
        try:
            async with self.connection_pool.acquire() as conn:
                for slide in slides:
                    await conn.execute("""
                        INSERT INTO source_slides (
                            source_id, slide_index, title, content, 
                            image_url, slide_type, metadata
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    """, 
                    slide['source_id'],
                    slide['slide_index'],
                    slide['title'],
                    slide['content'],
                    slide['image_url'],
                    slide['slide_type'],
                    json.dumps(slide['metadata'])
                    )
        except Exception as e:
            logger.error(f"Error storing slides: {e}")
            raise e
    
    async def search_slides_by_criteria(
        self, 
        industry: str, 
        use_case: str, 
        customer: str,
        target_audience: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Search for relevant slides from approved sources based on criteria"""
        try:
            async with self.connection_pool.acquire() as conn:
                # First get approved sources for the industry
                sources = await conn.fetch("""
                    SELECT id FROM presentation_sources 
                    WHERE status = 'approved' AND industry = $1
                """, industry)
                
                if not sources:
                    logger.warning(f"No approved sources found for industry: {industry}")
                    return []
                
                source_ids = [row['id'] for row in sources]
                
                # Search for relevant slides
                query = f"""
                    SELECT ss.*, ps.title as source_title, ps.description as source_description
                    FROM source_slides ss
                    JOIN presentation_sources ps ON ss.source_id = ps.id
                    WHERE ss.source_id = ANY($1)
                    AND (
                        ss.title ILIKE $2 OR 
                        ss.content ILIKE $2 OR
                        ps.title ILIKE $2 OR
                        ps.description ILIKE $2
                    )
                    ORDER BY ps.relevance_score DESC, ss.slide_index
                """
                
                search_term = f"%{use_case}%{customer}%"
                if target_audience:
                    search_term += f"%{target_audience}%"
                
                rows = await conn.fetch(query, source_ids, search_term)
                
                return [dict(row) for row in rows]
                
        except Exception as e:
            logger.error(f"Error searching slides: {e}")
            return []
    
    async def get_source_statistics(self) -> Dict[str, Any]:
        """Get statistics about approved sources"""
        try:
            async with self.connection_pool.acquire() as conn:
                # Get overall stats
                stats = await conn.fetchrow("""
                    SELECT 
                        COUNT(DISTINCT ps.id) as total_sources,
                        COUNT(ss.id) as total_slides,
                        COUNT(DISTINCT ps.industry) as industries_covered
                    FROM presentation_sources ps
                    LEFT JOIN source_slides ss ON ps.id = ss.source_id
                    WHERE ps.status = 'approved'
                """)
                
                # Get industry breakdown
                industry_stats = await conn.fetch("""
                    SELECT 
                        ps.industry,
                        COUNT(DISTINCT ps.id) as source_count,
                        COUNT(ss.id) as slide_count
                    FROM presentation_sources ps
                    LEFT JOIN source_slides ss ON ps.id = ss.source_id
                    WHERE ps.status = 'approved'
                    GROUP BY ps.industry
                    ORDER BY slide_count DESC
                """)
                
                return {
                    'overview': dict(stats),
                    'industry_breakdown': [dict(row) for row in industry_stats]
                }
                
        except Exception as e:
            logger.error(f"Error getting source statistics: {e}")
            return {}
    
    async def validate_source_access(self, source_id: str) -> bool:
        """Validate that a source is approved and accessible"""
        try:
            async with self.connection_pool.acquire() as conn:
                row = await conn.fetchrow("""
                    SELECT status FROM presentation_sources 
                    WHERE id = $1
                """, source_id)
                
                return row and row['status'] == 'approved'
                
        except Exception as e:
            logger.error(f"Error validating source access: {e}")
            return False
