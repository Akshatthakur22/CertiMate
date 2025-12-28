from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import os
import aiofiles
import logging
from app.config import settings
from app.utils.fileutils import sanitize_filename
from app.utils.metadata import UploadMetadata
from app.models.schemas import FileUploadResponse

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
        file_ext = os.path.splitext(file.filename)[1].lower()
        allowed_template_extensions = [".pdf", ".png", ".jpg", ".jpeg"]
        
        if file_ext not in allowed_template_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Template file type {file_ext} not allowed. Allowed types: {allowed_template_extensions}"
            )
        
        # Sanitize filename to prevent directory traversal and special characters
        safe_filename = sanitize_filename(file.filename)
        
        # Create templates directory if it doesn't exist
        template_dir = os.path.join(settings.UPLOAD_DIR, "templates")
        os.makedirs(template_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(template_dir, safe_filename)
        async with aiofiles.open(file_path, "wb") as f:
            content = await file.read()
            await f.write(content)
        
        # Record metadata
        metadata = UploadMetadata()
        metadata.record_template_upload(file_path, safe_filename)
        
        # Get file size
        file_size = os.path.getsize(file_path)
        
        return FileUploadResponse(
            message="Template uploaded successfully",
            filename=safe_filename,
            file_path=file_path,
            file_size=file_size,
            file_type=file_ext
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
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext != ".csv":
            raise HTTPException(
                status_code=400,
                detail="Only CSV files are allowed"
            )
        
        # Sanitize filename
        safe_filename = sanitize_filename(file.filename)
        
        # Create CSV directory if it doesn't exist
        csv_dir = os.path.join(settings.UPLOAD_DIR, "csv")
        os.makedirs(csv_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(csv_dir, safe_filename)
        async with aiofiles.open(file_path, "wb") as f:
            content = await file.read()
            await f.write(content)
        
        # Record metadata
        metadata = UploadMetadata()
        metadata.record_csv_upload(file_path, safe_filename)
        
        return {
            "message": "CSV file uploaded successfully",
            "filename": safe_filename,
            "file_path": file_path
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error uploading CSV: {str(e)}"
        )


@router.post("/")
async def upload_file_legacy(file: UploadFile = File(...)):
    """
    Legacy upload endpoint for backward compatibility
    Upload a file for processing
    """
    try:
        # Validate file extension
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file_ext} not allowed. Allowed types: {settings.ALLOWED_EXTENSIONS}"
            )
        
        # Create upload directory if it doesn't exist
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        
        # Save file
        file_path = os.path.join(settings.UPLOAD_DIR, file.filename)
        async with aiofiles.open(file_path, "wb") as f:
            content = await file.read()
            await f.write(content)
        
        return {
            "message": "File uploaded successfully",
            "filename": file.filename,
            "file_path": file_path
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error uploading file: {str(e)}"
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
            "message": "Latest uploads retrieved successfully",
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
