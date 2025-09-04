import asyncio
import aiohttp
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright
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
        """Discover relevant presentations from various sources"""
        results = []
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            
            # Search multiple sources in parallel
            for source in self.presentation_sources:
                task = self._search_source(session, source, query, industry)
                tasks.append(task)
            
            # Wait for all searches to complete
            source_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Combine and deduplicate results
            for source_result in source_results:
                if isinstance(source_result, list):
                    results.extend(source_result)
                elif isinstance(source_result, Exception):
                    logger.error(f"Search failed: {source_result}")
        
        # Sort by relevance score and return top results
        results.sort(key=lambda x: x.get('relevanceScore', 0), reverse=True)
        return results[:max_results]
    
    async def _search_source(self, session: aiohttp.ClientSession, source: str, query: str, industry: str) -> List[Dict[str, Any]]:
        """Search a specific source for presentations"""
        try:
            if "slideshare" in source:
                return await self._search_slideshare(session, query, industry)
            elif "speakerdeck" in source:
                return await self._search_speakerdeck(session, query, industry)
            elif "prezi" in source:
                return await self._search_prezi(session, query, industry)
            else:
                return await self._search_generic(session, source, query, industry)
        except Exception as e:
            logger.error(f"Error searching {source}: {e}")
            return []
    
    async def _search_slideshare(self, session: aiohttp.ClientSession, query: str, industry: str) -> List[Dict[str, Any]]:
        """Search SlideShare for presentations"""
        results = []
        
        try:
            # Construct SlideShare search URL
            search_url = f"https://www.slideshare.net/search/slideshow?q={query}+{industry}"
            
            async with session.get(search_url) as response:
                if response.status == 200:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # Find presentation links
                    presentation_links = soup.find_all('a', href=re.compile(r'/.*/.*'))
                    
                    for link in presentation_links[:10]:  # Limit to 10 results
                        href = link.get('href')
                        if href and '/slideshare/' in href:
                            title_elem = link.find('h3') or link.find('h2') or link.find('h1')
                            title = title_elem.get_text(strip=True) if title_elem else "Untitled"
                            
                            # Calculate relevance score
                            relevance_score = self._calculate_relevance(title, query, industry)
                            
                            if relevance_score > 0.3:  # Only include relevant results
                                results.append({
                                    'url': urljoin('https://www.slideshare.net', href),
                                    'title': title,
                                    'description': self._extract_description(link),
                                    'source': 'slideshare',
                                    'relevanceScore': relevance_score,
                                    'industry': industry
                                })
        except Exception as e:
            logger.error(f"Error searching SlideShare: {e}")
        
        return results
    
    async def _search_speakerdeck(self, session: aiohttp.ClientSession, query: str, industry: str) -> List[Dict[str, Any]]:
        """Search SpeakerDeck for presentations"""
        results = []
        
        try:
            search_url = f"https://speakerdeck.com/search?q={query}+{industry}"
            
            async with session.get(search_url) as response:
                if response.status == 200:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # Find presentation cards
                    cards = soup.find_all('div', class_=re.compile(r'deck|presentation'))
                    
                    for card in cards[:10]:
                        link_elem = card.find('a')
                        if link_elem:
                            href = link_elem.get('href')
                            title_elem = card.find('h3') or card.find('h2')
                            title = title_elem.get_text(strip=True) if title_elem else "Untitled"
                            
                            relevance_score = self._calculate_relevance(title, query, industry)
                            
                            if relevance_score > 0.3:
                                results.append({
                                    'url': urljoin('https://speakerdeck.com', href),
                                    'title': title,
                                    'description': self._extract_description(card),
                                    'source': 'speakerdeck',
                                    'relevanceScore': relevance_score,
                                    'industry': industry
                                })
        except Exception as e:
            logger.error(f"Error searching SpeakerDeck: {e}")
        
        return results
    
    async def _search_prezi(self, session: aiohttp.ClientSession, query: str, industry: str) -> List[Dict[str, Any]]:
        """Search Prezi for presentations"""
        results = []
        
        try:
            search_url = f"https://prezi.com/search/?q={query}+{industry}"
            
            async with session.get(search_url) as response:
                if response.status == 200:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # Find presentation links
                    links = soup.find_all('a', href=re.compile(r'/presentation/'))
                    
                    for link in links[:10]:
                        href = link.get('href')
                        title_elem = link.find('h3') or link.find('h2')
                        title = title_elem.get_text(strip=True) if title_elem else "Untitled"
                        
                        relevance_score = self._calculate_relevance(title, query, industry)
                        
                        if relevance_score > 0.3:
                            results.append({
                                'url': urljoin('https://prezi.com', href),
                                'title': title,
                                'description': self._extract_description(link),
                                'source': 'prezi',
                                'relevanceScore': relevance_score,
                                'industry': industry
                            })
        except Exception as e:
            logger.error(f"Error searching Prezi: {e}")
        
        return results
    
    async def _search_generic(self, session: aiohttp.ClientSession, source: str, query: str, industry: str) -> List[Dict[str, Any]]:
        """Generic search for other sources"""
        # This would implement generic search logic for other sources
        # For now, return empty list
        return []
    
    def _calculate_relevance(self, title: str, query: str, industry: str) -> float:
        """Calculate relevance score based on title, query, and industry"""
        score = 0.0
        title_lower = title.lower()
        query_lower = query.lower()
        industry_lower = industry.lower()
        
        # Check for query terms in title
        query_terms = query_lower.split()
        for term in query_terms:
            if term in title_lower:
                score += 0.3
        
        # Check for industry terms in title
        industry_terms = industry_lower.split()
        for term in industry_terms:
            if term in title_lower:
                score += 0.2
        
        # Bonus for exact phrase matches
        if query_lower in title_lower:
            score += 0.3
        
        if industry_lower in title_lower:
            score += 0.2
        
        return min(score, 1.0)  # Cap at 1.0
    
    def _extract_description(self, element) -> str:
        """Extract description from HTML element"""
        desc_elem = element.find('p') or element.find('div', class_=re.compile(r'desc|summary'))
        if desc_elem:
            return desc_elem.get_text(strip=True)[:200]  # Limit length
        return ""
    
    async def extract_presentation_content(self, url: str) -> Dict[str, Any]:
        """Extract content from a presentation URL using Playwright"""
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                
                await page.goto(url, wait_until='networkidle')
                
                # Extract presentation data based on source
                if 'slideshare' in url:
                    return await self._extract_slideshare_content(page)
                elif 'speakerdeck' in url:
                    return await self._extract_speakerdeck_content(page)
                elif 'prezi' in url:
                    return await self._extract_prezi_content(page)
                else:
                    return await self._extract_generic_content(page)
                
        except Exception as e:
            logger.error(f"Error extracting content from {url}: {e}")
            return {}
    
    async def _extract_slideshare_content(self, page) -> Dict[str, Any]:
        """Extract content from SlideShare presentation"""
        try:
            # Wait for slides to load
            await page.wait_for_selector('.slide', timeout=10000)
            
            # Extract slide data
            slides = await page.evaluate("""
                () => {
                    const slideElements = document.querySelectorAll('.slide');
                    return Array.from(slideElements).map((slide, index) => {
                        const img = slide.querySelector('img');
                        const text = slide.querySelector('.slide-content, .slide-text');
                        return {
                            index: index,
                            imageUrl: img ? img.src : null,
                            text: text ? text.textContent : '',
                            alt: img ? img.alt : ''
                        };
                    });
                }
            """)
            
            return {
                'slides': slides,
                'totalSlides': len(slides),
                'source': 'slideshare'
            }
        except Exception as e:
            logger.error(f"Error extracting SlideShare content: {e}")
            return {}
    
    async def _extract_speakerdeck_content(self, page) -> Dict[str, Any]:
        """Extract content from SpeakerDeck presentation"""
        try:
            await page.wait_for_selector('.deck', timeout=10000)
            
            slides = await page.evaluate("""
                () => {
                    const slideElements = document.querySelectorAll('.deck .slide');
                    return Array.from(slideElements).map((slide, index) => {
                        const img = slide.querySelector('img');
                        const text = slide.querySelector('.slide-content');
                        return {
                            index: index,
                            imageUrl: img ? img.src : null,
                            text: text ? text.textContent : '',
                            alt: img ? img.alt : ''
                        };
                    });
                }
            """)
            
            return {
                'slides': slides,
                'totalSlides': len(slides),
                'source': 'speakerdeck'
            }
        except Exception as e:
            logger.error(f"Error extracting SpeakerDeck content: {e}")
            return {}
    
    async def _extract_prezi_content(self, page) -> Dict[str, Any]:
        """Extract content from Prezi presentation"""
        try:
            await page.wait_for_selector('.prezi', timeout=10000)
            
            slides = await page.evaluate("""
                () => {
                    const slideElements = document.querySelectorAll('.prezi .slide');
                    return Array.from(slideElements).map((slide, index) => {
                        const img = slide.querySelector('img');
                        const text = slide.querySelector('.slide-text');
                        return {
                            index: index,
                            imageUrl: img ? img.src : null,
                            text: text ? text.textContent : '',
                            alt: img ? img.alt : ''
                        };
                    });
                }
            """)
            
            return {
                'slides': slides,
                'totalSlides': len(slides),
                'source': 'prezi'
            }
        except Exception as e:
            logger.error(f"Error extracting Prezi content: {e}")
            return {}
    
    async def _extract_generic_content(self, page) -> Dict[str, Any]:
        """Generic content extraction for unknown sources"""
        try:
            # Try to find common slide patterns
            slides = await page.evaluate("""
                () => {
                    const slideSelectors = [
                        '.slide', '.slide-container', '.presentation-slide',
                        '.deck-slide', '.prezi-slide', '[class*="slide"]'
                    ];
                    
                    let slides = [];
                    for (const selector of slideSelectors) {
                        const elements = document.querySelectorAll(selector);
                        if (elements.length > 0) {
                            slides = Array.from(elements).map((slide, index) => {
                                const img = slide.querySelector('img');
                                const text = slide.querySelector('p, h1, h2, h3, div');
                                return {
                                    index: index,
                                    imageUrl: img ? img.src : null,
                                    text: text ? text.textContent : '',
                                    alt: img ? img.alt : ''
                                };
                            });
                            break;
                        }
                    }
                    return slides;
                }
            """)
            
            return {
                'slides': slides,
                'totalSlides': len(slides),
                'source': 'generic'
            }
        except Exception as e:
            logger.error(f"Error extracting generic content: {e}")
            return {}
