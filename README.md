# Resilion Enrichment Pre-Loader POC

## Overview

The Resilion Enrichment Pre-Loader is a proof-of-concept designed to accelerate onboarding of new Resilion customers by automatically enriching known facility data. Given a minimal input, such as a company domain name, the system performs the following:

- Crawls public sources for relevant facility data
- Extracts site names, addresses, site types, and key metadata
- Applies confidence scores to each extracted fact
- Stores enrichment facts in a staging database
- Stores evidence text chunks and embeddings in a vector store for semantic retrieval
- Provides a lightweight user interface to monitor and validate enrichment jobs

The goal is to improve the "first experience" of Resilion customers by populating their onboarding environment with known industrial site data, reducing manual data entry and accelerating time-to-value.

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
- **Frontend**: Next.js, TailwindCSS, shadcn/ui
- **Backend**: Node.js with AI SDK orchestration
- **Database**: DigitalOcean Managed Postgres
- **Vector Store**: Pinecone
- **Visualization**: Mermaid.js diagrams and React components
- **Deployment**: DigitalOcean App Platform

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- DigitalOcean Managed Postgres database
- Pinecone account and API key
- OpenAI API key (or other LLM provider)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/your-org/resilion-enrichment-poc.git
   cd resilion-enrichment-poc
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up environment variables:**

   Copy the example environment file and configure your settings:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your actual configuration values (see Environment Variables section below).

4. **Set up the database:**

   Run the initial migration to create the database schema:

   ```bash
   # Apply the initial schema
   psql $DATABASE_URL -f db/migrations/001_initial_schema.sql
   
   # Optional: Add sample data for development
   psql $DATABASE_URL -f db/migrations/002_seed_data.sql
   ```

5. **Start the development server:**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## Environment Variables

The application requires the following environment variables. Copy `.env.example` to `.env` and configure:

### Database Configuration

```bash
# DigitalOcean Managed Postgres Database Configuration
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password
DB_HOST=your_db_host
DB_PORT=25060
DB_NAME=defaultdb
DB_SSLMODE=require

# Constructed DATABASE_URL for connection
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
```

### Pinecone Vector Database

```bash
# Pinecone Vector Database Configuration
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=your_index_name
PINECONE_INDEX_HOST=https://your-index-host.svc.pinecone.io
PINECONE_ENVIRONMENT=us-east-1
PINECONE_DIMENSIONS=1024
PINECONE_METRIC=cosine
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1
```

### LLM API Keys

```bash
# LLM API Keys Configuration (choose one or more)
OPENAI_API_KEY=your_openai_api_key_here
XAI_API_KEY=your_xai_grok_api_key_here
ANTHROPIC_API_KEY=your_anthropic_claude_api_key_here
GOOGLE_API_KEY=your_google_gemini_api_key_here
```

### Application Settings

```bash
# Application Configuration
LOG_LEVEL=info
NODE_ENV=development

# Next.js Configuration
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000

# Migration and Database Management
DB_MIGRATE_ON_START=false
DB_SEED_ON_START=false
```

---

## Project Structure

```
resilion-enrichment-poc/
├── apps/
│   └── web/                    # Next.js frontend application
│       ├── app/               # App router pages
│       │   ├── dashboard/     # Dashboard page
│       │   ├── jobs/          # Enrichment jobs page
│       │   └── facts/         # Facts viewer page
│       └── components/        # React components
├── packages/
│   └── ui/                    # Shared UI components (shadcn/ui)
│       └── src/
│           ├── components/    # Reusable UI components
│           └── styles/        # Global styles
├── db/
│   ├── schema.sql            # Complete database schema
│   └── migrations/           # Database migration files
├── docs/                     # Project documentation
├── dev/                      # Development resources
│   ├── development_plan.md   # Engineering development plan
│   └── ui/                   # UI mockups and designs
└── memory-bank/              # Project learnings and reflections
```

---

## Database Schema

The application uses PostgreSQL with the following main tables:

- **`enrichment_jobs`**: Tracks enrichment job status and progress
- **`enrichment_facts`**: Stores extracted facts with confidence scores
- **`failed_jobs`**: Dead letter queue for failed jobs
- **`job_logs`**: Detailed logging for debugging and monitoring

See `db/schema.sql` for the complete schema definition.

---

## Development Workflow

### Git Workflow

- **main**: Production-ready code only
- **feature/[milestone-name]**: Feature branches for each milestone
- **feature/[ticket-number]-[description]**: Individual ticket branches

### Commit Standards

Use conventional commits format: `type(scope): description`

- **Types**: feat, fix, docs, style, refactor, test, chore
- **Examples**:
  - `feat(setup): monorepo structure and initial config`
  - `fix(ui): resolve shadcn/ui styling issues`
  - `docs(readme): add environment variables documentation`

### Development Milestones

1. **Milestone 1**: Foundation & Setup ✅
2. **Milestone 2**: Backend Core Logic
3. **Milestone 3**: AI-Powered Extraction
4. **Milestone 4**: Frontend Implementation
5. **Milestone 5**: Integration, Testing & Deployment

---

## API Endpoints

### Enrichment Jobs

- `POST /api/jobs` - Create new enrichment job
- `GET /api/jobs` - List all enrichment jobs
- `GET /api/jobs/:id` - Get specific job details
- `POST /api/jobs/:id/retry` - Retry failed job

### Facts

- `GET /api/facts` - List extracted facts
- `GET /api/facts/:jobId` - Get facts for specific job
- `PUT /api/facts/:id/validate` - Validate/invalidate fact

---

## Deployment

### DigitalOcean App Platform

The application is designed for deployment on DigitalOcean App Platform:

1. **Connect your repository** to DigitalOcean App Platform
2. **Configure environment variables** in the App Platform dashboard
3. **Set build command**: `npm run build`
4. **Set run command**: `npm start`
5. **Configure database** connection to your DigitalOcean Managed Postgres

### Environment Setup

Ensure all required environment variables are configured in the App Platform dashboard before deployment.

---

## Testing

### Unit Tests

```bash
npm run test
```

### Integration Tests

```bash
npm run test
