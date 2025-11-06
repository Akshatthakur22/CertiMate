"""
Routes for sending certificates via email
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr
from typing import List, Dict, Optional
import logging
import asyncio
from app.services.email_service import EmailService
from app.config import settings
import os

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/send", tags=["send"])


class EmailRecipient(BaseModel):
    """Schema for email recipient"""
    email: EmailStr
    name: str
    certificate_filename: Optional[str] = None


class EmailSendRequest(BaseModel):
    """Request schema for sending certificates"""
    access_token: str
    recipients: List[EmailRecipient]
    subject: Optional[str] = "Your Certificate is Ready!"
    body_template: Optional[str] = None
    certificates_dir: Optional[str] = "uploads/certificates"
    event_name: Optional[str] = None  # For {{event}} placeholder


@router.post("/email")
async def send_certificates_email(request: EmailSendRequest):
    """
    Send certificates to multiple recipients via Gmail API
    
    Args:
        request: EmailSendRequest with OAuth token, recipients, and customization
        
    Returns:
        Dictionary with sending results
        
    Example request body:
    {
        "access_token": "ya29.a0AfB_by...",
        "recipients": [
            {
                "email": "recipient@example.com",
                "name": "John Doe",
                "certificate_filename": "certificate_1_John_Doe.png"
            }
        ],
        "subject": "Your Certificate is Ready!",
        "body_template": "Hi {{name}}, Your certificate is attached."
    }
    """
    try:
        # Log incoming request for debugging
        logger.info(f"📧 Email send request received: {len(request.recipients or [])} recipients")
        
        # Validate required fields
        if not request.access_token:
            logger.error("Missing access_token in request")
            raise HTTPException(
                status_code=422,
                detail="access_token is required"
            )
        
        if not request.access_token.strip():
            logger.error("Empty access_token in request")
            raise HTTPException(
                status_code=422,
                detail="access_token cannot be empty"
            )
        
        # Validate recipients list
        if not request.recipients:
            logger.error("Missing or empty recipients list")
            raise HTTPException(
                status_code=400,
                detail="recipients list cannot be empty"
            )
        
        # Validate each recipient
        for idx, recipient in enumerate(request.recipients):
            if not recipient.email or not recipient.email.strip():
                logger.error(f"Recipient at index {idx} has invalid email")
                raise HTTPException(
                    status_code=422,
                    detail=f"recipient at index {idx} has invalid or missing email"
                )
            if not recipient.name or not recipient.name.strip():
                logger.error(f"Recipient at index {idx} has invalid name")
                raise HTTPException(
                    status_code=422,
                    detail=f"recipient at index {idx} has invalid or missing name"
                )
        
        # Set default body template if not provided
        if request.body_template is None:
            request.body_template = (
                "Hi {{name}},\n\n"
                "Congratulations! Your certificate is attached.\n\n"
                "Best regards,\nThe CertiMate Team"
            )
        
        # Validate certificates directory exists
        certificates_dir = request.certificates_dir
        if not os.path.exists(certificates_dir):
            raise HTTPException(
                status_code=404,
                detail=f"Certificates directory not found: {certificates_dir}"
            )
        
        logger.info(f"Sending certificates to {len(request.recipients)} recipients")
        
        # Convert Pydantic models to dicts for service
        recipients_list = [
            {
                'email': r.email,
                'name': r.name,
                'certificate_filename': r.certificate_filename
            }
            for r in request.recipients
        ]
        
        # Send certificates with custom subject and template
        results = await EmailService.send_certificates_batch(
            access_token=request.access_token,
            recipients=recipients_list,
            certificates_dir=certificates_dir,
            subject=request.subject or "Your Certificate is Ready!",
            body_template=request.body_template or (
                "Hi {{name}},\n\n"
                "Congratulations! Your certificate is attached.\n\n"
                "Best regards,\nThe CertiMate Team"
            ),
            event_name=request.event_name  # For {{event}} placeholder
        )
        
        # Calculate success rate
        success_rate = (results['successful'] / results['total']) * 100 if results['total'] > 0 else 0
        
        response = {
            "message": f"Sent certificates to {results['successful']}/{results['total']} recipients",
            "total": results['total'],
            "successful": results['successful'],
            "failed": results['failed'],
            "success_rate": round(success_rate, 2),
            "details": results['details']
        }
        
        # Return 207 Multi-Status if some failed, 200 if all succeeded
        status_code = 207 if results['failed'] > 0 else 200
        
        return JSONResponse(
            content=response,
            status_code=status_code
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in send_certificates_email: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error sending certificates: {str(e)}"
        )


class EmailPreviewRequest(BaseModel):
    """Request schema for email preview"""
    subject: str
    body_template: str
    recipient_name: str = "John Doe"
    event_name: Optional[str] = None


@router.post("/email/preview")
async def preview_email(request: EmailPreviewRequest):
    """
    Preview how an email will look with personalized content
    
    Args:
        request: EmailPreviewRequest with subject, body_template, and sample data
        
    Returns:
        Dictionary with preview subject and body
    """
    try:
        # Build personalized subject
        preview_subject = request.subject.replace('{{name}}', request.recipient_name)
        if request.event_name:
            preview_subject = preview_subject.replace('{{event}}', request.event_name)
        else:
            preview_subject = preview_subject.replace('{{event}}', 'Hackathon 2025')  # Default preview
        
        # Build personalized body
        preview_body = request.body_template.replace('{{name}}', request.recipient_name)
        if request.event_name:
            preview_body = preview_body.replace('{{event}}', request.event_name)
        else:
            preview_body = preview_body.replace('{{event}}', 'Hackathon 2025')  # Default preview
        
        logger.info("Email preview generated successfully")
        
        return {
            "success": True,
            "preview": {
                "subject": preview_subject,
                "body": preview_body,
                "recipient_name": request.recipient_name,
                "event_name": request.event_name or "Hackathon 2025"
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating email preview: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "Preview generation error",
                "details": str(e)
            }
        )


@router.post("/email/test")
async def send_test_email(request: Dict):
    """
    Send a test email to verify Gmail API integration
    
    Args:
        request: Dictionary with access_token and test_email
        
    Returns:
        Success message or error
    """
    try:
        access_token = request.get('access_token')
        test_email = request.get('test_email')
        
        if not access_token:
            raise HTTPException(
                status_code=400,
                detail="access_token is required"
            )
        
        if not test_email:
            raise HTTPException(
                status_code=400,
                detail="test_email is required"
            )
        
        # Build Gmail service to test authentication
        service = await EmailService.build_gmail_service(access_token)
        
        # Get user profile to verify authentication
        loop = asyncio.get_event_loop()
        profile = await loop.run_in_executor(
            None,
            lambda: service.users().getProfile(userId='me').execute()
        )
        
        user_email = profile.get('emailAddress')
        
        logger.info(f"Gmail API authentication successful for: {user_email}")
        
        return {
            "success": True,
            "message": "Gmail API authentication successful",
            "authenticated_email": user_email
        }
        
    except Exception as e:
        logger.error(f"Test email failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Gmail API test failed: {str(e)}"
        )


@router.get("/health")
async def send_health_check():
    """
    Health check for send service
    """
    return {
        "status": "healthy",
        "service": "Email Send Service",
        "gmail_api_configured": bool(settings.GOOGLE_CLIENT_ID),
        "features": [
            "Gmail API integration",
            "OAuth 2.0 authentication",
            "Batch email sending",
            "Attachment support"
        ]
    }

