from pydantic import BaseModel, Field, validator, EmailStr
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
import re


class OutputFormat(str, Enum):
    """Supported output formats"""
    PDF = "pdf"
    PNG = "png"
    JPEG = "jpeg"
    DOCX = "docx"

class CertificateGenerateRequest(BaseModel):
    """Request schema for certificate generation"""
    template_path: str = Field(..., min_length=1, description="Path to certificate template")
    data: Dict[str, Any] = Field(..., min_items=1, description="Certificate data")
    output_format: OutputFormat = Field(OutputFormat.PDF, description="Output format")
    custom_fields: Optional[Dict[str, Any]] = Field(default=None, description="Custom fields")
    
    @validator('template_path')
    def validate_template_path(cls, v):
        if not v.strip():
            raise ValueError('Template path cannot be empty')
        # Basic file extension validation
        allowed_extensions = ['.pdf', '.docx', '.png', '.jpg', '.jpeg']
        if not any(v.lower().endswith(ext) for ext in allowed_extensions):
            raise ValueError(f'Template must have one of these extensions: {allowed_extensions}')
        return v.strip()
    
    @validator('data')
    def validate_data(cls, v):
        if not isinstance(v, dict):
            raise ValueError('Data must be a dictionary')
        if not v:
            raise ValueError('Data cannot be empty')
        return v


class CertificateStatus(str, Enum):
    """Certificate generation status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class CertificateResponse(BaseModel):
    """Response schema for certificate"""
    certificate_id: str = Field(..., description="Unique certificate identifier")
    file_path: str = Field(..., description="Path to generated certificate file")
    generated_at: datetime = Field(..., description="Generation timestamp")
    status: CertificateStatus = Field(..., description="Generation status")
    file_size: Optional[int] = Field(default=None, description="File size in bytes")
    download_url: Optional[str] = Field(default=None, description="Download URL")
    error_message: Optional[str] = Field(default=None, description="Error message if failed")


class ServiceStatus(str, Enum):
    """Service health status"""
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    DEGRADED = "degraded"

class HealthResponse(BaseModel):
    """Health check response schema"""
    status: ServiceStatus = Field(..., description="Service health status")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Health check timestamp")
    service: Optional[str] = Field(default="certimate-api", description="Service name")
    version: Optional[str] = Field(default="1.0.0", description="Service version")
    uptime: Optional[float] = Field(default=None, description="Service uptime in seconds")
    checks: Optional[Dict[str, Any]] = Field(default=None, description="Detailed health checks")


class FileUploadResponse(BaseModel):
    """File upload response schema"""
    message: str = Field(..., description="Upload status message")
    filename: str = Field(..., description="Uploaded filename")
    file_path: str = Field(..., description="File storage path")
    file_size: int = Field(..., description="File size in bytes")
    file_type: str = Field(..., description="MIME type")
    upload_timestamp: datetime = Field(default_factory=datetime.utcnow, description="Upload timestamp")
    checksum: Optional[str] = Field(default=None, description="File checksum for integrity")

class JobStatus(str, Enum):
    """Background job status"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class JobResponse(BaseModel):
    """Job status response schema"""
    job_id: str = Field(..., description="Unique job identifier")
    status: JobStatus = Field(..., description="Job status")
    created_at: datetime = Field(..., description="Job creation timestamp")
    started_at: Optional[datetime] = Field(default=None, description="Job start timestamp")
    completed_at: Optional[datetime] = Field(default=None, description="Job completion timestamp")
    progress: Optional[float] = Field(default=0.0, ge=0.0, le=100.0, description="Progress percentage")
    total_items: Optional[int] = Field(default=None, description="Total items to process")
    processed_items: Optional[int] = Field(default=None, description="Processed items count")
    result: Optional[Dict[str, Any]] = Field(default=None, description="Job result data")
    error_message: Optional[str] = Field(default=None, description="Error message if failed")

class EmailSendRequest(BaseModel):
    """Email sending request schema"""
    recipients: List[EmailStr] = Field(..., min_items=1, max_items=1000, description="List of recipient emails (auto-batched if >100)")
    subject: str = Field(..., min_length=1, max_length=200, description="Email subject")
    body_template: str = Field(..., min_length=1, description="Email body template")
    attachments: Optional[List[str]] = Field(default=None, description="List of attachment file paths")
    access_token: str = Field(..., description="Email service access token")
    batch_delay: Optional[int] = Field(default=30, ge=0, le=300, description="Delay between batches in seconds")
    
    @validator('recipients')
    def validate_and_batch_recipients(cls, v):
        if len(v) > 1000:
            raise ValueError('Cannot send to more than 1000 recipients at once')
        if len(v) <= 100:
            return [v]  # Single batch
        # Auto-split into batches of 100
        batches = [v[i:i+100] for i in range(0, len(v), 100)]
        return batches

class EmailSendResponse(BaseModel):
    """Email sending response schema"""
    job_id: str = Field(..., description="Background job ID")
    recipients_count: int = Field(..., description="Total number of recipients")
    batch_count: int = Field(..., description="Number of batches created")
    estimated_time: Optional[int] = Field(default=None, description="Estimated processing time in seconds")
    message: str = Field(..., description="Status message")
    batch_details: Optional[List[Dict[str, Any]]] = Field(default=None, description="Details of each batch")

class ErrorResponse(BaseModel):
    """Standard error response schema"""
    error: str = Field(..., description="Error type")
    message: str = Field(..., description="Error description")
    details: Optional[Dict[str, Any]] = Field(default=None, description="Additional error details")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Error timestamp")
    request_id: Optional[str] = Field(default=None, description="Request tracking ID")

class PaginationParams(BaseModel):
    """Pagination parameters schema"""
    page: int = Field(default=1, ge=1, description="Page number")
    size: int = Field(default=20, ge=1, le=100, description="Page size")
    
    @property
    def offset(self) -> int:
        return (self.page - 1) * self.size

class PaginatedResponse(BaseModel):
    """Paginated response schema"""
    items: List[Any] = Field(..., description="List of items")
    total: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    pages: int = Field(..., description="Total number of pages")
    has_next: bool = Field(..., description="Has next page")
    has_prev: bool = Field(..., description="Has previous page")
