#!/usr/bin/env node

/**
 * Fix database migration - properly handle SQL statements
 */

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function fixDatabaseMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🔄 Fixing database migration...');
  console.log(`📍 Database URL: ${databaseUrl.replace(/:[^:]*@/, ':****@')}`);

  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database successfully');

    // Create the missing tables one by one
    console.log('\n🚀 Creating missing tables...');

    // 1. Create enrichment_facts table
    const createFactsTable = `
      CREATE TABLE IF NOT EXISTS enrichment_facts (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          job_id UUID NOT NULL REFERENCES enrichment_jobs(id) ON DELETE CASCADE,
          fact_type VARCHAR(100) NOT NULL,
          fact_data JSONB NOT NULL,
          confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
          source_url TEXT,
          source_text TEXT,
          embedding_id VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          validated BOOLEAN DEFAULT FALSE,
          validation_notes TEXT
      )
    `;
    
    await client.query(createFactsTable);
    console.log('   ✓ Created enrichment_facts table');

    // 2. Create failed_jobs table
    const createFailedJobsTable = `
      CREATE TABLE IF NOT EXISTS failed_jobs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          original_job_id UUID,
          domain VARCHAR(255) NOT NULL,
          failure_step VARCHAR(50) NOT NULL,
          error_message TEXT NOT NULL,
          error_details JSONB,
          failed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          retry_attempted BOOLEAN DEFAULT FALSE,
          retry_count INTEGER DEFAULT 0
      )
    `;
    
    await client.query(createFailedJobsTable);
    console.log('   ✓ Created failed_jobs table');

    // 3. Create job_logs table
    const createJobLogsTable = `
      CREATE TABLE IF NOT EXISTS job_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          job_id UUID NOT NULL REFERENCES enrichment_jobs(id) ON DELETE CASCADE,
          level VARCHAR(20) NOT NULL DEFAULT 'info',
          message TEXT NOT NULL,
          details JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await client.query(createJobLogsTable);
    console.log('   ✓ Created job_logs table');

    // 4. Create update function
    const createUpdateFunction = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `;
    
    await client.query(createUpdateFunction);
    console.log('   ✓ Created update function');

    // 5. Create trigger
    const createTrigger = `
      DROP TRIGGER IF EXISTS update_enrichment_jobs_updated_at ON enrichment_jobs;
      CREATE TRIGGER update_enrichment_jobs_updated_at 
          BEFORE UPDATE ON enrichment_jobs 
          FOR EACH ROW 
          EXECUTE FUNCTION update_updated_at_column()
    `;
    
    await client.query(createTrigger);
    console.log('   ✓ Created update trigger');

    // 6. Insert sample data if tables are empty
    const checkDataQuery = 'SELECT COUNT(*) as count FROM enrichment_facts';
    const dataCount = await client.query(checkDataQuery);
    
    if (dataCount.rows[0].count === '0') {
      console.log('\n📝 Inserting sample data...');
      
      const insertSampleFacts = `
        INSERT INTO enrichment_facts (job_id, fact_type, fact_data, confidence_score, source_url) VALUES
        ((SELECT id FROM enrichment_jobs WHERE domain LIKE '%conagrabrands%' LIMIT 1), 'company_info', '{"name": "ConAgra Brands", "industry": "Food Manufacturing", "employees": "10000+", "founded": "1919"}', 0.94, 'https://conagrabrands.com/about'),
        ((SELECT id FROM enrichment_jobs WHERE domain LIKE '%test-company%' LIMIT 1), 'company_info', '{"name": "Test Company Inc", "industry": "Technology", "employees": "50-100", "founded": "2018"}', 0.91, 'https://test-company.com/company'),
        ((SELECT id FROM enrichment_jobs WHERE domain LIKE '%caterpillar%' LIMIT 1), 'company_info', '{"name": "Caterpillar Inc", "industry": "Heavy Machinery", "employees": "100000+", "founded": "1925"}', 0.96, 'https://caterpillar.com/about')
      `;
      
      try {
        await client.query(insertSampleFacts);
        console.log('   ✓ Inserted sample facts');
      } catch (error) {
        console.log('   ⚠️  Could not insert sample facts (jobs may not exist)');
      }
    }

    console.log('\n✅ Database migration completed successfully!');
    
    // Verify all tables
    const tableCheckQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    const finalTableCheck = await client.query(tableCheckQuery);
    console.log('\n📊 All tables:');
    finalTableCheck.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Check essential tables for delete operation
    const essentialTables = ['enrichment_jobs', 'enrichment_facts', 'failed_jobs', 'job_logs'];
    const existingTableNames = finalTableCheck.rows.map(row => row.table_name);
    
    console.log('\n🔍 Essential tables for delete operation:');
    essentialTables.forEach(table => {
      const exists = existingTableNames.includes(table);
      console.log(`   ${exists ? '✅' : '❌'} ${table}`);
    });

    // Test delete operation readiness
    if (essentialTables.every(table => existingTableNames.includes(table))) {
      console.log('\n🎉 Database is ready for delete operations!');
    } else {
      console.log('\n⚠️  Some tables are still missing for delete operations');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

fixDatabaseMigration().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
