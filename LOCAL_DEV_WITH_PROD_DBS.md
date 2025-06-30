# Local Development with Production Databases

This guide shows how to run the application locally while connecting to the production DigitalOcean PostgreSQL and Pinecone databases for full integration testing.

## Prerequisites

1. Access to DigitalOcean App Platform console
2. Access to Pinecone console
3. API keys for LLM services (OpenAI, Anthropic, etc.)

## Step 1: Get Production Database Credentials

### DigitalOcean PostgreSQL Database
1. Go to DigitalOcean App Platform console
2. Navigate to your `pre-loader` app
3. Go to Settings → Environment Variables
4. Copy the `DATABASE_URL` value (it should look like: `postgresql://username:password@host:port/database?sslmode=require`)

### Pinecone Database
1. Go to Pinecone console (https://app.pinecone.io/)
2. Navigate to your index
3. Copy the following values:
   - API Key
   - Index Name
   - Index Host URL
   - Environment/Region

## Step 2: Update Local .env File

Update your `.env` file with the production database credentials:

```bash
# DigitalOcean Managed Postgres Database Configuration
DATABASE_URL=postgresql://actual_username:actual_password@actual_host:25060/defaultdb?sslmode=require

# Pinecone Vector Database Configuration
PINECONE_API_KEY=your_actual_pinecone_api_key
PINECONE_INDEX_NAME=your_actual_index_name
PINECONE_INDEX_HOST=https://your-actual-index-host.svc.pinecone.io
PINECONE_ENVIRONMENT=us-east-1

# LLM API Keys (use your actual keys)
OPENAI_API_KEY=your_actual_openai_api_key
ANTHROPIC_API_KEY=your_actual_anthropic_api_key
GOOGLE_API_KEY=your_actual_google_api_key
XAI_API_KEY=your_actual_xai_api_key

# Local Development Settings
NODE_ENV=development
LOG_LEVEL=debug
NEXTAUTH_URL=http://localhost:3000

# Database Management (set to false for production DB)
DB_MIGRATE_ON_START=false
DB_SEED_ON_START=false
```

## Step 3: Test Database Connections

### Test PostgreSQL Connection
```bash
npm run migrate:database
```

### Test the Application
```bash
npm run dev
```

## Step 4: Verify Connections

1. **Health Check**: Visit http://localhost:3000/api/health
2. **Database Test**: Try creating an enrichment job
3. **Pinecone Test**: Verify vector operations work

## Step 5: Run Full Integration Tests

```bash
# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e:dev
```

## Important Notes

### Security Considerations
- ⚠️ **Never commit production credentials to git**
- ⚠️ **Use production databases carefully - you're working with live data**
- ⚠️ **Consider using a staging database if available**

### Database Safety
- The app is configured with `DB_MIGRATE_ON_START=false` to prevent accidental schema changes
- All operations will use the existing production schema
- Be careful with destructive operations

### Troubleshooting

#### Connection Issues
```bash
# Test database connection directly
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('DB Error:', err);
  else console.log('DB Connected:', res.rows[0]);
  pool.end();
});
"
```

#### Pinecone Issues
```bash
# Test Pinecone connection
node -e "
const { Pinecone } = require('@pinecone-database/pinecone');
const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
pc.listIndexes().then(console.log).catch(console.error);
"
```

## Alternative: Use Environment-Specific .env Files

Create separate environment files:
- `.env.local` - Local development with production DBs
- `.env.development` - Local development with local DBs
- `.env.production` - Production environment

Load the appropriate file:
```bash
# Use production databases locally
cp .env.local .env
npm run dev

# Use local databases
cp .env.development .env
npm run dev
```

## Getting Production Credentials

If you need help getting the actual credentials, you can:

1. **Use DigitalOcean CLI** (if configured):
   ```bash
   doctl apps list
   doctl apps get <app-id>
   ```

2. **Check deployment logs** for connection strings:
   ```bash
   node scripts/get-deployment-logs.js
   ```

3. **Use the configure script** to see current settings:
   ```bash
   npm run configure:digitalocean
