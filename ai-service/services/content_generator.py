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
        """Find and copy the most relevant slides from training data using AI search"""
        
        try:
            print(f"🔍 AI-POWERED SLIDE SEARCH: Finding most relevant slides")
            print(f"   - Available content items: {len(relevant_content)}")
            print(f"   - Customer: {request_data.get('customer', 'N/A')}")
            print(f"   - Industry: {request_data.get('industry', 'N/A')}")
            print(f"   - Use case: {request_data.get('useCase', 'N/A')}")
            
            # Store source images for later use
            self.source_images_pool = []
            for content in relevant_content:
                if content.get('images'):
                    self.source_images_pool.extend(content['images'])
                    print(f"📸 FOUND {len(content['images'])} IMAGES IN SOURCE CONTENT")
            
            print(f"📸 TOTAL SOURCE IMAGES AVAILABLE: {len(self.source_images_pool)}")
            
            if not self.openai_client:
                print("⚠️ OpenAI client not available, using fallback slide selection")
                return await self._select_fallback_slides(relevant_content, request_data)
            
            # Use AI to find the most relevant slides to copy
            selected_slides = await self._ai_search_relevant_slides(relevant_content, request_data)
            
            print(f"✅ AI SEARCH: Selected {len(selected_slides)} slides to copy")
            return selected_slides
            
        except Exception as e:
            logger.error(f"Error in AI slide search: {e}")
            # Fallback to simple slide selection
            return await self._select_fallback_slides(relevant_content, request_data)
    
    async def _ai_search_relevant_slides(
        self, 
        relevant_content: List[Dict[str, Any]], 
        request_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Use AI to find the most relevant slides from training data to copy exactly"""
        
        try:
            # Prepare context from relevant content for AI analysis
            context_content = self._prepare_search_context(relevant_content)
            
            # Create optimized prompt for AI search
            search_prompt = self._create_search_prompt(context_content, request_data)
            
            print(f"🔍 AI SEARCH: Analyzing {len(relevant_content)} slides for relevance")
            print(f"   - Prompt length: {len(search_prompt)} characters")
            
            # Use AI to analyze and rank slides
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",  # Cost-effective model for search
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert presentation curator. Your job is to analyze training slides and select the most relevant ones to copy exactly into a new presentation. Focus on content relevance, visual quality, and professional appearance. Return only the IDs of the best slides to copy."
                    },
                    {
                        "role": "user",
                        "content": search_prompt
                    }
                ],
                max_tokens=500,  # Small response - just slide IDs
                temperature=0.1   # Low temperature for consistent results
            )
            
            # Parse AI response to get selected slide IDs
            ai_response = response.choices[0].message.content
            selected_ids = self._parse_slide_selection(ai_response, relevant_content)
            
            # Convert selected IDs to slide data with copy_exact action
            selected_slides = []
            for content in relevant_content:
                if content.get('id') in selected_ids:
                    slide = {
                        'title': content.get('title', 'Untitled Slide'),
                        'content': content.get('content', ''),
                        'slide_type': content.get('slide_type', 'content'),
                        'images': content.get('images', []),
                        'formatting': content.get('formatting', {}),
                        'layout_info': content.get('layout_info', {}),
                        'source_title': content.get('source_title', 'Unknown Source'),
                        'action': 'copy_exact',  # Copy exactly as-is
                        'sourcePresentation': content.get('source_title', 'Unknown')
                    }
                    selected_slides.append(slide)
                    print(f"📄 SELECTED SLIDE: {slide['title']} (ID: {content.get('id')})")
            
            print(f"✅ AI SEARCH: Selected {len(selected_slides)} slides for exact copying")
            return selected_slides
            
        except Exception as e:
            logger.error(f"Error in AI slide search: {e}")
            return await self._select_fallback_slides(relevant_content, request_data)
    
    def _prepare_search_context(self, relevant_content: List[Dict[str, Any]]) -> str:
        """Prepare context from relevant content for AI search analysis"""
        
        context_parts = []
        
        for i, content in enumerate(relevant_content[:10]):  # Analyze more slides for better selection
            images_info = content.get('images', [])
            visual_summary = f"{len(images_info)} visual elements" if images_info else "No visuals"
            
            context_parts.append(f"""
Slide ID: {content.get('id', f'slide_{i+1}')}
Title: {content.get('title', 'N/A')}
Type: {content.get('slide_type', 'N/A')}
Industry: {content.get('industry', 'N/A')}
Content Preview: {content.get('content', 'N/A')[:200]}...
Visual Elements: {visual_summary}
Source: {content.get('source_title', 'N/A')}
Relevance Score: {content.get('relevance_score', 'N/A')}
""")
        
        return "\n".join(context_parts)
    
    def _prepare_context(self, relevant_content: List[Dict[str, Any]]) -> str:
        """Prepare context from relevant content for AI generation (legacy method)"""
        
        context_parts = []
        
        for i, content in enumerate(relevant_content[:5]):  # Limit to top 5 most relevant
            images_info = content.get('images', [])
            visual_summary = f"{len(images_info)} visual elements" if images_info else "No visuals"
            
            context_parts.append(f"""
Content {i+1}:
- Title: {content.get('title', 'N/A')}
- Type: {content.get('slide_type', 'N/A')}
- Industry: {content.get('industry', 'N/A')}
- Content: {content.get('content', 'N/A')}
- Visual Elements: {visual_summary}
- Relevance Score: {content.get('relevance_score', 'N/A')}
""")
        
        return "\n".join(context_parts)
    
    def _create_search_prompt(self, context_content: str, request_data: Dict[str, Any]) -> str:
        """Create optimized prompt for AI slide search and selection"""
        
        customer = request_data.get('customer', 'Client')
        industry = request_data.get('industry', 'Business')
        use_case = request_data.get('useCase', 'Presentation')
        target_audience = request_data.get('targetAudience', 'Stakeholders')
        style = request_data.get('style', 'professional')
        
        prompt = f"""
You are analyzing training slides to select the most relevant ones for a new presentation.

PRESENTATION REQUIREMENTS:
- Customer: {customer}
- Industry: {industry}
- Use Case: {use_case}
- Target Audience: {target_audience}
- Style: {style}

AVAILABLE TRAINING SLIDES:
{context_content}

TASK: Select exactly 5-7 slides that are most relevant to the requirements above.

SELECTION CRITERIA:
1. Content relevance to {use_case} in {industry}
2. Visual quality (prefer slides with images/charts/diagrams)
3. Professional appearance
4. Appropriate for {target_audience}
5. Variety in slide types (mix of content, charts, etc.)

RESPONSE FORMAT: Return only the Slide IDs separated by commas, like this:
slide_1, slide_3, slide_7, slide_12, slide_15

Do not include any other text, just the comma-separated list of Slide IDs.
"""
        
        return prompt
    
    def _parse_slide_selection(self, ai_response: str, relevant_content: List[Dict[str, Any]]) -> List[str]:
        """Parse AI response to extract selected slide IDs"""
        
        try:
            # Extract slide IDs from AI response
            # AI should return comma-separated IDs like: slide_1, slide_3, slide_7
            lines = ai_response.strip().split('\n')
            slide_ids = []
            
            for line in lines:
                # Look for comma-separated IDs
                if ',' in line:
                    ids = [id.strip() for id in line.split(',')]
                    slide_ids.extend(ids)
                elif line.strip() and not line.startswith('Slide ID:'):
                    # Single ID on a line
                    slide_ids.append(line.strip())
            
            # Validate that the IDs exist in our content
            valid_ids = []
            available_ids = [str(content.get('id', f'slide_{i+1}')) for i, content in enumerate(relevant_content)]
            
            for slide_id in slide_ids:
                if slide_id in available_ids:
                    valid_ids.append(slide_id)
                else:
                    print(f"⚠️ AI selected invalid slide ID: {slide_id}")
            
            # If AI didn't select enough slides, add some defaults
            if len(valid_ids) < 3:
                print(f"⚠️ AI selected only {len(valid_ids)} slides, adding defaults")
                for i, content in enumerate(relevant_content[:5]):
                    slide_id = str(content.get('id', f'slide_{i+1}'))
                    if slide_id not in valid_ids:
                        valid_ids.append(slide_id)
                    if len(valid_ids) >= 5:
                        break
            
            print(f"📋 PARSED SLIDE SELECTION: {valid_ids}")
            return valid_ids
            
        except Exception as e:
            logger.error(f"Error parsing slide selection: {e}")
            # Fallback: return first 5 slides
            return [str(content.get('id', f'slide_{i+1}')) for i, content in enumerate(relevant_content[:5])]
    
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
    
    async def _enhance_slide_with_visuals(self, slide: Dict[str, Any], request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Enhance slide with visual elements - prioritize source images over synthetic generation"""
        
        try:
            print(f"🎨 ENHANCING SLIDE: {slide.get('title', 'Untitled')}")
            print(f"   - Current images: {len(slide.get('images', []))}")
            
            # Priority 1: Use source images if available
            if hasattr(self, 'source_images_pool') and self.source_images_pool and slide.get('slide_type') in ['chart', 'infographic', 'content']:
                # Take 1-2 images from source pool
                slide['images'] = self.source_images_pool[:2]
                self.source_images_pool = self.source_images_pool[2:]  # Remove used images
                print(f"📸 USING SOURCE IMAGES for slide: {slide['title']} ({len(slide['images'])} images)")
                
                # Log details of each image being used
                for i, img in enumerate(slide['images']):
                    img_title = img.get('title', f'Image {i+1}')
                    img_type = img.get('type', 'unknown')
                    has_data = bool(img.get('image_data') or img.get('image_blob'))
                    print(f"   📸 Image {i+1}: {img_title} (type: {img_type}, has_data: {has_data})")
            
            # Priority 2: Generate synthetic visuals if no source images
            elif not slide.get('images'):
                print(f"🎨 NO SOURCE IMAGES - Generating synthetic visuals for: {slide['title']}")
                visual_elements = await self.visual_generator.generate_visual_elements(
                    slide['content'], slide['title'], slide.get('slide_type', 'content'), request_data
                )
                if visual_elements:
                    slide['images'] = visual_elements
                    print(f"🎨 GENERATED SYNTHETIC VISUALS for slide: {slide['title']} ({len(visual_elements)} elements)")
                else:
                    print(f"⚠️ NO VISUALS AVAILABLE for slide: {slide['title']}")
            else:
                print(f"📸 SLIDE ALREADY HAS IMAGES: {slide['title']} ({len(slide.get('images', []))} images)")
            
            print(f"✅ FINAL SLIDE IMAGES: {len(slide.get('images', []))} visual elements")
            return slide
            
        except Exception as e:
            logger.error(f"Error enhancing slide with visuals: {e}")
            return slide
    
    async def _add_visual_elements(self, slide: Dict[str, Any], request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Add visual elements to a slide (legacy method - kept for compatibility)"""
        
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
