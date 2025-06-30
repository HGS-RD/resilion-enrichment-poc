-- Migration 006: Data Model Schema
-- Implements the Pre-Loader Data Model Specification v1.0
-- Creates Organization, Site, and EnrichmentJobRecord tables

-- Create Organizations table
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
);

-- Create Sites table
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
);

-- Create EnrichmentJobRecords table
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
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_company_name ON organizations(company_name);
CREATE INDEX IF NOT EXISTS idx_organizations_website ON organizations(website);
CREATE INDEX IF NOT EXISTS idx_organizations_last_verified ON organizations(last_verified_date);

CREATE INDEX IF NOT EXISTS idx_sites_organization_id ON sites(organization_id);
CREATE INDEX IF NOT EXISTS idx_sites_enrichment_job_id ON sites(enrichment_job_id);
CREATE INDEX IF NOT EXISTS idx_sites_site_type ON sites(site_type);
CREATE INDEX IF NOT EXISTS idx_sites_operating_status ON sites(operating_status);
CREATE INDEX IF NOT EXISTS idx_sites_confidence_score ON sites(confidence_score);
CREATE INDEX IF NOT EXISTS idx_sites_last_verified ON sites(last_verified_date);
CREATE INDEX IF NOT EXISTS idx_sites_city_state ON sites(city, state_province);

CREATE INDEX IF NOT EXISTS idx_enrichment_job_records_input_domain ON enrichment_job_records(input_domain);
CREATE INDEX IF NOT EXISTS idx_enrichment_job_records_status ON enrichment_job_records(status);
CREATE INDEX IF NOT EXISTS idx_enrichment_job_records_start_time ON enrichment_job_records(start_time);
CREATE INDEX IF NOT EXISTS idx_enrichment_job_records_triggered_by ON enrichment_job_records(triggered_by);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sites_updated_at 
    BEFORE UPDATE ON sites 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_enrichment_job_records_updated_at 
    BEFORE UPDATE ON enrichment_job_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key constraint from sites to enrichment_job_records
-- Note: We'll reference the existing enrichment_jobs table for now
-- ALTER TABLE sites ADD CONSTRAINT fk_sites_enrichment_job 
--     FOREIGN KEY (enrichment_job_id) REFERENCES enrichment_jobs(id);

-- Create views for common queries
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
GROUP BY o.organization_id, o.company_name, o.website, o.headquarters_address, o.last_verified_date;

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
LEFT JOIN enrichment_job_records ejr ON s.enrichment_job_id = ejr.enrichment_job_id;

-- Insert sample data for testing
INSERT INTO organizations (company_name, website, headquarters_address, industry_sectors) 
VALUES 
    ('Sample Manufacturing Corp', 'https://sample-mfg.com', '123 Industrial Blvd, Detroit, MI 48201', '["Manufacturing", "Automotive"]'),
    ('Global Energy Solutions', 'https://global-energy.com', '456 Energy Way, Houston, TX 77001', '["Energy", "Oil & Gas"]')
ON CONFLICT DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE organizations IS 'Organizations table following Pre-Loader Data Model v1.0';
COMMENT ON TABLE sites IS 'Sites table with facility and location information';
COMMENT ON TABLE enrichment_job_records IS 'Enrichment job tracking and metadata';

COMMENT ON COLUMN organizations.industry_sectors IS 'Array of industry categories or NAICS codes stored as JSONB';
COMMENT ON COLUMN organizations.subsidiaries IS 'Array of subsidiary company names stored as JSONB';
COMMENT ON COLUMN sites.geo_coordinates IS 'Latitude/longitude coordinates stored as JSONB';
