import base64
import os
import logging
import time
import uuid
import random
import datetime
from typing import List, Dict, Tuple, Optional
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from email.utils import make_msgid, formatdate
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from google.auth.exceptions import RefreshError
import asyncio
from PIL import Image

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via Gmail API with OAuth"""
    
    @staticmethod
    async def build_gmail_service(access_token: str):
        """
        Build Gmail service instance using OAuth access token
        """
        try:
            credentials = Credentials(token=access_token)
            service = build('gmail', 'v1', credentials=credentials, cache_discovery=False)
            return service
        except Exception as e:
            logger.error(f"Error building Gmail service: {e}")
            raise Exception(f"Failed to authenticate with Gmail: {str(e)}")
    
    @staticmethod
    def create_message_with_attachment(
        to: str,
        subject: str,
        body_html: str,
        body_text: str,
        attachment_path: str,
        sender_email: str = None,
        reply_to: str = None,
        recipient_name: str = "Recipient"
    ) -> Dict:
        """
        Create an email message with attachment, HTML support, and proper headers
        """
        try:
            # Create multipart message (mixed for attachment)
            message = MIMEMultipart('mixed')
            
            # Set MANDATORY headers (no longer optional)
            message['To'] = to
            message['Subject'] = subject
            message['Date'] = formatdate(localtime=True)
            message['Message-ID'] = make_msgid(domain='certimate.app')
            message['Reply-To'] = reply_to or sender_email or to
            
            if sender_email:
                message['From'] = f"CertiMate <{sender_email}>"
            
            # Add List-Unsubscribe header (MANDATORY for deliverability)
            message['List-Unsubscribe'] = f"<mailto:unsubscribe@certimate.app?subject=unsubscribe>"
            message['X-Entity-Ref-ID'] = str(uuid.uuid4())
            
            # Create alternative part for HTML/Text
            msg_alternative = MIMEMultipart('alternative')
            message.attach(msg_alternative)
            
            # Add text body
            msg_text = MIMEText(body_text, 'plain')
            msg_alternative.attach(msg_text)
            
            # Add HTML body
            msg_html = MIMEText(body_html, 'html')
            msg_alternative.attach(msg_html)
            
            # Add attachment with unique metadata
            if attachment_path and os.path.exists(attachment_path):
                attachment_name = os.path.basename(attachment_path)
                
                # Create a temporary copy with unique metadata for PDFs
                temp_attachment_path = attachment_path
                if attachment_path.lower().endswith(('.png', '.jpg', '.jpeg')):
                    temp_attachment_path = EmailService._add_unique_metadata_to_image(attachment_path, recipient_name)
                
                with open(temp_attachment_path, "rb") as attachment:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(attachment.read())
                
                encoders.encode_base64(part)
                part.add_header(
                    'Content-Disposition',
                    f'attachment; filename="{attachment_name}"'
                )
                message.attach(part)
                logger.info(f"Added attachment: {attachment_name}")
                
                # Clean up temporary file if created
                if temp_attachment_path != attachment_path:
                    try:
                        os.remove(temp_attachment_path)
                    except:
                        pass
            
            # Encode message
            raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
            
            return {'raw': raw_message}
            
        except Exception as e:
            error_msg = f"Error creating message: {str(e)}"
            logger.error(error_msg)
            raise Exception(error_msg)
    
    @staticmethod
    async def send_message(
        service,
        message: Dict,
        retries: int = 3
    ) -> str:
        """
        Send an email message via Gmail API with retry logic
        """
        for attempt in range(retries):
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
                logger.warning(f"Attempt {attempt + 1} failed: {e}")
                if attempt == retries - 1:
                    raise
                # Exponential backoff
                await asyncio.sleep(2 ** attempt + random.uniform(0, 1))
    
    @staticmethod
    async def send_certificate_email(
        access_token: str,
        recipient_email: str,
        recipient_name: str,
        certificate_path: str,
        subject: str = "Your Certificate is Ready!",
        body_template: str = None,
        sender_email: str = None
    ) -> Dict[str, any]:
        """
        Send a certificate via email using Gmail API
        """
        try:
            # Default template if none provided
            if not body_template:
                body_template = (
                    "<p>Hi {{name}},</p>"
                    "<p>Congratulations! Your certificate is attached.</p>"
                    "<p>Best regards,<br>The CertiMate Team</p>"
                )
            
            # Personalize body
            body_html = body_template.replace('{{name}}', recipient_name)
            
            # Create plain text version from HTML (simple strip)
            body_text = body_html.replace('<br>', '\n').replace('<p>', '').replace('</p>', '\n\n')
            
            # Build Gmail service
            service = await EmailService.build_gmail_service(access_token)
            
            # Use 'me' as sender if not provided (Gmail will use authenticated user)
            if not sender_email:
                sender_email = None  # Gmail API will use authenticated user's email
            
            # Create message
            message = EmailService.create_message_with_attachment(
                to=recipient_email,
                subject=subject,
                body_html=body_html,
                body_text=body_text,
                attachment_path=certificate_path,
                sender_email=sender_email,
                recipient_name=recipient_name
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
        certificates_dir: str = "uploads/certificates",
        subject: str = "Your Certificate is Ready!",
        body_template: str = None,
        event_name: str = None
    ) -> Dict[str, any]:
        """
        Send certificates to multiple recipients with batching delay
        """
        results = {
            'total': len(recipients),
            'successful': 0,
            'failed': 0,
            'details': []
        }
        
        # Build service once to reuse (optimization)
        try:
            service = await EmailService.build_gmail_service(access_token)
            
            # Use authenticated user as sender
            sender_email = None  # Gmail API will use authenticated user's email
            
        except Exception as e:
            logger.error(f"Failed to initialize batch sending: {e}")
            return results
        
        for i, recipient in enumerate(recipients):
            email = recipient.get('email')
            name = recipient.get('name', email.split('@')[0])
            
            # Find certificate file
            certificate_filename = recipient.get('certificate_filename')
            if not certificate_filename:
                certificate_filename = EmailService._find_certificate_file(certificates_dir, name)
            
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
            
            # Personalize
            current_subject = subject
            current_body_template = body_template
            
            if event_name:
                current_subject = current_subject.replace('{{event}}', event_name)
                current_body_template = current_body_template.replace('{{event}}', event_name)
            
            # Send email
            try:
                # Personalize body
                body_html = current_body_template.replace('{{name}}', name)
                body_text = body_html.replace('<br>', '\n').replace('<p>', '').replace('</p>', '\n\n')
                
                message = EmailService.create_message_with_attachment(
                    to=email,
                    subject=current_subject,
                    body_html=body_html,
                    body_text=body_text,
                    attachment_path=certificate_path,
                    sender_email=sender_email,
                    recipient_name=name
                )
                
                message_id = await EmailService.send_message(service, message)
                
                results['successful'] += 1
                results['details'].append({
                    'success': True,
                    'recipient_email': email,
                    'message_id': message_id
                })
                
            except Exception as e:
                results['failed'] += 1
                results['details'].append({
                    'success': False,
                    'recipient_email': email,
                    'error': str(e)
                })
            
            # Batching delay to avoid rate limits (2-4 seconds for deliverability)
            if i < len(recipients) - 1:
                delay = random.uniform(2, 4)  # Random delay between 2-4 seconds
                logger.info(f"Delaying {delay:.1f} seconds before next email to avoid spam filters")
                await asyncio.sleep(delay)
        
        return results
    
    @staticmethod
    def _add_unique_metadata_to_image(image_path: str, recipient_name: str) -> str:
        """
        Add unique metadata to certificate image to ensure uniqueness
        """
        try:
            img = Image.open(image_path)
            
            # Create a temporary file with unique metadata
            temp_path = f"{image_path}.temp_{uuid.uuid4().hex[:8]}.png"
            
            # Add metadata to the image
            metadata = {
                'Title': f'Certificate - {recipient_name} - {datetime.datetime.now().strftime("%Y%m%d_%H%M%S")}',
                'Subject': f'Certificate of Completion - {recipient_name}',
                'Author': 'CertiMate Platform',
                'Creation Date': datetime.datetime.now().isoformat(),
                'Unique ID': str(uuid.uuid4()),
                'Recipient': recipient_name
            }
            
            # Save with metadata
            img.save(temp_path, 'PNG', **{'pnginfo': Image.PngInfo()})
            
            # Add metadata to PNG info
            pnginfo = Image.PngInfo()
            for key, value in metadata.items():
                pnginfo.add_text(key, str(value))
            
            img.save(temp_path, 'PNG', pnginfo=pnginfo)
            
            return temp_path
            
        except Exception as e:
            logger.warning(f"Could not add metadata to image {image_path}: {e}")
            return image_path
    
    @staticmethod
    def _find_certificate_file(certificates_dir: str, name: str) -> Optional[str]:
        """Find a certificate file for a given name"""
        try:
            search_name = name.replace(' ', '_').lower()
            if not os.path.exists(certificates_dir):
                return None
            
            files = os.listdir(certificates_dir)
            for filename in files:
                if filename.endswith('.zip'): continue
                if search_name in filename.lower():
                    return filename
            return None
        except Exception:
            return None