#!/usr/bin/env node

/**
 * Run the data model migration directly
 * This script handles the complex SQL properly
 */

require('dotenv').config();
const { Client } = require('pg');

async function runDataModelMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🔄 Running Data Model Migration');
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

    // Create Organizations table
    console.log('📋 Creating organizations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        organization_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name VARCHAR(255) NOT NULL,
        website VARCHAR(500),
        headquarters_address TEXT,
        industry_sectors JSONB DEFAULT '[]'::jsonb,
        parent_company VARCHAR(255),
        subsidiaries JSONB DEFAULT '[]'::jsonb,
        last_verified_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Organizations table created');

    // Create Sites table
    console.log('📋 Creating sites table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS sites (
        site_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
        site_name VARCHAR(255) NOT NULL,
        address TEXT,
        city VARCHAR(100),
        state_province VARCHAR(100),
        country VARCHAR(100),
        postal_code VARCHAR(20),
        geo_coordinates JSONB,
        site_type VARCHAR(100),
        site_purpose TEXT,
        certifications JSONB DEFAULT '[]'::jsonb,
        operating_status VARCHAR(50) CHECK (operating_status IN ('active', 'under_construction', 'inactive', 'closed')),
        production_capacity TEXT,
        employee_count INTEGER,
        plant_manager VARCHAR(255),
        regulatory_ids JSONB DEFAULT '[]'::jsonb,
        supply_chain_dependencies JSONB DEFAULT '[]'::jsonb,
        major_products JSONB DEFAULT '[]'::jsonb,
        evidence_text TEXT NOT NULL,
        source VARCHAR(1000) NOT NULL,
        confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
        last_verified_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        enrichment_job_id UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Sites table created');

    // Create EnrichmentJobRecords table
    console.log('📋 Creating enrichment_job_records table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS enrichment_job_records (
        enrichment_job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        triggered_by VARCHAR(100) NOT NULL,
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE,
        status VARCHAR(20) CHECK (status IN ('pending', 'running', 'completed', 'failed')) NOT NULL,
        confidence_summary DECIMAL(3,2) CHECK (confidence_summary >= 0 AND confidence_summary <= 1),
        errors TEXT,
        partial_success BOOLEAN DEFAULT FALSE,
        retried_count INTEGER DEFAULT 0,
        input_domain VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ EnrichmentJobRecords table created');

    // Create indexes
    console.log('📋 Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_organizations_company_name ON organizations(company_name)',
      'CREATE INDEX IF NOT EXISTS idx_organizations_website ON organizations(website)',
      'CREATE INDEX IF NOT EXISTS idx_organizations_last_verified ON organizations(last_verified_date)',
      'CREATE INDEX IF NOT EXISTS idx_sites_organization_id ON sites(organization_id)',
      'CREATE INDEX IF NOT EXISTS idx_sites_enrichment_job_id ON sites(enrichment_job_id)',
      'CREATE INDEX IF NOT EXISTS idx_sites_site_type ON sites(site_type)',
      'CREATE INDEX IF NOT EXISTS idx_sites_operating_status ON sites(operating_status)',
      'CREATE INDEX IF NOT EXISTS idx_sites_confidence_score ON sites(confidence_score)',
      'CREATE INDEX IF NOT EXISTS idx_sites_last_verified ON sites(last_verified_date)',
      'CREATE INDEX IF NOT EXISTS idx_sites_city_state ON sites(city, state_province)',
      'CREATE INDEX IF NOT EXISTS idx_enrichment_job_records_input_domain ON enrichment_job_records(input_domain)',
      'CREATE INDEX IF NOT EXISTS idx_enrichment_job_records_status ON enrichment_job_records(status)',
      'CREATE INDEX IF NOT EXISTS idx_enrichment_job_records_start_time ON enrichment_job_records(start_time)',
      'CREATE INDEX IF NOT EXISTS idx_enrichment_job_records_triggered_by ON enrichment_job_records(triggered_by)'
    ];

    for (const indexSql of indexes) {
      try {
        await client.query(indexSql);
        console.log(`   ✓ Index created`);
      } catch (error) {
        if (error.code === '42P07') {
          console.log(`   ⚠️  Index already exists`);
        } else {
          console.error(`   ❌ Index creation failed: ${error.message}`);
        }
      }
    }

    // Create trigger function
    console.log('📋 Creating trigger function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);
    console.log('✅ Trigger function created');

    // Create triggers
    console.log('📋 Creating triggers...');
    const triggers = [
      'CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      'CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      'CREATE TRIGGER update_enrichment_job_records_updated_at BEFORE UPDATE ON enrichment_job_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'
    ];

    for (const triggerSql of triggers) {
      try {
        await client.query(triggerSql);
        console.log(`   ✓ Trigger created`);
      } catch (error) {
        if (error.code === '42710') {
          console.log(`   ⚠️  Trigger already exists`);
        } else {
          console.error(`   ❌ Trigger creation failed: ${error.message}`);
        }
      }
    }

    // Create views
    console.log('📋 Creating views...');
    await client.query(`
      CREATE OR REPLACE VIEW organization_summary AS
      SELECT 
          o.organization_id,
          o.company_name,
          o.website,
          o.headquarters_address,
          COUNT(s.site_id) as total_sites,
          COUNT(CASE WHEN s.operating_status = 'active' THEN 1 END) as active_sites,
          AVG(s.confidence_score) as average_confidence,
          MAX(s.last_verified_date) as last_site_verification,
          o.last_verified_date as organization_last_verified
      FROM organizations o
      LEFT JOIN sites s ON o.organization_id = s.organization_id
      GROUP BY o.organization_id, o.company_name, o.website, o.headquarters_address, o.last_verified_date
    `);
    console.log('✅ Organization summary view created');

    await client.query(`
      CREATE OR REPLACE VIEW site_summary AS
      SELECT 
          s.site_id,
          s.site_name,
          s.site_type,
          s.operating_status,
          s.city,
          s.state_province,
          s.country,
          s.confidence_score,
          s.employee_count,
          s.last_verified_date,
          o.company_name,
          o.website as company_website,
          ejr.status as job_status,
          ejr.start_time as job_start_time
      FROM sites s
      JOIN organizations o ON s.organization_id = o.organization_id
      LEFT JOIN enrichment_job_records ejr ON s.enrichment_job_id = ejr.enrichment_job_id
    `);
    console.log('✅ Site summary view created');

    // Insert sample data
    console.log('📋 Inserting sample data...');
    await client.query(`
      INSERT INTO organizations (company_name, website, headquarters_address, industry_sectors) 
      VALUES 
          ('Sample Manufacturing Corp', 'https://sample-mfg.com', '123 Industrial Blvd, Detroit, MI 48201', '["Manufacturing", "Automotive"]'),
          ('Global Energy Solutions', 'https://global-energy.com', '456 Energy Way, Houston, TX 77001', '["Energy", "Oil & Gas"]')
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Sample data inserted');

    // Verify tables
    const tableCheckQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    const allTables = await client.query(tableCheckQuery);
    console.log('\n📊 All tables after migration:');
    allTables.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    console.log('\n✅ Data Model Migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

runDataModelMigration().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
