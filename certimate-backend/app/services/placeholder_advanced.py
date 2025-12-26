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
            
            # 4. Convert to grayscale and enhance
            grayscale = image.convert('L')
            processed_images.append(grayscale)
            
        except Exception as e:
            logger.warning(f"Preprocessing failed: {e}")
            
        return processed_images
    
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
            pattern_obj = re.compile(pattern)
            
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
                            
                            match = pattern_obj.search(text)
                            if match:
                                placeholder_name = match.group(1).upper()
                                
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
                                    'text': text,
                                    'full_match': match.group(0)
                                }
                                logger.info(f"Found {placeholder_name} (conf: {ocr_data['conf'][i]}, psm: {psm})")
                                
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
            "placeholder_data": placeholders
        }
    
    @staticmethod
    def get_placeholder_suggestions(template_path: str) -> List[str]:
        placeholders = AdvancedPlaceholderService.detect_all_placeholders(template_path)
        suggestions = ["NAME"]
        common_placeholders = ["EVENT", "DATE", "COURSE", "POSITION", "ORG", "SIGNATURE"]
        for p in common_placeholders:
            suggestions.append(p)
        return suggestions

