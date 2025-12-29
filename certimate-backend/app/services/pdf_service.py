from pdf2image import convert_from_path
import pytesseract
from PIL import Image, ImageDraw, ImageFont
from typing import List, Dict, Tuple, Optional
from collections import Counter
import logging
import os
from app.config import settings

logger = logging.getLogger(__name__)

# Configure pytesseract to use the correct tesseract path
pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD

# Preferred font candidates ordered by priority
PREFERRED_FONTS = [
    "/System/Library/Fonts/Supplemental/Garamond.ttf",
    "/System/Library/Fonts/Supplemental/Baskerville.ttc",
    "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
    "/Library/Fonts/Garamond.ttf",
    "/Library/Fonts/Times New Roman.ttf",
    "C:/Windows/Fonts/GARA.TTF",
    "C:/Windows/Fonts/TIMES.TTF",
    "C:/Windows/Fonts/TIMESBD.TTF",
]


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
        font_size: Optional[int] = None,
        font_color: Tuple[int, int, int] = (0, 0, 0),
        center: bool = False,
        placeholder_hint: Optional[str] = None
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

            def load_font(size: int) -> ImageFont.FreeTypeFont:
                for font_path in PREFERRED_FONTS:
                    if os.path.exists(font_path):
                        try:
                            return ImageFont.truetype(font_path, size)
                        except Exception:
                            continue
                # Fallbacks by general availability
                generic_fonts = [
                    "/System/Library/Fonts/Supplemental/Arial.ttf",
                    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
                    "C:/Windows/Fonts/arial.ttf",
                ]
                for font_path in generic_fonts:
                    if os.path.exists(font_path):
                        try:
                            return ImageFont.truetype(font_path, size)
                        except Exception:
                            continue
                return ImageFont.load_default()

            def derive_font_size(base_size: int, text: str, bounding_box: Dict) -> int:
                if not bounding_box:
                    return max(base_size, 12)

                bbox_width = bounding_box.get('width', 0)
                bbox_height = bounding_box.get('height', 0)
                # Start from bbox height with some padding
                size = int(bbox_height * 0.9)
                size = max(size, 12)

                trial_image = Image.new('RGB', (bbox_width or 1, bbox_height or 1), color=(255, 255, 255))
                trial_draw = ImageDraw.Draw(trial_image)

                while size >= 8:
                    font_candidate = load_font(size)
                    text_bbox = trial_draw.textbbox((0, 0), text, font=font_candidate)
                    text_width = text_bbox[2] - text_bbox[0]
                    text_height = text_bbox[3] - text_bbox[1]

                    if (bbox_width <= 0 or text_width <= bbox_width * 0.97) and (
                        bbox_height <= 0 or text_height <= bbox_height * 0.95
                    ):
                        return size

                    size -= 1

                return 8

            def infer_base_font_size(hint: Optional[str]) -> int:
                if not hint:
                    return 24
                normalized = hint.upper()
                if any(token in normalized for token in ("TITLE", "HEADING")):
                    return 34
                if any(token in normalized for token in ("NAME", "RECIPIENT")):
                    return 26
                if any(token in normalized for token in ("DATE", "ROLE", "DETAIL", "ORG", "ORGANIZATION")):
                    return 18
                return 20

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
                erase_left = max(0, bbox_left - 1)
                erase_top = max(0, bbox_top - 1)
                erase_right = min(result_image.width, bbox_left + bbox_width + 1)
                erase_bottom = min(result_image.height, bbox_top + bbox_height + 1)

                # Draw a filled rectangle to erase the placeholder
                draw.rectangle(
                    [(erase_left, erase_top), (erase_right, erase_bottom)],
                    fill=bg_color,
                    outline=None
                )

                derived_size = font_size or derive_font_size(
                    infer_base_font_size(placeholder_hint),
                    name,
                    bbox
                )
                font = load_font(derived_size)

                # STEP 3: Calculate position for new text (centered in bbox)
                bbox_text = draw.textbbox((0, 0), name, font=font)
                text_width = bbox_text[2] - bbox_text[0]
                text_height = bbox_text[3] - bbox_text[1]

                # Center the text in the bounding box
                x = bbox_left + (bbox_width - text_width) // 2
                y = bbox_top + (bbox_height - text_height) // 2

            else:
                derived_size = font_size or infer_base_font_size(placeholder_hint)
                font = load_font(derived_size)
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
