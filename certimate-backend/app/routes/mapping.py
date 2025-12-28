from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, List
import os
import logging
import base64
from io import BytesIO
from app.services.csv_service import CSVService
from app.services.pdf_service import PDFService
from app.services.placeholder_advanced import AdvancedPlaceholderService
from app.config import settings
from app.utils.metadata import UploadMetadata
from app.models.schemas import ErrorResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/mapping", tags=["mapping"])


class MappingConfig(BaseModel):
    """Mapping configuration for CSV columns to certificate fields"""
    name: str
    role: Optional[str] = None
    date: Optional[str] = None


class ValidateMappingRequest(BaseModel):
    """Request schema for mapping validation"""
    mapping: MappingConfig


class PreviewRequest(BaseModel):
    """Request schema for certificate preview"""
    mapping: MappingConfig
    row_index: int = 0  # Which row to use for preview (default: first row)


@router.post("/validate")
async def validate_mapping(request: ValidateMappingRequest):
    """
    Validate CSV mapping configuration
    
    Checks if the mapped columns exist in the CSV and returns:
    - Validation status
    - Field validation results
    - First row data for preview
    
    Args:
        request: Mapping configuration with name, role, date columns
        
    Returns:
        JSON response with validation results and preview data
    """
    try:
        # Get latest CSV file
        metadata = UploadMetadata()
        latest = metadata.get_latest_uploads()
        
        if not latest["csv"]:
            raise HTTPException(
                status_code=404,
                detail="No CSV file found. Please upload a CSV first."
            )
        
        csv_path = latest["csv"]["file_path"]
        
        # Validate file exists
        if not os.path.exists(csv_path):
            raise HTTPException(
                status_code=404,
                detail=f"CSV file not found: {csv_path}"
            )
        
        logger.info(f"Validating mapping for CSV: {csv_path}")
        logger.info(f"Mapping config: {request.mapping.dict()}")
        
        # Read CSV
        df = CSVService.read_csv(csv_path)
        
        # Validate columns exist
        validation_results = {
            "name": {"valid": False, "error": None},
            "role": {"valid": False, "error": None},
            "date": {"valid": False, "error": None},
        }
        
        # Validate name column (required)
        if request.mapping.name not in df.columns:
            validation_results["name"] = {
                "valid": False,
                "error": f"Column '{request.mapping.name}' not found in CSV",
                "details": f"Available columns: {df.columns.tolist()}"
            }
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Missing column",
                    "details": f"Column '{request.mapping.name}' not found in CSV",
                    "available_columns": df.columns.tolist(),
                    "validation": validation_results
                }
            )
        else:
            validation_results["name"] = {"valid": True, "error": None}
        
        # Validate role column (optional)
        if request.mapping.role:
            if request.mapping.role not in df.columns:
                validation_results["role"] = {
                    "valid": False,
                    "error": f"Column '{request.mapping.role}' not found in CSV"
                }
            else:
                validation_results["role"] = {"valid": True, "error": None}
        
        # Validate date column (optional)
        if request.mapping.date:
            if request.mapping.date not in df.columns:
                validation_results["date"] = {
                    "valid": False,
                    "error": f"Column '{request.mapping.date}' not found in CSV"
                }
            else:
                validation_results["date"] = {"valid": True, "error": None}
        
        # Get first row data for preview
        preview_data = {}
        if len(df) > 0:
            first_row = df.iloc[0]
            preview_data = {
                "name": str(first_row.get(request.mapping.name, "")),
                "role": str(first_row.get(request.mapping.role, "")) if request.mapping.role else "",
                "date": str(first_row.get(request.mapping.date, "")) if request.mapping.date else "",
            }
        
        logger.info(f"Mapping validation successful. Preview data: {preview_data}")
        
        return {
            "success": True,
            "message": "Mapping validated successfully",
            "validation": validation_results,
            "preview_data": preview_data,
            "csv_stats": {
                "total_rows": len(df),
                "total_columns": len(df.columns),
                "columns": df.columns.tolist()
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating mapping: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Validation error",
                "details": str(e)
            }
        )


@router.post("/preview")
async def generate_preview(request: PreviewRequest):
    """
    Generate a preview certificate image based on mapping configuration
    
    Uses the first row (or specified row) from the CSV to generate a preview
    certificate image. Returns the image as base64 or file path.
    
    Args:
        request: Mapping configuration and row index
        
    Returns:
        JSON response with preview image (base64) or file path
    """
    try:
        # Get latest uploads
        metadata = UploadMetadata()
        latest = metadata.get_latest_uploads()
        
        if not latest["template"]:
            raise HTTPException(
                status_code=404,
                detail="No template file found. Please upload a template first."
            )
        
        if not latest["csv"]:
            raise HTTPException(
                status_code=404,
                detail="No CSV file found. Please upload a CSV first."
            )
        
        template_path = latest["template"]["file_path"]
        csv_path = latest["csv"]["file_path"]
        
        # Validate files exist
        if not os.path.exists(template_path):
            raise HTTPException(
                status_code=404,
                detail=f"Template file not found: {template_path}"
            )
        
        if not os.path.exists(csv_path):
            raise HTTPException(
                status_code=404,
                detail=f"CSV file not found: {csv_path}"
            )
        
        logger.info(f"Generating preview certificate with mapping: {request.mapping.dict()}")
        
        # Read CSV and get preview row data
        df = CSVService.read_csv(csv_path)
        
        # Validate row index
        if request.row_index >= len(df):
            raise HTTPException(
                status_code=400,
                detail=f"Row index {request.row_index} out of range. CSV has {len(df)} rows."
            )
        
        # Get data from specified row
        row_data = df.iloc[request.row_index]
        
        # Extract values based on mapping
        name = str(row_data.get(request.mapping.name, ""))
        role = str(row_data.get(request.mapping.role, "")) if request.mapping.role and request.mapping.role in df.columns else ""
        date = str(row_data.get(request.mapping.date, "")) if request.mapping.date and request.mapping.date in df.columns else ""
        
        # Auto-detect event column if role is not mapped
        if not role:
            event_columns = ['event', 'Event', 'EVENT', 'course', 'Course', 'COURSE', 'program', 'Program', 'PROGRAM']
            for col in df.columns:
                if col in event_columns:
                    role = str(row_data.get(col, ""))
                    logger.info(f"Auto-detected event column: {col} with value: {role}")
                    break
        
        if not name:
            raise HTTPException(
                status_code=400,
                detail="Name field is empty in the selected row"
            )
        
        # Create mapping config dictionary
        mapping_config = {
            'name': request.mapping.name,
            'event': request.mapping.role if request.mapping.role and request.mapping.role in df.columns else next((col for col in df.columns if col in ['event', 'Event', 'EVENT', 'course', 'Course', 'COURSE', 'program', 'Program', 'PROGRAM']), None),
            'date': request.mapping.date
        }
        
        # Create preview data dictionary
        preview_data = {
            'name': name,
            'role': role,
            'date': date
        }
        
        logger.info(f"Preview data - Name: {name}, Role: {role}, Date: {date}")
        logger.info(f"Mapping config: {mapping_config}")
        
        # Detect ALL placeholders in template
        logger.info(f"Detecting all placeholders for template: {template_path}")
        placeholders = AdvancedPlaceholderService.detect_all_placeholders(template_path)
        logger.info(f"Found placeholders: {list(placeholders.keys())}")
        
        # Debug placeholder details
        for ph_name, ph_info in placeholders.items():
            logger.info(f"Placeholder {ph_name}: bbox={ph_info.get('bbox')}, text='{ph_info.get('text')}', confidence={ph_info.get('confidence')}")
        
        # Load template image
        if template_path.lower().endswith('.pdf'):
            template_images = PDFService.pdf_to_images(template_path)
            template_image = template_images[0]
        else:
            from PIL import Image
            template_image = Image.open(template_path)
        
        # Start with template image
        result_image = template_image.copy()
        
        # Render ALL placeholders with mapped data
        for placeholder_name, placeholder_info in placeholders.items():
            # Find matching CSV column from mapping (case-insensitive)
            csv_column = None
            for map_key, map_value in mapping_config.items():
                if map_key.upper() == placeholder_name and map_value:
                    csv_column = map_value
                    break
            
            if csv_column and csv_column in preview_data and preview_data[csv_column]:
                # Get placeholder bbox
                bbox = placeholder_info.get('bbox', {})
                logger.info(f"Rendering {placeholder_name}: bbox={bbox}, data='{preview_data[csv_column]}'")
                if bbox:
                    # Render text on placeholder position
                    result_image = PDFService.render_name_on_image(
                        result_image,
                        str(preview_data[csv_column]),
                        bbox=bbox,
                        center=True
                    )
                    logger.info(f"Successfully rendered {placeholder_name} -> {csv_column}: {preview_data[csv_column]}")
                else:
                    logger.warning(f"No bbox found for placeholder: {placeholder_name}")
            else:
                logger.info(f"No mapping or data for placeholder: {placeholder_name} (csv_column={csv_column}, available_data={list(preview_data.keys())})")
        
        # Convert image to base64
        buffer = BytesIO()
        result_image.save(buffer, format="PNG")
        image_bytes = buffer.getvalue()
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        logger.info("Preview certificate generated successfully")
        
        return {
            "success": True,
            "message": "Preview certificate generated successfully",
            "preview_image": f"data:image/png;base64,{image_base64}",
            "preview_data": {
                "name": name,
                "role": role,
                "date": date
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating preview: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Preview generation error",
                "details": str(e)
            }
        )


@router.get("/analyze-csv")
async def analyze_csv():
    """
    Analyze the latest uploaded CSV file and return column information
    
    Returns:
        JSON response with CSV columns, row count, and sample data
    """
    try:
        metadata = UploadMetadata()
        latest = metadata.get_latest_uploads()
        
        if not latest["csv"]:
            raise HTTPException(
                status_code=404,
                detail="No CSV file found. Please upload a CSV first."
            )
        
        csv_path = latest["csv"]["file_path"]
        
        if not os.path.exists(csv_path):
            raise HTTPException(
                status_code=404,
                detail=f"CSV file not found: {csv_path}"
            )
        
        logger.info(f"Analyzing CSV: {csv_path}")
        
        # Read CSV
        df = CSVService.read_csv(csv_path)
        
        # Get sample data (first 3 rows)
        sample_data = []
        for idx in range(min(3, len(df))):
            row = df.iloc[idx]
            sample_data.append(row.to_dict())
        
        logger.info(f"CSV analysis complete. Found {len(df.columns)} columns and {len(df)} rows")
        
        return {
            "success": True,
            "message": "CSV analyzed successfully",
            "csv_stats": {
                "filename": latest["csv"]["filename"],
                "total_rows": len(df),
                "total_columns": len(df.columns),
                "columns": df.columns.tolist()
            },
            "sample_data": sample_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing CSV: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "CSV analysis error",
                "details": str(e)
            }
        )

