#!/usr/bin/env node

/**
 * Add missing columns directly
 */

require('dotenv').config();
const { Client } = require('pg');

async function addColumns() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🔧 Adding missing columns directly...');
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

    // Add llm_used column to enrichment_jobs
    try {
      await client.query('ALTER TABLE enrichment_jobs ADD COLUMN llm_used VARCHAR(50)');
      console.log('✅ Added llm_used column to enrichment_jobs');
    } catch (error) {
      if (error.code === '42701') {
        console.log('⚠️  llm_used column already exists in enrichment_jobs');
      } else {
        console.error('❌ Failed to add llm_used column:', error.message);
      }
    }

    // Add tier_used column to enrichment_facts
    try {
      await client.query('ALTER TABLE enrichment_facts ADD COLUMN tier_used INTEGER CHECK (tier_used >= 1 AND tier_used <= 3)');
      console.log('✅ Added tier_used column to enrichment_facts');
    } catch (error) {
      if (error.code === '42701') {
        console.log('⚠️  tier_used column already exists in enrichment_facts');
      } else {
        console.error('❌ Failed to add tier_used column:', error.message);
      }
    }

    // Update status constraint
    try {
      await client.query('ALTER TABLE enrichment_jobs DROP CONSTRAINT IF EXISTS valid_status');
      await client.query("ALTER TABLE enrichment_jobs ADD CONSTRAINT valid_status CHECK (status IN ('pending', 'running', 'completed', 'partial_success', 'failed', 'cancelled'))");
      console.log('✅ Updated status constraint');
    } catch (error) {
      console.error('❌ Failed to update status constraint:', error.message);
    }

    // Create indexes
    try {
      await client.query('CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_llm_used ON enrichment_jobs(llm_used)');
      console.log('✅ Created index on llm_used');
    } catch (error) {
      console.error('❌ Failed to create llm_used index:', error.message);
    }

    try {
      await client.query('CREATE INDEX IF NOT EXISTS idx_enrichment_facts_tier_used ON enrichment_facts(tier_used)');
      console.log('✅ Created index on tier_used');
    } catch (error) {
      console.error('❌ Failed to create tier_used index:', error.message);
    }

    // Update sample data
    try {
      await client.query("UPDATE enrichment_jobs SET llm_used = 'gpt-4o' WHERE llm_used IS NULL");
      console.log('✅ Updated sample data for llm_used');
    } catch (error) {
      console.error('❌ Failed to update llm_used sample data:', error.message);
    }

    try {
      await client.query('UPDATE enrichment_facts SET tier_used = 1 WHERE tier_used IS NULL');
      console.log('✅ Updated sample data for tier_used');
    } catch (error) {
      console.error('❌ Failed to update tier_used sample data:', error.message);
    }

    console.log('\n🎉 All operations completed!');

  } catch (error) {
    console.error('\n❌ Operation failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

addColumns().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
