# Resilion Enrichment Pre-Loader POC

## Overview

The Resilion Enrichment Pre-Loader is a proof-of-concept designed to accelerate onboarding of new Resilion customers by automatically enriching known facility data. Given a minimal input, such as a company domain name, the system performs the following:

- Crawls public sources for relevant facility data
- Extracts site names, addresses, site types, and key metadata
- Applies confidence scores to each extracted fact
- Stores enrichment facts in a staging database
- Stores evidence text chunks and embeddings in a vector store for semantic retrieval
- Provides a lightweight user interface to monitor and validate enrichment jobs

The goal is to improve the “first experience” of Resilion customers by populating their onboarding environment with known industrial site data, reducing manual data entry and accelerating time-to-value.

---

## Features

- Domain-based enrichment trigger
- Multi-step enrichment agent chain (crawl, chunk, embed, extract, score, persist)
- Confidence scoring for facts
- Postgres storage for enrichment metadata
- Pinecone vector storage for semantic evidence retrieval
- Workflow visualization with Mermaid diagrams
- Simple job status tracking and error handling
- Modular design for chaining and future extensions
- Designed to integrate with Resilion onboarding in future phases

---

## Architecture

- **Language / Framework**: TypeScript (AI SDK), Python (optional FastAPI microservices)
- **Frontend**: Next.js, TailwindCSS
- **Backend**: Node.js with AI SDK orchestration
- **Database**: DigitalOcean Managed Postgres
- **Vector Store**: Pinecone
- **Visualization**: Mermaid.js diagrams and React components
- **Deployment**: DigitalOcean App Platform

---

## Getting Started

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-org/resilion-enrichment-poc.git
   cd resilion-enrichment-poc
