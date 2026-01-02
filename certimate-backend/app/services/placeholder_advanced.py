"""
Simple & Reliable Placeholder Detection (Image Templates Only)

Detects placeholders like:
{name}, {event}, {date}, {role}

Returns structured coordinate data for clean text replacement.
"""

import json
import logging
import re
from typing import Dict, List, Optional

from PIL import Image, ImageEnhance, ImageFilter
import pytesseract

from app.config import settings
from app.utils.template_cache import get_cached_template_metadata, cache_template_metadata

logger = logging.getLogger(__name__)

# Configure tesseract
pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD

# STRICT placeholder rule (double braces required)
PLACEHOLDER_REGEX = re.compile(r"\{\{\s*([A-Za-z0-9_\- ]+?)\s*\}\}")
MIN_CONFIDENCE = 60


class AdvancedPlaceholderService:
    """
    Image-based placeholder detection service.
    Keeps legacy method names for compatibility.
    """

    # ---------- Internal helpers ----------

    @staticmethod
    def _load_image(template_path: str) -> Image.Image:
        if template_path.lower().endswith(".pdf"):
            raise ValueError("PDF templates are not supported in image-only placeholder detection")
        return Image.open(template_path)

    @staticmethod
    def _run_ocr(image: Image.Image) -> Dict[str, List]:
        return pytesseract.image_to_data(
            image,
            output_type=pytesseract.Output.DICT,
            config="--psm 11"
        )

    @staticmethod
    def _safe_confidence(conf_value) -> int:
        try:
            return int(float(conf_value))
        except Exception:
            return -1

    @staticmethod
    def _tighten_bbox(image: Image.Image, bbox: Dict, threshold: int = 240, margin: int = 1) -> Dict:
        if not image or not bbox:
            return bbox

        img_width, img_height = image.size

        left = max(int(bbox.get("left", 0)), 0)
        top = max(int(bbox.get("top", 0)), 0)
        width = int(bbox.get("width", 0) or 0)
        height = int(bbox.get("height", 0) or 0)

        if width <= 0 or height <= 0:
            return bbox

        right = min(left + width, img_width)
        bottom = min(top + height, img_height)

        if right <= left or bottom <= top:
            return bbox

        cropped = image.crop((left, top, right, bottom))
        if cropped.width == 0 or cropped.height == 0:
            return bbox

        gray = cropped.convert("L")
        binary = gray.point(lambda p: 255 if p < threshold else 0, "L")
        content_box = binary.getbbox()

        if not content_box:
            return bbox

        content_left, content_top, content_right, content_bottom = content_box

        new_left = max(left + content_left - margin, 0)
        new_top = max(top + content_top - margin, 0)
        new_right = min(left + content_right + margin, img_width)
        new_bottom = min(top + content_bottom + margin, img_height)

        if new_right <= new_left or new_bottom <= new_top:
            return bbox

        return {
            "left": new_left,
            "top": new_top,
            "width": new_right - new_left,
            "height": new_bottom - new_top,
        }

    @staticmethod
    def _build_placeholder_record(
        image: Image.Image,
        ocr_data: Dict[str, List],
        index: int,
        raw_token: str,
        raw_key: str,
        normalized_key: str,
        confidence: int
    ) -> Dict:
        base_left = int(ocr_data["left"][index])
        base_top = int(ocr_data["top"][index])
        base_width = int(ocr_data["width"][index])
        base_height = int(ocr_data["height"][index])

        base_bbox = {
            "left": base_left,
            "top": base_top,
            "width": base_width,
            "height": base_height,
        }

        tightened_bbox = AdvancedPlaceholderService._tighten_bbox(image, base_bbox)

        return {
            "left": tightened_bbox["left"],
            "top": tightened_bbox["top"],
            "width": tightened_bbox["width"],
            "height": tightened_bbox["height"],
            "confidence": confidence,
            "text": raw_token,
            "raw_key": raw_key,
            "normalized_key": normalized_key,
            "csv_key": raw_key,
            "lookup_key": normalized_key.lower(),
            "bbox": {
                "left": tightened_bbox["left"],
                "top": tightened_bbox["top"],
                "width": tightened_bbox["width"],
                "height": tightened_bbox["height"],
            }
        }

    @staticmethod
    def _preprocess_image(image: Image.Image) -> List[Image.Image]:
        versions = [image.copy()]
        try:
            # High contrast
            contrast = ImageEnhance.Contrast(image).enhance(2.0)
            versions.append(contrast)

            # Sharpened
            sharpened = image.filter(ImageFilter.SHARPEN)
            versions.append(sharpened)

            # Binarized
            gray = image.convert('L')
            binary = gray.point(lambda x: 0 if x < 140 else 255, '1')
            versions.append(binary)
        except Exception as exc:
            logger.debug("Image preprocessing warning: %s", exc)
        return versions

    @staticmethod
    def _normalize_key(raw_key: str) -> str:
        cleaned = (raw_key or "").strip()
        cleaned = re.sub(r"\s+", "_", cleaned)
        cleaned = re.sub(r"[^A-Za-z0-9_]", "", cleaned)
        if not cleaned:
            return ""
        return cleaned.upper()

    # ---------- Public API ----------

    @staticmethod
    def detect_all_placeholders(template_path: str) -> Dict[str, Dict]:
        """
        Detect all placeholders in the image template with caching.

        Returns:
        {
          "NAME": {...},
          "EVENT": {...}
        }
        """
        try:
            # Check cache first
            cached_data = get_cached_template_metadata(template_path)
            if cached_data and "placeholders" in cached_data and cached_data["placeholders"]:
                logger.info(f"Using cached placeholders for {template_path}")
                return cached_data["placeholders"]
            
            image = AdvancedPlaceholderService._load_image(template_path)
        except Exception as exc:
            logger.error("Failed to open template '%s': %s", template_path, exc)
            return {}

        placeholders: Dict[str, Dict] = {}
        psm_modes = [11, 6, 3]

        for processed_image in AdvancedPlaceholderService._preprocess_image(image):
            for psm in psm_modes:
                try:
                    ocr_data = pytesseract.image_to_data(
                        processed_image,
                        output_type=pytesseract.Output.DICT,
                        config=f"--psm {psm}"
                    )
                except Exception as exc:
                    logger.debug("OCR error (psm=%s): %s", psm, exc)
                    continue

                for index, raw_text in enumerate(ocr_data.get("text", [])):
                    if not raw_text:
                        continue

                    confidence = AdvancedPlaceholderService._safe_confidence(ocr_data["conf"][index])
                    if confidence < MIN_CONFIDENCE:
                        continue

                    for match in PLACEHOLDER_REGEX.finditer(raw_text):
                        raw_key = match.group(1)
                        normalized_key = AdvancedPlaceholderService._normalize_key(raw_key)
                        if not normalized_key:
                            continue

                        # Keep best confidence if duplicate
                        if normalized_key in placeholders and confidence <= placeholders[normalized_key]["confidence"]:
                            continue

                        record = AdvancedPlaceholderService._build_placeholder_record(
                            image,
                            ocr_data,
                            index,
                            match.group(0),
                            raw_key,
                            normalized_key,
                            confidence
                        )

                        placeholders[normalized_key] = record

                        logger.info(
                            "Detected placeholder '%s' at (%s, %s) conf=%s (psm=%s)",
                            normalized_key,
                            record["left"],
                            record["top"],
                            confidence,
                            psm,
                        )

        if not placeholders:
            logger.warning("No placeholders detected in template '%s'", template_path)
        else:
            # Cache the detected placeholders
            existing_cache = get_cached_template_metadata(template_path) or {}
            cache_template_metadata(
                template_path,
                ocr_text=existing_cache.get("ocr_text", ""),
                placeholders=placeholders,
                font_info=existing_cache.get("font_info", {})
            )
            logger.info(f"Cached {len(placeholders)} placeholders for {template_path}")

        return placeholders

    @staticmethod
    def find_placeholder_bbox(template_path: str, placeholder_text: str = "{name}") -> List[Dict]:
        """
        Legacy-compatible single placeholder lookup.
        """
        target_key = placeholder_text.replace("{", "").replace("}", "").upper()
        placeholders = AdvancedPlaceholderService.detect_all_placeholders(template_path)

        if target_key in placeholders:
            record = placeholders[target_key]
            return [{
                "left": record["left"],
                "top": record["top"],
                "width": record["width"],
                "height": record["height"],
                "confidence": record["confidence"],
                "text": record["text"]
            }]

        logger.warning(
            "Placeholder '%s' not found in template '%s'",
            placeholder_text,
            template_path
        )
        return []

    @staticmethod
    def preprocess_image(image: Image.Image) -> List[Image.Image]:
        """
        Kept only for backward compatibility.
        No preprocessing required in simplified detector.
        """
        return [image]

    @staticmethod
    def save_placeholder_data(placeholders: Dict, file_path: str) -> None:
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(placeholders, f, indent=2)
        except Exception as exc:
            logger.error("Error saving placeholder data to %s: %s", file_path, exc)

    @staticmethod
    def load_placeholder_data(file_path: str) -> Dict:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    @staticmethod
    def validate_template(template_path: str, required_placeholders: List[str] = None) -> Dict:
        required = required_placeholders or ["NAME"]
        detected = AdvancedPlaceholderService.detect_all_placeholders(template_path)

        detected_keys = list(detected.keys())
        missing = [name.upper() for name in required if name.upper() not in detected]

        return {
            "valid": not missing,
            "found_placeholders": detected_keys,
            "required_placeholders": [name.upper() for name in required],
            "missing_placeholders": missing,
            "placeholder_details": detected
        }

    @staticmethod
    def get_placeholder_suggestions(template_path: str) -> List[str]:
        detected = AdvancedPlaceholderService.detect_all_placeholders(template_path)
        suggestions = ["NAME"]
        common = ["EVENT", "DATE", "ROLE", "COURSE", "ORG"]
        for item in common:
            if item not in detected:
                suggestions.append(item)
        return suggestions
