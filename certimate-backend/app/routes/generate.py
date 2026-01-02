from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
import os
import logging
import uuid
from app.services.csv_service import CSVService
from app.services.placeholder_advanced import AdvancedPlaceholderService
from app.services.pdf_service import PDFService
from app.services.zip_service import ZIPService
from app.services.streaming_zip import create_streaming_zip_response, create_streaming_zip_from_directory
from app.config import settings
from app.utils.logger import CSVAuditLogger
from app.utils.metadata import UploadMetadata
from app.services.job_service import JobService
from app.models.schemas import CertificateGenerateRequest, CertificateResponse, CertificateStatus, JobResponse, JobStatus
from app.models.optimized_responses import create_job_response

logger = logging.getLogger(__name__)
audit_logger = CSVAuditLogger()

router = APIRouter(prefix="/generate", tags=["generate"])


class LegacyGenerateRequest(BaseModel):
    """Legacy request schema for certificate generation"""
    template_path: str
    csv_path: Optional[str] = None
    names: Optional[List[str]] = None
    placeholder_text: str = "{{NAME}}"
    output_format: str = "pdf"


class MappingConfig(BaseModel):
    """Mapping configuration for CSV columns to certificate fields"""
    name: str
    role: Optional[str] = None
    date: Optional[str] = None


class GenerateWithMappingRequest(BaseModel):
    """Request schema for certificate generation with mapping config"""
    mapping: MappingConfig


@router.post("/preview")
async def generate_preview(request: LegacyGenerateRequest):
    """
    Generate preview certificates (3 samples) for testing
    
    This endpoint generates a few sample certificates to preview
    before generating the full batch
    """
    try:
        # Validate template path exists
        if not os.path.exists(request.template_path):
            raise HTTPException(status_code=404, detail=f"Template not found: {request.template_path}")
        
        # Detect ALL placeholders in template (will use cache if available)
        logger.info(f"Detecting all placeholders for template: {request.template_path}")
        placeholders = AdvancedPlaceholderService.detect_all_placeholders(request.template_path)
        logger.info(f"Found placeholders: {list(placeholders.keys())}")
        
        # Get CSV data with all columns
        if request.csv_path:
            if not os.path.exists(request.csv_path):
                raise HTTPException(status_code=404, detail=f"CSV file not found: {request.csv_path}")
            csv_data = CSVService.get_all_data(request.csv_path)
            sample_rows = csv_data[:3]  # Take first 3 rows
        else:
            # Use default sample data
            sample_rows = [
                {"name": "John Doe", "event": "Python Workshop", "date": "2024-01-15", "role": "Participant"},
                {"name": "Jane Smith", "event": "Python Workshop", "date": "2024-01-15", "role": "Participant"},
                {"name": "Bob Johnson", "event": "Python Workshop", "date": "2024-01-15", "role": "Participant"}
            ]
        
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
        for idx, row_data in enumerate(sample_rows):
            # Start with template image
            result_image = template_image.copy()
            
            # Render ALL placeholders on template
            logger.info(f"Generating preview certificate {idx + 1} with data: {row_data}")
            
            for placeholder_name, placeholder_info in placeholders.items():
                # Find matching CSV column (case-insensitive)
                csv_column = None
                for col in row_data.keys():
                    if col.lower() == placeholder_name.lower():
                        csv_column = col
                        break
                
                if csv_column and row_data[csv_column]:
                    # Get placeholder bbox
                    bbox = placeholder_info.get('bbox', {})
                    if bbox:
                        # Render text on placeholder position
                        result_image = PDFService.render_name_on_image(
                            result_image,
                            str(row_data[csv_column]),
                            bbox=bbox,
                            center=True
                        )
            
            # Save preview image
            safe_name = str(row_data.get('name', f'row_{idx}')).replace(' ', '_')
            output_path = os.path.join(preview_dir, f"preview_{idx + 1}_{safe_name}.png")
            result_image.save(output_path, "PNG")
            generated_files.append(output_path)
        
        # Create a streaming ZIP file with all preview certificates
        zip_response = await create_streaming_zip_from_directory(
            directory_path=preview_dir,
            filename="preview_certificates.zip",
            pattern="*.png"
        )
        
        return {
            "success": True,
            "num_certificates": len(sample_rows),
            "placeholders_found": list(placeholders.keys()),
            "sample_data": sample_rows[:1],  # Show first row as example
            "preview_zip": {
                "available": True,
                "download_url": f"/api/generate/download/preview/preview",
                "filename": "preview_certificates.zip"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating preview: {e}")
        raise HTTPException(status_code=500, detail=f"Error generating preview: {str(e)}")


@router.post("/batch")
async def generate_batch(
    request: Optional[GenerateWithMappingRequest] = None,
    placeholder_text: str = "{{NAME}}"
):
    """
    Generate certificates using the latest uploaded template and CSV
    """
    try:
        # Get latest uploads
        metadata = UploadMetadata()
        latest = metadata.get_latest_uploads()
        
        if not latest["template"] or not latest["csv"]:
            raise HTTPException(status_code=404, detail="Missing template or CSV file")
            
        template_path = latest["template"]["file_path"]
        csv_path = latest["csv"]["file_path"]
        
        # Verify files exist
        if not os.path.exists(template_path) or not os.path.exists(csv_path):
            raise HTTPException(status_code=404, detail="Files not found on server")
            
        # Estimate total items (read CSV quickly)
        try:
            df = CSVService.read_csv(csv_path)
            total_items = len(df)
        except:
            total_items = 0
            
        # Create Job
        job_id = str(uuid.uuid4())
        JobService.create_job(job_id, total_items, {
            "template": latest["template"]["filename"],
            "csv": latest["csv"]["filename"]
        })
        
        # Enqueue Task
        from app.core.queue import q
        from app.tasks.generation_tasks import generate_batch_task
        
        mapping_dict = request.mapping.dict() if request and request.mapping else None
        
        # Pass arguments in the correct order matching the function signature
        q.enqueue(
            generate_batch_task,
            job_id,  # First positional argument
            template_path,
            csv_path,
            mapping_dict,
            placeholder_text
        )
        
        return create_job_response(
            job_id=job_id,
            status="queued",
            total_items=total_items,
            message="Batch generation started"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting batch generation: {e}")
        raise HTTPException(status_code=500, detail=f"Error starting batch generation: {str(e)}")


@router.get("/status/{job_id}")
async def get_generation_status(job_id: str):
    """
    Get the status of a certificate generation job
    """
    status = JobService.get_job_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    # Backfill download info for completed jobs so the frontend can offer downloads
    if status.get("status") in ["completed", "completed_with_errors"] and not status.get("download_url"):
        download_url = f"/api/generate/download/{job_id}"
        filename = f"certificates_{job_id}.zip"
        status["download_url"] = download_url
        status["download_filename"] = filename
        status["download_available"] = True
        JobService.set_download_info(job_id, download_url, filename, status.get("output_dir"))
        
    return status


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


@router.get("/download/{job_id}")
async def download_certificates(job_id: str):
    """
    Download generated certificates as streaming ZIP
    """
    try:
        # Get job status
        job_status = JobService.get_job_status(job_id)
        if not job_status:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
        
        if job_status["status"] not in ["completed", "completed_with_errors"]:
            raise HTTPException(status_code=400, detail=f"Job {job_id} is not completed yet")
        
        # Get certificate directory
        cert_dir = os.path.join(settings.UPLOAD_DIR, "certificates", job_id)
        if not os.path.exists(cert_dir):
            raise HTTPException(status_code=404, detail="Certificate directory not found")
        
        # Create streaming ZIP response
        zip_response = await create_streaming_zip_from_directory(
            directory_path=cert_dir,
            filename=f"certificates_{job_id}.zip",
            pattern="*.png"
        )
        
        # Return streaming response
        return StreamingResponse(
            zip_response.stream_generator(),
            headers=zip_response.get_response_headers()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading certificates for job {job_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error downloading certificates: {str(e)}")


@router.get("/download/preview/{job_id}")
async def download_preview_certificates(job_id: str):
    """
    Download preview certificates as streaming ZIP
    """
    try:
        # Preview directory (job_id is ignored for preview, all previews in same dir)
        preview_dir = os.path.join(settings.UPLOAD_DIR, "preview")
        if not os.path.exists(preview_dir):
            raise HTTPException(status_code=404, detail="Preview directory not found")
        
        # Create streaming ZIP response
        zip_response = await create_streaming_zip_from_directory(
            directory_path=preview_dir,
            filename="preview_certificates.zip",
            pattern="*.png"
        )
        
        # Return streaming response
        return StreamingResponse(
            zip_response.stream_generator(),
            headers=zip_response.get_response_headers()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading preview certificates: {e}")
        raise HTTPException(status_code=500, detail=f"Error downloading preview certificates: {str(e)}")


@router.get("/download/{filename}")
async def download_legacy_certificates(filename: str):
    """
    Legacy download endpoint for backward compatibility
    Downloads generated certificate bundle (non-streaming)
    """
    try:
        if not filename.endswith(".zip"):
            raise HTTPException(status_code=400, detail="Invalid file type")

        safe_name = os.path.basename(filename)
        if safe_name != filename:
            raise HTTPException(status_code=400, detail="Invalid file name")

        file_path = os.path.join(settings.UPLOAD_DIR, "certificates", safe_name)

        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Download file not found")

        return FileResponse(
            file_path,
            media_type="application/zip",
            filename=safe_name
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error downloading certificates: {e}")
        raise HTTPException(status_code=500, detail=f"Error downloading certificates: {str(e)}")
