#!/usr/bin/env node

/**
 * Update DigitalOcean App Platform Configuration
 * 
 * This script updates the existing app configuration to fix the buildpack detection issue
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

async function updateAppConfig() {
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
    
    // Update the app spec with corrected build configuration
    const updatedSpec = {
      ...app.spec,
      services: app.spec.services.map(service => {
        if (service.name === 'web') {
          return {
            ...service,
            // Keep source_dir as root since we have package.json there
            source_dir: '/',
            // Use the correct build command that works with our monorepo
            build_command: 'npm install && npm run build:web',
            // Use the correct run command
            run_command: 'cd apps/web && npm start',
            // Ensure environment slug is correct
            environment_slug: 'node-js'
          };
        }
        return service;
      })
    };
    
    console.log('📝 Updating app configuration...');
    console.log('   Build command:', updatedSpec.services[0].build_command);
    console.log('   Run command:', updatedSpec.services[0].run_command);
    
    // Update the app
    const updateResponse = await apiRequest(`/apps/${app.id}`, {
      method: 'PUT',
      body: JSON.stringify({ spec: updatedSpec })
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
    
    console.log('\n🎉 Configuration update completed!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Monitor the deployment in the DigitalOcean dashboard');
    console.log('   2. Check build logs for any remaining issues');
    console.log('   3. Verify environment variables are properly set');
    
  } catch (error) {
    console.error('\n❌ Failed to update app configuration:', error.message);
    process.exit(1);
  }
}

// Run the update
updateAppConfig();
