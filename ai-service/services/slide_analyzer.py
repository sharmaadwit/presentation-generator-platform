import asyncio
import aiohttp
from typing import List, Dict, Any, Optional
import logging
from PIL import Image
import io
import base64
from urllib.parse import urljoin
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SlideAnalyzer:
    def __init__(self):
        self.session = None
        
    async def extract_slides_from_url(self, url: str, presentation_id: str) -> List[Dict[str, Any]]:
        """Extract slides from a single presentation URL"""
        try:
            async with aiohttp.ClientSession() as session:
                # First, try to get presentation metadata
                metadata = await self._get_presentation_metadata(session, url)
                
                # Extract individual slides
                slides = await self._extract_slides(session, url, presentation_id)
                
                return slides
        except Exception as e:
            logger.error(f"Error extracting slides from {url}: {e}")
            return []
    
    async def extract_slides_from_urls(self, urls: List[str], presentation_id: str) -> List[Dict[str, Any]]:
        """Extract slides from multiple presentation URLs"""
        all_slides = []
        
        tasks = []
        for url in urls:
            task = self.extract_slides_from_url(url, presentation_id)
            tasks.append(task)
        
        # Process URLs in parallel
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for result in results:
            if isinstance(result, list):
                all_slides.extend(result)
            elif isinstance(result, Exception):
                logger.error(f"Slide extraction failed: {result}")
        
        return all_slides
    
    async def _get_presentation_metadata(self, session: aiohttp.ClientSession, url: str) -> Dict[str, Any]:
        """Get basic metadata about the presentation"""
        try:
            async with session.get(url) as response:
                if response.status == 200:
                    html = await response.text()
                    
                    # Extract title, description, author, etc.
                    title = self._extract_title(html)
                    description = self._extract_description(html)
                    author = self._extract_author(html)
                    
                    return {
                        'title': title,
                        'description': description,
                        'author': author,
                        'url': url
                    }
        except Exception as e:
            logger.error(f"Error getting metadata from {url}: {e}")
        
        return {}
    
    async def _extract_slides(self, session: aiohttp.ClientSession, url: str, presentation_id: str) -> List[Dict[str, Any]]:
        """Extract individual slides from presentation"""
        slides = []
        
        try:
            # Determine the source and extract accordingly
            if 'slideshare' in url:
                slides = await self._extract_slideshare_slides(session, url)
            elif 'speakerdeck' in url:
                slides = await self._extract_speakerdeck_slides(session, url)
            elif 'prezi' in url:
                slides = await self._extract_prezi_slides(session, url)
            else:
                slides = await self._extract_generic_slides(session, url)
            
            # Process and enhance each slide
            processed_slides = []
            for i, slide_data in enumerate(slides):
                processed_slide = await self._process_slide(slide_data, presentation_id, i)
                if processed_slide:
                    processed_slides.append(processed_slide)
            
            return processed_slides
            
        except Exception as e:
            logger.error(f"Error extracting slides from {url}: {e}")
            return []
    
    async def _extract_slideshare_slides(self, session: aiohttp.ClientSession, url: str) -> List[Dict[str, Any]]:
        """Extract slides from SlideShare presentation"""
        slides = []
        
        try:
            async with session.get(url) as response:
                if response.status == 200:
                    html = await response.text()
                    
                    # Use regex to find slide images
                    slide_pattern = r'data-full="([^"]*)"'
                    slide_urls = re.findall(slide_pattern, html)
                    
                    # Also try to find slide data in JSON
                    json_pattern = r'window\.slideshare\.slideshow\.slides = (\[.*?\]);'
                    json_match = re.search(json_pattern, html, re.DOTALL)
                    
                    if json_match:
                        import json
                        try:
                            slide_data = json.loads(json_match.group(1))
                            for i, slide in enumerate(slide_data):
                                slides.append({
                                    'index': i,
                                    'imageUrl': slide.get('url', ''),
                                    'text': slide.get('text', ''),
                                    'title': slide.get('title', ''),
                                    'source': 'slideshare'
                                })
                        except json.JSONDecodeError:
                            pass
                    
                    # Fallback to image URLs
                    if not slides and slide_urls:
                        for i, slide_url in enumerate(slide_urls):
                            slides.append({
                                'index': i,
                                'imageUrl': slide_url,
                                'text': '',
                                'title': f'Slide {i + 1}',
                                'source': 'slideshare'
                            })
        
        except Exception as e:
            logger.error(f"Error extracting SlideShare slides: {e}")
        
        return slides
    
    async def _extract_speakerdeck_slides(self, session: aiohttp.ClientSession, url: str) -> List[Dict[str, Any]]:
        """Extract slides from SpeakerDeck presentation"""
        slides = []
        
        try:
            async with session.get(url) as response:
                if response.status == 200:
                    html = await response.text()
                    
                    # Find slide images
                    slide_pattern = r'data-src="([^"]*)"'
                    slide_urls = re.findall(slide_pattern, html)
                    
                    for i, slide_url in enumerate(slide_urls):
                        slides.append({
                            'index': i,
                            'imageUrl': slide_url,
                            'text': '',
                            'title': f'Slide {i + 1}',
                            'source': 'speakerdeck'
                        })
        
        except Exception as e:
            logger.error(f"Error extracting SpeakerDeck slides: {e}")
        
        return slides
    
    async def _extract_prezi_slides(self, session: aiohttp.ClientSession, url: str) -> List[Dict[str, Any]]:
        """Extract slides from Prezi presentation"""
        slides = []
        
        try:
            async with session.get(url) as response:
                if response.status == 200:
                    html = await response.text()
                    
                    # Find slide data in Prezi's JSON structure
                    json_pattern = r'window\.preziData = ({.*?});'
                    json_match = re.search(json_pattern, html, re.DOTALL)
                    
                    if json_match:
                        import json
                        try:
                            prezi_data = json.loads(json_match.group(1))
                            # Extract slides from Prezi data structure
                            # This would need to be adapted based on Prezi's actual data structure
                            pass
                        except json.JSONDecodeError:
                            pass
        
        except Exception as e:
            logger.error(f"Error extracting Prezi slides: {e}")
        
        return slides
    
    async def _extract_generic_slides(self, session: aiohttp.ClientSession, url: str) -> List[Dict[str, Any]]:
        """Generic slide extraction for unknown sources"""
        slides = []
        
        try:
            async with session.get(url) as response:
                if response.status == 200:
                    html = await response.text()
                    
                    # Look for common slide patterns
                    slide_patterns = [
                        r'<img[^>]*src="([^"]*)"[^>]*class="[^"]*slide[^"]*"',
                        r'<div[^>]*class="[^"]*slide[^"]*"[^>]*>.*?<img[^>]*src="([^"]*)"',
                        r'data-src="([^"]*)"'
                    ]
                    
                    for pattern in slide_patterns:
                        matches = re.findall(pattern, html, re.IGNORECASE | re.DOTALL)
                        if matches:
                            for i, match in enumerate(matches):
                                slides.append({
                                    'index': i,
                                    'imageUrl': match,
                                    'text': '',
                                    'title': f'Slide {i + 1}',
                                    'source': 'generic'
                                })
                            break
        
        except Exception as e:
            logger.error(f"Error extracting generic slides: {e}")
        
        return slides
    
    async def _process_slide(self, slide_data: Dict[str, Any], presentation_id: str, index: int) -> Optional[Dict[str, Any]]:
        """Process and enhance a single slide"""
        try:
            # Extract text from image if possible
            text_content = await self._extract_text_from_image(slide_data.get('imageUrl', ''))
            
            # Analyze slide content
            slide_type = self._classify_slide_type(slide_data, text_content)
            
            # Calculate relevance score (placeholder)
            relevance_score = self._calculate_relevance_score(slide_data, text_content)
            
            return {
                'id': f"{presentation_id}_slide_{index}",
                'presentationId': presentation_id,
                'title': slide_data.get('title', f'Slide {index + 1}'),
                'content': text_content or slide_data.get('text', ''),
                'imageUrl': slide_data.get('imageUrl', ''),
                'slideType': slide_type,
                'sourcePresentation': slide_data.get('source', ''),
                'relevanceScore': relevance_score,
                'orderIndex': index,
                'extractedAt': self._get_current_timestamp()
            }
            
        except Exception as e:
            logger.error(f"Error processing slide: {e}")
            return None
    
    async def _extract_text_from_image(self, image_url: str) -> str:
        """Extract text from slide image using OCR"""
        if not image_url:
            return ""
        
        try:
            # This would integrate with an OCR service like Tesseract or cloud OCR
            # For now, return empty string
            return ""
        except Exception as e:
            logger.error(f"Error extracting text from image {image_url}: {e}")
            return ""
    
    def _classify_slide_type(self, slide_data: Dict[str, Any], text_content: str) -> str:
        """Classify the type of slide based on content"""
        text_lower = text_content.lower()
        title = slide_data.get('title', '').lower()
        
        # Simple classification logic
        if any(word in text_lower for word in ['title', 'agenda', 'overview']):
            return 'title'
        elif any(word in text_lower for word in ['chart', 'graph', 'data', 'statistics']):
            return 'chart'
        elif any(word in text_lower for word in ['quote', 'testimonial', 'feedback']):
            return 'quote'
        elif any(word in text_lower for word in ['conclusion', 'summary', 'next steps']):
            return 'conclusion'
        elif any(word in text_lower for word in ['image', 'photo', 'picture']):
            return 'image'
        else:
            return 'content'
    
    def _calculate_relevance_score(self, slide_data: Dict[str, Any], text_content: str) -> float:
        """Calculate relevance score for the slide"""
        # Placeholder implementation
        # In a real implementation, this would use ML models to score relevance
        return 0.5
    
    def _extract_title(self, html: str) -> str:
        """Extract presentation title from HTML"""
        import re
        title_pattern = r'<title[^>]*>([^<]*)</title>'
        match = re.search(title_pattern, html, re.IGNORECASE)
        return match.group(1).strip() if match else "Untitled"
    
    def _extract_description(self, html: str) -> str:
        """Extract presentation description from HTML"""
        import re
        desc_pattern = r'<meta[^>]*name="description"[^>]*content="([^"]*)"'
        match = re.search(desc_pattern, html, re.IGNORECASE)
        return match.group(1).strip() if match else ""
    
    def _extract_author(self, html: str) -> str:
        """Extract presentation author from HTML"""
        import re
        author_pattern = r'<meta[^>]*name="author"[^>]*content="([^"]*)"'
        match = re.search(author_pattern, html, re.IGNORECASE)
        return match.group(1).strip() if match else ""
    
    def _get_current_timestamp(self) -> str:
        """Get current timestamp in ISO format"""
        from datetime import datetime
        return datetime.utcnow().isoformat()
