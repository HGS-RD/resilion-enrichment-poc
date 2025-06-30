#!/usr/bin/env node

/**
 * Run complete database migration - base schema + developer observability
 */

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runCompleteMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🔄 Running complete database migration...');
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

    // Check what tables exist
    const tableCheckQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    const existingTables = await client.query(tableCheckQuery);
    console.log('📋 Existing tables:');
    existingTables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    // Step 1: Run base schema (skip if tables already exist)
    const baseSchemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    if (fs.existsSync(baseSchemaPath)) {
      console.log('\n🚀 Step 1: Running base schema...');
      const baseSchemaSql = fs.readFileSync(baseSchemaPath, 'utf8');
      
      // Split and execute base schema statements
      const baseStatements = baseSchemaSql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt && !stmt.startsWith('--'));
      
      for (let i = 0; i < baseStatements.length; i++) {
        const statement = baseStatements[i];
        if (statement) {
          try {
            await client.query(statement);
            console.log(`   ✓ Base statement ${i + 1}/${baseStatements.length}`);
          } catch (error) {
            if (error.code === '42P07' || error.code === '42701') {
              console.log(`   ⚠️  Skipped base statement ${i + 1} (already exists)`);
            } else {
              console.error(`   ❌ Failed base statement ${i + 1}: ${error.message}`);
            }
          }
        }
      }
    }

    // Step 2: Run developer observability migration
    const migrationPath = path.join(__dirname, '..', 'db', 'migrations', '003_developer_observability.sql');
    if (fs.existsSync(migrationPath)) {
      console.log('\n🚀 Step 2: Running developer observability migration...');
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      
      // Split and execute migration statements
      const migrationStatements = migrationSql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt && !stmt.startsWith('--'));
      
      for (let i = 0; i < migrationStatements.length; i++) {
        const statement = migrationStatements[i];
        if (statement) {
          try {
            await client.query(statement);
            console.log(`   ✓ Migration statement ${i + 1}/${migrationStatements.length}`);
          } catch (error) {
            if (error.code === '42P07' || error.code === '42701') {
              console.log(`   ⚠️  Skipped migration statement ${i + 1} (already exists)`);
            } else {
              console.error(`   ❌ Failed migration statement ${i + 1}: ${error.message}`);
            }
          }
        }
      }
    }

    console.log('\n✅ Complete migration finished!');
    
    // Verify all tables
    const finalTableCheck = await client.query(tableCheckQuery);
    console.log('\n📊 All tables after complete migration:');
    finalTableCheck.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Check if we have the essential tables for delete operation
    const essentialTables = ['enrichment_jobs', 'enrichment_facts', 'failed_jobs', 'job_logs'];
    const existingTableNames = finalTableCheck.rows.map(row => row.table_name);
    
    console.log('\n🔍 Essential tables for delete operation:');
    essentialTables.forEach(table => {
      const exists = existingTableNames.includes(table);
      console.log(`   ${exists ? '✅' : '❌'} ${table}`);
    });

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

runCompleteMigration().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
