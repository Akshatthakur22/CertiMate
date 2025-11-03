from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime


class CertificateGenerateRequest(BaseModel):
    """Request schema for certificate generation"""
    template_path: str
    data: Dict[str, Any]
    output_format: Optional[str] = "pdf"
    custom_fields: Optional[Dict[str, Any]] = None


class CertificateResponse(BaseModel):
    """Response schema for certificate"""
    certificate_id: str
    file_path: str
    generated_at: datetime
    status: str


class HealthResponse(BaseModel):
    """Health check response schema"""
    status: str
    timestamp: str
    service: Optional[str] = None


class FileUploadResponse(BaseModel):
    """File upload response schema"""
    message: str
    filename: str
    file_path: str
