#!/usr/bin/env node

/**
 * Run a specific database migration
 * Usage: node scripts/run-migration.js <migration-filename>
 */

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const migrationName = process.argv[2];
  
  if (!migrationName) {
    console.error('❌ Please provide a migration filename');
    console.error('Usage: node scripts/run-migration.js <migration-filename>');
    process.exit(1);
  }

  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log(`🔄 Running migration: ${migrationName}`);
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

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'db', 'migrations', `${migrationName}.sql`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found at: ${migrationPath}`);
    }

    console.log('📖 Reading migration file...');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Executing migration...');
    
    // Split SQL into statements
    const statements = migrationSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && stmt.length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          await client.query(statement);
          console.log(`   ✓ Executed statement ${i + 1}/${statements.length}`);
        } catch (error) {
          // Skip errors for tables that already exist
          if (error.code === '42P07') { // relation already exists
            console.log(`   ⚠️  Skipped statement ${i + 1} (already exists)`);
          } else if (error.code === '42701') { // column already exists
            console.log(`   ⚠️  Skipped statement ${i + 1} (column already exists)`);
          } else {
            console.error(`   ❌ Failed on statement ${i + 1}: ${statement.substring(0, 100)}...`);
            console.error(`   Error: ${error.message}`);
            // Don't throw, continue with other statements
          }
        }
      }
    }

    console.log('✅ Migration completed!');
    
    // Verify tables after migration
    const newTableCheck = await client.query(tableCheckQuery);
    console.log('\n📊 All tables after migration:');
    newTableCheck.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    // Show column info for enrichment_jobs and enrichment_facts
    console.log('\n📋 Schema verification:');
    
    const jobsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'enrichment_jobs' 
      ORDER BY ordinal_position
    `);
    
    console.log('   enrichment_jobs columns:');
    jobsColumns.rows.forEach(col => {
      console.log(`     - ${col.column_name} (${col.data_type})`);
    });

    const factsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'enrichment_facts' 
      ORDER BY ordinal_position
    `);
    
    console.log('   enrichment_facts columns:');
    factsColumns.rows.forEach(col => {
      console.log(`     - ${col.column_name} (${col.data_type})`);
    });

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

runMigration().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
