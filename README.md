# Sentinel AI
### Enterprise AI Governance & Real-Time Compliance on IBM Z

**Policy → Rule → Proof**

Sentinel AI connects natural-language privacy policies to deterministic compliance checks on enterprise event streams. It is designed for **IBM Z / LinuxONE (s390x)** environments, with a prototype workflow using simulated IBM Z events.

## The problem

Enterprise teams need to turn complex policies into controls that can be tested, monitored, and audited. Manual reviews are slow, while AI-only decisions can be difficult to validate.

## Our approach

| Layer | Responsibility |
|---|---|
| **AI interprets** | Helps extract policy clauses, propose candidate rules, and explain findings with cited evidence. |
| **Rules decide** | A deterministic engine evaluates events against activated rules. AI is not in the compliance decision path. |
| **System validates** | Rule predicates and syntax are checked before activation. |
| **Ledger proves** | Each evaluation is recorded in a sequential SHA-256 hash chain for tamper evidence. |

### End-to-end workflow

**Policy input → Grounded clause retrieval → AI-proposed rule → Ambiguity checks → Automated validation → Event evaluation → Alert → Proof card → Ledger integrity verification**

## What the prototype demonstrates

- Policy-to-rule workflow with ambiguity checks and rule validation
- CSV ingestion for access logs and system events
- Deterministic evaluation against active compliance rules
- Regex-based data-loss-prevention (DLP) inspection
- Alerts with severity, status, and legal/policy citations
- SHA-256 hash-chained audit records, integrity verification, and tamper-detection controls
- Shared AI-model connectivity with a disclosed local/fallback mode when model configuration is unavailable

## Product walkthrough

### 1. Settings & environment
Configure shared IBM watsonx.ai connectivity, review deployment details, and import sample or benchmark datasets for compliance testing.

![Sentinel AI settings and model connectivity](assets/settings-model-connectivity.jpg)

![Dataset import and LinuxONE deployment details](assets/settings-dataset-deployment.jpg)

### 2. Events & alerts
Review detected violations, severity, cited rules, and case status. Inspect cases to support incident triage.

![Sentinel AI events and alerts](assets/events-alerts.jpg)

### 3. Audit ledger & cryptographic proof
Inspect proof cards and classifications, verify the hash chain, and test whether tampering is detected.

![Sentinel AI audit ledger and cryptographic proof](assets/audit-ledger-proof.jpg)

## IBM Z / LinuxONE deployment

The backend is designed for Python 3.11+ and Linux on Z (`s390x`), with an Ubuntu-compatible development path. A multi-architecture Docker image is intended to support both `s390x` and `amd64`.

```bash
docker build -t sentinel-ai:latest -f backend/Dockerfile backend/

docker run -d \
  --name sentinel-ai \
  --restart unless-stopped \
  -p 8000:8000 \
  -v sentinel_data:/app/data \
  sentinel-ai:latest

curl -f http://localhost:8000/api/health
```

Run tests from the project root:

```bash
pytest backend/tests/
```

The test suite is intended to cover workspace isolation and authentication, policy retrieval, ambiguity handling, rule validation, dataset evaluation, ledger integrity, tamper detection, and operation when the external AI service is unavailable.

## Trust boundaries & current scope

- **Prototype scope:** IBM Z events (including SMF-, RACF-, and CICS-style examples) are simulated. Live production integration would require the appropriate SMF/log adapters and deployment validation.
- **Decision boundary:** AI assists with interpretation and explanation; deterministic rules make runtime compliance decisions.
- **Audit boundary:** Hash chaining provides tamper evidence, but does **not** by itself guarantee immutable storage if an administrator can alter the underlying records and permissions.
- **Data handling:** The intended design minimizes exposure by passing masked findings and metadata across boundaries. Production privacy guarantees require implementation and deployment verification.
- **Roadmap:** Explore hybrid post-quantum cryptography, including ML-KEM key exchange and ML-DSA signatures, alongside IBM Z cryptographic acceleration.

## Why it matters

**A practical bridge between policy language and auditable enforcement:** Sentinel AI combines AI-assisted policy interpretation with deterministic controls and cryptographic traceability—built with enterprise IBM Z environments in mind.

---
*Hackathon prototype. Production readiness, live mainframe integration, and security claims must be validated in the target environment.*

Frontend overview
<img width="1600" height="809" alt="image" src="https://github.com/user-attachments/assets/2f331fef-457b-4e90-866a-4484af22de1b" /><br>
Settings page for importing and validating event datasets, viewing LinuxONE deployment details, and managing company workspace data.
<br><br>
<img width="1600" height="802" alt="image" src="https://github.com/user-attachments/assets/667995b1-86b4-4870-95ee-a24064e0e3b7" /><br>
Settings & Environment page for managing watsonx.ai connectivity, checking deployment configuration, and importing benchmark datasets for compliance testing.
<br><br>
<img width="1600" height="807" alt="image" src="https://github.com/user-attachments/assets/ac443356-37e2-42be-b880-7e9b3a3cc4ef" /><br>
Audit Ledger & Cryptographic Proof page displaying SHA-256 hash-chained records, integrity verification, compliance classifications, legal citations, and tamper-detection controls.
<br><br>
<img width="1600" height="807" alt="image" src="https://github.com/user-attachments/assets/06f1e304-9a7f-4ab6-9160-f47ce984da4f" /><br>
Events & Alerts page showing detected policy violations, severity levels, citations, case statuses, and tools to inspect and manage security incidents.



