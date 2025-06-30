# Resilion Enrichment Pre-Loader POC

[![CI/CD Pipeline](https://github.com/HGS-RD/resilion-enrichment-poc/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/HGS-RD/resilion-enrichment-poc/actions/workflows/ci-cd.yml)
[![Test Coverage](https://codecov.io/gh/HGS-RD/resilion-enrichment-poc/branch/main/graph/badge.svg)](https://codecov.io/gh/HGS-RD/resilion-enrichment-poc)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Overview

The Resilion Enrichment Pre-Loader is a production-grade system designed to accelerate onboarding of new Resilion customers by automatically enriching known facility data. Given a minimal input, such as a company domain name, the system performs sophisticated multi-tier enrichment:

### 🎯 Core Capabilities

- **🏢 Tier 1 - Corporate Data**: Crawls corporate websites and SEC financial documents for facility information
- **💼 Tier 2 - Professional Data**: Extracts data from LinkedIn profiles and job postings
- **📰 Tier 3 - News Intelligence**: Analyzes relevant news articles for facility mentions
- **🤖 Multi-LLM Support**: Choose from GPT-4o, Claude 3 Opus, or Gemini 1.5 Pro
- **📊 Real-time Monitoring**: Live workflow visualization with Mermaid diagrams
- **🎨 Professional UI**: Modern Next.js 14 interface with shadcn/ui components

### 🏗️ Architecture Highlights

- **Frontend**: Next.js 14 with App Router, TypeScript, shadcn/ui, TailwindCSS
- **Backend**: Node.js with AI SDK orchestration and advanced enrichment engine
- **Database**: PostgreSQL with comprehensive job and fact tracking
- **Vector Store**: Pinecone for semantic evidence retrieval
- **Deployment**: DigitalOcean App Platform with automated CI/CD
- **Monitoring**: Real-time job progress, error handling, and performance metrics

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** and npm
- **PostgreSQL Database** (DigitalOcean Managed recommended)
- **Pinecone Account** for vector storage
- **LLM API Keys** (OpenAI, Anthropic, or Google)

### Installation

1. **Clone and Install**
   ```bash
   git clone https://github.com/HGS-RD/resilion-enrichment-poc.git
   cd resilion-enrichment-poc
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration (see Environment Variables section)
   ```

3. **Database Setup**
   ```bash
   # Apply database schema
   psql $DATABASE_URL -f db/schema.sql
   
   # Optional: Add sample data
   psql $DATABASE_URL -f db/migrations/002_seed_data.sql
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3001](http://localhost:3001) to view the application.

---

## 🔧 Environment Variables

### Required Configuration

Create a `.env` file with the following variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require

# Vector Database
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=your_index_name
PINECONE_INDEX_HOST=https://your-index-host.svc.pinecone.io
PINECONE_ENVIRONMENT=us-east-1

# LLM API Keys (configure at least one)
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_API_KEY=your_google_api_key

# External APIs
BING_NEWS_API_KEY=your_bing_news_api_key

# Application Settings
NODE_ENV=development
LOG_LEVEL=info
PORT=3001
```

See `.env.example` for complete configuration options.

---

## 📁 Project Structure

```
resilion-enrichment-poc/
├── 🌐 apps/web/                    # Next.js 14 Application
│   ├── app/                       # App Router Pages
│   │   ├── dashboard/             # 📊 Main Dashboard
│   │   ├── jobs/                  # 💼 Job Management
│   │   │   └── [id]/              # 🔍 Job Detail View
│   │   ├── facts/                 # 📋 Facts Viewer
│   │   └── api/                   # 🔌 API Routes
│   ├── lib/                       # 🛠️ Core Services
│   │   ├── services/              # Business Logic
│   │   │   ├── advanced-enrichment-orchestrator.ts
│   │   │   ├── tier-processors/   # Tier-specific processors
│   │   │   └── financial-document-parser.ts
│   │   └── repositories/          # Data Access Layer
├── 📦 packages/ui/                 # Shared UI Components
│   └── src/components/            # shadcn/ui Components
│       ├── mermaid-workflow.tsx   # 📊 Workflow Visualization
│       ├── fact-card.tsx          # 📄 Fact Display
│       └── job-status-badge.tsx   # 🏷️ Status Indicators
├── 🗄️ db/                         # Database
│   ├── schema.sql                 # Complete Schema
│   └── migrations/                # Migration Scripts
├── 🚀 .github/workflows/          # CI/CD Pipeline
├── 📚 docs/                       # Documentation
└── 🔧 dev/                        # Development Resources
```

---

## 🎯 Key Features

### 🔄 Multi-Tier Enrichment Engine

1. **Tier 1 - Corporate Intelligence**
   - Corporate website crawling with depth limits
   - SEC EDGAR financial document parsing
   - Facility extraction from annual reports
   - Business segment analysis

2. **Tier 2 - Professional Networks**
   - LinkedIn profile analysis
   - Job posting data extraction
   - Professional network insights

3. **Tier 3 - News Intelligence**
   - Bing News API integration
   - Relevance scoring and filtering
   - Source reputation weighting

### 🤖 Advanced LLM Integration

- **Multi-Provider Support**: OpenAI GPT-4o, Anthropic Claude 3 Opus, Google Gemini 1.5 Pro
- **Confidence Scoring**: AI-powered confidence assessment for extracted facts
- **Evidence Tracking**: Complete source attribution with text snippets
- **Structured Output**: JSON schema validation for consistent data extraction

### 📊 Real-Time Monitoring

- **Live Workflow Visualization**: Mermaid diagrams with real-time status updates
- **Progress Tracking**: Step-by-step job execution monitoring
- **Error Handling**: Comprehensive error capture and user-friendly display
- **Performance Metrics**: Job statistics, runtime tracking, and success rates

### 🎨 Professional User Interface

- **Modern Design**: shadcn/ui components with professional styling
- **Responsive Layout**: Mobile, tablet, and desktop optimized
- **Dark/Light Themes**: User preference support
- **Real-Time Updates**: Live job status and progress updates
- **Export Capabilities**: JSON data export and SVG workflow diagrams

---

## 🔌 API Reference

### Job Management

```typescript
// Create new enrichment job
POST /api/enrichment
{
  "domain": "microsoft.com",
  "llm_choice": "gpt-4o"
}

// Get job details with statistics
GET /api/enrichment/{id}

// Start job execution
POST /api/enrichment/{id}/start

// List all jobs with filtering
GET /api/enrichment?status=running&limit=10
```

### Facts and Data

```typescript
// Get facts for a job
GET /api/facts?job_id={id}

// Validate/invalidate facts
PUT /api/facts/{id}/validate
{
  "validated": true
}
```

### Health and Monitoring

```typescript
// Application health check
GET /api/health

// Job statistics and metrics
GET /api/enrichment/{id}/statistics
```

---

## 🧪 Testing Strategy

### Comprehensive Test Suite

```bash
# Unit Tests
npm run test:unit

# Integration Tests  
npm run test:integration

# End-to-End Tests
npm run test:e2e

# Test Coverage Report
npm run test:coverage

# All Tests (CI Pipeline)
npm run test:ci
```

### Test Categories

- **Unit Tests**: Service layer, repositories, utilities
- **Integration Tests**: API endpoints, database operations
- **E2E Tests**: Complete user workflows with Playwright
- **Visual Tests**: UI component regression testing
- **Performance Tests**: Load testing and optimization

---

## 🚀 Deployment

### Automated CI/CD Pipeline

The project includes a comprehensive GitHub Actions pipeline:

- **✅ Linting & Code Quality**: ESLint, TypeScript checking
- **🧪 Testing**: Unit, integration, and E2E tests
- **🔒 Security Scanning**: npm audit, Snyk vulnerability scanning  
- **📦 Build & Artifacts**: Application building and artifact management
- **🚀 Deployment**: Automated deployment to DigitalOcean App Platform
- **📊 Monitoring**: Health checks and deployment validation

### DigitalOcean App Platform

Deployment is fully automated via `app.yaml` configuration:

```yaml
# Production deployment with managed database
name: resilion-enrichment-preloader
services:
  - name: web
    build_command: ./build.sh
    run_command: cd apps/web && npm start
    health_check:
      http_path: /api/health
databases:
  - name: resilion-preloader-db
    engine: PG
    version: "15"
    production: true
```

### Required Secrets

Configure these secrets in your GitHub repository and DigitalOcean App Platform:

- `DIGITALOCEAN_ACCESS_TOKEN`
- `DO_APP_ID`
- `DATABASE_URL`
- `PINECONE_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_API_KEY`
- `BING_NEWS_API_KEY`

---

## 📈 Development Workflow

### Git Branching Strategy

- **`main`**: Production-ready code with automated deployment
- **`develop`**: Integration branch for feature development
- **`feature/milestone-*`**: Milestone-based feature branches
- **`feature/ticket-*`**: Individual feature implementations

### Commit Standards

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat(jobs): add real-time job status updates
fix(ui): resolve mermaid diagram rendering issue
docs(readme): update deployment instructions
test(api): add integration tests for enrichment endpoints
```

### Development Milestones

- ✅ **Milestone 1**: Database Schema & LLM Integration
- ✅ **Milestone 2**: Financial Document Processing Engine  
- ✅ **Milestone 3**: Advanced Enrichment Logic & Job Management
- ✅ **Milestone 4**: Frontend Scaffolding & Core UI
- ✅ **Milestone 5**: Frontend Visualization & Data Display
- 🚀 **Milestone 6**: CI/CD, Deployment & Documentation *(Current)*

---

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** following the coding standards
4. **Add tests** for new functionality
5. **Commit your changes**: `git commit -m 'feat: add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Code Quality Standards

- **TypeScript**: Full type safety throughout the application
- **ESLint**: Consistent code formatting and best practices
- **Testing**: Comprehensive test coverage for all new features
- **Documentation**: Clear documentation for all public APIs

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🆘 Support

- **Documentation**: Check the `/docs` directory for detailed guides
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Discussions**: Join project discussions for questions and ideas

---

## 🎉 Acknowledgments

- **shadcn/ui**: Beautiful and accessible UI components
- **Next.js**: The React framework for production
- **Mermaid**: Diagram and flowchart generation
- **DigitalOcean**: Cloud infrastructure and deployment platform
- **Pinecone**: Vector database for semantic search
- **OpenAI, Anthropic, Google**: LLM providers for intelligent extraction

---

**Built with ❤️ for the Resilion ecosystem**
