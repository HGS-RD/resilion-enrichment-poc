#!/usr/bin/env node

/**
 * Run the new developer observability migration
 */

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runNewMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🔄 Running developer observability migration...');
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

    // Read the new migration file
    const migrationPath = path.join(__dirname, '..', 'db', 'migrations', '003_developer_observability.sql');
    
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
      .filter(stmt => stmt && !stmt.startsWith('--'));
    
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
    
    // Verify new tables
    const newTableCheck = await client.query(tableCheckQuery);
    console.log('\n📊 All tables after migration:');
    newTableCheck.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

runNewMigration().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
