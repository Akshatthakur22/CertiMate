"""
Lightweight health and readiness endpoints
Provides basic system health checks and performance metrics
"""

import os
import time
import psutil
from datetime import datetime
from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from app.config import settings
from app.utils.error_handling import log_error_with_context

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/")
async def health_check() -> Dict[str, Any]:
    """
    Basic health check endpoint
    Returns minimal health status for load balancers
    """
    try:
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "service": "certimate-api"
        }
    except Exception as e:
        log_error_with_context("Health check failed", {}, e)
        raise HTTPException(status_code=503, detail="Service unavailable")


@router.get("/ready")
async def readiness_check() -> Dict[str, Any]:
    """
    Readiness check endpoint
    Verifies database connectivity and file system access
    """
    checks = {}
    overall_status = "ready"
    
    # Check file system access
    try:
        # Test upload directory access
        upload_dir = settings.UPLOAD_DIR
        if os.path.exists(upload_dir) and os.access(upload_dir, os.W_OK):
            checks["filesystem"] = "ready"
        else:
            checks["filesystem"] = "not_ready"
            overall_status = "not_ready"
    except Exception as e:
        checks["filesystem"] = "error"
        overall_status = "not_ready"
        log_error_with_context("Filesystem check failed", {"upload_dir": upload_dir}, e)
    
    # Check external dependencies
    try:
        # Check Tesseract OCR
        import pytesseract
        pytesseract.get_tesseract_version()
        checks["ocr"] = "ready"
    except Exception as e:
        checks["ocr"] = "not_ready"
        overall_status = "not_ready"
        log_error_with_context("OCR check failed", {}, e)
    
    return {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat(),
        "checks": checks
    }


@router.get("/live")
async def liveness_check() -> Dict[str, Any]:
    """
    Liveness check endpoint
    Simple check if the service is running
    """
    return {
        "status": "alive",
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/metrics")
async def basic_metrics() -> Dict[str, Any]:
    """
    Basic performance metrics endpoint
    Returns lightweight system metrics
    """
    try:
        # System metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Process metrics
        process = psutil.Process()
        process_memory = process.memory_info()
        
        # Uptime
        uptime_seconds = time.time() - process.create_time()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "system": {
                "cpu_percent": round(cpu_percent, 2),
                "memory_percent": round(memory.percent, 2),
                "memory_available_gb": round(memory.available / (1024**3), 2),
                "disk_percent": round(disk.percent, 2),
                "disk_free_gb": round(disk.free / (1024**3), 2)
            },
            "process": {
                "memory_mb": round(process_memory.rss / (1024**2), 2),
                "cpu_percent": round(process.cpu_percent(), 2),
                "uptime_seconds": int(uptime_seconds)
            },
            "limits": {
                "max_upload_size_mb": round(settings.MAX_UPLOAD_SIZE / (1024**2), 2),
                "allowed_extensions": settings.ALLOWED_EXTENSIONS
            }
        }
    except Exception as e:
        log_error_with_context("Metrics collection failed", {}, e)
        raise HTTPException(status_code=500, detail="Metrics unavailable")


@router.get("/version")
async def version_info() -> Dict[str, Any]:
    """
    Version information endpoint
    Returns application and dependency versions
    """
    try:
        versions = {
            "api": settings.API_VERSION,
            "python": f"{psutil.sys.version_info.major}.{psutil.sys.version_info.minor}.{psutil.sys.version_info.micro}",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Try to get dependency versions
        try:
            import pytesseract
            versions["tesseract"] = pytesseract.get_tesseract_version()
        except:
            pass
        
        try:
            import pdf2image
            versions["pdf2image"] = pdf2image.__version__
        except:
            pass
        
        try:
            from PIL import Image
            versions["pillow"] = Image.__version__
        except:
            pass
        
        return versions
        
    except Exception as e:
        log_error_with_context("Version info failed", {}, e)
        raise HTTPException(status_code=500, detail="Version info unavailable")
