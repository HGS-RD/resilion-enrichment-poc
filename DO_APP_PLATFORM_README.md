# DigitalOcean App Platform Configuration

## Overview

This project is configured to deploy on DigitalOcean App Platform with the following setup:

- **Application Name**: pre-loader
- **Project**: resilion
- **Region**: NYC3
- **Database**: Managed PostgreSQL 14

## Required API Token Scopes

The DigitalOcean Personal Access Token requires the following scopes:

- `read` - Read access to account information
- `write` - Write access to create and modify resources

### Specific API Permissions Required:

- **Projects API**: Create and manage projects
- **Apps API**: Create and manage App Platform applications
- **Databases API**: Create and manage managed databases
- **Project Resources API**: Attach resources to projects

## Environment Variables

The following environment variables must be configured in the App Platform dashboard:

### Required Secrets:
- `DATABASE_URL` - Automatically provided by managed database
- `PINECONE_API_KEY` - Your Pinecone vector database API key
- `PINECONE_ENVIRONMENT` - Your Pinecone environment (e.g., us-east-1)
- `OPENAI_API_KEY` - Your OpenAI API key for LLM operations

### Application Settings:
- `NODE_ENV` - Set to "production"
- `LOG_LEVEL` - Set to "info"

## Deployment Configuration

### Build Process:
- **Build Command**: `turbo build`
- **Run Command**: `cd apps/web && next start`
- **Source Directory**: `/` (monorepo root)

### Auto-Deploy:
- Enabled on push to `main` branch
- GitHub repository: `ori-project/resilion-enrichment-poc`

### Health Check:
- Endpoint: `/api/health`
- Used for application health monitoring

## Database Migration

A pre-deploy job runs database migrations:
- Executes `db/schema.sql` before each deployment
- Ensures database schema is up-to-date

## Manual Configuration Steps

After running the configuration script, you may need to:

1. **Set Environment Variables**: Add the required secret values in the App Platform dashboard
2. **Verify GitHub Integration**: Ensure the repository connection is properly authenticated
3. **Monitor First Deployment**: Check logs for any deployment issues

## Troubleshooting

### Common Issues:

1. **API Token Permissions**: Ensure your token has sufficient scopes
2. **GitHub Authentication**: Verify repository access permissions
3. **Environment Variables**: Check that all required secrets are set
4. **Database Connection**: Verify managed database is properly linked

### Useful Commands:

```bash
# Run configuration script
node scripts/configure-digitalocean-app.js

# Validate deployment
node scripts/validate-deployment.js

# Check application logs
doctl apps logs <app-id>
```

## Support

For issues with DigitalOcean App Platform configuration:
- Check the [DigitalOcean App Platform documentation](https://docs.digitalocean.com/products/app-platform/)
- Review the [API documentation](https://docs.digitalocean.com/reference/api/digitalocean/)
- Contact DigitalOcean support for platform-specific issues
