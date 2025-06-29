# POC Lean PRD

## **Resilion Enrichment Pre-Loader**

## 1. Background

Resilion is designed to provide customers with operational resilience by connecting cybersecurity, governance, and operational risk for manufacturing sites. During onboarding, customers typically must provide details about their locations, managers, and production footprint. Collecting this manually is error-prone and time-consuming.

This POC aims to bootstrap the enrichment process by taking a company domain name (and optionally their HQ) as a starting point, then automatically crawling public data, extracting manufacturing locations, managers, and other relevant metadata, and writing structured, confidence-ranked results to a staging area.

---

## 2. Problem Statement

New Resilion tenants arrive with only minimal details. Without automated enrichment, their experience feels empty, and onboarding is slow. There is a need to pre-populate their tenant with known facility data to make their first impression of Resilion strong, intelligent, and helpful.

---

## 3. Objective

Provide an automated enrichment service that:

- takes minimal customer seed info (domain, HQ)
- autonomously searches public sources
- extracts manufacturing site details
- assigns confidence scores
- stores enrichment results in a staging database for later promotion to Resilion
- supports multi-step, retryable enrichment chains

This POC will validate that such an approach is feasible, accurate, and operationally lightweight.

---

## 4. Scope

**In scope**

- Trigger enrichment by providing a domain name
- Crawl known sources (e.g., corporate websites, press releases, public databases)
- Extract manufacturing sites, addresses, and optionally plant managers
- Apply a confidence score
- Store results in Postgres
- Store evidence text chunks in Pinecone
- Provide a simple front end to visualize enrichment chains, steps, and results
- One pilot customer test

**Out of scope (for this POC)**

- Advanced graph visualization
- Full-scale drag-and-drop workflow editors
- Complex user role management
- Writing directly to Resilion’s production tenant

---

## 5. Success Criteria

- Given a domain name, the enrichment process completes with more than 80% confidence on location data for at least one pilot company
- Results are persisted in Postgres and Pinecone
- Front end can display job status and results
- Logs are viewable
- Manual inspection confirms data is directionally correct
- All core steps complete in less than 30 minutes per job

---

## 6. Users

- **Primary:** Resilion onboarding team
- **Secondary:** Future Resilion customers benefiting from auto-populated onboarding

---

## 7. Features

- Enrichment agent with chaining capability
- Confidence scoring for each extracted fact
- Intermediate job status tracking
- Semantic chunk storage in Pinecone
- JSON-based enrichment output schema
- Basic visualization in a web frontend (Mermaid diagram with status colors)
- Manual inspection or human-in-the-loop review capability in the future

---

## 8. Constraints

- Must work in DigitalOcean App Platform
- Must use DigitalOcean Managed Postgres
- Must use Pinecone as the vector store
- MVP should avoid tight coupling to Resilion’s production tenant
- Must be documented and auditable

---

## 9. Risks

- Source data could be sparse or incomplete
- Confidence scoring might be unreliable in first version
- LLM hallucinations could slip through
- Front-end status polling could cause performance issues under load
- Overly complex chains might require refactor

---

## 10. Future Considerations

- Add human-in-the-loop review
- Add more advanced data sources (SEC, OSHA, EPA)
- Expand to graph enrichment with Neo4j relationships
- Extend to revenue per site and supply chain dependencies
- Automate promotion to Resilion tenant after approval

---