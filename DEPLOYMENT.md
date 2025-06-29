# Deployment Guide

This guide covers deploying the Resilion Enrichment Pre-Loader POC to DigitalOcean App Platform.

## Prerequisites

Before deploying, ensure you have:

1. **DigitalOcean Account** with App Platform access
2. **GitHub Repository** with the code pushed to the main branch
3. **Required API Keys**:
   - OpenAI API Key
   - Pinecone API Key and Index configuration
4. **Database Access** (PostgreSQL)

## Environment Variables

The following environment variables must be configured in DigitalOcean App Platform:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/dbname` |
| `OPENAI_API_KEY` | OpenAI API key for AI extraction | `sk-...` |
| `PINECONE_API_KEY` | Pinecone API key for vector storage | `...` |
| `PINECONE_INDEX_NAME` | Pinecone index name | `resilion-enrichment` |
| `PINECONE_INDEX_HOST` | Pinecone index host URL | `https://...` |
| `PINECONE_ENVIRONMENT` | Pinecone environment | `us-east-1-aws` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `LOG_LEVEL` | Logging level | `info` |

## Deployment Steps

### 1. Prepare Repository

Ensure your code is committed to the `feature/integration-testing` branch and pushed to GitHub:

```bash
git push origin feature/integration-testing
```

### 2. Create App on DigitalOcean

#### Option A: Using app.yaml (Recommended)

1. In DigitalOcean App Platform, click "Create App"
2. Choose "GitHub" as source
3. Select your repository and the `feature/integration-testing` branch
4. Choose "Use existing app spec" and upload the `app.yaml` file
5. Review the configuration and proceed

#### Option B: Manual Configuration

1. **Create App**: Choose GitHub source and select repository
2. **Configure Service**:
   - Name: `web`
   - Source Directory: `/`
   - Build Command: `npm install && npm run build`
   - Run Command: `cd apps/web && npm start`
   - HTTP Port: `3000`
   - Instance Size: Basic (512MB RAM, 1 vCPU)

3. **Configure Database**:
   - Add PostgreSQL database
   - Name: `resilion-db`
   - Version: PostgreSQL 14
   - Size: Development Database

4. **Add Environment Variables** (see table above)

### 3. Database Setup

The database will be automatically migrated using the pre-deploy job defined in `app.yaml`. If you need to run migrations manually:

```bash
# Connect to your database and run:
psql $DATABASE_URL -f db/schema.sql
```

### 4. Deploy

1. Click "Create Resources" to start the deployment
2. Monitor the build and deployment logs
3. Wait for the app to be fully deployed (usually 5-10 minutes)

### 5. Validate Deployment

Once deployed, validate the deployment using our validation script:

```bash
# Replace with your actual app URL
DEPLOYMENT_URL=https://your-app-name.ondigitalocean.app npm run validate:deployment
```

Expected output:
```
🚀 Validating deployment at: https://your-app-name.ondigitalocean.app
=====================================

🧪 Testing: Health Check Endpoint
✅ PASS: Health Check Endpoint

🧪 Testing: Environment Variables
✅ PASS: Environment Variables
   Environment variables configured correctly

🧪 Testing: Database Connection
✅ PASS: Database Connection
   Database connection healthy

🧪 Testing: API Endpoints Structure
✅ PASS: API Endpoints Structure
   API endpoints accessible

=====================================
📊 Validation Results:
   ✅ Passed: 4
   ❌ Failed: 0
   📈 Success Rate: 100%

🎉 All validation tests passed! Deployment is ready.
```

## Post-Deployment Testing

### 1. Manual Testing

1. **Access the Application**: Visit your app URL
2. **Test Job Creation**: 
   - Go to `/jobs`
   - Create a new enrichment job with domain `example.com`
   - Verify job starts and progresses through workflow steps
3. **Check Dashboard**: Verify statistics and recent activity display correctly
4. **Test Facts Viewer**: Navigate to `/facts` and verify data display

### 2. API Testing

Test the API endpoints directly:

```bash
# Health check
curl https://your-app-name.ondigitalocean.app/api/health

# Create job
curl -X POST https://your-app-name.ondigitalocean.app/api/enrichment \
  -H "Content-Type: application/json" \
  -d '{"domain": "example.com"}'

# Check job status
curl https://your-app-name.ondigitalocean.app/api/enrichment/JOB_ID
```

### 3. E2E Testing

Run the E2E test suite against the deployed environment:

```bash
TEST_BASE_URL=https://your-app-name.ondigitalocean.app npm run test -- tests/e2e/enrichment-flow.test.ts
```

## Monitoring and Maintenance

### Application Logs

Monitor application logs in DigitalOcean App Platform:
1. Go to your app in the DigitalOcean control panel
2. Click on "Runtime Logs" tab
3. Monitor for errors and performance issues

### Database Monitoring

Monitor database performance and connections:
1. Check database metrics in DigitalOcean control panel
2. Monitor connection pool usage
3. Watch for slow queries

### Health Monitoring

The health check endpoint (`/api/health`) provides real-time status:
- Application health
- Database connectivity
- Environment variable validation

Set up monitoring alerts based on this endpoint.

## Troubleshooting

### Common Issues

#### 1. Build Failures

**Symptom**: Build fails during deployment
**Solutions**:
- Check that all dependencies are listed in `package.json`
- Verify Node.js version compatibility (requires Node 18+)
- Check build logs for specific error messages

#### 2. Database Connection Issues

**Symptom**: Health check shows database as unhealthy
**Solutions**:
- Verify `DATABASE_URL` environment variable is set correctly
- Check database is running and accessible
- Verify SSL configuration for production database

#### 3. API Key Issues

**Symptom**: Enrichment jobs fail with authentication errors
**Solutions**:
- Verify all API keys are set correctly in environment variables
- Check API key permissions and quotas
- Test API keys independently

#### 4. Memory Issues

**Symptom**: Application crashes or becomes unresponsive
**Solutions**:
- Increase instance size in DigitalOcean App Platform
- Monitor memory usage and optimize if needed
- Check for memory leaks in application logs

### Getting Help

1. **Check Logs**: Always start by checking application and build logs
2. **Health Check**: Use `/api/health` endpoint to diagnose issues
3. **Validation Script**: Run deployment validation to identify problems
4. **DigitalOcean Support**: Contact DigitalOcean support for platform-specific issues

## Scaling Considerations

### Horizontal Scaling

To handle increased load:
1. Increase instance count in app configuration
2. Consider implementing job queues for background processing
3. Monitor database connection limits

### Vertical Scaling

For better performance:
1. Upgrade to larger instance sizes
2. Upgrade database to higher performance tiers
3. Implement caching strategies

### Cost Optimization

- Start with basic instances and scale as needed
- Monitor usage and optimize resource allocation
- Consider using development database for testing environments

## Security Considerations

1. **Environment Variables**: Never commit API keys to version control
2. **Database Security**: Use SSL connections and strong passwords
3. **API Security**: Implement rate limiting and authentication as needed
4. **HTTPS**: Ensure all traffic uses HTTPS (handled by DigitalOcean App Platform)

## Backup and Recovery

1. **Database Backups**: DigitalOcean automatically backs up managed databases
2. **Code Backups**: Ensure code is backed up in version control
3. **Environment Configuration**: Document all environment variables and configurations

---

## Quick Reference

### Useful Commands

```bash
# Validate deployment
npm run validate:deployment

# Run E2E tests against deployment
TEST_BASE_URL=https://your-app.ondigitalocean.app npm run test -- tests/e2e/enrichment-flow.test.ts

# Check health
curl https://your-app.ondigitalocean.app/api/health

# View logs (in DigitalOcean console)
doctl apps logs <app-id> --follow
```

### Important URLs

- **Application**: `https://your-app-name.ondigitalocean.app`
- **Health Check**: `https://your-app-name.ondigitalocean.app/api/health`
- **Dashboard**: `https://your-app-name.ondigitalocean.app/dashboard`
- **Jobs**: `https://your-app-name.ondigitalocean.app/jobs`
- **Facts**: `https://your-app-name.ondigitalocean.app/facts`

### Support Resources

- [DigitalOcean App Platform Documentation](https://docs.digitalocean.com/products/app-platform/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
