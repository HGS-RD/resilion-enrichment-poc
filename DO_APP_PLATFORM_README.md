# DigitalOcean App Platform Configuration - Resilion Enrichment Pre-Loader

## 📋 Configuration Summary

This document provides a complete guide for configuring and deploying the Resilion Enrichment Pre-Loader project on DigitalOcean App Platform.

## 🏗️ Infrastructure Setup

### ✅ Completed Components

1. **DigitalOcean App Platform Application**: `pre-loader`
2. **PostgreSQL Database**: `resilion-preloader-db` (managed database)
3. **Project Organization**: Attached to "resilion" project
4. **GitHub Integration**: Connected to repository with auto-deploy on push
5. **Environment Configuration**: Production-ready settings

### 🔧 Configuration Files

- **`app.yaml`**: App Platform configuration specification
- **`Dockerfile`**: Alternative deployment method
- **`scripts/configure-digitalocean-app.js`**: Automated setup script
- **`scripts/update-app-config.js`**: Configuration update script
- **`scripts/get-deployment-logs.js`**: Deployment monitoring script

## 🚨 Current Issue & Resolution

### Issue: Buildpack Detection Failure
The deployment failed with:
```
✘ could not detect app files that match known buildpacks.
```

### Root Cause
DigitalOcean's buildpack system couldn't detect the Node.js project due to the monorepo structure where the Next.js app is in `apps/web/` subdirectory.

### ✅ Solutions Implemented

1. **Updated Build Configuration**:
   - Build Command: `npm install && npm run build:web`
   - Run Command: `cd apps/web && npm start`
   - Source Directory: `/` (root)

2. **Added Monorepo Support**:
   - Created `build:web` script in root package.json
   - Configured turbo to build only the web application

3. **Alternative Dockerfile**:
   - Complete Dockerfile for container-based deployment
   - Includes Puppeteer dependencies for web crawling
   - Security hardening with non-root user

## 🛠️ Manual Configuration Required

Since API automation had terminal output issues, manual configuration is needed:

### Step 1: Update App Configuration in DigitalOcean Dashboard

1. Go to https://cloud.digitalocean.com/apps
2. Find "pre-loader" application
3. Navigate to Settings → Components → Edit web service
4. Update:
   - **Build Command**: `npm install && npm run build:web`
   - **Run Command**: `cd apps/web && npm start`
   - **Source Directory**: `/`

### Step 2: Set Environment Variables

**Required Variables:**
```
NODE_ENV=production
LOG_LEVEL=info
DATABASE_URL=[auto-populated when database linked]
PINECONE_API_KEY=[your-actual-key]
PINECONE_ENVIRONMENT=us-east-1
OPENAI_API_KEY=[your-actual-key]
```

**Optional Variables:**
```
XAI_API_KEY=[for Grok integration]
ANTHROPIC_API_KEY=[for Claude integration]
GOOGLE_API_KEY=[for Gemini integration]
```

### Step 3: Database Configuration

1. Ensure PostgreSQL database "resilion-preloader-db" is linked
2. Verify DATABASE_URL is auto-populated
3. Run database migrations manually after deployment (see migration script)

## 🚀 Deployment Options

### Option 1: Buildpack (Recommended)
- Apply manual configuration changes above
- Trigger new deployment
- Monitor build logs for success

### Option 2: Dockerfile
If buildpack continues to fail:
1. In App Platform dashboard, change deployment method to "Dockerfile"
2. Use the provided `Dockerfile` in the repository
3. Trigger deployment

## 📋 Environment Variables Setup

### Required API Token Scopes
The DigitalOcean Personal Access Token needs these scopes:
- `read` and `write` access to Apps
- `read` and `write` access to Databases
- `read` and `write` access to Projects

### Environment Variables in .env
```bash
# DigitalOcean Configuration
DIGITALOCEAN_ACCESS_TOKEN=dop_v1_[your-token]

# Database Configuration (auto-populated in production)
DATABASE_URL=postgresql://[user]:[pass]@[host]:[port]/[db]?sslmode=require

# AI Service APIs
PINECONE_API_KEY=[your-pinecone-key]
PINECONE_ENVIRONMENT=us-east-1
OPENAI_API_KEY=[your-openai-key]

# Application Settings
NODE_ENV=production
LOG_LEVEL=info
```

## 🔍 Verification Steps

After successful deployment:

1. **App Status**: Check dashboard shows "Active"
2. **Health Check**: Visit `/api/health` endpoint
3. **Database**: Verify connection and migrations
4. **Environment**: Confirm all variables are loaded
5. **Functionality**: Test enrichment job creation

## 📝 Troubleshooting

### Common Issues

1. **"turbo: command not found"**
   - Solution: Ensure turbo is in dependencies or use Dockerfile

2. **"Cannot resolve module '@workspace/ui'"**
   - Solution: Verify workspace configuration in package.json

3. **Database connection errors**
   - Solution: Check DATABASE_URL and database linking

4. **Environment variables not available**
   - Solution: Set in DigitalOcean dashboard, not just .env

### Debug Commands

```bash
# Check deployment logs
node scripts/get-deployment-logs.js

# Validate configuration
node scripts/validate-deployment.js

# Update app configuration
node scripts/update-app-config.js
```

## 🔗 Resources

- [DigitalOcean App Platform Documentation](https://docs.digitalocean.com/products/app-platform/)
- [Buildpacks Documentation](https://do.co/apps-buildpacks)
- [Environment Variables Guide](https://docs.digitalocean.com/products/app-platform/how-to/use-environment-variables/)
- [Database Integration](https://docs.digitalocean.com/products/app-platform/how-to/manage-databases/)

## 📞 Next Steps

1. Apply manual configuration changes in DigitalOcean dashboard
2. Set actual API keys in environment variables
3. Trigger new deployment and monitor logs
4. Test deployed application functionality
5. Set up monitoring and alerts
6. Configure custom domain (if needed)

---

**Note**: This configuration supports the monorepo structure with Turbo, Next.js 15, and all required dependencies for the Resilion Enrichment Pre-Loader application.
