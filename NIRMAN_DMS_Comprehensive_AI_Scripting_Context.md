# NIRMAN DMS: Comprehensive Product, Architecture & Feature Blueprint
> **Purpose:** Master AI Context & Knowledge Document for Scriptwriting, Teleprompters, Pitch Decks, and Video Production.  
> **How to use with AI tools (ChatGPT, Claude, Jasper, etc.):** Copy and paste this entire document into your AI prompt with instructions such as:  
> *"You are an expert tech scriptwriter. Using the comprehensive product context below, generate a [2-minute / 5-minute / 10-minute] video presentation script for [Judges / Enterprise Evaluators / General Audience] focusing on [all features / security / inter-agency sharing]."*

---

## 1. Executive Summary & Product Identity

- **Product Name:** NIRMAN DMS (Sovereign Document Management & Evidentiary Vault System)
- **Tagline:** Organise • Secure • Progress | Zero-Trust Sovereign Digital Evidence Vault
- **Core Mission:** Eliminate paper file vulnerability, unencrypted email transfers, evidence tampering, and bureaucratic silos across the Indian Government, Judiciary, Law Enforcement, and Critical Infrastructure.
- **Value Proposition:** A unified, production-ready, military-grade document management and digital evidence vault combining **AES-256-GCM Envelope Encryption**, **WORM (Write Once, Read Many) Immutability**, **Maker-Checker Dual-Custody Governance**, **Hyperledger Fabric Blockchain Proofs**, **Deep OCR Intelligence**, and an **Inter-Agency Sovereign Highway**.

---

## 2. Statutory Legal & Regulatory Compliance (Indian Legal Framework)

NIRMAN DMS is natively architected from the ground up to comply with Indian statutory acts and court precedents:

1. **Bharatiya Sakshya Adhiniyam (BSA) 2023 / Section 65B:**
   - Produces legally admissible, cryptographically attested Section 65B digital evidence certificates.
   - Validates SHA-256 binary bitstream hashes, cryptographic source chain of custody, and unwrap telemetry.
2. **Bharatiya Nagarik Suraksha Sanhita (BNSS) 2023:**
   - Enforces digital seizure memos, evidentiary chain of custody for cyber forensics, and electronic trial exhibits.
3. **Public Records Act 1993 & General Financial Rules (GFR):**
   - Statutory policy-based retention schedules (3-year, 7-year, 10-year, 30-year, and Permanent Cabinet archives).
4. **CERT-In Cyber Security Directions 2022:**
   - 100% immutable audit trails, IP/device telemetry logging, and continuous cryptographic monitoring.

---

## 3. Technology Stack & Enterprise Architecture

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, TailwindCSS with Vanilla CSS tokens, WebGL 3D Shader Gradient backgrounds, Material Symbols.
- **Backend Services:** Next.js Server Components, API Route Handlers, Edge & Node runtime, BullMQ Redis Asynchronous Job Queue Workers.
- **Database Layer:** PostgreSQL 16 with relational integrity, tsvector full-text search indexing, and database-level WORM immutability triggers (`BEFORE UPDATE OR DELETE RAISE EXCEPTION`).
- **Object Storage:** MinIO S3-compatible encrypted blob store, AES-256-GCM binary payload persistence, tamper-evident bucket tagging.
- **Cryptographic Engine:** HashiCorp Vault Transit KMS, Envelope Encryption (unique 256-bit DEK per document + 96-bit IV + AAD binding to docket number), SHA-256 checksums.
- **Blockchain Consortium:** Hyperledger Fabric permissioned consortium network, channel `dms-federation-channel`, chaincode `dms-evidence-contract`, Merkle root hash anchoring.
- **Cache & Performance:** Redis 7 (caching session profiles, taxonomy trees, rate-limiting, and BullMQ worker queues).

---

## 4. Deep Dive: The 10 Core Application Modules

### 🏛️ Module 1: Executive Command Center (Overview Dashboard)
- **Role & Purpose:** Real-time operational intelligence and telemetry for Apex Administrators and Department Heads.
- **Key Capabilities:**
  - **Live KPI Metric Cards:** Total Vault Records (77+ in Super Admin org), Encrypted Payloads (100%), Active Preservation Holds, Pending Approvals, System Health Score.
  - **Storage Quota & Utilization Breakdown:** Total storage consumption, departmental usage gauges, and WORM storage limits.
  - **Live Service Health Monitor:** Real-time health checks for PostgreSQL, Redis Queue, MinIO S3, HashiCorp Vault, and Hyperledger Fabric.
  - **Recent Activity Feed:** Chronological, authenticated stream of recent actions (uploads, approvals, unwrap requests).

### 📁 Module 2: Document Archive & Military-Grade Vault
- **Role & Purpose:** The primary evidentiary repository for managing institutional records.
- **Key Capabilities:**
  - **5-Tier Security Clearance Hierarchy:**
    - `T1` Unclassified / Public
    - `T2` Restricted / Internal
    - `T3` Confidential
    - `T4` Secret / Sensitive (Requires Maker-Checker approval)
    - `T5` Top Secret / Apex National Security (Strict Dual-Custody + HSM Key)
  - **Envelope Encryption Pipeline:** When a file is uploaded, the system generates a random 256-bit Data Encryption Key (DEK), encrypts the file with AES-256-GCM, binds Additional Authenticated Data (AAD) to the docket number, wraps the DEK via Vault KMS, and stores the encrypted blob in MinIO.
  - **SHA-256 Bitstream Verification Modal:** Real-time modal where officers can enter any SHA-256 hash or docket number to verify bit-level integrity against the cryptographic ledger.
  - **Decrypted Stream Downloads:** Secure, in-memory decryption stream with dynamic watermark injection.
  - **Version Timeline Drawer:** Historical progression showing all versions, modifier badges, change justifications, and version hashes.

### 🔍 Module 3: Deep OCR & AI Legal Intelligence
- **Role & Purpose:** Automatic optical character recognition and search intelligence for scanned PDFs, FIRs, and physical evidence images.
- **Key Capabilities:**
  - **Asynchronous OCR Queue Pipeline:** Background BullMQ workers process scanned files into clean text and generate PostgreSQL `tsvector` indexes.
  - **Legal Entity Extraction:** Automatically identifies and tags legal entities like Court Case Numbers (CNR), FIR references, IPC/BNS statutory sections, and court seal marks.
  - **Sub-Second Multi-Page Search:** Fast keyword search highlighting exact paragraphs, bounding boxes, and confidence scores (94%–99%).

### ✍️ Module 4: Maker-Checker Dual-Custody Governance (Sensitive Approvals)
- **Role & Purpose:** Enforces the "Four-Eyes Principle" to prevent single-point insider tampering or rogue modifications on high-security (T4/T5) dockets.
- **Key Capabilities:**
  - **Dual-Custody Approval Queue:** Dealing officers (Makers) can propose revisions (v2.0), security elevation, or metadata amendments, which enter a pending review state.
  - **Side-by-Side Diff Inspector:** Designated Approvers (Checkers) inspect original vs. proposed metadata, file size diffs, requester credentials, and statutory justifications.
  - **Cryptographic Sanction & Promotion:** Approver digitally signs off; the system anchors the approval signature, promotes the revision to active status, and archives the historical version.

### 🔒 Module 5: WORM Retention Schedules & Legal Hold Studio
- **Role & Purpose:** Compliance with statutory record lifecycles and court-ordered evidentiary preservation.
- **Key Capabilities:**
  - **Statutory Retention Policies:** 5 pre-configured sovereign schedules (Permanent Cabinet Hold, 30-Year Critical Infrastructure, 10-Year Inter-Agency MoU, 7-Year Public Records Audit, 3-Year Operational Telemetry).
  - **Active Preservation / Legal Holds (`is_legal_hold`):** Allows judicial authorities or CISOs to freeze a docket with formal Order Numbers, Legal Authorities, and Reasons, strictly blocking deletion.
  - **Controlled Disposal Cockpit:** For expired standard files, enforces dual digital authorization: **Key 1 (Requester Sign-Off)** + **Key 2 (Compliance Officer Sign-Off)** before physical cryptographic key zeroization occurs.
  - **Manifest Export:** Export CSV manifests with SHA-256 digital signature headers.

### ⛓️ Module 6: Hyperledger Fabric Blockchain Ledger
- **Role & Purpose:** Independent, immutable Proof-of-Existence and mathematical non-repudiation.
- **Key Capabilities:**
  - **Consortium Network:** Anchors Merkle root digests on Hyperledger Fabric channel `dms-federation-channel` with chaincode `dms-evidence-contract`.
  - **Block Verification Cards:** Displays live block numbers, transaction IDs (`0x...`), endorsing peer nodes, and submission/confirmation timestamps.
  - **Live Proof Modal:** Instant visual verification of transaction inclusion proofs across consortium nodes.

### 🛡️ Module 7: Auditor 360 & Sovereign Telemetry
- **Role & Purpose:** Forensic vigilance and tamper-proof chain of custody monitoring.
- **Key Capabilities:**
  - **WORM Immutable Audit Trail:** Database triggers physically reject any `UPDATE` or `DELETE` on audit tables.
  - **Chained HMAC/SHA-256 Hashes:** Every audit record contains an event hash chained to previous operations.
  - **Risk Classification:** Classifies activity into `Standard`, `Medium (DEK Unwraps)`, and `Flagged Anomalies`.
  - **Officer Dossier Telemetry:** Interactive modal displaying the officer's security badge, department, clearance rank, historical actions, and IP/node telemetry.

### 🌐 Module 8: Inter-Agency Sovereign Highway (Federation)
- **Role & Purpose:** Secure, time-bound, cross-agency document exchange replacing insecure physical pen drives and unencrypted emails.
- **Key Capabilities:**
  - **6 Sovereign Government Nodes:**
    1. *National Digital Governance Authority* (`DEMO` - Central Apex Body)
    2. *High Court of Judicature at Bombay* (`MH-HC-BOM` - Judiciary)
    3. *Central Bureau of Investigation* (`CBI-CYBER-HQ` - Federal Law Enforcement)
    4. *Maharashtra Police CID* (`MH-POL-CID` - State Law Enforcement)
    5. *Directorate of Forensic Science Labs Gujarat* (`GJ-DFS-FSL` - Forensic Science)
    6. *District Collectorate Mumbai* (`MH-REV-MUM` - Civil Administration & Land)
  - **Statutory Requisitions with SLAs:** Formal requisition workflows with priority tiers (*Court Mandate 2h SLA*, *Urgent Warrant 24h SLA*, *High Priority 48h SLA*, *Routine 7d SLA*).
  - **Dynamic Watermarked Ephemeral Shares:** Recipients view documents through time-bound, cryptographically signed tokens with dynamic watermarks showing viewer identity, timestamp, and requisition ID. Automatic expiry and revocation.

### ⚡ Module 9: Asynchronous BullMQ Queues & Notifications
- **Role & Purpose:** High-throughput async task execution without blocking the user interface.
- **Key Capabilities:**
  - Dedicated Redis queues for `ocr-queue`, `blockchain-queue`, `processing-queue`, and `notification-queue`.
  - Real-time notification bell with severity filtering (High, Warning, Info, Success).

### ⚙️ Module 10: Administration & Multi-Tenant Governance
- **Role & Purpose:** Super-admin configuration of institutional entities, departments, and personnel.
- **Key Capabilities:**
  - Multi-tenant isolation with cross-agency federation bridges.
  - Role-Based Access Control (RBAC) permission matrix mapping.
  - Department and user clearance provisioning.

---

## 5. Pre-Seeded Super Admin Demo Persona & Live Numbers

- **Active Super Admin User:** `admin` (Principal Systems Administrator)
- **Password:** `Password@DMS2026!`
- **Role:** `SUPER_ADMIN` (Clearance Level 5 — Top Secret)
- **Home Organization:** `National Digital Governance Authority (DEMO)`
- **Live Numbers in Database:**
  - **77 Vault Documents** across T1 (16), T2 (16), T3 (15), T4 (15), T5 (15)
  - **12 Enrolled Officers** across 5 departments
  - **13 Active WORM Preservation Holds**
  - **5 Records Staged for Controlled Disposal**
  - **8 Pending Maker-Checker Revision Requests**
  - **10 Inter-Agency Requisitions & 5 Active Encrypted Shares**
  - **30 Confirmed Hyperledger Blockchain Anchors**
  - **100+ Cryptographic Audit Events**

---

## 6. Ready-to-Use AI Scriptwriting Prompt Templates

### Prompt Template A: 5-Minute Video Recording Script
```markdown
You are a world-class technology presenter and video scriptwriter.
Using the NIRMAN DMS context above, generate a crisp, engaging 5-minute (approx. 650 words) video demo script.
- Tone: Confident, natural, human-like, professional.
- Structure: Clear timestamps (0:00 to 5:00), exact screen/view to show, specific clicks/actions to perform, and natural spoken dialogue.
- Must cover: Executive Overview, Vault & Envelope Encryption (AES-256), Deep OCR, Maker-Checker Dual-Custody, WORM Retention & Disposal Cockpit, Hyperledger Blockchain, Auditor 360, and Inter-Agency Sovereign Highway.
```

### Prompt Template B: 2-Minute High-Impact Pitch Script (For Judges / Evaluators)
```markdown
You are an expert pitch coach for top-tier hackathons and enterprise tech competitions.
Using the NIRMAN DMS context above, write a 2-minute (approx. 280 words) fast-paced, high-impact pitch script.
- Focus: Problem statement, why NIRMAN DMS is revolutionary (Post-Quantum Envelope Encryption, BSA 2023 Section 65B compliance, WORM, Blockchain, Inter-Agency Highway), live demonstration highlights, and closing impact.
```

### Prompt Template C: Technical Deep-Dive & Architecture Breakdown
```markdown
Using the NIRMAN DMS context above, write a detailed technical walkthrough script explaining how Envelope Encryption, PostgreSQL WORM triggers, HashiCorp Vault KMS, MinIO S3 storage, and Hyperledger Fabric work together to guarantee zero-trust evidentiary integrity.
```
