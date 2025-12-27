import os
import asyncio
import logging
from typing import List, Dict
from app.services.email_service import EmailService
from app.services.job_service import JobService

# Fix for macOS fork() issue - MUST be before any imports
os.environ['OBJC_DISABLE_INITIALIZE_FORK_SAFETY'] = 'YES'

logger = logging.getLogger(__name__)

def send_email_batch_task(
    job_id: str,
    access_token: str,
    recipients: List[Dict[str, str]],
    certificates_dir: str,
    subject: str,
    body_template: str,
    event_name: str = None
):
    """
    Background task for sending certificate emails
    """
    try:
        logger.info(f"Starting email batch task for job {job_id}")
        
        # Warm-up logic: limit batch size for new senders
        total_recipients = len(recipients)
        max_batch_size = total_recipients  # Default to full batch
        
        # For new senders or first-time batches, limit to 10 recipients
        if total_recipients > 10:
            # Simple heuristic - limit to 10 for potential first-time senders
            max_batch_size = 10
            logger.warning(f"Warm-up mode: Limiting batch to {max_batch_size} recipients for potential first-time sender")
        
        # Limit recipients if warm-up is active
        if len(recipients) > max_batch_size:
            recipients = recipients[:max_batch_size]
            logger.info(f"Warm-up: Processing {max_batch_size} recipients out of {total_recipients} total")
        
        # Update job with actual recipient count
        JobService.create_job(job_id, len(recipients), {
            "type": "email_batch",
            "recipients_count": len(recipients),
            "original_total": total_recipients,
            "warmup_limited": len(recipients) < total_recipients
        })
        
        # Send emails using the EmailService
        result = asyncio.run(EmailService.send_certificates_batch(
            access_token=access_token,
            recipients=recipients,
            certificates_dir=certificates_dir,
            subject=subject,
            body_template=body_template,
            event_name=event_name
        ))
        
        # Update job progress for each result
        for detail in result.get('details', []):
            if detail.get('success'):
                JobService.update_progress(job_id, True)
            else:
                JobService.update_progress(
                    job_id, 
                    False, 
                    detail.get('error', 'Unknown error'),
                    item_id=detail.get('recipient_email')
                )
        
        logger.info(f"Email batch task completed for job {job_id}: {result['successful']} sent, {result['failed']} failed")
        
    except Exception as e:
        logger.error(f"Fatal error in email batch task: {e}")
        JobService.update_progress(job_id, False, f"Fatal error: {str(e)}")
