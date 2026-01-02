from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, List
import os
import logging
import json
from app.utils.metadata import UploadMetadata
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/placeholders", tags=["placeholders"])


class PlaceholderPosition(BaseModel):
    """Position data for a single placeholder"""
    x: int  # X coordinate (pixels from left)
    y: int  # Y coordinate (pixels from top)
    width: int  # Width of placeholder region
    height: int  # Height of placeholder region


class SavePlaceholdersRequest(BaseModel):
    """Request to save user-defined placeholder positions"""
    template_filename: str
    placeholders: Dict[str, PlaceholderPosition]  # e.g., {"NAME": {...}, "ROLE": {...}}


class GetPlaceholdersResponse(BaseModel):
    """Response with saved placeholder positions"""
    template_filename: str
    template_path: str
    placeholders: Dict[str, PlaceholderPosition]
    has_placeholders: bool


@router.post("/save")
async def save_placeholders(request: SavePlaceholdersRequest):
    """
    Save user-defined placeholder positions for a template
    
    Stores the positions in a JSON file alongside the template
    """
    try:
        logger.info(f"💾 [PLACEHOLDERS] Saving positions for template: {request.template_filename}")
        
        # Get template path
        metadata = UploadMetadata()
        latest = metadata.get_latest_uploads()
        
        if not latest["template"]:
            raise HTTPException(
                status_code=404,
                detail="No template file found"
            )
        
        template_path = latest["template"]["file_path"]
        
        # Validate template file exists
        if not os.path.exists(template_path):
            raise HTTPException(
                status_code=404,
                detail=f"Template file not found: {template_path}"
            )
        
        # Convert placeholders to storage format
        placeholders_data = {
            name: {
                "left": pos.x,
                "top": pos.y,
                "width": pos.width,
                "height": pos.height,
                "confidence": 100,  # User-defined = 100% confidence
                "text": f"{{{{{name}}}}}",  # {{NAME}} format
                "raw_key": name,
                "normalized_key": name.upper(),
                "csv_key": name.upper(),
                "lookup_key": name.lower(),
                "bbox": {
                    "left": pos.x,
                    "top": pos.y,
                    "width": pos.width,
                    "height": pos.height,
                }
            }
            for name, pos in request.placeholders.items()
        }
        
        # Save to JSON file next to template
        placeholder_file = template_path.rsplit('.', 1)[0] + '_placeholders.json'
        with open(placeholder_file, 'w') as f:
            json.dump({
                "template_path": template_path,
                "template_filename": request.template_filename,
                "placeholders": placeholders_data,
                "method": "manual"  # Mark as manually defined
            }, f, indent=2)
        
        logger.info(f"✅ [PLACEHOLDERS] Saved {len(placeholders_data)} placeholder positions to {placeholder_file}")
        
        return {
            "success": True,
            "message": f"Saved {len(placeholders_data)} placeholder positions",
            "placeholder_file": placeholder_file,
            "placeholders": placeholders_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [PLACEHOLDERS] Error saving placeholders: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error saving placeholders: {str(e)}"
        )


@router.get("/get")
async def get_placeholders():
    """
    Get saved placeholder positions for the latest template
    
    Returns user-defined positions if available
    """
    try:
        logger.info("📖 [PLACEHOLDERS] Retrieving saved placeholder positions")
        
        # Get latest template
        metadata = UploadMetadata()
        latest = metadata.get_latest_uploads()
        
        if not latest["template"]:
            raise HTTPException(
                status_code=404,
                detail="No template file found"
            )
        
        template_path = latest["template"]["file_path"]
        template_filename = latest["template"]["filename"]
        
        # Check for saved placeholder file
        placeholder_file = template_path.rsplit('.', 1)[0] + '_placeholders.json'
        
        if os.path.exists(placeholder_file):
            with open(placeholder_file, 'r') as f:
                data = json.load(f)
            
            logger.info(f"✅ [PLACEHOLDERS] Found saved positions: {list(data['placeholders'].keys())}")
            
            return {
                "success": True,
                "template_filename": template_filename,
                "template_path": template_path,
                "placeholders": data["placeholders"],
                "has_placeholders": True,
                "method": data.get("method", "manual")
            }
        else:
            logger.info("⚠️ [PLACEHOLDERS] No saved placeholder positions found")
            
            return {
                "success": True,
                "template_filename": template_filename,
                "template_path": template_path,
                "placeholders": {},
                "has_placeholders": False,
                "method": None
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [PLACEHOLDERS] Error retrieving placeholders: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving placeholders: {str(e)}"
        )


@router.delete("/clear")
async def clear_placeholders():
    """
    Clear saved placeholder positions for the latest template
    """
    try:
        logger.info("🗑️ [PLACEHOLDERS] Clearing saved placeholder positions")
        
        # Get latest template
        metadata = UploadMetadata()
        latest = metadata.get_latest_uploads()
        
        if not latest["template"]:
            raise HTTPException(
                status_code=404,
                detail="No template file found"
            )
        
        template_path = latest["template"]["file_path"]
        placeholder_file = template_path.rsplit('.', 1)[0] + '_placeholders.json'
        
        if os.path.exists(placeholder_file):
            os.remove(placeholder_file)
            logger.info(f"✅ [PLACEHOLDERS] Deleted placeholder file: {placeholder_file}")
            return {
                "success": True,
                "message": "Placeholder positions cleared"
            }
        else:
            return {
                "success": True,
                "message": "No placeholder positions to clear"
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ [PLACEHOLDERS] Error clearing placeholders: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error clearing placeholders: {str(e)}"
        )
