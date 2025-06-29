# DigitalOcean App Platform Deployment Fix

## 🚨 Issue Identified

The deployment was failing with the error:
```
✘ could not detect app files that match known buildpacks.
please ensure that the files required by the desired language's buildpack exist in the repo.
```

## 🔍 Root Cause

DigitalOcean's buildpack detection system couldn't identify this as a Node.js project because:

1. **Monorepo Structure**: The Next.js application is located in `apps/web/` subdirectory
2. **Missing Detection Files**: Buildpack was looking for `package.json` and Node.js files in the root
3. **Incorrect Build Commands**: The original configuration didn't properly handle the monorepo structure

## ✅ Solutions Implemented

### 1. Updated Root Package.json
Added a specific build script for the web application:
```json
{
  "scripts": {
    "build:web": "turbo build --filter=web"
  }
}
```

### 2. Fixed App.yaml Configuration
Updated the build and run commands to work with the monorepo:
```yaml
services:
- name: web
  source_dir: /
  build_command: npm install && npm run build:web
  run_command: cd apps/web && npm start
  environment_slug: node-js
```

### 3. Created Update Script
Built `scripts/update-app-config.js` to programmatically update the DigitalOcean app configuration via API.

## 🛠️ Manual Steps Required

Since the API scripts aren't showing output in the terminal, you'll need to manually update the app configuration in the DigitalOcean dashboard:

### Step 1: Access DigitalOcean Dashboard
1. Go to https://cloud.digitalocean.com/apps
2. Find the "pre-loader" application
3. Click on it to view details

### Step 2: Update App Configuration
1. Go to the "Settings" tab
2. Find the "Components" section
3. Click "Edit" on the web service
4. Update the following fields:

**Build Command:**
```bash
npm install && npm run build:web
```

**Run Command:**
```bash
cd apps/web && npm start
```

**Source Directory:** `/` (root)

### Step 3: Environment Variables
Ensure these environment variables are set in the DigitalOcean dashboard:

**Required for Build & Runtime:**
- `DATABASE_URL` (should be auto-populated when database is linked)
- `PINECONE_API_KEY` (your actual Pinecone API key)
- `PINECONE_ENVIRONMENT` = `us-east-1`
- `OPENAI_API_KEY` (your actual OpenAI API key)
- `NODE_ENV` = `production`
- `LOG_LEVEL` = `info`

**Optional but Recommended:**
- `XAI_API_KEY` (if using Grok)
- `ANTHROPIC_API_KEY` (if using Claude)
- `GOOGLE_API_KEY` (if using Gemini)

### Step 4: Database Connection
1. Ensure the PostgreSQL database "resilion-db" is linked to the app
2. Verify that `DATABASE_URL` is automatically populated
3. Check that the database migration job is configured

### Step 5: Trigger New Deployment
1. After making the configuration changes, trigger a new deployment
2. Monitor the build logs for success
3. Check that the buildpack detection now works

## 🔧 Alternative Solution: Dockerfile

If the buildpack approach continues to fail, we can switch to a Dockerfile-based deployment:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./

# Copy workspace packages
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# Install dependencies
RUN npm install

# Build the application
RUN npm run build:web

# Change to web app directory
WORKDIR /app/apps/web

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
```

## 📋 Verification Steps

After deployment succeeds:

1. **Check App Status**: Verify the app shows as "Active" in the dashboard
2. **Test Health Endpoint**: Visit `https://your-app-url/api/health`
3. **Monitor Logs**: Check runtime logs for any errors
4. **Test Core Functionality**: Try creating an enrichment job

## 🚨 Common Issues & Solutions

### Issue: "turbo: command not found"
**Solution**: Ensure turbo is installed globally or add it to dependencies

### Issue: "Cannot resolve module '@workspace/ui'"
**Solution**: Verify workspace dependencies are properly configured

### Issue: "Database connection failed"
**Solution**: Check DATABASE_URL and ensure database is linked

### Issue: Environment variables not available
**Solution**: Set them in the DigitalOcean dashboard, not just in .env file

## 📝 Next Steps

1. Apply the manual configuration changes in DigitalOcean dashboard
2. Trigger a new deployment
3. Monitor build logs for successful buildpack detection
4. Test the deployed application
5. Update environment variables with actual API keys
6. Verify database connectivity

## 🔗 Useful Links

- [DigitalOcean Buildpacks Documentation](https://do.co/apps-buildpacks)
- [DigitalOcean Dockerfile Documentation](https://do.co/apps-dockerfile)
- [App Platform Environment Variables](https://docs.digitalocean.com/products/app-platform/how-to/use-environment-variables/)
