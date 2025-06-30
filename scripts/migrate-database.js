#!/usr/bin/env node

/**
 * Database Migration Script for DigitalOcean App Platform
 * 
 * This script runs database migrations using the DATABASE_URL environment variable
 * provided by DigitalOcean's managed PostgreSQL service.
 */

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🔄 Starting database migration...');
  console.log(`📍 Database URL: ${databaseUrl.replace(/:[^:]*@/, ':****@')}`);

  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false // Required for DigitalOcean managed databases
    }
  });

  try {
    // Connect to database
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database successfully');

    // Check if tables already exist
    const tableCheckQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('enrichment_jobs', 'enrichment_facts', 'failed_jobs', 'job_logs')
    `;
    
    const existingTables = await client.query(tableCheckQuery);
    
    if (existingTables.rows.length > 0) {
      console.log('📋 Found existing tables:');
      existingTables.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
      
      console.log('⚠️  Database appears to already be migrated');
      console.log('   If you want to reset the database, please do so manually');
      return;
    }

    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }

    console.log('📖 Reading schema file...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('🚀 Executing database schema...');
    
    // Split SQL into individual statements, handling functions properly
    const statements = [];
    let currentStatement = '';
    let inFunction = false;
    
    const lines = schemaSql.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip comments and empty lines
      if (trimmedLine.startsWith('--') || trimmedLine === '') {
        continue;
      }
      
      currentStatement += line + '\n';
      
      // Check if we're entering a function
      if (trimmedLine.includes('CREATE OR REPLACE FUNCTION') || trimmedLine.includes('CREATE FUNCTION')) {
        inFunction = true;
      }
      
      // Check if we're ending a function
      if (inFunction && trimmedLine.includes('$$ language')) {
        inFunction = false;
        statements.push(currentStatement.trim());
        currentStatement = '';
        continue;
      }
      
      // If not in a function and line ends with semicolon, it's a complete statement
      if (!inFunction && trimmedLine.endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          await client.query(statement);
          console.log(`   ✓ Executed statement ${i + 1}/${statements.length}`);
        } catch (error) {
          console.error(`   ❌ Failed on statement ${i + 1}: ${statement.substring(0, 100)}...`);
          throw error;
        }
      }
    }

    console.log('✅ Database migration completed successfully!');
    
    // Verify tables were created
    const verifyQuery = `
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_name IN ('enrichment_jobs', 'enrichment_facts', 'failed_jobs', 'job_logs')
      ORDER BY table_name
    `;
    
    const verification = await client.query(verifyQuery);
    
    console.log('\n📊 Created tables:');
    verification.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name} (${row.column_count} columns)`);
    });

    // Check sample data
    const sampleDataQuery = 'SELECT COUNT(*) as count FROM enrichment_jobs';
    const sampleCount = await client.query(sampleDataQuery);
    console.log(`\n📝 Sample data: ${sampleCount.rows[0].count} enrichment jobs created`);

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    
    if (error.detail) {
      console.error(`   Details: ${error.detail}`);
    }
    
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Add pg dependency check
try {
  require('pg');
} catch (error) {
  console.error('❌ Missing dependency: pg');
  console.error('   Please install it with: npm install pg');
  process.exit(1);
}

// Run migrations
runMigrations().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
