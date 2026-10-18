import sqlite3
import json
import os
from app.config import settings

def get_connection():
    db_file = settings.database_path or os.getenv("SENTINEL_DB_PATH", "sentinel_ai.db")
    conn = sqlite3.connect(db_file)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    
    # 1. Companies table (Multi-company login and isolation)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS companies (
        company_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        industry TEXT NOT NULL DEFAULT 'Banking',
        created_at TEXT NOT NULL
    );
    """)

    # 2. Company Sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS company_sessions (
        token TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY (company_id) REFERENCES companies(company_id)
    );
    """)

    # 3. Policies table (company isolated)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS policies (
        policy_id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
        title TEXT NOT NULL,
        industry TEXT NOT NULL,
        text TEXT NOT NULL,
        version TEXT NOT NULL,
        status TEXT NOT NULL,
        clauses_json TEXT NOT NULL,
        missing_info_reason TEXT,
        clarification_questions_json TEXT,
        is_sample INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
    );
    """)

    # 4. Rules table (company isolated)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS rules (
        rule_id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
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
        is_sample INTEGER DEFAULT 0,
        validation_status TEXT DEFAULT 'VALIDATED',
        validation_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """)

    # 5. Events table (company isolated)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS events (
        event_id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
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
        expected_reason TEXT,
        is_sample INTEGER DEFAULT 0
    );
    """)

    # 6. Alerts table (company isolated)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        alert_id TEXT PRIMARY KEY,
        company_id TEXT NOT NULL,
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

    # 7. Proof Cards / Audit Ledger table (company isolated)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id TEXT NOT NULL,
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

    # 8. Rule History / Audit Lineage table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS rule_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id TEXT NOT NULL,
        rule_id TEXT NOT NULL,
        version TEXT NOT NULL,
        action TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        actor_name TEXT NOT NULL,
        status TEXT NOT NULL,
        validation_status TEXT,
        validation_message TEXT,
        comment TEXT,
        timestamp TEXT NOT NULL,
        rule_snapshot_json TEXT NOT NULL
    );
    """)

    # Migration helper for any existing tables missing company_id
    for table in ["policies", "rules", "events", "alerts", "audit_ledger", "rule_history"]:
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN company_id TEXT DEFAULT 'DEFAULT_COMPANY'")
        except sqlite3.OperationalError:
            pass

    try:
        cursor.execute("ALTER TABLE rules ADD COLUMN validation_status TEXT DEFAULT 'VALIDATED'")
    except sqlite3.OperationalError:
        pass

    try:
        cursor.execute("ALTER TABLE rules ADD COLUMN validation_message TEXT")
    except sqlite3.OperationalError:
        pass

    # Migration: Existing rules must not bypass the new approval requirement
    # Transition any previously auto-activated rules to PENDING_APPROVAL
    cursor.execute("""
        UPDATE rules
        SET status = 'PENDING_APPROVAL',
            approver = NULL,
            approval_time = NULL
        WHERE status = 'ACTIVE' AND (approver = 'Automated Verification' OR approver IS NULL)
    """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
