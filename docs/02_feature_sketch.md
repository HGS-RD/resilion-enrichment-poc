# Feature Sketch

## **Resilion Enrichment Pre-Loader POC**

---

## 1. Overview

This feature sketch describes the key capabilities and minimal implementation features for the enrichment pre-loader POC. The purpose is to guide design and code generation in a consistent and structured way, while avoiding over-engineering.

---

## 2. Core Features

**1. Enrichment Trigger**

- Accept a domain name (and optionally HQ location) as input
- Support manual trigger through a simple UI button
- Store an enrichment job record with timestamp and status

**2. Data Retrieval**

- Crawl public sources:
    - corporate websites
    - press releases
    - publicly available directories
- Retrieve unstructured text containing site names and addresses

**3. Entity Extraction**

- Use AI SDK and prompt-based extraction to pull:
    - site names
    - addresses
    - optional plant manager names
- Enforce a strict JSON output schema
- Apply consistent parsing rules to reduce hallucinations

**4. Confidence Scoring**

- Assign confidence to each extracted fact (0–1.0)
- Confidence factors may include:
    - source type
    - mention frequency
    - string match similarity

**5. Storage**

- Store enrichment facts in Postgres
- Store extracted evidence chunks and embeddings in Pinecone
- Link facts to enrichment job IDs for traceability

**6. Chaining**

- Enable enrichment tasks to proceed in multiple passes
    - first pass: site names
    - second pass: manager names
    - third pass: revenue or size
- Persist intermediate states to Postgres

**7. Visualization**

- Provide a simple front end showing:
    - enrichment job status
    - step-by-step chain progress
    - facts and confidence levels
- Use a Mermaid diagram with color-coded status
- Support manual refresh or polling

**8. Error Handling and Resilience**

- Record errors and allow retries
- Mark failed jobs with reason
- Avoid duplicate enrichment for the same domain within a short time window

---

## 3. Nice-to-Have Features (Stretch Goals)

- Human-in-the-loop review flow (simple “approve/reject” UI)
- Support for additional data sources (e.g., OSHA, SEC filings)
- Trigger enrichment from Resilion directly via webhook
- Job prioritization or queuing for multiple enrichments

---

## 4. Non-Functional Requirements

- Must be deployable on DigitalOcean App Platform
- Must integrate with DigitalOcean Managed Postgres
- Must store semantic embeddings in Pinecone
- Should respond to enrichment requests in under 30 seconds (trigger/ack)
- Should complete the enrichment pipeline for a single domain within 30 minutes

---

## 5. Out of Scope (Explicit)

- Multi-user permission models
- Fine-grained role-based access control
- Advanced graph visual editors
- Billing and cost tracking
- Resilion production data writes

---