"""
Advanced Placeholder Detection System

Detects ALL placeholders in template images ({{NAME}}, {{EVENT}}, {{DATE}}, etc.)
and returns structured coordinate data for clean text replacement.
"""
import pytesseract
import re
from PIL import Image, ImageEnhance, ImageFilter
from typing import Dict, List, Tuple, Optional
from pdf2image import convert_from_path
import logging
import json
import os
from app.config import settings

logger = logging.getLogger(__name__)

# Configure pytesseract
pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD


class AdvancedPlaceholderService:
    """
    Advanced service for detecting multiple placeholders in certificate templates
    
    Features:
    - PIL-based Preprocessing (Contrast, Sharpness)
    - Multi-pass OCR (Different PSM modes)
    - Confidence Scoring
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
    def preprocess_image(image: Image.Image) -> List[Image.Image]:
        """
        Generate multiple preprocessed versions of the image for better OCR using PIL only
        """
        processed_images = []
        
        try:
            # 1. Original Image
            processed_images.append(image.copy())
            
            # 2. High Contrast
            enhancer = ImageEnhance.Contrast(image)
            high_contrast = enhancer.enhance(2.0)
            processed_images.append(high_contrast)
            
            # 3. Sharpened
            sharpened = image.filter(ImageFilter.SHARPEN)
            processed_images.append(sharpened)
            
            # 4. Binarized
            gray = image.convert('L')
            binary = gray.point(lambda x: 0 if x < 128 else 255, '1')
            processed_images.append(binary)
            
            return processed_images
            
        except Exception as e:
            logger.error(f"Error preprocessing image: {e}")
            return [image]
    
    @staticmethod
    def detect_all_placeholders(
        template_path: str,
        pattern: str = r"\{\{(\w+)\}\}"
    ) -> Dict[str, Dict]:
        """
        Detect ALL placeholders in template using multi-pass OCR
        """
        try:
            # Handle PDF
            if template_path.lower().endswith('.pdf'):
                images = convert_from_path(template_path, dpi=300)
                image = images[0]
            else:
                image = Image.open(template_path)
            
            # Get preprocessed versions
            images_to_scan = AdvancedPlaceholderService.preprocess_image(image)
            
            placeholders = {}
            
            # Try multiple patterns to catch different placeholder formats
            patterns = [
                r"\{\{(\w+)\}\}",      # {{NAME}}
                r"\{\{(\w+)",           # {{NAME (missing closing)
                r"(\w+)\}\}",            # NAME}} (missing opening)
                r"\{(\w+)\}",            # {NAME}
                r"\[(\w+)\]",            # [NAME}
                r"<<(\w+)>>",            # <<NAME>>
                r"(\w+)_PLACEHOLDER",    # NAME_PLACEHOLDER
                r"\{(\w+)",              # {NAME (malformed)
                r"(\w+)\}",              # NAME} (malformed)
            ]
            
            # PSM Modes to try: 
            # 3 = Fully automatic page segmentation
            # 6 = Assume a single uniform block of text
            # 11 = Sparse text (good for scattered placeholders)
            psm_modes = [3, 11, 6]
            
            for img in images_to_scan:
                for psm in psm_modes:
                    try:
                        config = f'--psm {psm}'
                        ocr_data = pytesseract.image_to_data(
                            img, output_type=pytesseract.Output.DICT, config=config
                        )
                        
                        for i in range(len(ocr_data['text'])):
                            text = ocr_data['text'][i].strip()
                            if not text:
                                continue
                            
                            # Try each pattern
                            for pattern in patterns:
                                pattern_obj = re.compile(pattern, re.IGNORECASE)
                                match = pattern_obj.search(text)
                                if match:
                                    placeholder_name = match.group(1).upper()
                                    
                                    # Clean up the detected text to remove extra braces
                                    clean_text = text.strip()
                                    if clean_text.startswith('{') and not clean_text.startswith('{{'):
                                        clean_text = clean_text[1:]  # Remove single leading brace
                                    if clean_text.endswith('}') and not clean_text.endswith('}}'):
                                        clean_text = clean_text[:-1]  # Remove single trailing brace
                                    
                                    # Skip if we already found a higher confidence match
                                    if placeholder_name in placeholders:
                                        if ocr_data['conf'][i] <= placeholders[placeholder_name]['confidence']:
                                            continue
                                    
                                    placeholders[placeholder_name] = {
                                        'left': ocr_data['left'][i],
                                        'top': ocr_data['top'][i],
                                        'width': ocr_data['width'][i],
                                        'height': ocr_data['height'][i],
                                        'confidence': ocr_data['conf'][i],
                                        'text': clean_text,
                                        'full_match': match.group(0),
                                        'bbox': {
                                            'left': ocr_data['left'][i],
                                            'top': ocr_data['top'][i],
                                            'width': ocr_data['width'][i],
                                            'height': ocr_data['height'][i]
                                        }
                                    }
                                    logger.info(f"Found {placeholder_name} (conf: {ocr_data['conf'][i]}, psm: {psm}) - cleaned text: '{clean_text}'")
                                    break  # Found match, don't try other patterns for this text
                        
                    except Exception as e:
                        continue
            
            logger.info(f"Final detection: {list(placeholders.keys())}")
            return placeholders
            
        except Exception as e:
            logger.error(f"Error detecting placeholders: {e}")
            return {}
    
    @staticmethod
    def save_placeholder_data(placeholders: Dict, file_path: str):
        try:
            with open(file_path, 'w') as f:
                json.dump(placeholders, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving placeholder data: {e}")
    
    @staticmethod
    def load_placeholder_data(file_path: str) -> Dict:
        try:
            with open(file_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            return {}
    
    @staticmethod
    def validate_template(
        template_path: str,
        required_placeholders: List[str] = None
    ) -> Dict:
        if required_placeholders is None:
            required_placeholders = ["NAME"]
        
        placeholders = AdvancedPlaceholderService.detect_all_placeholders(template_path)
        found_names = [name.upper() for name in placeholders.keys()]
        required_upper = [name.upper() for name in required_placeholders]
        
        missing = set(required_upper) - set(found_names)
        valid = len(missing) == 0
        
        return {
            "valid": valid,
            "found_placeholders": found_names,
            "required_placeholders": required_upper,
            "missing_placeholders": list(missing),
            "placeholder_details": placeholders
        }
    
    @staticmethod
    def get_placeholder_suggestions(template_path: str) -> List[str]:
        placeholders = AdvancedPlaceholderService.detect_all_placeholders(template_path)
        suggestions = ["NAME"]
        common_placeholders = ["EVENT", "DATE", "COURSE", "POSITION", "ORG", "SIGNATURE"]
        for p in common_placeholders:
            if p not in placeholders:
                suggestions.append(p)
        return suggestions
