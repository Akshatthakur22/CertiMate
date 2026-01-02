from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
import aiofiles
import logging
from app.config import settings
from app.utils.fileutils import sanitize_filename, validate_file_extension, get_file_extension
from app.utils.metadata import UploadMetadata
from app.models.schemas import FileUploadResponse
from app.models.optimized_responses import create_file_upload_response

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("/template", response_model=FileUploadResponse)
async def upload_template(file: UploadFile = File(...)):
    """
    Upload certificate template (PDF or image file)
    Saves to uploads/templates directory
    """
    try:
        # Validate file extension - allow PDF and common image formats
        allowed_template_extensions = [".pdf", ".png", ".jpg", ".jpeg"]
        
        if not validate_file_extension(file.filename, allowed_template_extensions):
            ext_list = ", ".join(allowed_template_extensions)
            raise HTTPException(
                status_code=400,
                detail=f"Template file type not allowed. Allowed types: {ext_list}"
            )
        
        # Sanitize filename to prevent directory traversal and special characters
        safe_filename = sanitize_filename(file.filename)
        
        # Create templates directory if it doesn't exist
        template_dir = os.path.join(settings.UPLOAD_DIR, "templates")
        from app.utils.fileutils import ensure_directory
        ensure_directory(template_dir)
        
        # Save file
        file_path = os.path.join(template_dir, safe_filename)
        async with aiofiles.open(file_path, "wb") as f:
            content = await file.read()
            await f.write(content)
        
        # Record metadata
        metadata = UploadMetadata()
        metadata.record_template_upload(file_path, safe_filename)
        
        # Get file size
        from app.utils.fileutils import get_file_size
        file_size = get_file_size(file_path)
        
        return create_file_upload_response(
            filename=safe_filename,
            file_path=file_path,
            file_size=file_size,
            file_type=get_file_extension(file_path),
            message="Template uploaded successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error uploading template: {str(e)}"
        )


@router.post("/csv")
async def upload_csv(file: UploadFile = File(...)):
    """
    Upload CSV file containing names for certificate generation
    Saves to uploads/csv directory
    """
    try:
        # Validate file extension
        if not validate_file_extension(file.filename, [".csv"]):
            raise HTTPException(
                status_code=400,
                detail="Only CSV files are allowed"
            )
        
        # Sanitize filename
        safe_filename = sanitize_filename(file.filename)
        
        # Create CSV directory if it doesn't exist
        csv_dir = os.path.join(settings.UPLOAD_DIR, "csv")
        from app.utils.fileutils import ensure_directory
        ensure_directory(csv_dir)
        
        # Save file
        file_path = os.path.join(csv_dir, safe_filename)
        async with aiofiles.open(file_path, "wb") as f:
            content = await file.read()
            await f.write(content)
        
        # Record metadata
        metadata = UploadMetadata()
        metadata.record_csv_upload(file_path, safe_filename)
        
        return create_file_upload_response(
            filename=safe_filename,
            file_path=file_path,
            file_size=os.path.getsize(file_path),
            file_type="csv",
            message="CSV file uploaded successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error uploading CSV: {str(e)}"
        )




@router.get("/latest")
async def get_latest_uploads():
    """
    Get the most recent uploaded template and CSV files
    
    Returns the file paths and metadata for the latest uploads.
    Useful for automatically generating certificates without manually specifying paths.
    """
    try:
        metadata = UploadMetadata()
        latest = metadata.get_latest_uploads()
        
        # Check if files exist
        if latest["template"] and not metadata.validate_file_exists(latest["template"]["file_path"]):
            latest["template"] = None
            logger.warning("Template file from metadata no longer exists")
        
        if latest["csv"] and not metadata.validate_file_exists(latest["csv"]["file_path"]):
            latest["csv"] = None
            logger.warning("CSV file from metadata no longer exists")
        
        return {
            "success": True,
            "template": latest["template"],
            "csv": latest["csv"],
            "ready": latest["template"] is not None and latest["csv"] is not None
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving latest uploads: {str(e)}"
        )


@router.get("/csv/content")
async def get_csv_content():
    """
    Get the content of the latest uploaded CSV file
    
    Returns the actual CSV content for parsing on the frontend.
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
        
        # Check if file exists
        if not os.path.exists(csv_path):
            raise HTTPException(
                status_code=404,
                detail=f"CSV file not found: {csv_path}"
            )
        
        # Read and return CSV content
        async with aiofiles.open(csv_path, 'r') as f:
            content = await f.read()
        
        return {
            "message": "CSV content retrieved successfully",
            "filename": latest["csv"]["filename"],
            "content": content
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving CSV content: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving CSV content: {str(e)}"
        )
