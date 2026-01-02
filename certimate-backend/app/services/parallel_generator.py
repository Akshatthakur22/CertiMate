"""
Async certificate generation with controlled concurrency
Handles parallel processing while preventing memory explosion
"""

import asyncio
import os
import uuid
import logging
from typing import List, Dict, Optional, Any
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageDraw, ImageFont
import io

from app.config import settings
from app.services.job_service import JobService
from app.services.csv_service import CSVService
from app.services.placeholder_advanced import AdvancedPlaceholderService
from app.services.pdf_service import PDFService
from app.services.zip_service import ZIPService
from app.utils.template_cache import get_cached_template_metadata

logger = logging.getLogger(__name__)

# Configuration for parallel processing
MAX_CONCURRENT_GENERATIONS = 8   # Reduced for better stability
MEMORY_CLEANUP_THRESHOLD = 15    # Even smaller batches for memory safety


class ParallelCertificateGenerator:
    """
    Handles parallel certificate generation with memory management
    """
    
    def __init__(self, max_concurrent: int = MAX_CONCURRENT_GENERATIONS):
        """
        Initialize parallel generator
        
        Args:
            max_concurrent: Maximum number of concurrent certificate generations
        """
        self.max_concurrent = max_concurrent
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.executor = ThreadPoolExecutor(max_workers=max_concurrent)
        self.template_cache = {}
        
    async def generate_batch_certificates(
        self, 
        job_id: str, 
        template_path: str, 
        csv_path: str, 
        mapping: Dict = None, 
        placeholder_text: str = "{{NAME}}"
    ) -> Dict[str, Any]:
        """
        Generate certificates in parallel with memory management
        
        Args:
            job_id: Job identifier for tracking
            template_path: Path to template file
            csv_path: Path to CSV data file
            mapping: Column mapping configuration
            placeholder_text: Default placeholder text
            
        Returns:
            Dictionary with generation results
        """
        try:
            logger.info(f"Starting parallel generation for job {job_id}")
            
            # Load data and prepare template
            csv_data = CSVService.read_csv(csv_path)
            if not csv_data:
                raise ValueError("No data found in CSV file")
            
            # Get cached placeholder data
            placeholders = AdvancedPlaceholderService.detect_all_placeholders(template_path)
            if not placeholders:
                raise ValueError("No placeholders detected in template")
            
            # Prepare template image (load once, reuse for all certificates)
            template_image = await self._load_template_image(template_path)
            
            # Prepare column mapping
            mapping = mapping or {}
            columns = list(csv_data[0].keys()) if csv_data else []
            normalized_columns = {
                AdvancedPlaceholderService._normalize_key(col): col
                for col in columns
            }
            
            # Create output directory
            output_dir = os.path.join(settings.UPLOAD_DIR, "certificates", job_id)
            os.makedirs(output_dir, exist_ok=True)
            
            # Generate certificates in parallel batches
            total_items = len(csv_data)
            generated_files = []
            
            # Process in smaller batches to control memory more aggressively
            batch_size = MEMORY_CLEANUP_THRESHOLD
            for batch_start in range(0, total_items, batch_size):
                batch_end = min(batch_start + batch_size, total_items)
                batch_data = csv_data[batch_start:batch_end]
                
                logger.info(f"Processing batch {batch_start//batch_size + 1}: items {batch_start}-{batch_end-1}")
                
                # Generate batch in parallel with smaller sub-batches
                sub_batch_size = min(3, len(batch_data))  # Very small sub-batches for stability
                sub_batch_results = []
                
                for sub_start in range(0, len(batch_data), sub_batch_size):
                    sub_end = min(sub_start + sub_batch_size, len(batch_data))
                    sub_batch = batch_data[sub_start:sub_end]
                    
                    # Create tasks for sub-batch
                    sub_tasks = []
                    for idx, row in enumerate(sub_batch):
                        task_idx = batch_start + sub_start + idx
                        task = self._generate_single_certificate(
                            job_id=job_id,
                            row=row,
                            row_index=task_idx,
                            template_image=template_image,
                            placeholders=placeholders,
                            normalized_columns=normalized_columns,
                            output_dir=output_dir,
                            mapping=mapping
                        )
                        sub_tasks.append(task)
                    
                    # Wait for sub-batch completion
                    sub_batch_results = await asyncio.gather(*sub_tasks, return_exceptions=True)
                    
                    # Process sub-batch results immediately
                    for result in sub_batch_results:
                        if isinstance(result, Exception):
                            logger.error(f"Certificate generation failed: {result}")
                            JobService.update_progress(job_id, False, str(result))
                        elif result:
                            generated_files.append(result)
                    
                    # Force cleanup after each sub-batch
                    await self._cleanup_memory()
                    del sub_batch_results  # Explicit cleanup
                    del sub_tasks
            
            # Create streaming ZIP instead of in-memory ZIP
            from app.services.streaming_zip import create_streaming_zip_from_directory
            zip_response = await create_streaming_zip_from_directory(
                directory_path=output_dir,
                filename=f"certificates_{job_id}.zip",
                pattern="*.png"
            )
            
            result = {
                "job_id": job_id,
                "total_items": total_items,
                "generated_files": len(generated_files),
                "output_dir": output_dir,
                "streaming_zip": {
                    "available": True,
                    "download_url": f"/api/generate/download/{job_id}",
                    "filename": f"certificates_{job_id}.zip"
                }
            }

            # Persist download info so the status endpoint can expose it to the client
            JobService.set_download_info(
                job_id=job_id,
                download_url=result["streaming_zip"]["download_url"],
                filename=result["streaming_zip"]["filename"],
                output_dir=output_dir
            )
            
            logger.info(f"Parallel generation completed for job {job_id}: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Parallel generation failed for job {job_id}: {e}")
            JobService.update_progress(job_id, False, str(e))
            raise
    
    async def _load_template_image(self, template_path: str) -> Image.Image:
        """
        Load template image asynchronously
        
        Args:
            template_path: Path to template file
            
        Returns:
            PIL Image object
        """
        loop = asyncio.get_event_loop()
        
        def load_image():
            if template_path.lower().endswith('.pdf'):
                images = PDFService.pdf_to_images(template_path)
                if images:
                    img = images[0]
                    # Ensure fully loaded and RGB for thread-safe copies
                    if img.mode != "RGB":
                        img = img.convert("RGB")
                    img.load()
                    return img
                return None
            else:
                img = Image.open(template_path)
                # Force-load and normalize mode to avoid concurrent read issues
                img.load()
                if img.mode != "RGB":
                    img = img.convert("RGB")
                return img
        
        return await loop.run_in_executor(self.executor, load_image)
    
    async def _generate_single_certificate(
        self,
        job_id: str,
        row: Dict[str, str],
        row_index: int,
        template_image: Image.Image,
        placeholders: Dict[str, Any],
        normalized_columns: Dict[str, str],
        output_dir: str,
        mapping: Dict[str, str]
    ) -> Optional[str]:
        """
        Generate a single certificate with concurrency control
        
        Args:
            job_id: Job identifier
            row: CSV row data
            row_index: Row index for tracking
            template_image: Template PIL Image
            placeholders: Detected placeholder positions
            normalized_columns: Normalized column names
            output_dir: Output directory
            mapping: Column mapping configuration
            
        Returns:
            Path to generated certificate or None if failed
        """
        async with self.semaphore:  # Control concurrency
            try:
                loop = asyncio.get_event_loop()
                
                def generate_certificate():
                    # Resolve name column
                    name_column = mapping.get('name')
                    if not name_column:
                        # Use first column as fallback
                        name_column = list(row.keys())[0] if row else None
                    
                    if not name_column or name_column not in row:
                        raise ValueError(f"Name column not found: {name_column}")
                    
                    name_value = row[name_column].strip()
                    if not name_value:
                        raise ValueError("Empty name value")
                    
                    # Create certificate image
                    result_image = template_image.copy()
                    
                    # Process all placeholders
                    for placeholder_name, placeholder_info in placeholders.items():
                        csv_column = normalized_columns.get(placeholder_name)
                        
                        if not csv_column and placeholder_info.get('raw_key'):
                            raw_normalized = AdvancedPlaceholderService._normalize_key(placeholder_info['raw_key'])
                            csv_column = normalized_columns.get(raw_normalized)
                        
                        if csv_column and csv_column in row:
                            value = row[csv_column].strip()
                            if value:
                                # Render text on image
                                self._render_text_on_image(
                                    result_image, 
                                    value, 
                                    placeholder_info
                                )
                    
                    # Save certificate
                    safe_name = "".join(c for c in name_value if c.isalnum() or c in (' ', '-', '_')).rstrip()
                    filename = f"certificate_{row_index:04d}_{safe_name}.png"
                    output_path = os.path.join(output_dir, filename)
                    
                    result_image.save(output_path, "PNG", optimize=True)
                    result_image.close()  # Free memory immediately
                    
                    return output_path
                
                # Execute in thread pool to avoid blocking event loop
                output_path = await loop.run_in_executor(self.executor, generate_certificate)
                
                # Update progress
                JobService.update_progress(job_id, True, item_id=f"row_{row_index}")
                
                logger.debug(f"Generated certificate: {output_path}")
                return output_path
                
            except Exception as e:
                logger.error(f"Failed to generate certificate for row {row_index}: {e}")
                JobService.update_progress(job_id, False, str(e), item_id=f"row_{row_index}")
                return None
    
    def _render_text_on_image(self, image: Image.Image, text: str, placeholder_info: Dict[str, Any]):
        """
        Render text on image at placeholder position
        
        Args:
            image: PIL Image to render on
            text: Text to render
            placeholder_info: Placeholder position and styling info
        """
        try:
            draw = ImageDraw.Draw(image)
            
            # Get position and dimensions
            left = int(placeholder_info.get("left", 0))
            top = int(placeholder_info.get("top", 0))
            width = int(placeholder_info.get("width", 100))
            height = int(placeholder_info.get("height", 30))
            
            # Use default font (simplified approach)
            try:
                font = ImageFont.load_default()
            except:
                font = None
            
            # Calculate text position (center in placeholder box)
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]
            
            text_x = left + (width - text_width) // 2
            text_y = top + (height - text_height) // 2
            
            # Draw text
            draw.text((text_x, text_y), text, fill="black", font=font)
            
        except Exception as e:
            logger.error(f"Error rendering text: {e}")
            # Continue without text rendering rather than failing
    
    async def _cleanup_memory(self):
        """
        Aggressive memory cleanup to prevent buildup
        """
        import gc
        import psutil
        import os
        
        # Get current process
        process = psutil.Process(os.getpid())
        memory_info = process.memory_info()
        
        logger.debug(f"Memory usage before cleanup: {memory_info.rss / 1024 / 1024:.1f} MB")
        
        # Force garbage collection multiple times
        for _ in range(3):
            gc.collect()
            await asyncio.sleep(0.001)  # Small delay
        
        # Log memory after cleanup
        memory_info_after = process.memory_info()
        logger.debug(f"Memory usage after cleanup: {memory_info_after.rss / 1024 / 1024:.1f} MB")
    
    async def __aenter__(self):
        """Async context manager entry"""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit - cleanup resources"""
        self.executor.shutdown(wait=True)
        await self._cleanup_memory()


# Global instance for reuse
async def generate_certificates_parallel(
    job_id: str,
    template_path: str,
    csv_path: str,
    mapping: Dict = None,
    placeholder_text: str = "{{NAME}}",
    max_concurrent: int = MAX_CONCURRENT_GENERATIONS
) -> Dict[str, Any]:
    """
    High-level function for parallel certificate generation
    
    Args:
        job_id: Job identifier
        template_path: Path to template file
        csv_path: Path to CSV data file
        mapping: Column mapping configuration
        placeholder_text: Default placeholder text
        max_concurrent: Maximum concurrent generations
        
    Returns:
        Generation results
    """
    # Create a fresh generator per job to avoid executor reuse after shutdown
    async with ParallelCertificateGenerator(max_concurrent) as generator:
        return await generator.generate_batch_certificates(
            job_id=job_id,
            template_path=template_path,
            csv_path=csv_path,
            mapping=mapping,
            placeholder_text=placeholder_text
        )
