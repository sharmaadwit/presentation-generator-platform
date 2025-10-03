import re
import json
from typing import List, Dict, Any, Optional
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VisualElementGenerator:
    def __init__(self):
        """Initialize the visual element generator"""
        pass
    
    async def generate_visual_elements(
        self, 
        content: str, 
        title: str, 
        slide_type: str, 
        request_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate visual elements based on slide content"""
        
        try:
            print(f"🎨 VISUAL GENERATOR: Analyzing content for visual elements")
            print(f"   - Title: {title}")
            print(f"   - Slide Type: {slide_type}")
            print(f"   - Content Length: {len(content)} characters")
            
            visual_elements = []
            
            # Analyze content for different types of visual elements
            visual_elements.extend(await self._extract_charts(content, title))
            visual_elements.extend(await self._extract_infographics(content, title))
            visual_elements.extend(await self._extract_icons(content, title))
            visual_elements.extend(await self._extract_tech_stack(content, title))
            visual_elements.extend(await self._extract_innovation(content, title))
            visual_elements.extend(await self._extract_steps(content, title))
            
            print(f"✅ VISUAL GENERATOR: Generated {len(visual_elements)} visual elements")
            return visual_elements
            
        except Exception as e:
            logger.error(f"Error generating visual elements: {e}")
            return []
    
    async def _extract_charts(self, content: str, title: str) -> List[Dict[str, Any]]:
        """Extract chart data from content"""
        
        charts = []
        
        # Look for numerical data patterns
        number_patterns = [
            r'(\d+)\s*%',  # Percentage patterns
            r'(\d+)\s*percent',  # Percentage text
            r'(\d+)\s*billion',  # Billion amounts
            r'(\d+)\s*million',  # Million amounts
            r'(\d+)\s*thousand',  # Thousand amounts
            r'(\d{4}):\s*(\d+)',  # Year: value patterns
            r'(\d+)\s*out\s*of\s*(\d+)',  # Fraction patterns
        ]
        
        for pattern in number_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                chart_data = {}
                for match in matches:
                    if len(match) == 2:
                        chart_data[match[0]] = int(match[1])
                    else:
                        chart_data[match[0]] = int(match[0])
                
                if chart_data:
                    charts.append({
                        'title': f"{title} - Data Analysis",
                        'type': 'chart',
                        'data': chart_data
                    })
                    break
        
        # Look for comparison patterns
        comparison_patterns = [
            r'(\w+)\s*(\d+)\s*(\w+)\s*(\d+)',  # A 50 B 30 patterns
            r'(\d+)\s*(\w+)\s*vs\s*(\d+)\s*(\w+)',  # 50 A vs 30 B patterns
        ]
        
        for pattern in comparison_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                chart_data = {}
                for match in matches:
                    if len(match) == 4:
                        chart_data[match[1]] = int(match[0])
                        chart_data[match[3]] = int(match[2])
                
                if chart_data:
                    charts.append({
                        'title': f"{title} - Comparison",
                        'type': 'chart',
                        'data': chart_data
                    })
                    break
        
        return charts
    
    async def _extract_infographics(self, content: str, title: str) -> List[Dict[str, Any]]:
        """Extract infographic data from content"""
        
        infographics = []
        
        # Look for process patterns
        process_keywords = ['process', 'workflow', 'pipeline', 'methodology', 'approach']
        if any(keyword in content.lower() for keyword in process_keywords):
            infographics.append({
                'title': f"{title} - Process Flow",
                'type': 'infographic',
                'data': {
                    'Step 1': 'Planning',
                    'Step 2': 'Execution',
                    'Step 3': 'Monitoring',
                    'Step 4': 'Optimization'
                }
            })
        
        # Look for category patterns
        category_patterns = [
            r'(\w+)\s*and\s*(\w+)\s*and\s*(\w+)',  # A and B and C
            r'(\w+),\s*(\w+),\s*and\s*(\w+)',  # A, B, and C
        ]
        
        for pattern in category_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                for match in matches:
                    if len(match) == 3:
                        infographics.append({
                            'title': f"{title} - Categories",
                            'type': 'infographic',
                            'data': {
                                'Category 1': match[0],
                                'Category 2': match[1],
                                'Category 3': match[2]
                            }
                        })
                        break
        
        return infographics
    
    async def _extract_icons(self, content: str, title: str) -> List[Dict[str, Any]]:
        """Extract icon data from content"""
        
        icons = []
        
        # Look for key concept patterns
        concept_keywords = {
            'growth': '📈',
            'success': '🎯',
            'innovation': '💡',
            'technology': '🔧',
            'security': '🔒',
            'efficiency': '⚡',
            'quality': '⭐',
            'collaboration': '🤝',
            'strategy': '🎯',
            'analysis': '📊',
            'implementation': '🚀',
            'monitoring': '👁️',
            'optimization': '⚙️',
            'automation': '🤖',
            'integration': '🔗'
        }
        
        for keyword, icon in concept_keywords.items():
            if keyword in content.lower():
                icons.append({
                    'title': f"{title} - {keyword.title()}",
                    'type': 'icon',
                    'data': {'concept': keyword, 'icon': icon}
                })
        
        return icons
    
    async def _extract_tech_stack(self, content: str, title: str) -> List[Dict[str, Any]]:
        """Extract technology stack data from content"""
        
        tech_stacks = []
        
        # Look for technology patterns
        tech_keywords = [
            'python', 'javascript', 'java', 'react', 'angular', 'vue',
            'nodejs', 'django', 'flask', 'spring', 'express',
            'aws', 'azure', 'gcp', 'docker', 'kubernetes',
            'mysql', 'postgresql', 'mongodb', 'redis',
            'api', 'microservices', 'rest', 'graphql'
        ]
        
        found_tech = []
        for tech in tech_keywords:
            if tech in content.lower():
                found_tech.append(tech)
        
        if found_tech:
            tech_stacks.append({
                'title': f"{title} - Technology Stack",
                'type': 'tech_stack',
                'data': {f'Tech {i+1}': tech for i, tech in enumerate(found_tech[:5])}
            })
        
        return tech_stacks
    
    async def _extract_innovation(self, content: str, title: str) -> List[Dict[str, Any]]:
        """Extract innovation data from content"""
        
        innovations = []
        
        # Look for innovation patterns
        innovation_keywords = [
            'innovation', 'breakthrough', 'revolutionary', 'cutting-edge',
            'advanced', 'next-generation', 'disruptive', 'transformative',
            'ai', 'artificial intelligence', 'machine learning', 'blockchain',
            'iot', 'internet of things', 'cloud', 'edge computing'
        ]
        
        found_innovations = []
        for innovation in innovation_keywords:
            if innovation in content.lower():
                found_innovations.append(innovation)
        
        if found_innovations:
            innovations.append({
                'title': f"{title} - Innovation",
                'type': 'innovation',
                'data': {f'Innovation {i+1}': innovation for i, innovation in enumerate(found_innovations[:3])}
            })
        
        return innovations
    
    async def _extract_steps(self, content: str, title: str) -> List[Dict[str, Any]]:
        """Extract step-by-step data from content"""
        
        steps = []
        
        # Look for step patterns
        step_patterns = [
            r'step\s*(\d+):\s*([^.\n]+)',  # Step 1: description
            r'(\d+)\.\s*([^.\n]+)',  # 1. description
            r'first[,\s]+([^.\n]+)',  # First, description
            r'second[,\s]+([^.\n]+)',  # Second, description
            r'third[,\s]+([^.\n]+)',  # Third, description
        ]
        
        step_data = {}
        step_counter = 1
        
        for pattern in step_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for match in matches:
                if len(match) == 2:
                    step_data[f'Step {step_counter}'] = match[1].strip()
                    step_counter += 1
                elif len(match) == 1:
                    step_data[f'Step {step_counter}'] = match[0].strip()
                    step_counter += 1
        
        if step_data:
            steps.append({
                'title': f"{title} - Process Steps",
                'type': 'steps',
                'data': step_data
            })
        
        return steps
    
    def _create_sample_chart_data(self, title: str) -> Dict[str, Any]:
        """Create sample chart data for testing"""
        
        return {
            'title': f"{title} - Sample Chart",
            'type': 'chart',
            'data': {
                '2020': 100,
                '2021': 120,
                '2022': 140,
                '2023': 160
            }
        }
    
    def _create_sample_infographic_data(self, title: str) -> Dict[str, Any]:
        """Create sample infographic data for testing"""
        
        return {
            'title': f"{title} - Sample Infographic",
            'type': 'infographic',
            'data': {
                'Planning': '25%',
                'Execution': '50%',
                'Monitoring': '25%'
            }
        }
