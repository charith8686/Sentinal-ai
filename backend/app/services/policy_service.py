import json
import os
import uuid
import datetime
from typing import Dict, Any, List, Optional
from app.database.db import get_connection
from app.config import settings

CLAUSES_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "legal_clauses.json")

def load_legal_clauses() -> List[Dict[str, Any]]:
    if os.path.exists(CLAUSES_FILE):
        with open(CLAUSES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def retrieve_grounded_clauses(policy_text: str) -> List[Dict[str, Any]]:
    """
    RAG-style grounded clause retrieval over authentic legal standards.
    Extracts matching clauses with exact citations.
    """
    clauses = load_legal_clauses()
    text_lower = policy_text.lower()
    scored = []

    for clause in clauses:
        score = 0
        for kw in clause.get("keywords", []):
            if kw.lower() in text_lower:
                score += 1
        
        # Exact standard match bonus
        if clause.get("standard", "").lower() in text_lower:
            score += 2

        if score > 0:
            clause_copy = dict(clause)
            clause_copy["relevance_score"] = min(1.0, round(score / max(len(clause.get("keywords", [])), 1) * 1.5, 2))
            scored.append(clause_copy)

    # Sort descending by relevance
    scored.sort(key=lambda x: x["relevance_score"], reverse=True)
    return scored[:3]

def check_policy_clarity(policy_text: str) -> Dict[str, Any]:
    """
    Clarity Check: Detects vague or ambiguous policies.
    Guarantees no hallucinated rule is activated when requirements are ambiguous.
    """
    text_lower = policy_text.lower().strip()
    
    # Ambiguous markers
    vague_phrases = [
        "handle data appropriately",
        "act properly",
        "use common sense",
        "ensure safety",
        "be careful with records",
        "do what is best",
        "reasonable care",
        "standard precautions"
    ]

    for phrase in vague_phrases:
        if phrase in text_lower and len(text_lower) < 80:
            return {
                "is_ambiguous": True,
                "reason": "Policy contains purely subjective guidance ('" + phrase + "') without concrete technical predicates.",
                "clarification_questions": [
                    "What specific classification of data (e.g. PII, PCI, PHI) does this rule govern?",
                    "What technical actions (e.g. EXPORT, AI_PROMPT, READ_RECORD) trigger this policy?",
                    "Which destination endpoints or systems are considered authorized vs unauthorized?"
                ]
            }

    # Short or non-specific text check
    if len(text_lower.split()) < 4:
        return {
            "is_ambiguous": True,
            "reason": "Policy statement is too brief to formulate deterministic boolean criteria.",
            "clarification_questions": [
                "Please define the exact actor roles and access prerequisites.",
                "Please specify required approval documentation or ticketing procedures."
            ]
        }

    return {"is_ambiguous": False}

def generate_proposed_rule(policy_id: str, policy_title: str, policy_text: str, grounded_clause: Dict[str, Any]) -> Dict[str, Any]:
    """
    Proposes a structured IF-THEN rule grounded in the cited clause.
    """
    text_lower = policy_text.lower()
    rule_id = f"R-{uuid.uuid4().hex[:6].upper()}"

    # Template-based deterministic translation
    if "ai" in text_lower or "external" in text_lower or "chatgpt" in text_lower:
        conditions = [
            {"field": "sensitive_data", "operator": "==", "value": True},
            {"field": "is_unapproved_destination", "operator": "==", "value": True}
        ]
        classification = "PRIVACY_VIOLATION"
        recommended_action = "BLOCK_OR_ALERT"
        risk_level = "HIGH"
        rule_name = "Restrict Sensitive Data Transmission to External AI"
        explanation = (
            f"Evaluates outbound AI data flow against {grounded_clause.get('clause_id')}. "
            "Triggers when sensitive enterprise data is targeted to unapproved external AI endpoints."
        )
    elif "bulk" in text_lower or "5000" in text_lower or "export" in text_lower:
        conditions = [
            {"field": "sensitive_data", "operator": "==", "value": True},
            {"field": "is_bulk", "operator": "==", "value": True}
        ]
        classification = "SUSPICIOUS"
        recommended_action = "INVESTIGATE"
        risk_level = "MEDIUM"
        rule_name = "Bulk Customer Record Export Inspection"
        explanation = (
            f"Grounds against {grounded_clause.get('clause_id')}. Flags high-volume record queries "
            "exceeding standard operational thresholds for manual review."
        )
    elif "unusual hour" in text_lower or "off-hours" in text_lower:
        conditions = [
            {"field": "sensitive_data", "operator": "==", "value": True},
            {"field": "is_off_hours", "operator": "==", "value": True}
        ]
        classification = "SUSPICIOUS"
        recommended_action = "HUMAN_REVIEW"
        risk_level = "MEDIUM"
        rule_name = "Off-Hours Sensitive Record Access Review"
        explanation = (
            f"Under {grounded_clause.get('clause_id')}, flags customer data access during non-business "
            "windows without attached business ticket."
        )
    elif "ticket" in text_lower or "permission" in text_lower or "privilege" in text_lower:
        conditions = [
            {"field": "authorized", "operator": "==", "value": False}
        ]
        classification = "PRIVACY_VIOLATION"
        recommended_action = "BLOCK_OR_ALERT"
        risk_level = "HIGH"
        rule_name = "Enforce Documented Ticket for Privilege Changes"
        explanation = (
            f"Strictly enforces {grounded_clause.get('clause_id')}. Access grants and modifications "
            "lacking verified authorization are deterministically blocked."
        )
    else:
        # Default baseline privacy rule
        conditions = [
            {"field": "sensitive_data", "operator": "==", "value": True},
            {"field": "authorized", "operator": "==", "value": False}
        ]
        classification = "PRIVACY_VIOLATION"
        recommended_action = "BLOCK_OR_ALERT"
        risk_level = "HIGH"
        rule_name = f"Enforce {policy_title[:30]}"
        explanation = f"Grounded in {grounded_clause.get('clause_id')}: blocks unauthorized access to sensitive records."

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    return {
        "rule_id": rule_id,
        "rule_name": rule_name,
        "source_policy_id": policy_id,
        "source_clause_id": grounded_clause.get("clause_id", "GENERAL-POLICY"),
        "supporting_clause_text": grounded_clause.get("text", policy_text),
        "conditions": conditions,
        "classification": classification,
        "recommended_action": recommended_action,
        "risk_level": risk_level,
        "explanation": explanation,
        "version": "1.0",
        "status": "PENDING_APPROVAL",  # Must never be ACTIVE immediately!
        "approver": None,
        "approval_time": None,
        "review_comment": None,
        "requires_revalidation": False,
        "created_at": now,
        "updated_at": now
    }

def create_policy_service(title: str, industry: str, text: str) -> Dict[str, Any]:
    """
    Submits a policy, checks clarity, retrieves grounded clauses, and creates proposed rule if clear.
    """
    clarity = check_policy_clarity(text)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    policy_id = f"POL-{uuid.uuid4().hex[:6].upper()}"
    
    conn = get_connection()
    cursor = conn.cursor()

    if clarity["is_ambiguous"]:
        # Ambiguous policy: route to human review
        policy_record = {
            "policy_id": policy_id,
            "title": title,
            "industry": industry,
            "text": text,
            "version": "1.0",
            "status": "NEEDS_REVIEW",
            "clauses": [],
            "missing_info_reason": clarity["reason"],
            "clarification_questions": clarity["clarification_questions"],
            "created_at": now
        }
        cursor.execute("""
            INSERT INTO policies (policy_id, title, industry, text, version, status, clauses_json, missing_info_reason, clarification_questions_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            policy_id, title, industry, text, "1.0", "NEEDS_REVIEW",
            "[]", clarity["reason"], json.dumps(clarity["clarification_questions"]), now
        ))
        conn.commit()
        conn.close()
        return {"policy": policy_record, "proposed_rule": None}

    # Clear policy: ground clauses
    retrieved_clauses = retrieve_grounded_clauses(text)
    if not retrieved_clauses:
        # Fallback to general clause
        retrieved_clauses = [{
            "clause_id": "ENT-GEN-01",
            "standard": "Enterprise Privacy Standard",
            "section": "Section 1.1",
            "title": "General Data Protection Requirement",
            "text": text,
            "relevance_score": 0.8
        }]

    top_clause = retrieved_clauses[0]
    proposed_rule = generate_proposed_rule(policy_id, title, text, top_clause)

    # Persist policy
    cursor.execute("""
        INSERT INTO policies (policy_id, title, industry, text, version, status, clauses_json, missing_info_reason, clarification_questions_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        policy_id, title, industry, text, "1.0", "ACTIVE",
        json.dumps(retrieved_clauses), None, "[]", now
    ))

    # Persist proposed rule as PENDING_APPROVAL
    cursor.execute("""
        INSERT INTO rules (rule_id, rule_name, source_policy_id, source_clause_id, supporting_clause_text, conditions_json, classification, recommended_action, risk_level, explanation, version, status, approver, approval_time, review_comment, requires_revalidation, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        proposed_rule["rule_id"],
        proposed_rule["rule_name"],
        proposed_rule["source_policy_id"],
        proposed_rule["source_clause_id"],
        proposed_rule["supporting_clause_text"],
        json.dumps(proposed_rule["conditions"]),
        proposed_rule["classification"],
        proposed_rule["recommended_action"],
        proposed_rule["risk_level"],
        proposed_rule["explanation"],
        proposed_rule["version"],
        proposed_rule["status"],
        proposed_rule["approver"],
        proposed_rule["approval_time"],
        proposed_rule["review_comment"],
        0,
        now,
        now
    ))

    conn.commit()
    conn.close()

    policy_record = {
        "policy_id": policy_id,
        "title": title,
        "industry": industry,
        "text": text,
        "version": "1.0",
        "status": "ACTIVE",
        "clauses": retrieved_clauses,
        "missing_info_reason": None,
        "clarification_questions": [],
        "created_at": now
    }
    return {"policy": policy_record, "proposed_rule": proposed_rule}

def get_all_policies() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM policies ORDER BY created_at DESC")
    rows = cursor.fetchall()
    policies = []
    for row in rows:
        policies.append({
            "policy_id": row["policy_id"],
            "title": row["title"],
            "industry": row["industry"],
            "text": row["text"],
            "version": row["version"],
            "status": row["status"],
            "clauses": json.loads(row["clauses_json"]),
            "missing_info_reason": row["missing_info_reason"],
            "clarification_questions": json.loads(row["clarification_questions_json"] or "[]"),
            "created_at": row["created_at"]
        })
    conn.close()
    return policies
