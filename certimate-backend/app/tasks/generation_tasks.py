import os

# Fix for macOS fork() issue with OpenCV - MUST be before any imports
os.environ['OBJC_DISABLE_INITIALIZE_FORK_SAFETY'] = 'YES'

import logging
import uuid
from typing import List, Optional, Dict
from app.services.job_service import JobService
from app.services.pdf_service import PDFService
from app.services.csv_service import CSVService
from app.services.placeholder_advanced import AdvancedPlaceholderService
from app.services.zip_service import ZIPService
from app.config import settings

logger = logging.getLogger(__name__)

def generate_batch_task(job_id: str, template_path: str, csv_path: str, mapping: Dict = None, placeholder_text: str = "{{NAME}}"):
    """
    Background task for batch certificate generation
    """
    try:
        logger.info(f"Starting batch generation task for job {job_id}")
        
        # Get data from CSV
        df = CSVService.read_csv(csv_path)
        
        if mapping:
            # Extract names using mapped column
            if mapping.get('name') not in df.columns:
                JobService.update_progress(job_id, False, f"Column '{mapping.get('name')}' not found in CSV")
                return
            
            names = df[mapping.get('name')].dropna().astype(str).str.strip().tolist()
            names = [n for n in names if n]
        else:
            # Fallback to auto-detection
            names = CSVService.get_names_from_csv(csv_path)
            
        if not names:
            JobService.update_progress(job_id, False, "No names found in CSV")
            return
            
        # Update total items in job
        # (Note: Job was created with estimated total, we can update if needed or just track progress)
        
        # Find placeholder bounding box
        placeholders = AdvancedPlaceholderService.detect_all_placeholders(template_path)
        # Look for the specific placeholder or fallback to NAME
        target_placeholder = placeholder_text.replace("{{", "").replace("}}", "")
        bbox = None
        
        if target_placeholder in placeholders:
            bbox = placeholders[target_placeholder]
        elif "NAME" in placeholders:
            bbox = placeholders["NAME"]
            
        # Convert template to image if it's a PDF
        if template_path.lower().endswith('.pdf'):
            template_images = PDFService.pdf_to_images(template_path)
            template_image = template_images[0]
        else:
            from PIL import Image
            template_image = Image.open(template_path)
            
        # Generate certificates
        output_dir = os.path.join(settings.UPLOAD_DIR, "certificates", job_id)
        os.makedirs(output_dir, exist_ok=True)
        
        generated_files = []
        
        for idx, name in enumerate(names):
            try:
                # Render name on template
                result_image = PDFService.render_name_on_image(
                    template_image,
                    name,
                    bbox=bbox,
                    center=True
                )
                
                # Save certificate image
                filename = f"certificate_{idx + 1}_{name.replace(' ', '_')}.png"
                output_path = os.path.join(output_dir, filename)
                result_image.save(output_path, "PNG")
                generated_files.append(output_path)
                
                # Update progress
                JobService.update_progress(job_id, True)
                
            except Exception as e:
                logger.error(f"Error generating certificate for {name}: {e}")
                JobService.update_progress(job_id, False, str(e), item_id=name)
        
        if generated_files:
            # Create ZIP
            zip_path = os.path.join(settings.UPLOAD_DIR, "certificates", f"{job_id}.zip")
            ZIPService.create_zip(generated_files, zip_path)
            
            # Update job metadata with download URL
            status = JobService.get_job_status(job_id)
            status["download_url"] = f"/api/generate/download/{os.path.basename(zip_path)}"
            JobService._save_status(job_id, status)
            
        logger.info(f"Batch generation task completed for job {job_id}")
        
    except Exception as e:
        logger.error(f"Fatal error in batch generation task: {e}")
        # Mark remaining items as failed? Or just log fatal error
        JobService.update_progress(job_id, False, f"Fatal error: {str(e)}")
