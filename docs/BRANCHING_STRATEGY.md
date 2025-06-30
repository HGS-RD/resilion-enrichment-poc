# Git Branching Strategy

## Overview

This document outlines the Git branching strategy for the Resilion Enrichment Pre-Loader POC project. We follow a modified GitFlow approach optimized for milestone-based development with automated CI/CD deployment.

## Branch Structure

### Main Branches

#### `main`
- **Purpose**: Production-ready code only
- **Protection**: Protected branch with required PR reviews
- **Deployment**: Automatically deploys to production via CI/CD pipeline
- **Merge Policy**: Only accepts merges from `develop` or hotfix branches
- **Status Checks**: All CI/CD pipeline checks must pass

#### `develop`
- **Purpose**: Integration branch for ongoing development
- **Protection**: Protected branch with required PR reviews
- **Deployment**: Automatically deploys to staging environment
- **Merge Policy**: Accepts merges from feature branches
- **Testing**: Comprehensive testing before merging to `main`

### Supporting Branches

#### Feature Branches

**Milestone-based Features**
```
feature/milestone-[number]-[description]
```
Examples:
- `feature/milestone-1-database-schema`
- `feature/milestone-2-financial-documents`
- `feature/milestone-3-advanced-enrichment`
- `feature/milestone-4-frontend-ui`
- `feature/milestone-5-visualization`
- `feature/milestone-6-cicd-deployment`

**Individual Features**
```
feature/[ticket-number]-[short-description]
```
Examples:
- `feature/RESIL-123-add-mermaid-diagrams`
- `feature/RESIL-456-implement-tier-processing`
- `feature/RESIL-789-enhance-error-handling`

**Bug Fixes**
```
bugfix/[ticket-number]-[short-description]
```
Examples:
- `bugfix/RESIL-321-fix-database-connection`
- `bugfix/RESIL-654-resolve-ui-rendering-issue`

#### Release Branches
```
release/v[major].[minor].[patch]
```
Examples:
- `release/v1.0.0`
- `release/v1.1.0`
- `release/v2.0.0`

#### Hotfix Branches
```
hotfix/[ticket-number]-[critical-issue]
```
Examples:
- `hotfix/RESIL-999-critical-security-patch`
- `hotfix/RESIL-888-production-database-fix`

## Workflow Process

### 1. Feature Development

```bash
# Start new feature from develop
git checkout develop
git pull origin develop
git checkout -b feature/milestone-6-cicd-deployment

# Work on feature
git add .
git commit -m "feat(ci): add GitHub Actions workflow"

# Push feature branch
git push origin feature/milestone-6-cicd-deployment

# Create Pull Request to develop
```

### 2. Code Review Process

**Required Reviewers**: Minimum 1 reviewer for feature branches, 2 for milestone branches

**Review Checklist**:
- [ ] Code follows project conventions
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed

### 3. Integration Testing

```bash
# Merge to develop triggers staging deployment
git checkout develop
git merge feature/milestone-6-cicd-deployment
git push origin develop

# Automated staging deployment and testing
```

### 4. Production Release

```bash
# Create release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/v1.6.0

# Final testing and bug fixes
git commit -m "fix: resolve final staging issues"

# Merge to main for production deployment
git checkout main
git merge release/v1.6.0
git tag v1.6.0
git push origin main --tags

# Merge back to develop
git checkout develop
git merge release/v1.6.0
git push origin develop
```

### 5. Hotfix Process

```bash
# Create hotfix from main
git checkout main
git pull origin main
git checkout -b hotfix/RESIL-999-critical-security-patch

# Fix critical issue
git commit -m "fix: resolve critical security vulnerability"

# Merge to main (triggers immediate deployment)
git checkout main
git merge hotfix/RESIL-999-critical-security-patch
git tag v1.6.1
git push origin main --tags

# Merge to develop
git checkout develop
git merge hotfix/RESIL-999-critical-security-patch
git push origin develop
```

## Milestone Branch Organization

### Milestone Lifecycle

1. **Planning Phase**
   - Create milestone branch from `develop`
   - Define acceptance criteria and deliverables
   - Break down into individual feature tickets

2. **Development Phase**
   - Create feature branches from milestone branch
   - Regular integration back to milestone branch
   - Continuous testing and validation

3. **Integration Phase**
   - Merge milestone branch to `develop`
   - Comprehensive testing in staging environment
   - Documentation and milestone summary creation

4. **Release Phase**
   - Create release branch from `develop`
   - Final testing and bug fixes
   - Merge to `main` for production deployment

### Current Milestone Status

- ✅ **Milestone 1**: `feature/milestone-1-database-schema` (Completed)
- ✅ **Milestone 2**: `feature/milestone-2-financial-documents` (Completed)
- ✅ **Milestone 3**: `feature/milestone-3-advanced-enrichment` (Completed)
- ✅ **Milestone 4**: `feature/milestone-4-frontend-ui` (Completed)
- ✅ **Milestone 5**: `feature/milestone-5-visualization` (Completed)
- 🚀 **Milestone 6**: `feature/milestone-6-cicd-deployment` (In Progress)

## Commit Message Standards

### Format
```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks
- **ci**: CI/CD pipeline changes
- **perf**: Performance improvements

### Examples
```bash
feat(jobs): add real-time job status updates

Implement WebSocket connection for live job monitoring
with automatic reconnection and error handling.

Closes #123

fix(ui): resolve mermaid diagram rendering issue

The Mermaid diagrams were not rendering correctly in
production due to CDN loading timing issues.

- Add proper loading state management
- Implement retry logic for CDN failures
- Add fallback for offline scenarios

Fixes #456

docs(readme): update deployment instructions

Add comprehensive deployment guide including:
- Environment variable configuration
- DigitalOcean App Platform setup
- CI/CD pipeline configuration

test(api): add integration tests for enrichment endpoints

Implement comprehensive test suite covering:
- Job creation and lifecycle management
- Error handling and validation
- Database integration scenarios

Coverage increased from 75% to 92%
```

## Branch Protection Rules

### `main` Branch
- Require pull request reviews (2 reviewers)
- Require status checks to pass
- Require branches to be up to date
- Restrict pushes to administrators only
- Require signed commits

### `develop` Branch
- Require pull request reviews (1 reviewer)
- Require status checks to pass
- Require branches to be up to date
- Allow force pushes for administrators

### Feature Branches
- No protection rules (developer freedom)
- Encourage regular commits and pushes
- Self-review before creating PR

## CI/CD Integration

### Automated Triggers

**On Push to Feature Branch**:
- Linting and code quality checks
- Unit and integration tests
- Security scanning

**On Pull Request to `develop`**:
- Full test suite execution
- Build verification
- Deployment to staging environment

**On Merge to `main`**:
- Production deployment
- Health checks and validation
- Notification and monitoring

### Status Checks

Required status checks for protected branches:
- ✅ Lint & Code Quality
- ✅ Test Suite (Unit + Integration)
- ✅ Build Verification
- ✅ Security Scan
- ✅ E2E Tests

## Best Practices

### Branch Naming
- Use lowercase with hyphens
- Include ticket numbers when applicable
- Keep names descriptive but concise
- Follow established patterns

### Commit Practices
- Make atomic commits (one logical change per commit)
- Write clear, descriptive commit messages
- Use conventional commit format
- Include ticket references

### Pull Request Guidelines
- Provide clear description of changes
- Include testing instructions
- Reference related tickets/issues
- Keep PRs focused and reasonably sized
- Update documentation as needed

### Code Review Standards
- Review for functionality, not just syntax
- Consider performance and security implications
- Provide constructive feedback
- Approve only when confident in changes
- Test locally when possible

## Troubleshooting

### Common Issues

**Merge Conflicts**
```bash
# Resolve conflicts in feature branch
git checkout feature/my-feature
git merge develop
# Resolve conflicts manually
git add .
git commit -m "resolve: merge conflicts with develop"
git push origin feature/my-feature
```

**Failed CI Checks**
```bash
# Fix issues locally and push
git add .
git commit -m "fix: resolve CI pipeline failures"
git push origin feature/my-feature
```

**Accidental Commits to Wrong Branch**
```bash
# Move commits to correct branch
git log --oneline -n 5  # Find commit hash
git checkout correct-branch
git cherry-pick <commit-hash>
git checkout wrong-branch
git reset --hard HEAD~1  # Remove from wrong branch
```

## Tools and Automation

### Git Hooks
- **pre-commit**: Linting and formatting
- **commit-msg**: Commit message validation
- **pre-push**: Local test execution

### GitHub Actions
- Automated testing and deployment
- Status checks and notifications
- Security scanning and monitoring

### Branch Management Tools
- Automatic branch cleanup after merge
- Stale branch detection and notification
- Branch protection rule enforcement

---

This branching strategy ensures code quality, enables parallel development, and supports automated deployment while maintaining production stability.
