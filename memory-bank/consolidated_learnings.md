# Consolidated Learnings

## Project Planning & Architecture

### Document-Driven Development Planning
**Pattern**: When tasked with complex project planning, systematically read all provided documentation before generating plans.
**Rationale**: Ensures comprehensive understanding of requirements, constraints, and design decisions before committing to an architecture.
**Application**: Use for any multi-document project planning scenario.

### Multi-Service Architecture Planning
**Pattern**: For POCs involving multiple technologies (AI, databases, frontend), create clear component diagrams and define integration points early.
**Key Components**: 
- Frontend (UI/UX)
- Backend Orchestration (Business Logic)
- Data Persistence (Structured & Vector)
- External APIs (AI, Third-party)
**Best Practice**: Use Mermaid diagrams to visualize component relationships and data flow.

### Risk-First Planning Approach
**Pattern**: Identify and document risks with mitigation strategies before detailed implementation planning.
**Common Risk Categories**:
- Data Quality/Availability
- External API Dependencies
- LLM Reliability/Hallucinations
- Scope Creep
- Performance Under Load
**Application**: Essential for AI-driven applications where data quality and model reliability are critical.

## AI & LLM Integration

### Prompt Engineering as Code
**Pattern**: Treat prompts as first-class code artifacts requiring versioning, testing, and validation.
**Implementation**:
- Store prompts in dedicated `prompts/` directory
- Version control with explicit version headers
- Include JSON schema validation
- Create test suites for prompt validation
**Rationale**: Prevents prompt drift and ensures consistent AI behavior across deployments.

### Chain-of-Responsibility for AI Workflows
**Pattern**: Structure AI-driven workflows as modular chains where each step has a single responsibility.
**Example Steps**: crawl → chunk → embed → extract → score → persist → finalize
**Benefits**: 
- Easier debugging and testing
- Modular retry logic
- Clear progress tracking
- Extensible for future enhancements

## Data Architecture

### Hybrid Storage Strategy
**Pattern**: Use both relational and vector databases for different data types in AI applications.
**Relational DB**: Job metadata, structured facts, audit logs
**Vector DB**: Text embeddings, semantic search, evidence chunks
**Integration**: Link records via common identifiers (e.g., enrichment_job_id)

### Confidence-Driven Data Quality
**Pattern**: Assign confidence scores to all AI-extracted data and use them for downstream processing decisions.
**Implementation**: 0-1.0 scale with clear thresholds for different actions
**Applications**: Human-in-the-loop review, automated promotion, data visualization

## Development Practices

### Milestone-Based POC Development
**Pattern**: Structure POC development in 5 clear milestones with specific deliverables.
**Typical Milestones**:
1. Foundation & Setup
2. Backend Core Logic
3. AI Integration
4. Frontend Implementation
5. Integration & Testing
**Benefits**: Clear progress tracking, manageable scope, early risk identification

### Environment-First Configuration
**Pattern**: Design applications with environment variables as the primary configuration mechanism.
**Critical Variables**: Database connections, API keys, feature flags, logging levels
**Best Practice**: Document all required environment variables in README with examples

## Reusable Code Patterns

### Repository Pattern for Data Access
**Pattern**: Abstract data access behind repository interfaces to separate business logic from persistence details.
**Example**: `PostgresRepository`, `PineconeRepository`
**Benefits**: Testability, flexibility, clear separation of concerns

### Typed Interfaces Matching Schemas
**Pattern**: Create TypeScript interfaces that mirror JSON schemas for type safety.
**Implementation**: Ensure interface properties match schema field names exactly
**Benefits**: Compile-time validation, better IDE support, reduced runtime errors

## Frontend Development Patterns

### Turborepo Monorepo Architecture
**Pattern**: Use Turborepo for scalable monorepo structure with shared component libraries.
**Structure**:
- `packages/ui/` - Shared UI components with TypeScript interfaces
- `apps/web/` - Next.js application consuming UI package
- Root-level `turbo.json` for build orchestration
- Workspace dependencies managed via package.json workspaces
**Benefits**: Code reuse, consistent design system, independent deployments

### shadcn/ui Component System Implementation
**Pattern**: Build professional UI component library with shadcn/ui patterns.
**Key Dependencies**: `class-variance-authority`, `clsx`, `tailwind-merge`
**Component Structure**: Use `cva()` for variant systems, proper TypeScript interfaces
**Example**:
```typescript
const buttonVariants = cva("base-classes", {
  variants: { variant: { default: "...", destructive: "..." } }
})
```
**Application**: Enterprise-grade component libraries with consistent styling

### Tailwind CSS v4 Integration
**Pattern**: Use `@tailwindcss/postcss` plugin instead of direct `tailwindcss` plugin for newer versions.
**PostCSS Config**:
```js
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```
**Rationale**: Newer Tailwind versions moved PostCSS functionality to separate package.

### CSS Custom Properties for Theming
**Pattern**: Use CSS custom properties (variables) for theme values instead of hardcoded colors.
**Implementation**: Define theme variables in `:root` and `.dark` selectors, reference with `hsl(var(--variable-name))`
**Benefits**: Dynamic theme switching, consistent color system, better maintainability

### Module Resolution Fallback Strategy
**Pattern**: When TypeScript path aliases fail, use relative imports as fallback.
**Primary**: `import { Component } from "@/components/component"`
**Fallback**: `import { Component } from "../components/component"`
**Application**: Essential for monorepo setups where path resolution can be complex

## Git Workflow & Version Control

### Feature Branch Development Strategy
**Pattern**: Use feature branches for all development work with clear naming conventions.
**Branch Types**:
- `feature/[milestone-name]` - For major milestones
- `feature/[ticket-number]-[description]` - For individual tickets
- `main` - Production-ready code only
**Benefits**: Clean history, isolated development, proper code review process

### Conventional Commit Standards
**Pattern**: Use structured commit messages following conventional commit format.
**Format**: `type(scope): description`
**Common Types**: feat, fix, docs, style, refactor, test, chore
**Example**: `feat(auth): add user authentication with JWT tokens`
**Benefits**: Clear change history, automated changelog generation, semantic versioning support

### Development Plan Integration
**Pattern**: Include git best practices as final step in all development tickets and milestones.
**Implementation**: Add "Git: commit changes, push to feature branch, create PR" to each ticket
**Rationale**: Ensures consistent version control practices and prevents work from being lost
**Application**: Essential for team development and project continuity

---

*Last Updated: 2025-06-29*
*Next Review: After first POC implementation milestone*
