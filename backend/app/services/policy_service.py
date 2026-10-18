import json
import os
import uuid
import datetime
from typing import Dict, Any, List, Optional
from app.database.db import get_connection
from app.config import settings
from app.services.ai_service import get_ai_provider, _local_rule_extraction_fallback
from app.services.rule_validator import validate_and_test_rule

CLAUSES_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "legal_clauses.json")

def load_legal_clauses() -> List[Dict[str, Any]]:
    if os.path.exists(CLAUSES_FILE):
        with open(CLAUSES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

def retrieve_grounded_clauses(policy_text: str) -> List[Dict[str, Any]]:
    """
    Retrieves grounded clauses from reference corpus.
    """
    clauses = load_legal_clauses()
    text_lower = policy_text.lower()
    scored = []

    for clause in clauses:
        score = 0
        for kw in clause.get("keywords", []):
            if kw.lower() in text_lower:
                score += 1
        if clause.get("standard", "").lower() in text_lower:
            score += 2

        if score > 0:
            clause_copy = dict(clause)
            clause_copy["relevance_score"] = min(1.0, round(score / max(len(clause.get("keywords", [])), 1) * 1.5, 2))
            scored.append(clause_copy)

    scored.sort(key=lambda x: x["relevance_score"], reverse=True)
    return scored[:3]

def check_policy_clarity(policy_text: str) -> Dict[str, Any]:
    text_lower = policy_text.lower().strip()
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
                "reason": f"Policy contains purely subjective language ('{phrase}') without measurable security conditions.",
                "clarification_questions": [
                    "What specific classification of data (PII, Credentials, Financial Records) does this policy govern?",
                    "What technical actions (e.g. Outbound AI prompt, Bulk data export, Role modification) trigger enforcement?",
                    "Which destinations are authorized vs unauthorized for this record type?"
                ]
            }

    if len(text_lower.split()) < 4:
        return {
            "is_ambiguous": True,
            "reason": "Policy statement is too brief to formulate deterministic logic.",
            "clarification_questions": [
                "Please define the exact actor roles and access prerequisites.",
                "Please specify required approval documentation or ticketing procedures."
            ]
        }

    return {"is_ambiguous": False}

async def create_policy_service(title: str, industry: str, text: str, company_id: str) -> Dict[str, Any]:
    """
    Submits a policy for the authenticated company, invokes real AI analysis,
    validates the proposed rule, and automatically activates it if valid.
    """
    clarity = check_policy_clarity(text)
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    policy_id = f"POL-{uuid.uuid4().hex[:6].upper()}"
    
    conn = get_connection()
    cursor = conn.cursor()

    if clarity["is_ambiguous"]:
        # Ambiguous policy: Save as NEEDS_REVIEW, do not activate a rule
        cursor.execute("""
            INSERT INTO policies (policy_id, company_id, title, industry, text, version, status, clauses_json, missing_info_reason, clarification_questions_json, is_sample, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        """, (
            policy_id, company_id, title, industry, text, "1.0", "NEEDS_REVIEW",
            "[]", clarity["reason"], json.dumps(clarity["clarification_questions"]), now
        ))
        conn.commit()
        conn.close()

        policy_record = {
            "policy_id": policy_id,
            "company_id": company_id,
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
        return {"policy": policy_record, "proposed_rule": None}

    # Clear policy: Retrieve grounded reference citations
    retrieved_clauses = retrieve_grounded_clauses(text)
    if not retrieved_clauses:
        retrieved_clauses = [{
            "clause_id": "General Enterprise Policy",
            "standard": "Internal Corporate Standards",
            "section": "Section 1",
            "title": "Corporate Compliance Requirement",
            "text": text,
            "relevance_score": 1.0
        }]

    # Invoke configured AI provider
    ai_provider = get_ai_provider()
    try:
        ai_result = await ai_provider.analyze_policy(title, text, industry, retrieved_clauses)
    except Exception as e:
        # Fallback to local grounded rule extractor if external AI model call fails or is unconfigured
        ai_result = _local_rule_extraction_fallback(title, text, retrieved_clauses, provider_note=f"[Fallback: {str(e)}]")

    if ai_result.get("is_ambiguous"):
        # Model flagged ambiguity
        cursor.execute("""
            INSERT INTO policies (policy_id, company_id, title, industry, text, version, status, clauses_json, missing_info_reason, clarification_questions_json, is_sample, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        """, (
            policy_id, company_id, title, industry, text, "1.0", "NEEDS_REVIEW",
            json.dumps(retrieved_clauses), ai_result.get("ambiguity_reason", "Policy ambiguous"),
            json.dumps(ai_result.get("clarification_questions", [])), now
        ))
        conn.commit()
        conn.close()
        return {
            "policy": {
                "policy_id": policy_id,
                "company_id": company_id,
                "title": title,
                "industry": industry,
                "text": text,
                "version": "1.0",
                "status": "NEEDS_REVIEW",
                "clauses": retrieved_clauses,
                "missing_info_reason": ai_result.get("ambiguity_reason"),
                "clarification_questions": ai_result.get("clarification_questions", []),
                "created_at": now
            },
            "proposed_rule": None
        }

    # Build rule draft
    rule_id = f"R-{uuid.uuid4().hex[:6].upper()}"
    rule_name = ai_result.get("rule_name") or f"Rule for {title[:40]}"
    source_clause_id = ai_result.get("cited_clause_id") or retrieved_clauses[0]["clause_id"]
    supporting_clause_text = ai_result.get("supporting_clause_text") or retrieved_clauses[0]["text"]
    conditions = ai_result.get("conditions") or [{"field": "sensitive_data", "operator": "==", "value": True}]
    classification = ai_result.get("classification") or "PRIVACY_VIOLATION"
    recommended_action = ai_result.get("recommended_action") or "BLOCK_OR_ALERT"
    risk_level = ai_result.get("risk_level") or "HIGH"
    explanation = ai_result.get("explanation") or f"Automatically generated rule grounded in {source_clause_id}."

    rule_draft = {
        "rule_id": rule_id,
        "company_id": company_id,
        "rule_name": rule_name,
        "source_policy_id": policy_id,
        "source_clause_id": source_clause_id,
        "supporting_clause_text": supporting_clause_text,
        "conditions": conditions,
        "classification": classification,
        "recommended_action": recommended_action,
        "risk_level": risk_level,
        "explanation": explanation,
        "version": "1.0",
        "created_at": now,
        "updated_at": now
    }

    # AUTOMATIC VALIDATION & TESTING PIPELINE
    validation = validate_and_test_rule(rule_draft, company_id)
    rule_status = validation["status"] # "ACTIVE" if passed, "REJECTED" if failed
    validation_status = "VALIDATED" if validation["passed"] else "REJECTED"
    validation_message = validation["message"]

    # Persist policy
    cursor.execute("""
        INSERT INTO policies (policy_id, company_id, title, industry, text, version, status, clauses_json, missing_info_reason, clarification_questions_json, is_sample, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    """, (
        policy_id, company_id, title, industry, text, "1.0", "ACTIVE",
        json.dumps(retrieved_clauses), None, "[]", now
    ))

    # Persist rule with automated activation status
    cursor.execute("""
        INSERT INTO rules (
            rule_id, company_id, rule_name, source_policy_id, source_clause_id,
            supporting_clause_text, conditions_json, classification, recommended_action,
            risk_level, explanation, version, status, approver, approval_time,
            review_comment, requires_revalidation, is_sample, validation_status, validation_message, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        rule_id, company_id, rule_name, policy_id, source_clause_id,
        supporting_clause_text, json.dumps(conditions), classification, recommended_action,
        risk_level, explanation, "1.0", rule_status, "Automated Verification", now,
        validation_message, 0, 0, validation_status, validation_message, now, now
    ))

    conn.commit()
    conn.close()

    rule_draft["status"] = rule_status
    rule_draft["approver"] = "Automated Verification"
    rule_draft["approval_time"] = now
    rule_draft["validation_status"] = validation_status
    rule_draft["validation_message"] = validation_message

    return {
        "policy": {
            "policy_id": policy_id,
            "company_id": company_id,
            "title": title,
            "industry": industry,
            "text": text,
            "version": "1.0",
            "status": "ACTIVE",
            "clauses": retrieved_clauses,
            "missing_info_reason": None,
            "clarification_questions": [],
            "created_at": now
        },
        "proposed_rule": rule_draft
    }

def get_all_policies(company_id: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM policies WHERE company_id = ? ORDER BY created_at DESC", (company_id,))
    rows = cursor.fetchall()
    policies = []
    for row in rows:
        policies.append({
            "policy_id": row["policy_id"],
            "company_id": row["company_id"],
            "title": row["title"],
            "industry": row["industry"],
            "text": row["text"],
            "version": row["version"],
            "status": row["status"],
            "clauses": json.loads(row["clauses_json"] or "[]"),
            "missing_info_reason": row["missing_info_reason"],
            "clarification_questions": json.loads(row["clarification_questions_json"] or "[]"),
            "created_at": row["created_at"]
        })
    conn.close()
    return policies

def delete_policy_service(policy_id: str, company_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT policy_id FROM policies WHERE policy_id = ? AND company_id = ?", (policy_id, company_id))
    if not cursor.fetchone():
        conn.close()
        return False
    
    # Cascade delete associated rules for this company
    cursor.execute("DELETE FROM rules WHERE source_policy_id = ? AND company_id = ?", (policy_id, company_id))
    cursor.execute("DELETE FROM policies WHERE policy_id = ? AND company_id = ?", (policy_id, company_id))
    conn.commit()
    conn.close()
    return True
