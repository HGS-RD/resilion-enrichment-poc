#!/usr/bin/env node

/**
 * Script to test database connections for local development
 */

require('dotenv').config();
const { Pool } = require('pg');

async function testPostgreSQL() {
  console.log('🐘 Testing PostgreSQL connection...');
  
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL not found in environment variables');
    return false;
  }
  
  if (process.env.DATABASE_URL.includes('your_')) {
    console.log('❌ DATABASE_URL contains placeholder values');
    return false;
  }
  
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ PostgreSQL connected successfully');
    console.log(`   Time: ${result.rows[0].current_time}`);
    console.log(`   Version: ${result.rows[0].pg_version.split(' ')[0]} ${result.rows[0].pg_version.split(' ')[1]}`);
    await pool.end();
    return true;
  } catch (error) {
    console.log('❌ PostgreSQL connection failed:', error.message);
    return false;
  }
}

async function testPinecone() {
  console.log('\n🌲 Testing Pinecone connection...');
  
  if (!process.env.PINECONE_API_KEY) {
    console.log('❌ PINECONE_API_KEY not found in environment variables');
    return false;
  }
  
  if (process.env.PINECONE_API_KEY.includes('your_')) {
    console.log('❌ PINECONE_API_KEY contains placeholder values');
    return false;
  }
  
  try {
    const { Pinecone } = require('@pinecone-database/pinecone');
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const indexes = await pc.listIndexes();
    console.log('✅ Pinecone connected successfully');
    console.log(`   Available indexes: ${indexes.indexes?.length || 0}`);
    if (indexes.indexes?.length > 0) {
      console.log(`   Index names: ${indexes.indexes.map(i => i.name).join(', ')}`);
    }
    return true;
  } catch (error) {
    console.log('❌ Pinecone connection failed:', error.message);
    return false;
  }
}

async function testLLMAPIs() {
  console.log('\n🤖 Testing LLM API Keys...');
  
  const apis = [
    { name: 'OpenAI', key: 'OPENAI_API_KEY', pattern: /^sk-/ },
    { name: 'Anthropic', key: 'ANTHROPIC_API_KEY', pattern: /^sk-ant-/ },
    { name: 'Google', key: 'GOOGLE_API_KEY', pattern: /^AIza/ },
    { name: 'xAI', key: 'XAI_API_KEY', pattern: /^xai-/ }
  ];
  
  let validCount = 0;
  
  apis.forEach(api => {
    const value = process.env[api.key];
    if (!value) {
      console.log(`❌ ${api.name}: ${api.key} not found`);
    } else if (value.includes('your_')) {
      console.log(`❌ ${api.name}: Contains placeholder value`);
    } else if (api.pattern.test(value)) {
      console.log(`✅ ${api.name}: API key format looks valid`);
      validCount++;
    } else {
      console.log(`⚠️  ${api.name}: API key format doesn't match expected pattern`);
    }
  });
  
  return validCount;
}

async function main() {
  console.log('🔍 Database Connection Test\n');
  
  const pgSuccess = await testPostgreSQL();
  const pineconeSuccess = await testPinecone();
  const validLLMCount = await testLLMAPIs();
  
  console.log('\n📊 SUMMARY:');
  console.log(`PostgreSQL: ${pgSuccess ? '✅ Connected' : '❌ Failed'}`);
  console.log(`Pinecone: ${pineconeSuccess ? '✅ Connected' : '❌ Failed'}`);
  console.log(`LLM APIs: ${validLLMCount}/4 configured`);
  
  if (pgSuccess && pineconeSuccess && validLLMCount > 0) {
    console.log('\n🎉 Ready for local development with production databases!');
    console.log('Run: npm run dev');
  } else {
    console.log('\n⚠️  Some connections failed. Check your .env file.');
    console.log('Run: npm run get:prod-credentials for help');
  }
}

main().catch(console.error);
