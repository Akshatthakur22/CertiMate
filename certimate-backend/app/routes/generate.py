from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import os
import logging
from app.services.csv_service import CSVService
from app.services.placeholder import PlaceholderService
from app.services.placeholder_advanced import AdvancedPlaceholderService
from app.services.pdf_service import PDFService
from app.services.zip_service import ZIPService
from app.config import settings
from app.utils.logger import CSVAuditLogger
from app.utils.metadata import UploadMetadata

logger = logging.getLogger(__name__)
audit_logger = CSVAuditLogger()

router = APIRouter(prefix="/generate", tags=["generate"])


class GenerateRequest(BaseModel):
    """Request schema for certificate generation"""
    template_path: str
    csv_path: Optional[str] = None
    names: Optional[List[str]] = None
    placeholder_text: str = "{{NAME}}"
    output_format: str = "pdf"


@router.post("/preview")
async def generate_preview(request: GenerateRequest):
    """
    Generate preview certificates (3 samples) for testing
    
    This endpoint generates a few sample certificates to preview
    before generating the full batch
    """
    try:
        # Validate template path exists
        if not os.path.exists(request.template_path):
            raise HTTPException(status_code=404, detail=f"Template not found: {request.template_path}")
        
        # Get names for preview
        names = []
        if request.names:
            # Use provided names
            names = request.names[:3]  # Take first 3
        elif request.csv_path:
            # Read names from CSV
            if not os.path.exists(request.csv_path):
                raise HTTPException(status_code=404, detail=f"CSV file not found: {request.csv_path}")
            all_names = CSVService.get_names_from_csv(request.csv_path)
            names = all_names[:3]  # Take first 3
        else:
            # Use default sample names
            names = ["John Doe", "Jane Smith", "Bob Johnson"]
        
        # Find placeholder bounding box
        logger.info(f"Finding placeholder bbox for template: {request.template_path}")
        bboxes = PlaceholderService.find_placeholder_bbox(
            request.template_path,
            request.placeholder_text
        )
        
        # Use the first bbox found (or None if not found)
        bbox = bboxes[0] if bboxes else None
        logger.info(f"Using bbox: {bbox}")
        
        # Convert template to image if it's a PDF
        if request.template_path.lower().endswith('.pdf'):
            template_images = PDFService.pdf_to_images(request.template_path)
            template_image = template_images[0]
        else:
            from PIL import Image
            template_image = Image.open(request.template_path)
        
        # Generate preview certificates
        preview_dir = os.path.join(settings.UPLOAD_DIR, "preview")
        os.makedirs(preview_dir, exist_ok=True)
        
        generated_files = []
        for idx, name in enumerate(names):
            # Render name on template
            logger.info(f"Generating preview certificate {idx + 1} for: {name}")
            result_image = PDFService.render_name_on_image(
                template_image,
                name,
                bbox=bbox,
                center=True  # Center text in bbox
            )
            
            # Save preview image
            output_path = os.path.join(preview_dir, f"preview_{idx + 1}_{name.replace(' ', '_')}.png")
            result_image.save(output_path, "PNG")
            generated_files.append(output_path)
        
        # Create a zip file with all preview certificates
        zip_path = os.path.join(preview_dir, "preview_certificates.zip")
        ZIPService.create_zip(generated_files, zip_path)
        
        return {
            "message": "Preview certificates generated successfully",
            "num_certificates": len(names),
            "names": names,
            "bbox": bbox,
            "zip_path": zip_path
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating preview: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating preview: {str(e)}")


@router.post("/batch")
async def generate_batch(background_tasks: BackgroundTasks, placeholder_text: str = "{{NAME}}"):
    """
    Generate certificates using the latest uploaded template and CSV
    
    Automatically detects the most recent template and CSV file uploaded,
    then generates certificates for all participants in the CSV.
    
    Args:
        background_tasks: FastAPI background tasks
        placeholder_text: Placeholder text to search for in template (default: {{NAME}})
    
    Returns:
        JSON response with generation results and download URL
    """
    try:
        # Get latest uploads
        metadata = UploadMetadata()
        latest = metadata.get_latest_uploads()
        
        # Validate that both files exist
        if not latest["template"]:
            raise HTTPException(
                status_code=404,
                detail="No template file found. Please upload a template first."
            )
        
        if not latest["csv"]:
            raise HTTPException(
                status_code=404,
                detail="No CSV file found. Please upload a CSV file first."
            )
        
        template_path = latest["template"]["file_path"]
        csv_path = latest["csv"]["file_path"]
        
        # Verify files still exist
        if not metadata.validate_file_exists(template_path):
            raise HTTPException(
                status_code=404,
                detail=f"Template file not found: {template_path}"
            )
        
        if not metadata.validate_file_exists(csv_path):
            raise HTTPException(
                status_code=404,
                detail=f"CSV file not found: {csv_path}"
            )
        
        logger.info(f"Batch generation started with template: {template_path} and CSV: {csv_path}")
        
        # Get names from CSV
        names = CSVService.get_names_from_csv(csv_path)
        
        if not names:
            raise HTTPException(
                status_code=400,
                detail="No names found in CSV file. Please check your CSV format."
            )
        
        logger.info(f"Found {len(names)} names to generate certificates for")
        
        # Find placeholder bounding box
        logger.info(f"Finding placeholder bbox for template: {template_path}")
        bboxes = PlaceholderService.find_placeholder_bbox(
            template_path,
            placeholder_text
        )
        
        # Use the first bbox found (or None if not found)
        bbox = bboxes[0] if bboxes else None
        logger.info(f"Using bbox: {bbox}")
        
        # Convert template to image if it's a PDF
        if template_path.lower().endswith('.pdf'):
            template_images = PDFService.pdf_to_images(template_path)
            template_image = template_images[0]
        else:
            from PIL import Image
            template_image = Image.open(template_path)
        
        # Generate all certificates
        output_dir = os.path.join(settings.UPLOAD_DIR, "certificates")
        os.makedirs(output_dir, exist_ok=True)
        
        generated_files = []
        successful_count = 0
        failed_count = 0
        
        for idx, name in enumerate(names):
            try:
                # Render name on template
                result_image = PDFService.render_name_on_image(
                    template_image,
                    name,
                    bbox=bbox,
                    center=True  # Center text in bbox
                )
                
                # Save certificate image
                output_path = os.path.join(output_dir, f"certificate_{idx + 1}_{name.replace(' ', '_')}.png")
                result_image.save(output_path, "PNG")
                generated_files.append(output_path)
                
                # Log success
                audit_logger.log_success(name, output_path, "success")
                successful_count += 1
                
                logger.info(f"Generated certificate {idx + 1}/{len(names)} for: {name}")
                
            except Exception as e:
                error_msg = str(e)
                # Log failure
                audit_logger.log_failure(name, error_msg, "failed")
                failed_count += 1
                logger.error(f"Error generating certificate for {name}: {e}")
                continue
        
        if not generated_files:
            raise HTTPException(status_code=500, detail="Failed to generate any certificates")
        
        # Create a zip file with all certificates
        zip_path = os.path.join(output_dir, "certificates.zip")
        ZIPService.create_zip(generated_files, zip_path)
        
        logger.info(f"Generated {len(generated_files)} certificates and created ZIP file")
        
        return {
            "message": "Certificates generated successfully",
            "template": latest["template"]["filename"],
            "csv": latest["csv"]["filename"],
            "num_certificates": len(generated_files),
            "total_requested": len(names),
            "successful": successful_count,
            "failed": failed_count,
            "zip_path": zip_path,
            "download_url": f"/api/generate/download/{os.path.basename(zip_path)}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in batch generation: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error generating certificates: {str(e)}"
        )


@router.post("/")
async def generate_certificates(request: GenerateRequest, background_tasks: BackgroundTasks):
    """
    Generate full batch of certificates
    
    This endpoint generates certificates for all names and returns a ZIP file
    """
    try:
        # Validate template path exists
        if not os.path.exists(request.template_path):
            raise HTTPException(status_code=404, detail=f"Template not found: {request.template_path}")
        
        # Get all names
        names = []
        if request.names:
            # Use provided names
            names = request.names
        elif request.csv_path:
            # Read names from CSV
            if not os.path.exists(request.csv_path):
                raise HTTPException(status_code=404, detail=f"CSV file not found: {request.csv_path}")
            names = CSVService.get_names_from_csv(request.csv_path)
        else:
            raise HTTPException(status_code=400, detail="Either 'names' or 'csv_path' must be provided")
        
        if not names:
            raise HTTPException(status_code=400, detail="No names found to generate certificates for")
        
        logger.info(f"Generating {len(names)} certificates")
        
        # Find placeholder bounding box
        logger.info(f"Finding placeholder bbox for template: {request.template_path}")
        bboxes = PlaceholderService.find_placeholder_bbox(
            request.template_path,
            request.placeholder_text
        )
        
        # Use the first bbox found (or None if not found)
        bbox = bboxes[0] if bboxes else None
        logger.info(f"Using bbox: {bbox}")
        
        # Convert template to image if it's a PDF
        if request.template_path.lower().endswith('.pdf'):
            template_images = PDFService.pdf_to_images(request.template_path)
            template_image = template_images[0]
        else:
            from PIL import Image
            template_image = Image.open(request.template_path)
        
        # Generate all certificates
        output_dir = os.path.join(settings.UPLOAD_DIR, "certificates")
        os.makedirs(output_dir, exist_ok=True)
        
        generated_files = []
        successful_count = 0
        failed_count = 0
        
        for idx, name in enumerate(names):
            try:
                # Render name on template
                result_image = PDFService.render_name_on_image(
                    template_image,
                    name,
                    bbox=bbox,
                    center=True  # Center text in bbox
                )
                
                # Save certificate image
                output_path = os.path.join(output_dir, f"certificate_{idx + 1}_{name.replace(' ', '_')}.png")
                result_image.save(output_path, "PNG")
                generated_files.append(output_path)
                
                # Log success
                audit_logger.log_success(name, output_path, "success")
                successful_count += 1
                
                logger.info(f"Generated certificate {idx + 1}/{len(names)} for: {name}")
                
            except Exception as e:
                error_msg = str(e)
                # Log failure
                audit_logger.log_failure(name, error_msg, "failed")
                failed_count += 1
                logger.error(f"Error generating certificate for {name}: {e}")
                continue
        
        if not generated_files:
            raise HTTPException(status_code=500, detail="Failed to generate any certificates")
        
        # Create a zip file with all certificates
        zip_path = os.path.join(output_dir, "certificates.zip")
        ZIPService.create_zip(generated_files, zip_path)
        
        logger.info(f"Generated {len(generated_files)} certificates and created ZIP file")
        
        return {
            "message": "Certificates generated successfully",
            "num_certificates": len(generated_files),
            "total_requested": len(names),
            "successful": successful_count,
            "failed": failed_count,
            "zip_path": zip_path,
            "download_url": f"/api/generate/download/{os.path.basename(zip_path)}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating certificates: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating certificates: {str(e)}")


@router.get("/download/{filename}")
async def download_certificates(filename: str):
    """
    Download generated certificate ZIP file
    """
    try:
        # Security: prevent directory traversal
        if '..' in filename or '/' in filename:
            raise HTTPException(status_code=400, detail="Invalid filename")
        
        zip_path = os.path.join(settings.UPLOAD_DIR, "certificates", filename)
        
        if not os.path.exists(zip_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        return FileResponse(
            zip_path,
            media_type="application/zip",
            filename=filename
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading certificates: {e}")
        raise HTTPException(status_code=500, detail=f"Error downloading certificates: {str(e)}")


@router.get("/status/{job_id}")
async def get_generation_status(job_id: str):
    """
    Get the status of a certificate generation job
    TODO: Implement job status tracking
    """
    return {
        "job_id": job_id,
        "status": "pending"
    }


@router.get("/logs/success")
async def get_success_log():
    """
    Get the success log (success.csv) as a file download
    """
    try:
        log_path = os.path.join("logs", "success.csv")
        
        if not os.path.exists(log_path):
            raise HTTPException(status_code=404, detail="Success log not found")
        
        return FileResponse(
            log_path,
            media_type="text/csv",
            filename="success.csv"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving success log: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving success log: {str(e)}")


@router.get("/analyze-template/{template_path:path}")
async def analyze_template(template_path: str):
    """
    Analyze a template and return all detected placeholders
    
    This endpoint scans the template for ALL placeholder patterns like {{NAME}}, {{EVENT}}, etc.
    and returns their coordinates for visualization or validation.
    
    Args:
        template_path: Path to the template file
        
    Returns:
        Dictionary with detected placeholders and their coordinates
    """
    try:
        if not os.path.exists(template_path):
            raise HTTPException(
                status_code=404,
                detail=f"Template not found: {template_path}"
            )
        
        # Detect all placeholders
        placeholders = AdvancedPlaceholderService.detect_all_placeholders(template_path)
        
        # Validate template
        validation = AdvancedPlaceholderService.validate_template(template_path, required_placeholders=["NAME"])
        
        return {
            "template_path": template_path,
            "placeholders": placeholders,
            "placeholder_count": len(placeholders),
            "validation": validation,
            "suggested_placeholders": AdvancedPlaceholderService.get_placeholder_suggestions(template_path)
        }
        
    except Exception as e:
        logger.error(f"Error analyzing template: {e}")
        raise HTTPException(status_code=500, detail=f"Error analyzing template: {str(e)}")


@router.get("/logs/failures")
async def get_failure_log():
    """
    Get the failure log (failed.csv) as a file download
    """
    try:
        log_path = os.path.join("logs", "failed.csv")
        
        if not os.path.exists(log_path):
            raise HTTPException(status_code=404, detail="Failure log not found")
        
        return FileResponse(
            log_path,
            media_type="text/csv",
            filename="failed.csv"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving failure log: {e}")
        raise HTTPException(status_code=500, detail=f"Error retrieving failure log: {str(e)}")
