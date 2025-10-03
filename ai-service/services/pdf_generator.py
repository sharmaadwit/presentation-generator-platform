from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor, blue, green, red, orange, purple
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.linecharts import HorizontalLineChart
import os
import uuid
from typing import List, Dict, Any, Optional
import logging
from PIL import Image as PILImage
import requests
from io import BytesIO

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PDFGenerator:
    def __init__(self):
        self.output_dir = os.getenv('PRESENTATION_OUTPUT_DIR', './generated_presentations')
        self.ensure_output_dir()
    
    def ensure_output_dir(self):
        """Ensure output directory exists"""
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
    
    async def generate_presentation(
        self,
        slides: List[Dict[str, Any]],
        presentation_id: str,
        request_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate a PDF presentation from selected slides"""
        
        try:
            print(f"🎨 PDF PRESENTATION GENERATOR STARTED")
            print(f"   - Presentation ID: {presentation_id}")
            print(f"   - Total Slides: {len(slides)}")
            print(f"   - Customer: {request_data.get('customer', 'N/A')}")
            print(f"   - Industry: {request_data.get('industry', 'N/A')}")
            print(f"   - Style: {request_data.get('style', 'N/A')}")
            
            # Create PDF document
            filename = f"{presentation_id}_{request_data['customer'].replace(' ', '_')}.pdf"
            filepath = os.path.join(self.output_dir, filename)
            
            # Set up PDF document
            doc = SimpleDocTemplate(
                filepath,
                pagesize=A4,
                rightMargin=72,
                leftMargin=72,
                topMargin=72,
                bottomMargin=18
            )
            
            # Get styles
            styles = getSampleStyleSheet()
            custom_styles = self._create_custom_styles(request_data.get('style', 'professional'))
            
            # Build content
            story = []
            
            # Add title slide
            self._add_title_slide(story, request_data, custom_styles)
            story.append(PageBreak())
            
            # Add content slides
            for i, slide_data in enumerate(slides):
                action = slide_data.get('action', 'copy_exact')
                print(f"📄 PROCESSING SLIDE {i+1}/{len(slides)}")
                print(f"   - Action: {action}")
                print(f"   - Source: {slide_data.get('source_title', 'N/A')}")
                print(f"   - Type: {slide_data.get('slide_type', 'N/A')}")
                
                if action == 'copy_exact':
                    print(f"   - 🔄 Copying exact content (0 AI tokens)")
                    self._add_content_slide(story, slide_data, i + 1, custom_styles)
                elif action == 'minor_enhancement':
                    print(f"   - ✨ Minor enhancement (~50 AI tokens)")
                    self._add_enhanced_slide(story, slide_data, i + 1, request_data, custom_styles)
                else:  # full_generation
                    print(f"   - 🤖 Full AI generation (~200 AI tokens)")
                    self._add_ai_generated_slide(story, slide_data, i + 1, request_data, custom_styles)
                
                print(f"   - ✅ Slide {i+1} completed")
                print()
                
                # Add page break between slides
                if i < len(slides) - 1:
                    story.append(PageBreak())
            
            # Add conclusion slide
            self._add_conclusion_slide(story, request_data, custom_styles)
            
            # Build PDF
            doc.build(story)
            
            # Generate preview images
            preview_urls = await self._generate_preview_images(filepath, presentation_id)
            
            return {
                'filepath': filepath,
                'filename': filename,
                'previewUrls': preview_urls,
                'slideCount': len(slides) + 2,  # +2 for title and conclusion
                'status': 'completed'
            }
            
        except Exception as e:
            logger.error(f"Error generating PDF presentation: {e}")
            raise e
    
    def _create_custom_styles(self, style: str) -> Dict[str, Any]:
        """Create custom styles based on presentation style"""
        styles = getSampleStyleSheet()
        custom_styles = {}
        
        if style == 'creative':
            # Creative styling
            custom_styles['title'] = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=32,
                textColor=HexColor('#0066CC'),
                alignment=TA_CENTER,
                spaceAfter=30,
                fontName='Helvetica-Bold'
            )
            custom_styles['subtitle'] = ParagraphStyle(
                'CustomSubtitle',
                parent=styles['Heading2'],
                fontSize=20,
                textColor=HexColor('#333333'),
                alignment=TA_CENTER,
                spaceAfter=20,
                fontName='Helvetica'
            )
            custom_styles['content'] = ParagraphStyle(
                'CustomContent',
                parent=styles['Normal'],
                fontSize=14,
                textColor=HexColor('#2f2f2f'),
                alignment=TA_LEFT,
                spaceAfter=12,
                fontName='Helvetica'
            )
            custom_styles['slide_title'] = ParagraphStyle(
                'CustomSlideTitle',
                parent=styles['Heading2'],
                fontSize=24,
                textColor=HexColor('#0066CC'),
                alignment=TA_LEFT,
                spaceAfter=15,
                fontName='Helvetica-Bold'
            )
            
        elif style == 'minimalist':
            # Minimalist styling
            custom_styles['title'] = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=28,
                textColor=HexColor('#000000'),
                alignment=TA_CENTER,
                spaceAfter=30,
                fontName='Helvetica-Bold'
            )
            custom_styles['subtitle'] = ParagraphStyle(
                'CustomSubtitle',
                parent=styles['Heading2'],
                fontSize=16,
                textColor=HexColor('#666666'),
                alignment=TA_CENTER,
                spaceAfter=20,
                fontName='Helvetica'
            )
            custom_styles['content'] = ParagraphStyle(
                'CustomContent',
                parent=styles['Normal'],
                fontSize=12,
                textColor=HexColor('#333333'),
                alignment=TA_LEFT,
                spaceAfter=10,
                fontName='Helvetica'
            )
            custom_styles['slide_title'] = ParagraphStyle(
                'CustomSlideTitle',
                parent=styles['Heading2'],
                fontSize=20,
                textColor=HexColor('#000000'),
                alignment=TA_LEFT,
                spaceAfter=12,
                fontName='Helvetica-Bold'
            )
            
        else:  # professional/corporate
            # Professional styling
            custom_styles['title'] = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=30,
                textColor=HexColor('#000000'),
                alignment=TA_CENTER,
                spaceAfter=30,
                fontName='Helvetica-Bold'
            )
            custom_styles['subtitle'] = ParagraphStyle(
                'CustomSubtitle',
                parent=styles['Heading2'],
                fontSize=18,
                textColor=HexColor('#404040'),
                alignment=TA_CENTER,
                spaceAfter=20,
                fontName='Helvetica'
            )
            custom_styles['content'] = ParagraphStyle(
                'CustomContent',
                parent=styles['Normal'],
                fontSize=13,
                textColor=HexColor('#2f2f2f'),
                alignment=TA_LEFT,
                spaceAfter=12,
                fontName='Helvetica'
            )
            custom_styles['slide_title'] = ParagraphStyle(
                'CustomSlideTitle',
                parent=styles['Heading2'],
                fontSize=22,
                textColor=HexColor('#000000'),
                alignment=TA_LEFT,
                spaceAfter=15,
                fontName='Helvetica-Bold'
            )
        
        return custom_styles
    
    def _add_title_slide(self, story: List, request_data: Dict[str, Any], styles: Dict[str, Any]):
        """Add title slide to presentation"""
        # Add title
        title_text = f"{request_data['customer']} - {request_data['industry']}"
        story.append(Paragraph(title_text, styles['title']))
        
        # Add subtitle
        subtitle_text = f"{request_data['useCase']} Presentation"
        story.append(Paragraph(subtitle_text, styles['subtitle']))
        
        # Add some spacing
        story.append(Spacer(1, 0.5*inch))
    
    def _add_content_slide(self, story: List, slide_data: Dict[str, Any], slide_number: int, styles: Dict[str, Any]):
        """Add a content slide to presentation"""
        # Add slide title
        title = slide_data.get('title', f'Slide {slide_number}')
        story.append(Paragraph(title, styles['slide_title']))
        
        # Add visual elements if available
        images = slide_data.get('images', [])
        print(f"🔍 DEBUG: Slide {slide_number} has {len(images)} visual elements")
        if images:
            print(f"📊 Visual elements: {images}")
            story.append(Spacer(1, 0.1*inch))
            
            # Add visual section header
            story.append(Paragraph("📊 Visual Elements", styles['slide_title']))
            story.append(Spacer(1, 0.1*inch))
            
            print(f"🎯 PROCESSING {len(images)} VISUAL ELEMENTS FOR SLIDE {slide_number}")
            
            for img_data in images[:2]:  # Limit to 2 images per slide
                img_title = img_data.get('title', 'Visual Element')
                print(f"🎨 PROCESSING VISUAL ELEMENT: {img_title} (type: {img_data.get('type')})")
                story.append(Paragraph(f"📊 {img_title}", styles['slide_title']))
                
                # Create actual visual representations
                if img_data.get('type') == 'chart' and 'data' in img_data:
                    data = img_data['data']
                    if isinstance(data, dict):
                        # Create a bar chart
                        print(f"🎨 Creating chart for {img_title} with data: {data}")
                        # Always add a text representation first
                        data_text = f"📊 Chart Data: {', '.join([f'{k}: {v}' for k, v in data.items()])}"
                        story.append(Paragraph(data_text, styles['content']))
                        
                        # Try to create chart
                        chart = self._create_bar_chart(data, img_title)
                        if chart:
                            print(f"✅ Chart created successfully for {img_title}")
                            story.append(chart)
                            story.append(Spacer(1, 0.2*inch))  # Add space after chart
                        else:
                            print(f"❌ Chart creation failed for {img_title}, using table fallback")
                            # Fallback to table if chart creation fails
                            table_data = [['Year', 'Value']] + [[str(k), str(v)] for k, v in data.items()]
                            table = Table(table_data)
                            table.setStyle(TableStyle([
                                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                                ('FONTSIZE', (0, 0), (-1, 0), 14),
                                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                                ('GRID', (0, 0), (-1, -1), 1, colors.black)
                            ]))
                            story.append(table)
                
                elif img_data.get('type') == 'infographic' and 'elements' in img_data:
                    # Create a visual list with icons
                    elements = img_data['elements']
                    for i, element in enumerate(elements):
                        story.append(Paragraph(f"🔹 {element}", styles['content']))
                
                elif img_data.get('type') == 'icon' and 'icons' in img_data:
                    # Create a visual list with icons
                    icons = img_data['icons']
                    for i, icon in enumerate(icons):
                        story.append(Paragraph(f"🏦 {icon}", styles['content']))
                
                elif img_data.get('type') == 'tech_stack' and 'technologies' in img_data:
                    # Create a visual list with tech icons
                    technologies = img_data['technologies']
                    for i, tech in enumerate(technologies):
                        story.append(Paragraph(f"⚙️ {tech}", styles['content']))
                
                elif img_data.get('type') == 'innovation' and 'stages' in img_data:
                    # Create a visual timeline
                    stages = img_data['stages']
                    for i, stage in enumerate(stages):
                        story.append(Paragraph(f"➡️ {stage}", styles['content']))
                
                elif 'steps' in img_data:
                    # Create a visual process flow
                    steps = img_data['steps']
                    for i, step in enumerate(steps):
                        story.append(Paragraph(f"📋 {step}", styles['content']))
                
                story.append(Spacer(1, 0.1*inch))
        
        # Add content
        content = slide_data.get('content', '')
        if content:
            # Split content into bullet points
            content_lines = content.split('\n')
            for line in content_lines:
                if line.strip():
                    # Add bullet point
                    bullet_text = f"• {line.strip()}"
                    story.append(Paragraph(bullet_text, styles['content']))
        
        # Add source attribution if available
        source = slide_data.get('sourcePresentation', '')
        if source:
            source_text = f"<i>Source: {source}</i>"
            story.append(Spacer(1, 0.2*inch))
            story.append(Paragraph(source_text, styles['content']))
    
    def _add_enhanced_slide(self, story: List, slide_data: Dict[str, Any], slide_number: int, request_data: Dict[str, Any], styles: Dict[str, Any]):
        """Add slide with minor AI enhancement"""
        # Enhance title slightly
        original_title = slide_data.get('title', f'Slide {slide_number}')
        enhanced_title = self._enhance_title(original_title, request_data)
        
        story.append(Paragraph(enhanced_title, styles['slide_title']))
        
        # Use original content
        content = slide_data.get('content', '')
        if content:
            content_lines = content.split('\n')
            for line in content_lines:
                if line.strip():
                    bullet_text = f"• {line.strip()}"
                    story.append(Paragraph(bullet_text, styles['content']))
        
        # Add source attribution
        source = slide_data.get('sourcePresentation', '')
        if source:
            source_text = f"<i>Source: {source}</i>"
            story.append(Spacer(1, 0.2*inch))
            story.append(Paragraph(source_text, styles['content']))
    
    def _add_ai_generated_slide(self, story: List, slide_data: Dict[str, Any], slide_number: int, request_data: Dict[str, Any], styles: Dict[str, Any]):
        """Add slide with full AI generation"""
        # Generate enhanced content using AI
        enhanced_content = self._generate_ai_content(slide_data, request_data)
        
        title = enhanced_content.get('title', f'Slide {slide_number}')
        story.append(Paragraph(title, styles['slide_title']))
        
        content = enhanced_content.get('content', '')
        if content:
            content_lines = content.split('\n')
            for line in content_lines:
                if line.strip():
                    bullet_text = f"• {line.strip()}"
                    story.append(Paragraph(bullet_text, styles['content']))
        
        # Add source attribution
        source = slide_data.get('sourcePresentation', '')
        if source:
            source_text = f"<i>Source: {source}</i>"
            story.append(Spacer(1, 0.2*inch))
            story.append(Paragraph(source_text, styles['content']))
    
    def _add_conclusion_slide(self, story: List, request_data: Dict[str, Any], styles: Dict[str, Any]):
        """Add conclusion slide to presentation"""
        # Add title
        story.append(Paragraph("Thank You", styles['title']))
        
        # Add subtitle
        subtitle_text = f"Questions & Discussion<br/><br/>{request_data['customer']} - {request_data['industry']}"
        story.append(Paragraph(subtitle_text, styles['subtitle']))
    
    def _enhance_title(self, original_title: str, request_data: Dict[str, Any]) -> str:
        """Enhance title with minimal processing (no AI cost)"""
        customer = request_data.get('customer', '')
        industry = request_data.get('industry', '')
        
        if customer and industry:
            return f"{original_title} - {customer} ({industry})"
        return original_title
    
    def _create_bar_chart(self, data: Dict[str, Any], title: str) -> Optional[Drawing]:
        """Create a bar chart from data"""
        try:
            print(f"🎨 Starting chart creation for {title}")
            # Create drawing
            drawing = Drawing(400, 200)
            
            # Create bar chart
            chart = VerticalBarChart()
            chart.x = 50
            chart.y = 50
            chart.height = 150
            chart.width = 300
            
            # Prepare data
            years = list(data.keys())
            values = list(data.values())
            
            print(f"📊 Chart data - Years: {years}, Values: {values}")
            
            chart.data = [values]
            chart.categoryAxis.categoryNames = years
            chart.categoryAxis.labels.fontSize = 10
            chart.valueAxis.valueMin = 0
            chart.valueAxis.valueMax = max(values) * 1.1
            
            # Add chart to drawing
            drawing.add(chart)
            
            print(f"✅ Chart created successfully for {title}")
            return drawing
            
        except Exception as e:
            print(f"❌ Error creating chart for {title}: {e}")
            return None

    def _generate_ai_content(self, slide_data: Dict[str, Any], request_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate AI content (high cost - only when necessary)"""
        # This would use AI to generate content, but for cost optimization
        # we'll return the original content with minor enhancements
        return {
            'title': slide_data.get('title', ''),
            'content': slide_data.get('content', '')
        }
    
    async def _generate_preview_images(self, filepath: str, presentation_id: str) -> List[str]:
        """Generate preview images for the PDF presentation"""
        try:
            # This would integrate with a service to convert PDF to images
            # For now, return placeholder URLs
            preview_urls = []
            
            # In a real implementation, you would:
            # 1. Convert PDF to images using a service like pdf2image or cloud API
            # 2. Upload images to cloud storage
            # 3. Return the URLs
            
            return preview_urls
            
        except Exception as e:
            logger.error(f"Error generating preview images: {e}")
            return []
    
    def get_presentation_info(self, filepath: str) -> Dict[str, Any]:
        """Get information about the generated PDF presentation"""
        try:
            return {
                'fileSize': os.path.getsize(filepath),
                'fileType': 'PDF',
                'created': os.path.getctime(filepath)
            }
            
        except Exception as e:
            logger.error(f"Error getting PDF presentation info: {e}")
            return {}
