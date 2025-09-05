import asyncio
import aiohttp
from bs4 import BeautifulSoup
from typing import List, Dict, Any
import re
from urllib.parse import urljoin, urlparse
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class WebScraper:
    def __init__(self):
        self.session = None
        self.presentation_sources = [
            "slideshare.net",
            "speakerdeck.com", 
            "prezi.com",
            "canva.com",
            "slides.com",
            "issuu.com",
            "scribd.com"
        ]
        
    async def discover_presentations(self, query: str, industry: str, max_results: int = 20) -> List[Dict[str, Any]]:
        """DISABLED: Web scraping is not permitted in controlled knowledge base system"""
        logger.warning("Web scraping is disabled. This system only uses uploaded, approved content.")
        return []
    
    async def _search_source(self, session: aiohttp.ClientSession, source: str, query: str, industry: str) -> List[Dict[str, Any]]:
        """Search a specific source for presentations"""
        try:
            # Simplified search - return empty for now
            return []
        except Exception as e:
            logger.error(f"Error searching {source}: {e}")
            return []
    
    async def _search_slideshare(self, session: aiohttp.ClientSession, query: str, industry: str) -> List[Dict[str, Any]]:
        """Search SlideShare for presentations"""
        return []
    
    async def _search_speakerdeck(self, session: aiohttp.ClientSession, query: str, industry: str) -> List[Dict[str, Any]]:
        """Search SpeakerDeck for presentations"""
        return []
    
    async def _search_prezi(self, session: aiohttp.ClientSession, query: str, industry: str) -> List[Dict[str, Any]]:
        """Search Prezi for presentations"""
        return []
    
    async def _search_generic(self, session: aiohttp.ClientSession, source: str, query: str, industry: str) -> List[Dict[str, Any]]:
        """Generic search for other sources"""
        return []
    
    def _build_search_url(self, source: str, query: str) -> str:
        """Build search URL for a specific source"""
        if "slideshare" in source:
            return f"https://www.slideshare.net/search/slideshow?searchfrom=header&q={query}"
        elif "speakerdeck" in source:
            return f"https://speakerdeck.com/search?q={query}"
        elif "prezi" in source:
            return f"https://prezi.com/search/?q={query}"
        else:
            return f"https://{source}/search?q={query}"
    
    def _extract_presentation_data(self, element, source: str) -> Dict[str, Any]:
        """Extract presentation data from HTML element"""
        return {
            "title": "Sample Presentation",
            "url": "https://example.com/sample",
            "source": source,
            "description": "Sample description",
            "slides_count": 10,
            "download_url": "https://example.com/sample.pptx",
            "relevanceScore": 0.5
        }
    
    def _calculate_relevance_score(self, title: str, description: str, query: str, industry: str) -> float:
        """Calculate relevance score for a presentation"""
        score = 0.0
        
        # Simple keyword matching
        query_words = query.lower().split()
        title_words = title.lower().split()
        desc_words = description.lower().split()
        
        # Title matches
        for word in query_words:
            if word in title_words:
                score += 0.3
        
        # Description matches
        for word in query_words:
            if word in desc_words:
                score += 0.2
        
        # Industry matches
        if industry.lower() in title.lower() or industry.lower() in description.lower():
            score += 0.3
        
        return min(score, 1.0)
    
    async def close(self):
        """Close the scraper session"""
        if self.session:
            await self.session.close()