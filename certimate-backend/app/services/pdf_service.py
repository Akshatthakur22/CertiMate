from pdf2image import convert_from_path
import pytesseract
from PIL import Image, ImageDraw, ImageFont
from typing import List, Dict, Tuple
from collections import Counter
import logging
import os
from app.config import settings

logger = logging.getLogger(__name__)

# Configure pytesseract to use the correct tesseract path
pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD


class PDFService:
    """Service for processing PDF files and rendering names on images"""
    
    @staticmethod
    def extract_text_from_pdf(pdf_path: str) -> str:
        """
        Extract text from PDF using OCR
        """
        try:
            # Convert PDF to images
            images = convert_from_path(pdf_path)
            
            # Extract text from each page
            text_content = []
            for i, image in enumerate(images):
                text = pytesseract.image_to_string(image)
                text_content.append(f"Page {i+1}:\n{text}")
            
            return "\n\n".join(text_content)
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
            raise
    
    @staticmethod
    def pdf_to_images(pdf_path: str, dpi: int = 300) -> List[Image.Image]:
        """
        Convert PDF pages to images with fallback DPI
        """
        try:
            logger.info(f"Converting PDF to images with DPI: {dpi}")
            images = convert_from_path(pdf_path, dpi=dpi)
            logger.info(f"Converted {len(images)} pages to images")
            return images
        except Exception as e:
            logger.warning(f"Error converting PDF to images at {dpi} DPI: {e}")
            
            # Fallback to lower DPI if high DPI fails
            if dpi > 150:
                logger.info("Retrying with 150 DPI...")
                try:
                    return convert_from_path(pdf_path, dpi=150)
                except Exception as e2:
                    logger.error(f"Fallback conversion failed: {e2}")
                    raise
            raise
    
    @staticmethod
    def detect_background_color(image: Image.Image, bbox: Dict) -> Tuple[int, int, int]:
        """
        Detect background color around the placeholder area
        """
        try:
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Sample pixels from around the bbox area (expanded region)
            bbox_left = max(0, bbox.get('left', 0) - 10)
            bbox_top = max(0, bbox.get('top', 0) - 10)
            bbox_right = min(image.width, bbox.get('left', 0) + bbox.get('width', 0) + 10)
            bbox_bottom = min(image.height, bbox.get('top', 0) + bbox.get('height', 0) + 10)
            
            # Sample corner pixels to detect background
            pixels = []
            sample_points = [
                (bbox_left, bbox_top),
                (bbox_right, bbox_top),
                (bbox_left, bbox_bottom),
                (bbox_right, bbox_bottom),
                (bbox_left + (bbox_right - bbox_left) // 2, bbox_top),
                (bbox_left + (bbox_right - bbox_left) // 2, bbox_bottom),
            ]
            
            for x, y in sample_points:
                if 0 <= x < image.width and 0 <= y < image.height:
                    pixels.append(image.getpixel((x, y)))
            
            if pixels:
                # Get the most common color (background)
                color_counts = Counter(pixels)
                bg_color = color_counts.most_common(1)[0][0]
                return bg_color
            
            # Fallback to cream-like color
            return (245, 238, 220)
            
        except Exception as e:
            logger.warning(f"Error detecting background color: {e}, using default cream")
            return (245, 238, 220)

    @staticmethod
    def render_name_on_image(
        image: Image.Image,
        name: str,
        bbox: Dict = None,
        font_size: int = 40,
        font_color: Tuple[int, int, int] = (0, 0, 0),
        center: bool = False
    ) -> Image.Image:
        """
        Render name on an image with CLEAN placeholder replacement
        """
        try:
            # Create a copy of the image to avoid modifying the original
            result_image = image.copy()
            
            # Ensure image is in RGB mode
            if result_image.mode != 'RGB':
                result_image = result_image.convert('RGB')
            
            # Create a drawing context
            draw = ImageDraw.Draw(result_image)
            
            # Try to load a font, fall back to default if not available
            try:
                # Try to use a nice font
                font_paths = [
                    "/System/Library/Fonts/Supplemental/Arial.ttf",  # macOS
                    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",  # Linux
                    "C:/Windows/Fonts/arial.ttf",  # Windows
                ]
                
                font = None
                for font_path in font_paths:
                    if os.path.exists(font_path):
                        font = ImageFont.truetype(font_path, font_size)
                        break
                
                if font is None:
                    font = ImageFont.load_default()
                    
            except Exception as e:
                logger.warning(f"Error loading font: {e}, using default")
                font = ImageFont.load_default()
            
            # Calculate text position and size
            if bbox:
                # Use bounding box coordinates
                bbox_left = bbox.get('left', 0)
                bbox_top = bbox.get('top', 0)
                bbox_width = bbox.get('width', 0)
                bbox_height = bbox.get('height', 0)
                
                # STEP 1: Detect background color around the placeholder
                bg_color = PDFService.detect_background_color(result_image, bbox)
                
                # STEP 2: Erase the placeholder by filling the bbox with background color
                # Expand slightly to ensure complete erasure
                erase_left = max(0, bbox_left - 5)
                erase_top = max(0, bbox_top - 5)
                erase_right = min(result_image.width, bbox_left + bbox_width + 5)
                erase_bottom = min(result_image.height, bbox_top + bbox_height + 5)
                
                # Draw a filled rectangle to erase the placeholder
                draw.rectangle(
                    [(erase_left, erase_top), (erase_right, erase_bottom)],
                    fill=bg_color,
                    outline=None
                )
                
                # STEP 3: Calculate position for new text (centered in bbox)
                bbox_text = draw.textbbox((0, 0), name, font=font)
                text_width = bbox_text[2] - bbox_text[0]
                text_height = bbox_text[3] - bbox_text[1]
                
                # Center the text in the bounding box
                x = bbox_left + (bbox_width - text_width) // 2
                y = bbox_top + (bbox_height - text_height) // 2
                
            else:
                # No bbox provided - center on the entire image
                bbox_text = draw.textbbox((0, 0), name, font=font)
                text_width = bbox_text[2] - bbox_text[0]
                text_height = bbox_text[3] - bbox_text[1]
                
                img_width, img_height = image.size
                x = (img_width - text_width) // 2
                y = (img_height - text_height) // 2
            
            # STEP 4: Render the new text cleanly
            draw.text((x, y), name, font=font, fill=font_color)
            
            return result_image
            
        except Exception as e:
            logger.error(f"Error rendering name on image: {e}")
            raise
