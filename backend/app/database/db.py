import sqlite3
import json
import os
from typing import List, Dict, Any, Optional

from app.config import settings

def get_connection():
    db_file = settings.database_path or os.getenv("SENTINEL_DB_PATH", "sentinel_ai.db")
    conn = sqlite3.connect(db_file)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Policies table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS policies (
        policy_id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        industry TEXT NOT NULL,
        text TEXT NOT NULL,
        version TEXT NOT NULL,
        status TEXT NOT NULL,
        clauses_json TEXT NOT NULL,
        missing_info_reason TEXT,
        clarification_questions_json TEXT,
        created_at TEXT NOT NULL
    );
    """)

    # 2. Rules table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS rules (
        rule_id TEXT PRIMARY KEY,
        rule_name TEXT NOT NULL,
        source_policy_id TEXT NOT NULL,
        source_clause_id TEXT NOT NULL,
        supporting_clause_text TEXT NOT NULL,
        conditions_json TEXT NOT NULL,
        classification TEXT NOT NULL,
        recommended_action TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        explanation TEXT NOT NULL,
        version TEXT NOT NULL,
        status TEXT NOT NULL,
        approver TEXT,
        approval_time TEXT,
        review_comment TEXT,
        requires_revalidation INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    # 3. Events table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS events (
        event_id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        received_time TEXT NOT NULL,
        user_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        resource TEXT NOT NULL,
        activity_details TEXT NOT NULL,
        sensitive_data INTEGER NOT NULL,
        authorized INTEGER,
        policy_rule TEXT,
        destination TEXT,
        region TEXT,
        metadata_json TEXT NOT NULL,
        dlp_findings_json TEXT NOT NULL,
        expected_classification TEXT,
        expected_action TEXT,
        expected_reason TEXT
    );
    """)

    # 4. Alerts table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        alert_id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        severity TEXT NOT NULL,
        detection_time TEXT NOT NULL,
        rule_id TEXT NOT NULL,
        rule_version TEXT NOT NULL,
        policy_id TEXT NOT NULL,
        policy_version TEXT NOT NULL,
        cited_clause_id TEXT NOT NULL,
        event_details_json TEXT NOT NULL,
        explanation TEXT NOT NULL,
        recommended_remediation TEXT NOT NULL,
        investigation_status TEXT NOT NULL,
        assigned_to TEXT,
        investigation_notes_json TEXT NOT NULL
    );
    """)

    # 5. Proof Cards / Audit Ledger table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        proof_id TEXT UNIQUE NOT NULL,
        event_id TEXT NOT NULL,
        event_timestamp TEXT NOT NULL,
        detection_timestamp TEXT NOT NULL,
        rule_id TEXT NOT NULL,
        rule_version TEXT NOT NULL,
        policy_id TEXT NOT NULL,
        policy_version TEXT NOT NULL,
        cited_clause_id TEXT NOT NULL,
        classification TEXT NOT NULL,
        recommended_action TEXT NOT NULL,
        approver_id TEXT NOT NULL,
        approval_time TEXT,
        previous_hash TEXT NOT NULL,
        current_hash TEXT NOT NULL,
        is_tampered INTEGER DEFAULT 0
    );
    """)

    # 6. Global System State
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
    """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
