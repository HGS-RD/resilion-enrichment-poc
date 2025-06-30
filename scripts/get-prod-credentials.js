#!/usr/bin/env node

/**
 * Script to help retrieve production database credentials for local development
 * This script provides guidance on where to find the credentials manually
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Production Database Credentials Helper\n');

console.log('To run locally with production databases, you need to get the following credentials:\n');

console.log('📊 DIGITALOCEAN POSTGRESQL DATABASE:');
console.log('1. Go to: https://cloud.digitalocean.com/apps');
console.log('2. Find your "pre-loader" app');
console.log('3. Go to Settings → Environment Variables');
console.log('4. Look for DATABASE_URL - it should look like:');
console.log('   postgresql://username:password@host:25060/defaultdb?sslmode=require\n');

console.log('🌲 PINECONE VECTOR DATABASE:');
console.log('1. Go to: https://app.pinecone.io/');
console.log('2. Navigate to your index');
console.log('3. Get these values:');
console.log('   - API Key (from API Keys section)');
console.log('   - Index Name');
console.log('   - Index Host URL');
console.log('   - Environment/Region\n');

console.log('🤖 LLM API KEYS:');
console.log('- OpenAI: https://platform.openai.com/api-keys');
console.log('- Anthropic: https://console.anthropic.com/');
console.log('- Google: https://console.cloud.google.com/');
console.log('- xAI: https://console.x.ai/\n');

console.log('📝 NEXT STEPS:');
console.log('1. Copy the credentials from the above sources');
console.log('2. Update your .env file with the actual values');
console.log('3. Run: npm run dev');
console.log('4. Test: http://localhost:3000/api/health\n');

console.log('📖 For detailed instructions, see: LOCAL_DEV_WITH_PROD_DBS.md\n');

// Check if .env file exists and show current status
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  console.log('🔧 CURRENT .env STATUS:');
  
  const checks = [
    { key: 'DATABASE_URL', pattern: /DATABASE_URL=postgresql:\/\/[^:]+:[^@]+@[^:]+:\d+\/[^?]+\?sslmode=require/ },
    { key: 'PINECONE_API_KEY', pattern: /PINECONE_API_KEY=pc-[a-zA-Z0-9]+/ },
    { key: 'OPENAI_API_KEY', pattern: /OPENAI_API_KEY=sk-[a-zA-Z0-9]+/ },
    { key: 'ANTHROPIC_API_KEY', pattern: /ANTHROPIC_API_KEY=sk-ant-[a-zA-Z0-9]+/ }
  ];
  
  checks.forEach(check => {
    const hasRealValue = check.pattern.test(envContent);
    const status = hasRealValue ? '✅' : '❌';
    console.log(`${status} ${check.key}: ${hasRealValue ? 'Configured' : 'Needs real value'}`);
  });
  
  console.log('\n');
} else {
  console.log('❌ .env file not found. Copy .env.example to .env first.\n');
}

console.log('💡 TIP: Create a .env.local file for production credentials and keep .env for local development');
