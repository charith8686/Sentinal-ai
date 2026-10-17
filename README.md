# Sentinel AI — Enterprise AI Governance & Real-Time Compliance on IBM Z
> **Tagline:** Policy → Rule → Proof  
> **Platform Target:** IBM Z / z/OS & LinuxONE (s390x)

---

## 1. Executive Overview

Sentinel AI is a specialized privacy governance and compliance monitoring system architected for IBM Z environments. It resolves the fundamental operational gap between natural language privacy regulations (GDPR, PCI-DSS, HIPAA) and high-speed enterprise event streams (SMF, RACF, CICS, IMS) and unmonitored employee AI-tool traffic.

### The Three Governing Axioms
1. **RULES DECIDE** — Deterministic logic evaluates active compliance rules. AI never makes the compliance decision in the critical path.
2. **AI EXPLAINS** — Generative AI (e.g. watsonx.ai / on-premises Spyre Accelerator) proposes candidate rules, interprets policy text, and explains alerts using cited legal evidence.
3. **HUMANS APPROVE** — Dual-control governance requires explicit human review and sign-off before any rule can be activated.

---

## 2. The Operational Workflow Chain

```
Policy Input ➔ Clause Extraction ➔ AI-Proposed Rule ➔ Clarity Check ➔ Human Approval ➔ Rule Testing ➔ Deterministic Event Detection ➔ Alert ➔ Proof Card ➔ Audit Verification
```

- **Lane 1 (Control Lane — Asynchronous):** Policy ingestion, RAG grounded clause retrieval, ambiguity checks, candidate IF-THEN drafting, historical backtesting, and human sign-off.
- **Lane 2 (Continuous Detection Lane — Real-Time):** Pure deterministic evaluation on IBM Z events and outbound prompt traffic, sub-millisecond execution, DLP pattern inspection, advisory MLz anomaly context, SHA-256 hash-chained proof cards.

---

## 3. IBM LinuxONE (s390x) Deployment Guide

The backend is built as a lightweight Python service optimized for execution on Linux on Z (`s390x`) and Ubuntu 24.04:

### A. Run with Docker (s390x & amd64 compatible)
```bash
# Build multi-architecture container
docker build -t sentinel-ai:latest -f backend/Dockerfile backend/

# Run on non-conflicting port (e.g. 8000, leaving existing JupyterLab on 8888 untouched)
docker run -d \
  --name sentinel-ai \
  --restart unless-stopped \
  -p 8000:8000 \
  -v sentinel_data:/app/data \
  sentinel-ai:latest

# Check health endpoint
curl -f http://localhost:8000/api/health
```

### B. Run Native on LinuxONE (Python 3.11+)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m pytest tests/
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

---

## 4. Test Suite Verification

Run the automated test suite covering all 17 quality requirements:
```bash
pytest backend/tests/
```
Tests verify:
- Policy submission & grounded RAG clause retrieval
- Ambiguity detection & routing to manual review (blocking vague policies)
- Dual-control human approval enforcement (unapproved rules blocked from engine)
- Ground-truth CSV parsing & verification against `ibm_z_sentinel_ai_sample_events.csv`
- Cryptographic SHA-256 hash chaining, proof card generation, and tamper detection
- Degraded mode operation (deterministic engine runs uninterrupted when AI is offline)

---

## 5. Technical Specifications & Trust Boundaries

- **Simulated Environment:** Current prototype operates on simulated IBM Z events (SMF Type 80/82, RACF, and CICS-style logs). Live production mainframes connect via asynchronous SMF queues and z/OS Open Enterprise SDK adapters.
- **Data Privacy by Design:** Only masked findings and metadata cross platform boundaries. Raw sensitive records and confidential user prompts are never persisted.
- **Quantum-Safe Roadmap:** Engineered for hybrid ML-KEM key exchange, ML-DSA digital signatures, and hardware-accelerated SHA-256 via IBM Z CP Assist for Cryptographic Functions (CPACF).
