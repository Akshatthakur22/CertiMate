from fastapi import APIRouter
from datetime import datetime

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/")
async def health_check():
    """
    Health check endpoint
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "CertiMate API"
    }


@router.get("/ready")
async def readiness_check():
    """
    Readiness check endpoint
    """
    # TODO: Add checks for required services/dependencies
    return {
        "status": "ready",
        "timestamp": datetime.utcnow().isoformat()
    }


@router.get("/live")
async def liveness_check():
    """
    Liveness check endpoint
    """
    return {
        "status": "alive",
        "timestamp": datetime.utcnow().isoformat()
    }
