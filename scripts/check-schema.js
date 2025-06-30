#!/usr/bin/env node

/**
 * Check current database schema
 */

require('dotenv').config();
const { Client } = require('pg');

async function checkSchema() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🔍 Checking current database schema...');
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

    // Check enrichment_jobs columns
    const jobsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'enrichment_jobs' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 enrichment_jobs columns:');
    jobsColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });

    // Check enrichment_facts columns
    const factsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'enrichment_facts' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 enrichment_facts columns:');
    factsColumns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });

    // Check constraints
    const constraints = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints 
      WHERE table_name IN ('enrichment_jobs', 'enrichment_facts')
      ORDER BY table_name, constraint_name
    `);
    
    console.log('\n📋 Constraints:');
    constraints.rows.forEach(constraint => {
      console.log(`   - ${constraint.constraint_name} (${constraint.constraint_type})`);
    });

  } catch (error) {
    console.error('\n❌ Schema check failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

checkSchema().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
