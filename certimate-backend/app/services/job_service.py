import os
import json
import time
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from app.config import settings

logger = logging.getLogger(__name__)

class JobService:
    """
    Service for managing file-based job state.
    Stores job data in /jobs/{job_id}/ directory.
    """
    
    JOBS_DIR = "jobs"
    
    @classmethod
    def _get_job_dir(cls, job_id: str) -> str:
        return os.path.join(cls.JOBS_DIR, job_id)
    
    @classmethod
    def create_job(cls, job_id: str, total_items: int, metadata: Dict = None) -> Dict:
        """Initialize a new job directory and status file"""
        job_dir = cls._get_job_dir(job_id)
        os.makedirs(job_dir, exist_ok=True)
        os.makedirs(os.path.join(job_dir, "results"), exist_ok=True)
        
        status = {
            "job_id": job_id,
            "status": "queued",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "total_items": total_items,
            "processed_items": 0,
            "successful_items": 0,
            "failed_items": 0,
            "metadata": metadata or {}
        }
        
        cls._save_status(job_id, status)
        cls._save_errors(job_id, [])
        
        return status
    
    @classmethod
    def update_progress(cls, job_id: str, success: bool = True, error: str = None, item_id: str = None):
        """Update job progress"""
        status = cls.get_job_status(job_id)
        if not status:
            return
            
        status["processed_items"] += 1
        status["updated_at"] = datetime.utcnow().isoformat()
        
        if success:
            status["successful_items"] += 1
        else:
            status["failed_items"] += 1
            if error:
                cls._append_error(job_id, {
                    "item_id": item_id,
                    "error": error,
                    "timestamp": datetime.utcnow().isoformat()
                })
        
        # Check if complete
        if status["processed_items"] >= status["total_items"]:
            status["status"] = "completed" if status["failed_items"] == 0 else "completed_with_errors"
        else:
            status["status"] = "processing"
            
        cls._save_status(job_id, status)
    
    @classmethod
    def get_job_status(cls, job_id: str) -> Optional[Dict]:
        """Get current job status"""
        job_dir = cls._get_job_dir(job_id)
        status_path = os.path.join(job_dir, "status.json")
        
        if not os.path.exists(status_path):
            return None
            
        try:
            with open(status_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading job status: {e}")
            return None

    @classmethod
    def get_job_errors(cls, job_id: str) -> List[Dict]:
        """Get list of errors for a job"""
        job_dir = cls._get_job_dir(job_id)
        errors_path = os.path.join(job_dir, "errors.json")
        
        if not os.path.exists(errors_path):
            return []
            
        try:
            with open(errors_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading job errors: {e}")
            return []

    @classmethod
    def _save_status(cls, job_id: str, status: Dict):
        job_dir = cls._get_job_dir(job_id)
        with open(os.path.join(job_dir, "status.json"), 'w') as f:
            json.dump(status, f, indent=2)

    @classmethod
    def _save_errors(cls, job_id: str, errors: List[Dict]):
        job_dir = cls._get_job_dir(job_id)
        with open(os.path.join(job_dir, "errors.json"), 'w') as f:
            json.dump(errors, f, indent=2)
            
    @classmethod
    def _append_error(cls, job_id: str, error: Dict):
        errors = cls.get_job_errors(job_id)
        errors.append(error)
        cls._save_errors(job_id, errors)
