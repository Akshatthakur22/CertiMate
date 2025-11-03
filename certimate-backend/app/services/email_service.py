"""
Email service for sending certificates via Gmail API
Handles OAuth token authentication, message creation, and attachment sending
"""
import base64
import os
import logging
from typing import List, Dict, Tuple, Optional
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google.auth.exceptions import RefreshError
import asyncio

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via Gmail API with OAuth"""
    
    @staticmethod
    async def build_gmail_service(access_token: str):
        """
        Build Gmail service instance using OAuth access token
        
        Args:
            access_token: OAuth 2.0 access token from frontend
            
        Returns:
            Gmail API service instance
            
        Raises:
            Exception: If token is invalid or service cannot be built
        """
        try:
            # Create credentials from the access token
            credentials = Credentials(token=access_token)
            
            # Build Gmail service
            service = build('gmail', 'v1', credentials=credentials)
            logger.info("Gmail service built successfully")
            
            return service
            
        except Exception as e:
            logger.error(f"Error building Gmail service: {e}")
            raise Exception(f"Failed to authenticate with Gmail: {str(e)}")
    
    @staticmethod
    def create_message_with_attachment(
        to: str,
        subject: str,
        body: str,
        attachment_path: str,
        sender_email: str = None
    ) -> Dict:
        """
        Create an email message with attachment
        
        Args:
            to: Recipient email address
            subject: Email subject
            body: Email body text
            attachment_path: Path to attachment file
            sender_email: Optional sender email address
            
        Returns:
            Dictionary with 'raw' base64 encoded message
            
        Raises:
            Exception: If attachment file not found or error creating message
        """
        try:
            # Create multipart message
            message = MIMEMultipart()
            
            # Set headers
            message['to'] = to
            message['subject'] = subject
            if sender_email:
                message['from'] = sender_email
            
            # Add body
            msgBody = MIMEText(body, 'plain')
            message.attach(msgBody)
            
            # Add attachment
            if attachment_path and os.path.exists(attachment_path):
                attachment_name = os.path.basename(attachment_path)
                
                with open(attachment_path, "rb") as attachment:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(attachment.read())
                
                encoders.encode_base64(part)
                part.add_header(
                    'Content-Disposition',
                    f'attachment; filename= {attachment_name}'
                )
                message.attach(part)
                logger.info(f"Added attachment: {attachment_name}")
            
            # Encode message
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
            
            return {'raw': raw_message}
            
        except FileNotFoundError:
            error_msg = f"Attachment file not found: {attachment_path}"
            logger.error(error_msg)
            raise Exception(error_msg)
        except Exception as e:
            error_msg = f"Error creating message: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)
    
    @staticmethod
    async def send_message(
        service,
        message: Dict
    ) -> str:
        """
        Send an email message via Gmail API
        
        Args:
            service: Gmail API service instance
            message: Message dictionary with 'raw' field
            
        Returns:
            Message ID of sent email
            
        Raises:
            Exception: If sending fails
        """
        try:
            # Define a synchronous function that calls the Gmail API
            def _send_email():
                return service.users().messages().send(userId='me', body=message).execute()
            
            # Run in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, _send_email)
            
            message_id = result.get('id')
            logger.info(f"Email sent successfully. Message ID: {message_id}")
            
            return message_id
            
        except Exception as e:
            error_msg = f"Error sending email: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)
    
    @staticmethod
    async def send_certificate_email(
        access_token: str,
        recipient_email: str,
        recipient_name: str,
        certificate_path: str,
        subject: str = "Your Certificate is Ready!",
        body_template: str = "Hi {{name}},\n\nCongratulations! Your certificate is attached.\n\nBest regards,\nThe CertiMate Team"
    ) -> Dict[str, any]:
        """
        Send a certificate via email using Gmail API
        
        Args:
            access_token: OAuth 2.0 access token
            recipient_email: Recipient's email address
            recipient_name: Recipient's name (for personalization)
            certificate_path: Path to certificate file
            subject: Email subject
            body_template: Email body template with {{name}} placeholder
            
        Returns:
            Dictionary with success status and message ID
            
        Raises:
            Exception: If sending fails
        """
        try:
            # Build personalized body
            body = body_template.replace('{{name}}', recipient_name)
            
            # Build Gmail service
            service = await EmailService.build_gmail_service(access_token)
            
            # Create message
            message = EmailService.create_message_with_attachment(
                to=recipient_email,
                subject=subject,
                body=body,
                attachment_path=certificate_path
            )
            
            # Send message
            message_id = await EmailService.send_message(service, message)
            
            return {
                'success': True,
                'recipient_email': recipient_email,
                'recipient_name': recipient_name,
                'message_id': message_id,
                'certificate_path': certificate_path
            }
            
        except Exception as e:
            logger.error(f"Error sending certificate email to {recipient_email}: {e}")
            return {
                'success': False,
                'recipient_email': recipient_email,
                'recipient_name': recipient_name,
                'error': str(e)
            }
    
    @staticmethod
    async def send_certificates_batch(
        access_token: str,
        recipients: List[Dict[str, str]],
        certificates_dir: str = "uploads/certificates"
    ) -> Dict[str, any]:
        """
        Send certificates to multiple recipients
        
        Args:
            access_token: OAuth 2.0 access token
            recipients: List of dicts with 'email', 'name', and optionally 'certificate_filename'
            certificates_dir: Directory containing certificate files
            
        Returns:
            Dictionary with success/failure counts and details
        """
        results = {
            'total': len(recipients),
            'successful': 0,
            'failed': 0,
            'details': []
        }
        
        for recipient in recipients:
            email = recipient.get('email')
            name = recipient.get('name', email.split('@')[0])
            
            # Find certificate file
            certificate_filename = recipient.get('certificate_filename')
            if not certificate_filename:
                # Try to infer from name
                # Look for files starting with "certificate_" and containing the name
                certificate_filename = EmailService._find_certificate_file(
                    certificates_dir,
                    name
                )
            
            if not certificate_filename:
                results['failed'] += 1
                results['details'].append({
                    'success': False,
                    'recipient_email': email,
                    'recipient_name': name,
                    'error': 'Certificate file not found'
                })
                continue
            
            certificate_path = os.path.join(certificates_dir, certificate_filename)
            
            # Send email
            result = await EmailService.send_certificate_email(
                access_token=access_token,
                recipient_email=email,
                recipient_name=name,
                certificate_path=certificate_path
            )
            
            if result.get('success'):
                results['successful'] += 1
            else:
                results['failed'] += 1
            
            results['details'].append(result)
        
        return results
    
    @staticmethod
    def _find_certificate_file(certificates_dir: str, name: str) -> Optional[str]:
        """
        Find a certificate file for a given name
        
        Args:
            certificates_dir: Directory to search in
            name: Recipient name to search for
            
        Returns:
            Certificate filename or None if not found
        """
        try:
            # Normalize name for file matching
            search_name = name.replace(' ', '_').lower()
            
            # List files in directory
            if not os.path.exists(certificates_dir):
                logger.warning(f"Certificates directory does not exist: {certificates_dir}")
                return None
            
            files = os.listdir(certificates_dir)
            
            # Search for matching certificate file
            for filename in files:
                # Skip ZIP files
                if filename.endswith('.zip'):
                    continue
                
                # Check if name is in filename
                if search_name in filename.lower():
                    logger.info(f"Found certificate file: {filename}")
                    return filename
            
            logger.warning(f"No certificate file found for name: {name}")
            return None
            
        except Exception as e:
            logger.error(f"Error finding certificate file: {e}")
            return None

