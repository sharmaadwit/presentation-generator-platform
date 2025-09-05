import openai
from typing import List, Dict, Any, Optional
import logging
import re
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ContentMatcher:
    def __init__(self):
        # Initialize OpenAI client
        openai_key = os.getenv('OPENAI_API_KEY')
        
        if not openai_key:
            logger.error("OPENAI_API_KEY not found. AI features will be disabled.")
            self.openai_client = None
        else:
            self.openai_client = openai.OpenAI(api_key=openai_key)
            logger.info("OpenAI client initialized successfully with GPT-5 low thinking mode")
        
        # Initialize text vectorizer for similarity matching
        self.vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2)
        )
    
    async def match_slides(
        self,
        slides: List[Dict[str, Any]],
        use_case: str,
        customer: str,
        industry: str,
        target_audience: Optional[str] = None,
        style: str = "professional"
    ) -> List[Dict[str, Any]]:
        """Match slides to user requirements using AI and ML"""
        
        if not slides:
            return []
        
        try:
            # Step 1: Use AI to analyze and score slides
            ai_scored_slides = await self._ai_score_slides(
                slides, use_case, customer, industry, target_audience, style
            )
            
            # Step 2: Use ML similarity matching
            ml_scored_slides = self._ml_score_slides(
                slides, use_case, customer, industry
            )
            
            # Step 3: Combine scores and select best slides
            final_slides = self._combine_scores_and_select(
                ai_scored_slides, ml_scored_slides, use_case, style
            )
            
            return final_slides
            
        except Exception as e:
            logger.error(f"Error matching slides: {e}")
            return slides[:10]  # Return first 10 slides as fallback
    
    async def _ai_score_slides(
        self,
        slides: List[Dict[str, Any]],
        use_case: str,
        customer: str,
        industry: str,
        target_audience: Optional[str],
        style: str
    ) -> List[Dict[str, Any]]:
        """Use AI to analyze and score slides for relevance"""
        
        try:
            # Create context for AI analysis
            context = f"""
            Use Case: {use_case}
            Customer: {customer}
            Industry: {industry}
            Target Audience: {target_audience or 'General'}
            Style: {style}
            """
            
            # Analyze slides in batches to avoid token limits
            batch_size = 5
            scored_slides = []
            
            for i in range(0, len(slides), batch_size):
                batch = slides[i:i + batch_size]
                batch_scores = await self._analyze_slide_batch(batch, context)
                scored_slides.extend(batch_scores)
            
            return scored_slides
            
        except Exception as e:
            logger.error(f"Error in AI scoring: {e}")
            return slides
    
    async def _analyze_slide_batch(
        self,
        slides: List[Dict[str, Any]],
        context: str
    ) -> List[Dict[str, Any]]:
        """Analyze a batch of slides using AI"""
        
        try:
            # Prepare slide data for AI analysis
            slide_texts = []
            for slide in slides:
                slide_text = f"""
                Title: {slide.get('title', '')}
                Content: {slide.get('content', '')}
                Type: {slide.get('slideType', 'content')}
                """
                slide_texts.append(slide_text)
            
            # Use OpenAI to analyze slides
            if not self.openai_client:
                logger.warning("OpenAI client not available. Using fallback scoring.")
                ai_scores = [{"index": i, "score": 0.5, "reason": "AI analysis unavailable"} for i in range(len(slides))]
            else:
                prompt = f"""
                Analyze the following slides for relevance to the given context.
                Rate each slide from 0.0 to 1.0 based on how well it matches the requirements.
                Consider content relevance, visual appeal, and appropriateness for the target audience.
                
                Context: {context}
                
                Slides to analyze:
                {chr(10).join([f"Slide {i+1}: {text}" for i, text in enumerate(slide_texts)])}
                
                Return a JSON array with scores for each slide in the format:
                [{{"index": 0, "score": 0.8, "reason": "Highly relevant to use case"}}, ...]
                """
                
                try:
                    logger.info("Using GPT-5 with low thinking mode for slide analysis")
                    response = self.openai_client.chat.completions.create(
                        model="gpt-5",
                        messages=[{"role": "user", "content": prompt}],
                        temperature=0.3,
                        max_tokens=1000,
                        extra_body={
                            "thinking_mode": "low"
                        }
                    )
                    ai_scores = self._parse_ai_response(response.choices[0].message.content)
                except Exception as e:
                    logger.error(f"OpenAI API error: {e}")
                    ai_scores = [{"index": i, "score": 0.5, "reason": "AI analysis failed"} for i in range(len(slides))]
            
            # Apply scores to slides
            for i, slide in enumerate(slides):
                ai_score = next((s for s in ai_scores if s['index'] == i), {'score': 0.5, 'reason': 'No specific analysis'})
                slide['ai_score'] = ai_score['score']
                slide['ai_reason'] = ai_score['reason']
            
            return slides
            
        except Exception as e:
            logger.error(f"Error analyzing slide batch: {e}")
            return slides
    
    def _ml_score_slides(
        self,
        slides: List[Dict[str, Any]],
        use_case: str,
        customer: str,
        industry: str
    ) -> List[Dict[str, Any]]:
        """Use ML to score slides based on text similarity"""
        
        try:
            # Prepare text data
            slide_texts = []
            for slide in slides:
                text = f"{slide.get('title', '')} {slide.get('content', '')}"
                slide_texts.append(text)
            
            # Create query text
            query_text = f"{use_case} {customer} {industry}"
            
            # Vectorize texts
            all_texts = [query_text] + slide_texts
            tfidf_matrix = self.vectorizer.fit_transform(all_texts)
            
            # Calculate similarities
            query_vector = tfidf_matrix[0:1]
            slide_vectors = tfidf_matrix[1:]
            
            similarities = cosine_similarity(query_vector, slide_vectors)[0]
            
            # Apply ML scores to slides
            for i, slide in enumerate(slides):
                slide['ml_score'] = float(similarities[i])
            
            return slides
            
        except Exception as e:
            logger.error(f"Error in ML scoring: {e}")
            return slides
    
    def _combine_scores_and_select(
        self,
        ai_scored_slides: List[Dict[str, Any]],
        ml_scored_slides: List[Dict[str, Any]],
        use_case: str,
        style: str
    ) -> List[Dict[str, Any]]:
        """Combine AI and ML scores and select best slides"""
        
        try:
            # Create a mapping of slide IDs to scores
            slide_scores = {}
            
            for slide in ai_scored_slides:
                slide_id = slide.get('id', '')
                ai_score = slide.get('ai_score', 0.5)
                ml_score = slide.get('ml_score', 0.5)
                
                # Weighted combination (70% AI, 30% ML)
                combined_score = (ai_score * 0.7) + (ml_score * 0.3)
                
                slide_scores[slide_id] = {
                    'slide': slide,
                    'ai_score': ai_score,
                    'ml_score': ml_score,
                    'combined_score': combined_score
                }
            
            # Sort by combined score
            sorted_slides = sorted(
                slide_scores.values(),
                key=lambda x: x['combined_score'],
                reverse=True
            )
            
            # Select slides based on use case and style
            selected_slides = self._select_slides_by_requirements(
                sorted_slides, use_case, style
            )
            
            return [s['slide'] for s in selected_slides]
            
        except Exception as e:
            logger.error(f"Error combining scores: {e}")
            return ai_scored_slides[:10]
    
    def _select_slides_by_requirements(
        self,
        sorted_slides: List[Dict[str, Any]],
        use_case: str,
        style: str
    ) -> List[Dict[str, Any]]:
        """Select slides based on presentation requirements"""
        
        # Determine target number of slides based on use case
        if 'pitch' in use_case.lower() or 'demo' in use_case.lower():
            target_slides = 8
        elif 'training' in use_case.lower() or 'education' in use_case.lower():
            target_slides = 15
        elif 'report' in use_case.lower() or 'analysis' in use_case.lower():
            target_slides = 12
        else:
            target_slides = 10
        
        # Ensure we have a good mix of slide types
        selected_slides = []
        slide_types = {}
        
        for slide_data in sorted_slides:
            slide = slide_data['slide']
            slide_type = slide.get('slideType', 'content')
            
            # Check if we need more of this slide type
            type_count = slide_types.get(slide_type, 0)
            max_per_type = self._get_max_slides_per_type(slide_type, target_slides)
            
            if type_count < max_per_type and len(selected_slides) < target_slides:
                selected_slides.append(slide_data)
                slide_types[slide_type] = type_count + 1
        
        # Fill remaining slots with highest scoring slides
        while len(selected_slides) < target_slides and len(selected_slides) < len(sorted_slides):
            for slide_data in sorted_slides:
                if slide_data not in selected_slides:
                    selected_slides.append(slide_data)
                    break
        
        return selected_slides[:target_slides]
    
    def _get_max_slides_per_type(self, slide_type: str, total_slides: int) -> int:
        """Get maximum number of slides per type based on presentation needs"""
        
        type_limits = {
            'title': 2,
            'content': int(total_slides * 0.4),
            'chart': int(total_slides * 0.2),
            'image': int(total_slides * 0.15),
            'quote': int(total_slides * 0.1),
            'conclusion': 2
        }
        
        return type_limits.get(slide_type, int(total_slides * 0.1))
    
    def _parse_ai_response(self, response_text: str) -> List[Dict[str, Any]]:
        """Parse AI response to extract scores"""
        
        try:
            import json
            # Try to extract JSON from response
            json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
        except Exception as e:
            logger.error(f"Error parsing AI response: {e}")
        
        # Fallback: return default scores
        return [{"index": i, "score": 0.5, "reason": "Default score"} for i in range(10)]
    
    async def generate_slide_content(
        self,
        slide: Dict[str, Any],
        use_case: str,
        customer: str,
        industry: str
    ) -> Dict[str, Any]:
        """Generate enhanced content for a slide using AI"""
        
        try:
            prompt = f"""
            Enhance the following slide content for a presentation about {use_case} 
            for {customer} in the {industry} industry.
            
            Original slide:
            Title: {slide.get('title', '')}
            Content: {slide.get('content', '')}
            Type: {slide.get('slideType', 'content')}
            
            Please provide:
            1. An improved title
            2. Enhanced content that's more relevant and engaging
            3. Key points that should be highlighted
            4. Any additional context that would make this slide more effective
            
            Return the response in JSON format:
            {{
                "title": "Enhanced title",
                "content": "Enhanced content",
                "keyPoints": ["point1", "point2", "point3"],
                "additionalContext": "Additional context"
            }}
            """
            
            logger.info("Using GPT-5 with low thinking mode for content enhancement")
            response = await self.openai_client.chat.completions.create(
                model="gpt-5",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=500,
                extra_body={
                    "thinking_mode": "low"
                }
            )
            
            # Parse and apply enhancements
            enhanced_data = self._parse_enhancement_response(response.choices[0].message.content)
            
            # Update slide with enhanced content
            slide.update({
                'title': enhanced_data.get('title', slide.get('title', '')),
                'content': enhanced_data.get('content', slide.get('content', '')),
                'keyPoints': enhanced_data.get('keyPoints', []),
                'additionalContext': enhanced_data.get('additionalContext', '')
            })
            
            return slide
            
        except Exception as e:
            logger.error(f"Error generating slide content: {e}")
            return slide
    
    def _parse_enhancement_response(self, response_text: str) -> Dict[str, Any]:
        """Parse AI enhancement response"""
        
        try:
            import json
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group(0))
        except Exception as e:
            logger.error(f"Error parsing enhancement response: {e}")
        
        return {}
