import dns.resolver
import logging
from typing import Optional

logger = logging.getLogger(__name__)

def check_dmarc_record(domain: str) -> Optional[str]:
    """
    Check DMARC record for a domain
    
    Returns:
        DMARC record content if found, None otherwise
    """
    try:
        dmarc_domain = f"_dmarc.{domain}"
        records = dns.resolver.resolve(dmarc_domain, 'TXT')
        for record in records:
            dmarc_text = str(record).strip('"')
            if dmarc_text.startswith('v=DMARC1'):
                return dmarc_text
        return None
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, Exception) as e:
        logger.debug(f"DMARC check failed for {domain}: {e}")
        return None

def get_sender_domain_from_email(email: str) -> str:
    """
    Extract domain from email address
    """
    return email.split('@')[1].lower()

def analyze_domain_auth(email: str) -> dict:
    """
    Analyze domain authentication for sender
    
    Returns:
        Dictionary with authentication status and recommendations
    """
    domain = get_sender_domain_from_email(email)
    dmarc_record = check_dmarc_record(domain)
    
    result = {
        'domain': domain,
        'dmarc_found': bool(dmarc_record),
        'dmarc_record': dmarc_record,
        'recommendation': None
    }
    
    if not dmarc_record:
        result['recommendation'] = (
            f"Consider setting up DMARC for {domain} to improve deliverability. "
            "Add TXT record: _dmarc.example.com with 'v=DMARC1; p=none'"
        )
        logger.warning(f"No DMARC record found for domain: {domain}")
    else:
        logger.info(f"DMARC record found for {domain}: {dmarc_record}")
    
    return result
