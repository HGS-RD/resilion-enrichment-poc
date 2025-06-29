#!/usr/bin/env node

/**
 * Fix DigitalOcean App Spec Configuration
 * 
 * This script updates the app configuration to remove the problematic db-migrate job
 * and fix the build commands based on the current app spec.
 */

require('dotenv').config();

const API_BASE = 'https://api.digitalocean.com/v2';
const ACCESS_TOKEN = process.env.DIGITALOCEAN_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('❌ DIGITALOCEAN_ACCESS_TOKEN not found in environment variables');
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${ACCESS_TOKEN}`,
  'Content-Type': 'application/json'
};

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

async function fixAppSpec() {
  try {
    console.log('🔍 Finding pre-loader app...');
    
    // Get the pre-loader app
    const appsData = await apiRequest('/apps');
    const app = appsData.apps.find(a => a.spec.name === 'pre-loader');
    
    if (!app) {
      console.log('❌ App "pre-loader" not found');
      return;
    }
    
    console.log(`✅ Found app: ${app.spec.name} (${app.id})`);
    
    // Create the corrected app spec
    const correctedSpec = {
      name: 'pre-loader',
      region: 'nyc',
      
      // Keep the database configuration
      databases: app.spec.databases,
      
      // Fix the services configuration
      services: [{
        name: 'web',
        source_dir: '/',
        github: {
          repo: 'HGS-RD/resilion-enrichment-poc',
          branch: 'main',
          deploy_on_push: true
        },
        // Fixed build and run commands
        build_command: 'npm install && npm run build:web',
        run_command: 'cd apps/web && npm start',
        environment_slug: 'node-js',
        instance_count: 1,
        instance_size_slug: 'basic-xxs',
        http_port: 3000,
        health_check: {
          http_path: '/api/health'
        },
        // Simplified environment variables (remove duplicates)
        envs: [
          {
            key: 'NODE_ENV',
            value: 'production',
            scope: 'RUN_AND_BUILD_TIME'
          },
          {
            key: 'LOG_LEVEL',
            value: 'info',
            scope: 'RUN_AND_BUILD_TIME'
          },
          {
            key: 'DATABASE_URL',
            scope: 'RUN_AND_BUILD_TIME',
            type: 'SECRET',
            value: '${resilion-preloader-db.DATABASE_URL}'
          },
          {
            key: 'PINECONE_API_KEY',
            scope: 'RUN_AND_BUILD_TIME',
            type: 'SECRET'
          },
          {
            key: 'PINECONE_ENVIRONMENT',
            scope: 'RUN_AND_BUILD_TIME',
            value: 'us-east-1'
          },
          {
            key: 'PINECONE_INDEX_HOST',
            scope: 'RUN_AND_BUILD_TIME',
            value: 'https://resilion-enrichment-poc-wbgwq66.svc.aped-4627-b74a.pinecone.io'
          },
          {
            key: 'OPENAI_API_KEY',
            scope: 'RUN_AND_BUILD_TIME',
            type: 'SECRET'
          },
          {
            key: 'XAI_API_KEY',
            scope: 'RUN_AND_BUILD_TIME',
            type: 'SECRET'
          },
          {
            key: 'ANTHROPIC_API_KEY',
            scope: 'RUN_AND_BUILD_TIME',
            type: 'SECRET'
          },
          {
            key: 'GOOGLE_API_KEY',
            scope: 'RUN_AND_BUILD_TIME',
            type: 'SECRET'
          }
        ]
      }],
      
      // REMOVE the problematic jobs section entirely
      // jobs: [] // This will remove the db-migrate job
      
      // Keep features if they exist
      features: app.spec.features || ['buildpack-stack=ubuntu-22']
    };
    
    console.log('📝 Updating app configuration...');
    console.log('   ✅ Removing db-migrate job');
    console.log('   ✅ Fixing build command to: npm install && npm run build:web');
    console.log('   ✅ Fixing run command to: cd apps/web && npm start');
    console.log('   ✅ Cleaning up duplicate environment variables');
    
    // Update the app
    const updateResponse = await apiRequest(`/apps/${app.id}`, {
      method: 'PUT',
      body: JSON.stringify({ spec: correctedSpec })
    });
    
    console.log('✅ App configuration updated successfully!');
    console.log(`   App ID: ${updateResponse.app.id}`);
    console.log(`   Updated at: ${updateResponse.app.updated_at}`);
    
    // Trigger a new deployment
    console.log('🚀 Triggering new deployment...');
    const deployResponse = await apiRequest(`/apps/${app.id}/deployments`, {
      method: 'POST',
      body: JSON.stringify({
        force_build: true
      })
    });
    
    console.log('✅ New deployment triggered!');
    console.log(`   Deployment ID: ${deployResponse.deployment.id}`);
    console.log(`   Phase: ${deployResponse.deployment.phase}`);
    
    console.log('\n🎉 App spec fixes completed!');
    console.log('\n📝 Changes made:');
    console.log('   1. Removed problematic db-migrate job');
    console.log('   2. Fixed build command for monorepo structure');
    console.log('   3. Fixed run command to use npm start');
    console.log('   4. Cleaned up duplicate environment variables');
    console.log('   5. Triggered new deployment');
    
  } catch (error) {
    console.error('\n❌ Failed to fix app spec:', error.message);
    process.exit(1);
  }
}

// Run the fix
fixAppSpec();
