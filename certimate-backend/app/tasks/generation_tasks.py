import os

# Fix for macOS fork() issue with OpenCV - MUST be before any imports
os.environ['OBJC_DISABLE_INITIALIZE_FORK_SAFETY'] = 'YES'

import logging
import uuid
from typing import Dict, Optional
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

        mapping = mapping or {}

        normalized_columns = {
            AdvancedPlaceholderService._normalize_key(col): col
            for col in df.columns
        }

        def resolve_column(column_name: Optional[str]) -> Optional[str]:
            if not column_name:
                return None
            normalized = AdvancedPlaceholderService._normalize_key(column_name)
            resolved = normalized_columns.get(normalized)
            if not resolved:
                logger.warning(
                    "Column '%s' from mapping not found. Available columns: %s",
                    column_name,
                    list(df.columns)
                )
            return resolved

        name_column = resolve_column(mapping.get('name')) or df.columns[0]
        if name_column not in df.columns:
            JobService.update_progress(job_id, False, f"Name column '{name_column}' not found in CSV")
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
            
        output_dir = os.path.join(settings.UPLOAD_DIR, "certificates", job_id)
        os.makedirs(output_dir, exist_ok=True)
        
        generated_files = []
        
        for idx, (_, row) in enumerate(df.iterrows()):
            try:
                row_dict = {col: str(row.get(col, "")) for col in df.columns}

                name_value = row_dict.get(name_column, "").strip()
                if not name_value:
                    logger.warning(f"Row {idx} has empty name, skipping")
                    JobService.update_progress(job_id, False, "Empty name", item_id=f"row_{idx}")
                    continue

                result_image = template_image.copy()
                for placeholder_name, placeholder_info in placeholders.items():
                    csv_column = normalized_columns.get(placeholder_name)

                    if not csv_column and placeholder_info.get('raw_key'):
                        raw_normalized = AdvancedPlaceholderService._normalize_key(placeholder_info['raw_key'])
                        csv_column = normalized_columns.get(raw_normalized)

                    if not csv_column:
                        logger.info(
                            "No matching CSV column for placeholder %s (available columns: %s)",
                            placeholder_name,
                            list(df.columns)
                        )
                        continue

                    value = row_dict.get(csv_column, "").strip()
                    if not value:
                        logger.info(
                            "Skipping placeholder %s: empty value in column '%s'",
                            placeholder_name,
                            csv_column
                        )
                        continue

                    bbox_current = placeholder_info.get('bbox', {})
                    if bbox_current:
                        result_image = PDFService.render_name_on_image(
                            result_image,
                            value,
                            bbox=bbox_current,
                            center=True
                        )

                # Save certificate image
                safe_name = "".join(c for c in name_value if c.isalnum() or c in (' ', '_', '-')).strip()
                filename = f"certificate_{idx + 1}_{safe_name.replace(' ', '_')}.png"
                output_path = os.path.join(output_dir, filename)
                result_image.save(output_path, "PNG")
                generated_files.append(output_path)
                
                # Update progress
                JobService.update_progress(job_id, True)
                
            except Exception as e:
                logger.error(f"Error generating certificate for row {idx}: {e}")
                JobService.update_progress(job_id, False, str(e), item_id=name_value or f"row_{idx}")
        
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
