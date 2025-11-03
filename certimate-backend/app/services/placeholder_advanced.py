"""
Advanced Placeholder Detection System

Detects ALL placeholders in template images ({{NAME}}, {{EVENT}}, {{DATE}}, etc.)
and returns structured coordinate data for clean text replacement.
"""
import pytesseract
import re
from PIL import Image
from typing import Dict, List, Tuple, Optional
from pdf2image import convert_from_path
import logging
import json
from app.config import settings

logger = logging.getLogger(__name__)

# Configure pytesseract
pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD


class AdvancedPlaceholderService:
    """
    Advanced service for detecting multiple placeholders in certificate templates
    
    Detects patterns like {{NAME}}, {{EVENT}}, {{DATE}} using OCR
    Returns structured coordinate data for each placeholder
    """
    
    @staticmethod
    def detect_all_placeholders(
        template_path: str,
        pattern: str = r"\{\{(\w+)\}\}"
    ) -> Dict[str, Dict]:
        """
        Detect ALL placeholders in template and return bounding boxes
        
        Args:
            template_path: Path to template image or PDF
            pattern: Regex pattern to match placeholders (default: {{WORD}})
            
        Returns:
            Dictionary mapping placeholder names to their bounding boxes
            Example: {
                "NAME": {"left": 100, "top": 200, "width": 150, "height": 40, "text": "{{NAME}}"},
                "EVENT": {"left": 100, "top": 300, "width": 200, "height": 40, "text": "{{EVENT}}"}
            }
        """
        try:
            # Load image
            if template_path.lower().endswith('.pdf'):
                images = convert_from_path(template_path, dpi=300)
                image = images[0]
                image_path_for_ocr = template_path
            else:
                image = Image.open(template_path)
                image_path_for_ocr = template_path
            
            width, height = image.size
            logger.info(f"Processing template: {template_path} ({width}x{height})")
            
            # Get OCR data with bounding boxes
            try:
                ocr_data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            except Exception as e:
                logger.error(f"OCR failed: {e}")
                return {}
            
            # Prepare placeholder map
            placeholders = {}
            
            # Search for placeholder patterns in OCR text
            pattern_obj = re.compile(pattern)
            
            # Look through each detected text element
            for i in range(len(ocr_data['text'])):
                text = ocr_data['text'][i].strip()
                if not text:
                    continue
                
                # Check if this text contains a placeholder pattern
                match = pattern_obj.search(text)
                if match:
                    placeholder_name = match.group(1).upper()
                    left = ocr_data['left'][i]
                    top = ocr_data['top'][i]
                    width_bbox = ocr_data['width'][i]
                    height_bbox = ocr_data['height'][i]
                    confidence = ocr_data['conf'][i]
                    
                    # Store placeholder data
                    placeholders[placeholder_name] = {
                        'left': left,
                        'top': top,
                        'width': width_bbox,
                        'height': height_bbox,
                        'confidence': confidence,
                        'text': text,
                        'full_match': match.group(0)
                    }
                    
                    logger.info(f"Found placeholder '{{{{{placeholder_name}}}}}' at ({left}, {top}, {width_bbox}x{height_bbox}) with confidence {confidence}")
            
            logger.info(f"Detected {len(placeholders)} placeholder(s): {list(placeholders.keys())}")
            return placeholders
            
        except Exception as e:
            logger.error(f"Error detecting placeholders: {e}")
            return {}
    
    @staticmethod
    def save_placeholder_data(placeholders: Dict, file_path: str):
        """
        Save placeholder coordinates to JSON file
        
        Args:
            placeholders: Dictionary of placeholder data
            file_path: Path to save JSON file
        """
        try:
            with open(file_path, 'w') as f:
                json.dump(placeholders, f, indent=2)
            logger.info(f"Saved placeholder data to: {file_path}")
        except Exception as e:
            logger.error(f"Error saving placeholder data: {e}")
    
    @staticmethod
    def load_placeholder_data(file_path: str) -> Dict:
        """
        Load placeholder coordinates from JSON file
        
        Args:
            file_path: Path to JSON file
            
        Returns:
            Dictionary of placeholder data
        """
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            logger.info(f"Loaded placeholder data from: {file_path}")
            return data
        except Exception as e:
            logger.error(f"Error loading placeholder data: {e}")
            return {}
    
    @staticmethod
    def validate_template(
        template_path: str,
        required_placeholders: List[str] = None
    ) -> Dict:
        """
        Validate template has required placeholders
        
        Args:
            template_path: Path to template
            required_placeholders: List of required placeholder names (e.g., ["NAME"])
            
        Returns:
            Validation result with details
        """
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
        """
        Suggest what placeholders might be useful based on template
        
        Args:
            template_path: Path to template
            
        Returns:
            List of suggested placeholder names
        """
        placeholders = AdvancedPlaceholderService.detect_all_placeholders(template_path)
        suggestions = ["NAME"]  # Always suggest NAME
        
        # Common placeholders to suggest
        common_placeholders = ["EVENT", "DATE", "COURSE", "POSITION", "ORG", "SIGNATURE"]
        
        for placeholder in common_placeholders:
            # Check if similar text exists in image
            # (simplified - you could enhance this with OCR context analysis)
            suggestions.append(placeholder)
        
        return suggestions

