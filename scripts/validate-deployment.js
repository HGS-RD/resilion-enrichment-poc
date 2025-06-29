#!/usr/bin/env node

/**
 * Deployment Validation Script
 * 
 * Validates that the deployment is ready and all components are working.
 * This script can be run against a deployed environment to ensure everything is functioning.
 */

const https = require('https');
const http = require('http');

const baseUrl = process.env.DEPLOYMENT_URL || 'http://localhost:3000';
const isHttps = baseUrl.startsWith('https://');

console.log('🚀 Validating deployment at:', baseUrl);
console.log('=====================================\n');

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = isHttps ? https : http;
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// Validation tests
const validationTests = [
  {
    name: 'Health Check Endpoint',
    test: async () => {
      const response = await makeRequest(`${baseUrl}/api/health`);
      if (response.status !== 200) {
        throw new Error(`Health check failed with status ${response.status}`);
      }
      if (response.data.status !== 'healthy') {
        console.warn('⚠️  Health check returned degraded status:', response.data);
      }
      return response.data;
    }
  },
  {
    name: 'Environment Variables',
    test: async () => {
      const response = await makeRequest(`${baseUrl}/api/health`);
      const healthData = response.data;
      
      if (!healthData.checks) {
        throw new Error('Health check response missing checks');
      }
      
      const envCheck = healthData.checks.environment_variables;
      if (envCheck !== 'healthy') {
        throw new Error(`Environment variables check failed: ${envCheck}`);
      }
      
      return { status: 'Environment variables configured correctly' };
    }
  },
  {
    name: 'Database Connection',
    test: async () => {
      const response = await makeRequest(`${baseUrl}/api/health`);
      const healthData = response.data;
      
      const dbCheck = healthData.checks.database;
      if (dbCheck !== 'healthy') {
        throw new Error(`Database check failed: ${dbCheck}`);
      }
      
      return { status: 'Database connection healthy' };
    }
  },
  {
    name: 'API Endpoints Structure',
    test: async () => {
      // Test that the enrichment API endpoint exists (even if it returns an error due to missing data)
      try {
        const response = await makeRequest(`${baseUrl}/api/enrichment`);
        // We expect this to work or return a proper error, not a 404
        if (response.status === 404) {
          throw new Error('Enrichment API endpoint not found');
        }
        return { status: 'API endpoints accessible', statusCode: response.status };
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('Cannot connect to server - is it running?');
        }
        throw error;
      }
    }
  }
];

// Run validation tests
async function runValidation() {
  let passed = 0;
  let failed = 0;
  
  for (const test of validationTests) {
    try {
      console.log(`🧪 Testing: ${test.name}`);
      const result = await test.test();
      console.log(`✅ PASS: ${test.name}`);
      if (result.status) {
        console.log(`   ${result.status}`);
      }
      passed++;
    } catch (error) {
      console.log(`❌ FAIL: ${test.name}`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }
    console.log('');
  }
  
  console.log('=====================================');
  console.log(`📊 Validation Results:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All validation tests passed! Deployment is ready.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some validation tests failed. Please check the deployment.');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Deployment Validation Script

Usage:
  node scripts/validate-deployment.js [options]

Options:
  --help, -h     Show this help message

Environment Variables:
  DEPLOYMENT_URL Set the base URL to validate (default: http://localhost:3000)

Examples:
  # Validate local development server
  npm run dev &
  node scripts/validate-deployment.js

  # Validate production deployment
  DEPLOYMENT_URL=https://your-app.ondigitalocean.app node scripts/validate-deployment.js
`);
  process.exit(0);
}

// Run the validation
runValidation().catch((error) => {
  console.error('💥 Validation script failed:', error);
  process.exit(1);
});
