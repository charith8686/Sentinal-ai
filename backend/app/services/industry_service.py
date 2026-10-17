from typing import Dict, Any, List

INDUSTRY_CONFIGS: Dict[str, Dict[str, Any]] = {
    "Banking": {
        "industry": "Banking",
        "regulatory_frameworks": ["GDPR Art 44/48", "PCI-DSS 4.0", "SOX Sec 404", "FFIEC Guidance"],
        "primary_resources": ["CUSTOMER_DB", "PAYROLL_DB", "CORE_LEDGER", "SWIFT_PAYMENTS"],
        "sensitive_data_categories": ["IBAN / Account Number", "Credit Card PAN", "Transaction History", "SWIFT MT103", "SSN / Tax ID"],
        "allowed_destinations": ["INTERNAL_IBM_Z", "LOCAL_SMF_STREAM", "SANCTIONED_BANKING_CORE"],
        "export_threshold_records": 5000,
        "sample_policy_prompt": "Personal customer data must not be sent to unapproved external AI services.",
        "sample_ambiguous_policy": "Handle banking records appropriately and ensure safety during off-hours.",
        "remediation_playbook": "Revoke RACF credentials on z/OS, terminate CICS session, and alert AML Officer."
    },
    "Healthcare": {
        "industry": "Healthcare",
        "regulatory_frameworks": ["HIPAA Security Rule", "HITECH Act", "GDPR Art 9 (Health Data)"],
        "primary_resources": ["EHR_SYSTEM", "PATIENT_RECORD_DB", "CLINICAL_TRIALS", "PHARMACY_RX"],
        "sensitive_data_categories": ["Protected Health Information (PHI)", "Diagnostic Codes (ICD-10)", "Prescription History", "Insurance Member ID"],
        "allowed_destinations": ["HOSPITAL_ONPREM_Z", "SECURE_EPIC_BRIDGE", "ENCRYPTED_PACS"],
        "export_threshold_records": 1000,
        "sample_policy_prompt": "Patient diagnosis and clinical history records must not be shared with external LLM tools without IRB approval.",
        "sample_ambiguous_policy": "Doctors and nurses should handle patient health data with care.",
        "remediation_playbook": "Quarantine HL7 message flow, notify Chief Privacy Officer, and generate HIPAA breach record."
    },
    "Insurance": {
        "industry": "Insurance",
        "regulatory_frameworks": ["NAIC Model Law", "NYDFS 23 NYCRR 500", "GDPR"],
        "primary_resources": ["POLICYHOLDER_DB", "CLAIMS_PROCESSING", "ACTUARIAL_MODELS", "UNDERWRITING_DATA"],
        "sensitive_data_categories": ["Claim Financials", "Medical Underwriting Docs", "Driver License PII", "Policy Beneficiary Details"],
        "allowed_destinations": ["INSURANCE_Z_CORE", "CLAIM_SYSTEM_INTERNAL", "SECURE_ADJUSTER_PORTAL"],
        "export_threshold_records": 3000,
        "sample_policy_prompt": "Policyholder actuarial data and claims must only be processed by certified on-premises analytical models.",
        "sample_ambiguous_policy": "Ensure claims information is used properly by staff.",
        "remediation_playbook": "Suspend adjuster claims authority, isolate IMS dataset, and file NYDFS incident log."
    },
    "Retail": {
        "industry": "Retail",
        "regulatory_frameworks": ["CCPA / CPRA", "PCI-DSS 4.0", "FTC Act Sec 5"],
        "primary_resources": ["LOYALTY_PROGRAM_DB", "POS_CHECKOUT_STREAM", "ORDER_MANAGEMENT", "INVENTORY_Z"],
        "sensitive_data_categories": ["Payment Card Primary Account Numbers", "Customer Geolocation", "Loyalty Account PII", "Purchase Profiles"],
        "allowed_destinations": ["RETAIL_Z_MAINFRAME", "SECURE_TOKEN_VAULT", "ERP_WAREHOUSE"],
        "export_threshold_records": 10000,
        "sample_policy_prompt": "Customer credit card numbers and loyalty purchase history must not be exported without explicit PCI authorization.",
        "sample_ambiguous_policy": "Treat shopper information with respect.",
        "remediation_playbook": "Lock POS terminal token session, notify Fraud Prevention unit, and purge non-tokenized temporary cache."
    }
}

def get_industry_config(industry_name: str) -> Dict[str, Any]:
    return INDUSTRY_CONFIGS.get(industry_name, INDUSTRY_CONFIGS["Banking"])

def list_supported_industries() -> List[str]:
    return list(INDUSTRY_CONFIGS.keys())
