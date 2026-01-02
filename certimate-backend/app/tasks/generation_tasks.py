import os
import asyncio
import logging
import uuid
from typing import Dict, Optional
from app.services.job_service import JobService
from app.services.csv_service import CSVService
from app.services.placeholder_advanced import AdvancedPlaceholderService
from app.services.parallel_generator import generate_certificates_parallel
from app.config import settings

logger = logging.getLogger(__name__)

async def generate_batch_task_async(job_id: str, template_path: str, csv_path: str, mapping: Dict = None, placeholder_text: str = "{{NAME}}"):
    """
    Async background task for batch certificate generation with parallel processing
    """
    try:
        logger.info(f"Starting parallel batch generation task for job {job_id}")
        
        # Validate inputs
        if not os.path.exists(template_path):
            raise FileNotFoundError(f"Template not found: {template_path}")
        if not os.path.exists(csv_path):
            raise FileNotFoundError(f"CSV not found: {csv_path}")
        
        # Get CSV data to determine total items
        csv_data = CSVService.read_csv(csv_path)
        total_items = len(csv_data)
        
        if total_items == 0:
            raise ValueError("CSV file is empty")
        
        # Update job with correct total
        JobService.create_job(job_id, total_items, {
            "template": os.path.basename(template_path),
            "csv": os.path.basename(csv_path),
            "parallel": True
        })
        
        # Generate certificates in parallel
        result = await generate_certificates_parallel(
            job_id=job_id,
            template_path=template_path,
            csv_path=csv_path,
            mapping=mapping,
            placeholder_text=placeholder_text,
            max_concurrent=8  # Safe concurrency limit
        )
        
        logger.info(f"Parallel batch generation completed for job {job_id}: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Parallel batch generation failed for job {job_id}: {e}")
        JobService.update_progress(job_id, False, str(e))
        raise


def generate_batch_task(job_id: str, template_path: str, csv_path: str, mapping: Dict = None, placeholder_text: str = "{{NAME}}"):
    """
    Synchronous wrapper for async batch generation task
    Maintains compatibility with existing task queue system
    """
    try:
        # Always create and manage a dedicated event loop for this thread
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            return loop.run_until_complete(
                generate_batch_task_async(job_id, template_path, csv_path, mapping, placeholder_text)
            )
        finally:
            loop.close()
            asyncio.set_event_loop(None)
    except Exception as e:
        logger.error(f"Batch generation task failed for job {job_id}: {e}")
        JobService.update_progress(job_id, False, str(e))
        raise
