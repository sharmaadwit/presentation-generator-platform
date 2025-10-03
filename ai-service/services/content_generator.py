import openai
from typing import List, Dict, Any, Optional
import logging
import os
import json
import re
from .visual_element_generator import VisualElementGenerator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ContentGenerator:
    def __init__(self):
        # Initialize OpenAI client
        openai_key = os.getenv('OPENAI_API_KEY')
        
        if not openai_key or openai_key == "sk-dummy-key":
            logger.warning("OPENAI_API_KEY not found or is dummy. AI features will be disabled.")
            self.openai_client = None
        else:
            try:
                self.openai_client = openai.OpenAI(api_key=openai_key)
                logger.info("OpenAI client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {e}")
                self.openai_client = None
        
        # Initialize visual element generator
        self.visual_generator = VisualElementGenerator()
    
    async def generate_new_slides(
        self, 
        relevant_content: List[Dict[str, Any]], 
        request_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate new slides based on relevant training content"""
        
        try:
            print(f"🎨 CONTENT GENERATOR: Starting slide generation")
            print(f"   - Relevant content items: {len(relevant_content)}")
            print(f"   - Customer: {request_data.get('customer', 'N/A')}")
            print(f"   - Industry: {request_data.get('industry', 'N/A')}")
            print(f"   - Use case: {request_data.get('useCase', 'N/A')}")
            
            if not self.openai_client:
                print("⚠️ OpenAI client not available, using fallback content generation")
                return await self._generate_fallback_slides(relevant_content, request_data)
            
            # Generate slides using AI
            generated_slides = await self._generate_ai_slides(relevant_content, request_data)
            
            # Add visual elements to each slide
            enhanced_slides = []
            for i, slide in enumerate(generated_slides):
                print(f"🎨 ENHANCING SLIDE {i+1} WITH VISUAL ELEMENTS")
                enhanced_slide = await self._add_visual_elements(slide, request_data)
                enhanced_slides.append(enhanced_slide)
            
            print(f"✅ CONTENT GENERATOR: Generated {len(enhanced_slides)} enhanced slides")
            return enhanced_slides
            
        except Exception as e:
            logger.error(f"Error in content generation: {e}")
            # Fallback to simple content generation
            return await self._generate_fallback_slides(relevant_content, request_data)
    
    async def _generate_ai_slides(
        self, 
        relevant_content: List[Dict[str, Any]], 
        request_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate slides using AI based on relevant content"""
        
        try:
            # Prepare context from relevant content
            context_content = self._prepare_context(relevant_content)
            
            # Create prompt for AI generation
            prompt = self._create_generation_prompt(context_content, request_data)
            
            print(f"🤖 AI GENERATION: Creating slides with AI")
            print(f"   - Context length: {len(context_content)} characters")
            print(f"   - Prompt length: {len(prompt)} characters")
            
            # Generate content using OpenAI
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",  # Using cost-effective model
                messages=[
                    {
                        "role": "system",
                        "content": "You are a professional presentation generator. Create engaging, informative slides based on the provided context. Focus on creating clear, actionable content with visual elements."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=2000,
                temperature=0.7
            )
            
            # Parse the AI response
            ai_content = response.choices[0].message.content
            slides = self._parse_ai_response(ai_content, request_data)
            
            print(f"✅ AI GENERATION: Created {len(slides)} slides")
            return slides
            
        except Exception as e:
            logger.error(f"Error in AI slide generation: {e}")
            return await self._generate_fallback_slides(relevant_content, request_data)
    
    def _prepare_context(self, relevant_content: List[Dict[str, Any]]) -> str:
        """Prepare context from relevant content for AI generation"""
        
        context_parts = []
        
        for i, content in enumerate(relevant_content[:5]):  # Limit to top 5 most relevant
            context_parts.append(f"""
Content {i+1}:
- Title: {content.get('title', 'N/A')}
- Type: {content.get('slide_type', 'N/A')}
- Industry: {content.get('industry', 'N/A')}
- Content: {content.get('content', 'N/A')}
- Relevance Score: {content.get('relevance_score', 'N/A')}
""")
        
        return "\n".join(context_parts)
    
    def _create_generation_prompt(self, context_content: str, request_data: Dict[str, Any]) -> str:
        """Create prompt for AI content generation"""
        
        customer = request_data.get('customer', 'Client')
        industry = request_data.get('industry', 'Business')
        use_case = request_data.get('useCase', 'Presentation')
        target_audience = request_data.get('targetAudience', 'Stakeholders')
        style = request_data.get('style', 'professional')
        
        prompt = f"""
Based on the following relevant content from our knowledge base, create a professional presentation for:

Customer: {customer}
Industry: {industry}
Use Case: {use_case}
Target Audience: {target_audience}
Style: {style}

Relevant Content:
{context_content}

Please generate 5-7 slides in the following JSON format:
{{
    "slides": [
        {{
            "title": "Slide Title",
            "content": "Slide content with key points",
            "slide_type": "content|chart|infographic|title",
            "visual_data": {{
                "type": "chart|infographic|icon|tech_stack|innovation|steps",
                "data": {{"key": "value"}},
                "title": "Visual Element Title"
            }}
        }}
    ]
}}

Requirements:
1. Create engaging, professional content
2. Include visual elements (charts, infographics, icons) where appropriate
3. Make content specific to {customer} in {industry}
4. Focus on {use_case}
5. Use {style} style
6. Include actionable insights and key metrics where possible

Generate the JSON response only, no additional text.
"""
        
        return prompt
    
    def _parse_ai_response(self, ai_content: str, request_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Parse AI response and convert to slide format"""
        
        try:
            # Extract JSON from AI response
            json_match = re.search(r'\{.*\}', ai_content, re.DOTALL)
            if not json_match:
                raise ValueError("No JSON found in AI response")
            
            json_str = json_match.group(0)
            parsed_data = json.loads(json_str)
            
            slides = []
            for slide_data in parsed_data.get('slides', []):
                slide = {
                    'title': slide_data.get('title', 'Untitled Slide'),
                    'content': slide_data.get('content', ''),
                    'slide_type': slide_data.get('slide_type', 'content'),
                    'images': []
                }
                
                # Add visual data if present
                visual_data = slide_data.get('visual_data')
                if visual_data:
                    slide['images'] = [visual_data]
                
                slides.append(slide)
            
            return slides
            
        except Exception as e:
            logger.error(f"Error parsing AI response: {e}")
            # Return fallback slides
            return self._create_fallback_slides(request_data)
    
    async def _generate_fallback_slides(
        self, 
        relevant_content: List[Dict[str, Any]], 
        request_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate fallback slides when AI is not available"""
        
        print(f"🔄 FALLBACK GENERATION: Creating slides without AI")
        
        slides = []
        
        # Create title slide
        slides.append({
            'title': f"{request_data.get('customer', 'Client')} - {request_data.get('industry', 'Business')}",
            'content': f"{request_data.get('useCase', 'Presentation')} Overview",
            'slide_type': 'title',
            'images': []
        })
        
        # Create content slides based on relevant content
        for i, content in enumerate(relevant_content[:4]):  # Limit to 4 content slides
            slide = {
                'title': content.get('title', f'Key Point {i+1}'),
                'content': content.get('content', ''),
                'slide_type': 'content',
                'images': []
            }
            
            # Add visual element based on content type
            if 'chart' in content.get('slide_type', '').lower():
                slide['images'] = [{
                    'title': f"{slide['title']} Chart",
                    'type': 'chart',
                    'data': {'2020': 100, '2021': 120, '2022': 140, '2023': 160}
                }]
            elif 'infographic' in content.get('slide_type', '').lower():
                slide['images'] = [{
                    'title': f"{slide['title']} Infographic",
                    'type': 'infographic',
                    'data': {'Process': 'Step 1', 'Analysis': 'Step 2', 'Implementation': 'Step 3'}
                }]
            
            slides.append(slide)
        
        # Create conclusion slide
        slides.append({
            'title': 'Thank You',
            'content': f'Questions & Discussion\n\n{request_data.get("customer", "Client")} - {request_data.get("industry", "Business")}',
            'slide_type': 'title',
            'images': []
        })
        
        print(f"✅ FALLBACK GENERATION: Created {len(slides)} slides")
        return slides
    
    def _create_fallback_slides(self, request_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Create basic fallback slides when all else fails"""
        
        return [
            {
                'title': f"{request_data.get('customer', 'Client')} - {request_data.get('industry', 'Business')}",
                'content': f"{request_data.get('useCase', 'Presentation')} Overview",
                'slide_type': 'title',
                'images': []
            },
            {
                'title': 'Key Objectives',
                'content': '• Define clear goals\n• Establish metrics\n• Create action plan\n• Monitor progress',
                'slide_type': 'content',
                'images': [{
                    'title': 'Objectives Chart',
                    'type': 'chart',
                    'data': {'Planning': 25, 'Execution': 50, 'Monitoring': 25}
                }]
            },
            {
                'title': 'Implementation Strategy',
                'content': '• Phase 1: Planning and preparation\n• Phase 2: Implementation\n• Phase 3: Monitoring and optimization',
                'slide_type': 'content',
                'images': [{
                    'title': 'Implementation Steps',
                    'type': 'steps',
                    'data': {'Phase 1': 'Planning', 'Phase 2': 'Execution', 'Phase 3': 'Optimization'}
                }]
            },
            {
                'title': 'Thank You',
                'content': f'Questions & Discussion\n\n{request_data.get("customer", "Client")} - {request_data.get("industry", "Business")}',
                'slide_type': 'title',
                'images': []
            }
        ]
    
    async def _add_visual_elements(self, slide: Dict[str, Any], request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add visual elements to a slide"""
        
        try:
            # Generate visual elements based on slide content
            visual_elements = await self.visual_generator.generate_visual_elements(
                slide['content'],
                slide['title'],
                slide.get('slide_type', 'content'),
                request_data
            )
            
            # Add visual elements to slide
            if visual_elements:
                slide['images'] = visual_elements
                print(f"🎨 Added {len(visual_elements)} visual elements to slide: {slide['title']}")
            
            return slide
            
        except Exception as e:
            logger.error(f"Error adding visual elements: {e}")
            return slide
