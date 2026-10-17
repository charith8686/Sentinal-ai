import re
from typing import Dict, Any, List, Tuple

# Pre-compiled high-performance regex patterns
CREDIT_CARD_REGEX = re.compile(r'\b(?:\d{4}[ -]?){3}\d{4}\b')
SSN_REGEX = re.compile(r'\b\d{3}-\d{2}-\d{4}\b')
EMAIL_REGEX = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
API_KEY_REGEX = re.compile(r'(?:api[_-]?key|secret|token|bearer|auth|sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,})', re.IGNORECASE)
PRIVATE_KEY_REGEX = re.compile(r'-----BEGIN (?:RSA )?PRIVATE KEY-----')

# Sanctioned vs unsanctioned external AI targets
SANCTIONED_AI_DOMAINS = [
    "ai-gateway.enterprise.internal",
    "ibm-watsonx.internal.net",
    "local-spyre.ibmz.internal"
]

UNSANCTIONED_AI_DOMAINS = [
    "api.openai.com",
    "chatgpt.com",
    "chat.openai.com",
    "claude.ai",
    "api.anthropic.com",
    "gemini.google.com",
    "deepseek.com",
    "unapproved-ai.cloud"
]

def scan_text_dlp(text: str) -> List[Dict[str, Any]]:
    """
    Performs deterministic DLP scanning over text.
    Extracts category, risk, and masked match. Raw sensitive values are NEVER persisted.
    """
    findings = []
    if not text:
        return findings

    # Credit Cards
    cc_matches = CREDIT_CARD_REGEX.findall(text)
    if cc_matches:
        findings.append({
            "category": "PAYMENT_CARD",
            "matches_count": len(cc_matches),
            "sample_masked": "XXXX-XXXX-XXXX-" + cc_matches[0][-4:],
            "risk": "HIGH"
        })

    # SSN / National IDs
    ssn_matches = SSN_REGEX.findall(text)
    if ssn_matches:
        findings.append({
            "category": "NATIONAL_ID_SSN",
            "matches_count": len(ssn_matches),
            "sample_masked": "***-**-" + ssn_matches[0][-4:],
            "risk": "HIGH"
        })

    # Emails
    email_matches = EMAIL_REGEX.findall(text)
    if email_matches:
        findings.append({
            "category": "CUSTOMER_EMAIL_PII",
            "matches_count": len(email_matches),
            "sample_masked": email_matches[0][0] + "***@" + email_matches[0].split("@")[-1],
            "risk": "MEDIUM"
        })

    # API Keys / Credentials
    if API_KEY_REGEX.search(text) or PRIVATE_KEY_REGEX.search(text):
        findings.append({
            "category": "SYSTEM_CREDENTIALS",
            "matches_count": 1,
            "sample_masked": "SECRET_KEY_REDACTED[********]",
            "risk": "CRITICAL"
        })

    return findings

def evaluate_ai_destination(destination_or_url: str) -> Tuple[bool, str]:
    """
    Evaluates whether an AI destination is sanctioned.
    Returns: (is_sanctioned: bool, status_label: str)
    """
    if not destination_or_url:
        return True, "INTERNAL"
    
    dest_lower = destination_or_url.lower()
    for sanctioned in SANCTIONED_AI_DOMAINS:
        if sanctioned in dest_lower:
            return True, "SANCTIONED_AI_GATEWAY"
            
    for unsanctioned in UNSANCTIONED_AI_DOMAINS:
        if unsanctioned in dest_lower:
            return False, "UNSANCTIONED_PUBLIC_AI"
            
    if "ai" in dest_lower or "chat" in dest_lower or "llm" in dest_lower:
        return False, "UNKNOWN_EXTERNAL_AI"

    return True, "ENTERPRISE_INTERNAL"
