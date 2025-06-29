# Tech Stack Notes

## **Resilion Enrichment Pre-Loader POC**

## 1. Overview

This document outlines the technology stack choices for the enrichment pre-loader POC, with a focus on balancing speed, simplicity, maintainability, and alignment with Resilion’s broader ecosystem.

---

## 2. Core Technologies

**AI SDK**

- JavaScript/TypeScript-based orchestration framework
- Rapid prompt design and agent chains
- Supports native tool calling and streaming
- Maintains developer familiarity with TypeScript

**Next.js**

- Provides the lightweight POC front end
- Supports serverless endpoints for triggers if needed
- React-based, consistent with Resilion standards
- Supports easy deployment on DigitalOcean App Platform

**FastAPI**

- Optional lightweight Python endpoint
- Can support spaCy or future Python-based models if needed
- Flexible for chaining Python-based enrichment tasks
- Good for exposing additional microservices later

**Postgres (DigitalOcean Managed Postgres)**

- Relational storage for enrichment job metadata
- JSONB columns for semi-structured enrichment facts
- Easy to index by site name, enrichment job ID
- Managed service for operational simplicity

**Pinecone**

- Managed vector database
- Stores text chunk embeddings for semantic retrieval
- Supports similarity search for evidence
- Well-documented integrations with LangChain, AI SDK, and Python clients

**Mermaid.js**

- Front-end workflow visualization (status diagrams)
- Supports simple, clear sequence and flow diagrams
- No complex drag/drop workflow needed at POC stage

**DigitalOcean App Platform**

- Simplified deployment for Node.js/TypeScript and Python workloads
- Automatic HTTPS, scaling, and GitHub integration
- Lower DevOps burden for a rapid POC

---

## 3. Why These Tools

- **AI SDK**: fastest time to prototype with modern agent patterns
- **Postgres**: proven, flexible, supports JSONB for semi-structured data
- **Pinecone**: removes vector store infrastructure complexity
- **Next.js**: supports a rapid front-end with a React-compatible team
- **FastAPI**: future option if spaCy or other Python NLP models are introduced
- **App Platform**: deploy easily, no K8s overhead for the POC
- **Mermaid**: easy visual diagrams, no major front-end engineering investment

---

## 4. Deployment Strategy

- Single monorepo for API, agent logic, and front end
- GitHub-driven CI/CD pipeline with DigitalOcean App Platform
- Environment variables managed through App Platform
- Database migration scripts (SQL or Prisma) versioned in the repo
- Pinecone environment configured through its own API keys

---

## 5. Observability

- Application logs to DigitalOcean
- Postgres audit logs for enrichment job tracking
- Optionally wire to Sentry or another error monitoring platform
- Future consideration: Prometheus/Grafana for metrics if needed

---

## 6. Next Steps

- Confirm the AI SDK initial architecture
- Build a lightweight job tracking table in Postgres
- Set up Pinecone namespace for enrichment evidence
- Establish consistent environment variable patterns
- Wire Mermaid visualization into the front end
- Plan first round of POC testing with a known domain

---