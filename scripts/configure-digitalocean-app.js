#!/usr/bin/env node

/**
 * DigitalOcean App Platform Configuration Script
 * 
 * This script configures a new DigitalOcean App Platform application for the
 * Resilion Enrichment Pre-Loader project using the DigitalOcean API.
 * 
 * Requirements:
 * - DIGITALOCEAN_ACCESS_TOKEN environment variable
 * - Node.js with fetch support (Node 18+)
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const API_BASE = 'https://api.digitalocean.com/v2';
const ACCESS_TOKEN = process.env.DIGITALOCEAN_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('❌ DIGITALOCEAN_ACCESS_TOKEN not found in environment variables');
  process.exit(1);
}

// API Headers
const headers = {
  'Authorization': `Bearer ${ACCESS_TOKEN}`,
  'Content-Type': 'application/json'
};

/**
 * Make API request to DigitalOcean
 */
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers,
    ...options
  };

  console.log(`🔄 API Request: ${options.method || 'GET'} ${endpoint}`);
  
  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} - ${data.message || JSON.stringify(data)}`);
    }
    
    return data;
  } catch (error) {
    console.error(`❌ API Request failed: ${error.message}`);
    throw error;
  }
}

/**
 * Find or create the "resilion" project
 */
async function findOrCreateProject() {
  console.log('🔍 Looking for "resilion" project...');
  
  try {
    // List all projects
    const projectsResponse = await apiRequest('/projects');
    const existingProject = projectsResponse.projects.find(p => p.name === 'resilion');
    
    if (existingProject) {
      console.log(`✅ Found existing project: ${existingProject.name} (${existingProject.id})`);
      return existingProject;
    }
    
    // Create new project
    console.log('📝 Creating new "resilion" project...');
    const newProjectResponse = await apiRequest('/projects', {
      method: 'POST',
      body: JSON.stringify({
        name: 'resilion',
        description: 'Resilion Enrichment Platform - AI-powered content enrichment and fact extraction',
        purpose: 'Web Application',
        environment: 'Production'
      })
    });
    
    console.log(`✅ Created project: ${newProjectResponse.project.name} (${newProjectResponse.project.id})`);
    return newProjectResponse.project;
    
  } catch (error) {
    console.error('❌ Failed to find or create project:', error.message);
    throw error;
  }
}

/**
 * Find the existing managed Postgres database
 */
async function findOrCreateDatabase() {
  console.log('🔍 Looking for existing managed Postgres database...');
  
  try {
    // List databases
    const dbResponse = await apiRequest('/databases');
    const existingDb = dbResponse.databases.find(db => 
      db.name === 'resilion-preloader-db' && db.engine === 'pg'
    );
    
    if (existingDb) {
      console.log(`✅ Found existing database: ${existingDb.name} (${existingDb.id})`);
      console.log(`   Host: ${existingDb.connection.host}`);
      console.log(`   Port: ${existingDb.connection.port}`);
      console.log(`   Database: ${existingDb.connection.database}`);
      return existingDb;
    }
    
    // If not found, look for any database that might match
    console.log('⚠️  resilion-preloader-db not found, listing all databases...');
    dbResponse.databases.forEach(db => {
      console.log(`   - ${db.name} (${db.engine}) - ${db.id}`);
    });
    
    throw new Error('resilion-preloader-db database not found. Please ensure the database exists.');
    
  } catch (error) {
    console.error('❌ Failed to find database:', error.message);
    throw error;
  }
}

/**
 * Create the App Platform application
 */
async function createAppPlatformApp(projectId, databaseId) {
  console.log('📝 Creating App Platform application...');
  
  // First check if app already exists
  try {
    const appsResponse = await apiRequest('/apps');
    const existingApp = appsResponse.apps.find(app => app.spec.name === 'pre-loader');
    
    if (existingApp) {
      console.log(`✅ Found existing App Platform application: ${existingApp.spec.name} (${existingApp.id})`);
      return existingApp;
    }
  } catch (error) {
    console.log('⚠️  Could not check for existing apps, proceeding with creation...');
  }
  
  // First, try to create with GitHub integration
  const appSpecWithGitHub = {
    name: 'pre-loader',
    region: 'nyc',
    services: [
      {
        name: 'web',
        source_dir: '/',
        github: {
          repo: 'HGS-RD/resilion-enrichment-poc',
          branch: 'main',
          deploy_on_push: true
        },
        run_command: 'cd apps/web && next start',
        build_command: 'turbo build',
        environment_slug: 'node-js',
        instance_count: 1,
        instance_size_slug: 'basic-xxs',
        http_port: 3000,
        routes: [
          {
            path: '/'
          }
        ],
        health_check: {
          http_path: '/api/health'
        },
        envs: [
          {
            key: 'NODE_ENV',
            value: 'production'
          },
          {
            key: 'DATABASE_URL',
            scope: 'RUN_AND_BUILD_TIME',
            type: 'SECRET'
          },
          {
            key: 'PINECONE_API_KEY',
            scope: 'RUN_AND_BUILD_TIME',
            type: 'SECRET'
          },
          {
            key: 'PINECONE_ENVIRONMENT',
            scope: 'RUN_AND_BUILD_TIME',
            type: 'SECRET'
          },
          {
            key: 'OPENAI_API_KEY',
            scope: 'RUN_AND_BUILD_TIME',
            type: 'SECRET'
          },
          {
            key: 'LOG_LEVEL',
            value: 'info'
          }
        ]
      }
    ],
    // Note: Database will be linked manually in DigitalOcean dashboard
    // databases: [
    //   {
    //     name: 'resilion-preloader-db',
    //     engine: 'PG',
    //     production: true,
    //     cluster_name: databaseId
    //   }
    // ],
    jobs: [
      {
        name: 'db-migrate',
        source_dir: '/',
        github: {
          repo: 'HGS-RD/resilion-enrichment-poc',
          branch: 'main'
        },
        run_command: `cd db && 
export PGPASSWORD=$DATABASE_PASSWORD && 
psql -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USER -d $DATABASE_NAME -f schema.sql`,
        environment_slug: 'node-js',
        instance_count: 1,
        instance_size_slug: 'basic-xxs',
        kind: 'PRE_DEPLOY',
        envs: [
          {
            key: 'DATABASE_URL',
            scope: 'RUN_TIME',
            type: 'SECRET'
          }
        ]
      }
    ]
  };
  
  try {
    const appResponse = await apiRequest('/apps', {
      method: 'POST',
      body: JSON.stringify({ spec: appSpecWithGitHub })
    });
    
    console.log(`✅ Created App Platform application: ${appResponse.app.spec.name} (${appResponse.app.id})`);
    return appResponse.app;
    
  } catch (error) {
    if (error.message.includes('GitHub user does not have access')) {
      console.log('⚠️  GitHub integration not available, creating app without source...');
      
      // Create app without GitHub integration - will need manual setup
      const appSpecWithoutGitHub = {
        name: 'pre-loader',
        region: 'nyc',
        services: [
          {
            name: 'web',
            run_command: 'cd apps/web && next start',
            build_command: 'turbo build',
            environment_slug: 'node-js',
            instance_count: 1,
            instance_size_slug: 'basic-xxs',
            http_port: 3000,
            routes: [
              {
                path: '/'
              }
            ],
            health_check: {
              http_path: '/api/health'
            },
            envs: [
              {
                key: 'NODE_ENV',
                value: 'production'
              },
              {
                key: 'DATABASE_URL',
                scope: 'RUN_AND_BUILD_TIME',
                type: 'SECRET'
              },
              {
                key: 'PINECONE_API_KEY',
                scope: 'RUN_AND_BUILD_TIME',
                type: 'SECRET'
              },
              {
                key: 'PINECONE_ENVIRONMENT',
                scope: 'RUN_AND_BUILD_TIME',
                type: 'SECRET'
              },
              {
                key: 'OPENAI_API_KEY',
                scope: 'RUN_AND_BUILD_TIME',
                type: 'SECRET'
              },
              {
                key: 'LOG_LEVEL',
                value: 'info'
              }
            ]
          }
        ],
        // Note: Database will be linked manually in DigitalOcean dashboard
        // databases: [
        //   {
        //     name: 'resilion-preloader-db',
        //     engine: 'PG',
        //     production: true,
        //     cluster_name: databaseId
        //   }
        // ]
      };
      
      const appResponse = await apiRequest('/apps', {
        method: 'POST',
        body: JSON.stringify({ spec: appSpecWithoutGitHub })
      });
      
      console.log(`✅ Created App Platform application: ${appResponse.app.spec.name} (${appResponse.app.id})`);
      console.log('⚠️  Note: GitHub integration must be configured manually in the DigitalOcean dashboard');
      return appResponse.app;
    } else {
      console.error('❌ Failed to create App Platform application:', error.message);
      throw error;
    }
  }
}

/**
 * Attach app to project
 */
async function attachAppToProject(projectId, appId) {
  console.log('🔗 Attaching app to project...');
  
  try {
    const response = await apiRequest(`/projects/${projectId}/resources`, {
      method: 'POST',
      body: JSON.stringify({
        resources: [
          {
            urn: `do:app:${appId}`
          }
        ]
      })
    });
    
    console.log('✅ Successfully attached app to project');
    return response;
    
  } catch (error) {
    console.log('⚠️  Failed to attach app to project via API, but this can be done manually in the dashboard');
    console.log(`   App ID: ${appId}`);
    console.log(`   Project ID: ${projectId}`);
    // Don't throw error as this is not critical for app functionality
    return null;
  }
}

/**
 * Update app.yaml with new configuration
 */
function updateAppYaml(appSpec) {
  console.log('📝 Updating app.yaml...');
  
  const yamlContent = `# DigitalOcean App Platform Configuration
# Generated by configure-digitalocean-app.js
# 
# This file defines the App Platform application configuration for
# the Resilion Enrichment Pre-Loader project.

name: ${appSpec.name}
region: ${appSpec.region}

services:
- name: web
  source_dir: /
  github:
    repo: HGS-RD/resilion-enrichment-poc
    branch: main
    deploy_on_push: true
  run_command: cd apps/web && next start
  build_command: turbo build
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  http_port: 3000
  routes:
  - path: /
  health_check:
    http_path: /api/health
  envs:
  - key: NODE_ENV
    value: production
  - key: DATABASE_URL
    scope: RUN_AND_BUILD_TIME
    type: SECRET
  - key: PINECONE_API_KEY
    scope: RUN_AND_BUILD_TIME
    type: SECRET
  - key: PINECONE_ENVIRONMENT
    scope: RUN_AND_BUILD_TIME
    type: SECRET
  - key: OPENAI_API_KEY
    scope: RUN_AND_BUILD_TIME
    type: SECRET
  - key: LOG_LEVEL
    value: info

databases:
- name: resilion-db
  engine: PG
  production: true

jobs:
- name: db-migrate
  source_dir: /
  github:
    repo: HGS-RD/resilion-enrichment-poc
    branch: main
  run_command: |
    cd db && 
    export PGPASSWORD=$DATABASE_PASSWORD && 
    psql -h $DATABASE_HOST -p $DATABASE_PORT -U $DATABASE_USER -d $DATABASE_NAME -f schema.sql
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  kind: PRE_DEPLOY
  envs:
  - key: DATABASE_URL
    scope: RUN_TIME
    type: SECRET
`;

  fs.writeFileSync('app.yaml', yamlContent);
  console.log('✅ Updated app.yaml');
}

/**
 * Create documentation
 */
function createDocumentation() {
  console.log('📝 Creating documentation...');
  
  const readmeContent = `# DigitalOcean App Platform Configuration

## Overview

This project is configured to deploy on DigitalOcean App Platform with the following setup:

- **Application Name**: pre-loader
- **Project**: resilion
- **Region**: NYC3
- **Database**: Managed PostgreSQL 14

## Required API Token Scopes

The DigitalOcean Personal Access Token requires the following scopes:

- \`read\` - Read access to account information
- \`write\` - Write access to create and modify resources

### Specific API Permissions Required:

- **Projects API**: Create and manage projects
- **Apps API**: Create and manage App Platform applications
- **Databases API**: Create and manage managed databases
- **Project Resources API**: Attach resources to projects

## Environment Variables

The following environment variables must be configured in the App Platform dashboard:

### Required Secrets:
- \`DATABASE_URL\` - Automatically provided by managed database
- \`PINECONE_API_KEY\` - Your Pinecone vector database API key
- \`PINECONE_ENVIRONMENT\` - Your Pinecone environment (e.g., us-east-1)
- \`OPENAI_API_KEY\` - Your OpenAI API key for LLM operations

### Application Settings:
- \`NODE_ENV\` - Set to "production"
- \`LOG_LEVEL\` - Set to "info"

## Deployment Configuration

### Build Process:
- **Build Command**: \`turbo build\`
- **Run Command**: \`cd apps/web && next start\`
- **Source Directory**: \`/\` (monorepo root)

### Auto-Deploy:
- Enabled on push to \`main\` branch
- GitHub repository: \`ori-project/resilion-enrichment-poc\`

### Health Check:
- Endpoint: \`/api/health\`
- Used for application health monitoring

## Database Migration

A pre-deploy job runs database migrations:
- Executes \`db/schema.sql\` before each deployment
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

\`\`\`bash
# Run configuration script
node scripts/configure-digitalocean-app.js

# Validate deployment
node scripts/validate-deployment.js

# Check application logs
doctl apps logs <app-id>
\`\`\`

## Support

For issues with DigitalOcean App Platform configuration:
- Check the [DigitalOcean App Platform documentation](https://docs.digitalocean.com/products/app-platform/)
- Review the [API documentation](https://docs.digitalocean.com/reference/api/digitalocean/)
- Contact DigitalOcean support for platform-specific issues
`;

  fs.writeFileSync('DO_APP_PLATFORM_README.md', readmeContent);
  console.log('✅ Created DO_APP_PLATFORM_README.md');
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Starting DigitalOcean App Platform configuration...\n');
  
  try {
    // Step 1: Find or create project
    const project = await findOrCreateProject();
    
    // Step 2: Find or create database
    const database = await findOrCreateDatabase();
    
    // Step 3: Create App Platform application
    const app = await createAppPlatformApp(project.id, database.id);
    
    // Step 4: Attach app to project
    await attachAppToProject(project.id, app.id);
    
    // Step 5: Update app.yaml
    updateAppYaml(app.spec);
    
    // Step 6: Create documentation
    createDocumentation();
    
    console.log('\n🎉 DigitalOcean App Platform configuration completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   Project: ${project.name} (${project.id})`);
    console.log(`   Database: ${database.name} (${database.id})`);
    console.log(`   App: ${app.spec.name} (${app.id})`);
    console.log('\n📝 Next Steps:');
    console.log('   1. Set environment variables in the App Platform dashboard');
    console.log('   2. Verify GitHub repository connection');
    console.log('   3. Monitor the first deployment');
    console.log('   4. Review DO_APP_PLATFORM_README.md for detailed instructions');
    
  } catch (error) {
    console.error('\n❌ Configuration failed:', error.message);
    process.exit(1);
  }
}

// Run the configuration
if (require.main === module) {
  main();
}

module.exports = {
  findOrCreateProject,
  findOrCreateDatabase,
  createAppPlatformApp,
  attachAppToProject,
  updateAppYaml,
  createDocumentation
};
