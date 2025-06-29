#!/usr/bin/env node

/**
 * DigitalOcean Deployment Logs Fetcher
 * 
 * This script fetches and analyzes deployment logs from DigitalOcean App Platform
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

async function apiRequest(endpoint) {
  const url = `${API_BASE}${endpoint}`;
  
  try {
    const response = await fetch(url, { headers });
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

async function getDeploymentLogs() {
  try {
    console.log('🔍 Fetching app information...');
    
    // Get the pre-loader app
    const appsData = await apiRequest('/apps');
    const app = appsData.apps.find(a => a.spec.name === 'pre-loader');
    
    if (!app) {
      console.log('❌ App "pre-loader" not found');
      console.log('Available apps:');
      appsData.apps.forEach(a => console.log(`  - ${a.spec.name} (${a.id})`));
      return;
    }
    
    console.log(`✅ Found app: ${app.spec.name} (${app.id})`);
    console.log(`   Live URL: ${app.live_url || 'Not deployed yet'}`);
    console.log(`   Default Ingress: ${app.default_ingress || 'Not set'}`);
    
    // Get deployments
    console.log('\n🔍 Fetching deployments...');
    const deploymentsData = await apiRequest(`/apps/${app.id}/deployments`);
    
    if (!deploymentsData.deployments || deploymentsData.deployments.length === 0) {
      console.log('❌ No deployments found');
      return;
    }
    
    console.log(`\n📋 Recent deployments (${deploymentsData.deployments.length} total):`);
    deploymentsData.deployments.slice(0, 5).forEach((deployment, i) => {
      const status = deployment.phase === 'ACTIVE' ? '✅' : 
                   deployment.phase === 'ERROR' ? '❌' : 
                   deployment.phase === 'PENDING_BUILD' ? '🔄' : 
                   deployment.phase === 'BUILDING' ? '🔨' : 
                   deployment.phase === 'DEPLOYING' ? '🚀' : '⏳';
      
      console.log(`  ${i + 1}. ${status} ${deployment.id}`);
      console.log(`     Phase: ${deployment.phase}`);
      console.log(`     Created: ${deployment.created_at}`);
      console.log(`     Updated: ${deployment.updated_at}`);
      
      if (deployment.progress && deployment.progress.error_steps) {
        console.log(`     ❌ Error steps: ${deployment.progress.error_steps.length}`);
      }
      console.log('');
    });
    
    // Analyze the latest deployment
    const latestDeployment = deploymentsData.deployments[0];
    console.log(`🔍 Analyzing latest deployment: ${latestDeployment.id}`);
    console.log(`   Phase: ${latestDeployment.phase}`);
    console.log(`   Cause: ${latestDeployment.cause || 'Unknown'}`);
    
    if (latestDeployment.progress) {
      console.log(`   Progress:`);
      console.log(`     - Steps: ${latestDeployment.progress.steps?.length || 0}`);
      console.log(`     - Running steps: ${latestDeployment.progress.running_steps?.length || 0}`);
      console.log(`     - Pending steps: ${latestDeployment.progress.pending_steps?.length || 0}`);
      console.log(`     - Error steps: ${latestDeployment.progress.error_steps?.length || 0}`);
      
      if (latestDeployment.progress.error_steps && latestDeployment.progress.error_steps.length > 0) {
        console.log(`\n❌ Error steps details:`);
        latestDeployment.progress.error_steps.forEach((step, i) => {
          console.log(`   ${i + 1}. ${step.name} (${step.component_name})`);
          console.log(`      Status: ${step.status}`);
          console.log(`      Started: ${step.started_at}`);
          console.log(`      Ended: ${step.ended_at}`);
          if (step.reason) {
            console.log(`      Reason: ${step.reason}`);
          }
        });
      }
    }
    
    // Get deployment logs
    console.log(`\n📝 Fetching deployment logs...`);
    const logsData = await apiRequest(`/apps/${app.id}/deployments/${latestDeployment.id}/logs`);
    
    if (logsData.historic_urls && logsData.historic_urls.length > 0) {
      console.log(`\n📋 Available log components:`);
      logsData.historic_urls.forEach((logUrl, i) => {
        console.log(`  ${i + 1}. ${logUrl.component_name}`);
      });
      
      // Fetch the most recent logs
      console.log(`\n📝 Recent build logs:`);
      console.log('='.repeat(80));
      
      for (const logUrl of logsData.historic_urls.slice(-3)) {
        try {
          const logResponse = await fetch(logUrl.url);
          const logContent = await logResponse.text();
          
          console.log(`\n--- ${logUrl.component_name} ---`);
          
          // Show last 1500 characters to focus on errors
          const relevantLog = logContent.slice(-1500);
          console.log(relevantLog);
          
          // Look for specific error patterns
          if (logContent.includes('ERROR') || logContent.includes('FAILED') || logContent.includes('error')) {
            console.log(`\n🚨 ERRORS DETECTED in ${logUrl.component_name}:`);
            const lines = logContent.split('\n');
            const errorLines = lines.filter(line => 
              line.toLowerCase().includes('error') || 
              line.toLowerCase().includes('failed') ||
              line.toLowerCase().includes('cannot') ||
              line.toLowerCase().includes('missing')
            );
            errorLines.slice(-10).forEach(line => console.log(`   ${line}`));
          }
          
        } catch (logError) {
          console.log(`❌ Failed to fetch logs for ${logUrl.component_name}: ${logError.message}`);
        }
      }
    } else {
      console.log('❌ No deployment logs available');
      
      if (logsData.live_url) {
        console.log(`📝 Live logs URL: ${logsData.live_url}`);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Failed to fetch deployment logs:', error.message);
  }
}

// Run the log fetcher
getDeploymentLogs();
