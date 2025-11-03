import pytesseract
from PIL import Image
from typing import List, Dict, Tuple, Optional
from pdf2image import convert_from_path
import os
import logging
from app.config import settings

logger = logging.getLogger(__name__)

# Configure pytesseract to use the correct tesseract path
pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD


class PlaceholderService:
    """
    Service for detecting placeholder text in certificate templates
    Uses Tesseract OCR to find bounding boxes for placeholder text
    """
    
    @staticmethod
    def find_placeholder_bbox(template_path: str, placeholder_text: str = "{{NAME}}") -> List[Dict]:
        """
        Find bounding boxes for placeholder text in a template image
        
        Args:
            template_path: Path to the template file (PDF or image)
            placeholder_text: Text to search for (default: {{NAME}})
            
        Returns:
            List of dictionaries containing bbox coordinates and confidence scores
            Format: [{'left': x, 'top': y, 'width': w, 'height': h, 'confidence': c}, ...]
        """
        try:
            # Convert PDF to image if needed
            if template_path.lower().endswith('.pdf'):
                # Convert first page of PDF to image
                logger.info(f"Converting PDF to image: {template_path}")
                images = convert_from_path(template_path, dpi=300)
                if not images:
                    raise ValueError("No pages found in PDF")
                image = images[0]
            else:
                # Load image directly
                logger.info(f"Loading image: {template_path}")
                image = Image.open(template_path)
            
            # Get image dimensions
            width, height = image.size
            logger.info(f"Image dimensions: {width}x{height}")
            
            # Use pytesseract to get detailed OCR data with bounding boxes
            # Get bounding box data for all detected text
            ocr_data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            
            # Find matches for placeholder text
            matches = []
            placeholder_lower = placeholder_text.lower()
            
            for i in range(len(ocr_data['text'])):
                text = ocr_data['text'][i].strip()
                if text.lower() == placeholder_lower or placeholder_lower in text.lower():
                    left = ocr_data['left'][i]
                    top = ocr_data['top'][i]
                    width_bbox = ocr_data['width'][i]
                    height_bbox = ocr_data['height'][i]
                    confidence = ocr_data['conf'][i]
                    
                    match = {
                        'left': left,
                        'top': top,
                        'width': width_bbox,
                        'height': height_bbox,
                        'confidence': confidence,
                        'text': text
                    }
                    matches.append(match)
                    logger.info(f"Found placeholder at ({left}, {top}) with confidence {confidence}")
            
            # If no exact match found, search for variations
            if not matches:
                logger.warning(f"No exact match found for '{placeholder_text}', searching for variations")
                
                # Common placeholder variations
                variations = [
                    placeholder_text,
                    placeholder_text.replace('{', ''),
                    placeholder_text.replace('}', ''),
                    'NAME',
                    'name',
                    'Name'
                ]
                
                for variation in variations:
                    for i in range(len(ocr_data['text'])):
                        text = ocr_data['text'][i].strip()
                        if variation.lower() in text.lower():
                            left = ocr_data['left'][i]
                            top = ocr_data['top'][i]
                            width_bbox = ocr_data['width'][i]
                            height_bbox = ocr_data['height'][i]
                            confidence = ocr_data['conf'][i]
                            
                            match = {
                                'left': left,
                                'top': top,
                                'width': width_bbox,
                                'height': height_bbox,
                                'confidence': confidence,
                                'text': text
                            }
                            matches.append(match)
                            logger.info(f"Found placeholder variation '{text}' at ({left}, {top})")
                    
                    if matches:
                        break
            
            # If still no matches, return center position as fallback
            if not matches:
                logger.warning("No placeholder found, returning center position as fallback")
                center_x = width // 2
                center_y = height // 2
                matches.append({
                    'left': center_x - 100,
                    'top': center_y - 20,
                    'width': 200,
                    'height': 40,
                    'confidence': 0,
                    'text': 'CENTER'
                })
            
            return matches
            
        except Exception as e:
            logger.error(f"Error finding placeholder bbox: {e}")
            raise
    
    @staticmethod
    def process(data: Dict) -> Dict:
        """
        Placeholder processing method for backward compatibility
        """
        return {
            "message": "This is a placeholder service",
            "processed_data": data
        }
