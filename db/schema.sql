-- Resilion Enrichment POC Database Schema
-- Created: 2025-06-29

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enrichment Jobs Table
CREATE TABLE enrichment_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    domain VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    
    -- Workflow step tracking
    crawling_status VARCHAR(50) DEFAULT 'pending',
    chunking_status VARCHAR(50) DEFAULT 'pending',
    embedding_status VARCHAR(50) DEFAULT 'pending',
    extraction_status VARCHAR(50) DEFAULT 'pending',
    
    -- Progress tracking
    pages_crawled INTEGER DEFAULT 0,
    chunks_created INTEGER DEFAULT 0,
    embeddings_generated INTEGER DEFAULT 0,
    facts_extracted INTEGER DEFAULT 0,
    
    CONSTRAINT valid_status CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    CONSTRAINT valid_step_status CHECK (
        crawling_status IN ('pending', 'running', 'completed', 'failed') AND
        chunking_status IN ('pending', 'running', 'completed', 'failed') AND
        embedding_status IN ('pending', 'running', 'completed', 'failed') AND
        extraction_status IN ('pending', 'running', 'completed', 'failed')
    )
);

-- Enrichment Facts Table
CREATE TABLE enrichment_facts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES enrichment_jobs(id) ON DELETE CASCADE,
    fact_type VARCHAR(100) NOT NULL,
    fact_data JSONB NOT NULL,
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    source_url TEXT,
    source_text TEXT,
    embedding_id VARCHAR(255), -- Pinecone vector ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    validated BOOLEAN DEFAULT FALSE,
    validation_notes TEXT
);

-- Failed Jobs Table (Dead Letter Queue)
CREATE TABLE failed_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_job_id UUID,
    domain VARCHAR(255) NOT NULL,
    failure_step VARCHAR(50) NOT NULL,
    error_message TEXT NOT NULL,
    error_details JSONB,
    failed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    retry_attempted BOOLEAN DEFAULT FALSE,
    retry_count INTEGER DEFAULT 0
);

-- Job Logs Table
CREATE TABLE job_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES enrichment_jobs(id) ON DELETE CASCADE,
    level VARCHAR(20) NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Update trigger for enrichment_jobs
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_enrichment_jobs_updated_at 
    BEFORE UPDATE ON enrichment_jobs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Sample data for development/testing
INSERT INTO enrichment_jobs (domain, status, pages_crawled, chunks_created, facts_extracted, crawling_status, chunking_status, embedding_status, extraction_status) VALUES
('acme-corp.com', 'completed', 45, 234, 23, 'completed', 'completed', 'completed', 'completed'),
('techstart.io', 'completed', 12, 89, 45, 'completed', 'completed', 'completed', 'completed'),
('manufacturing-co.com', 'failed', 8, 45, 0, 'completed', 'completed', 'failed', 'pending'),
('startup-hub.com', 'pending', 0, 0, 0, 'pending', 'pending', 'pending', 'pending'),
('enterprise-solutions.com', 'completed', 67, 312, 67, 'completed', 'completed', 'completed', 'completed');

INSERT INTO enrichment_facts (job_id, fact_type, fact_data, confidence_score, source_url) VALUES
((SELECT id FROM enrichment_jobs WHERE domain = 'acme-corp.com'), 'company_info', '{"name": "ACME Corporation", "industry": "Manufacturing", "employees": "500-1000", "founded": "1985"}', 0.94, 'https://acme-corp.com/about'),
((SELECT id FROM enrichment_jobs WHERE domain = 'acme-corp.com'), 'location', '{"headquarters": "Detroit, MI", "facilities": ["Detroit, MI", "Austin, TX", "Portland, OR"]}', 0.87, 'https://acme-corp.com/locations'),
((SELECT id FROM enrichment_jobs WHERE domain = 'techstart.io'), 'company_info', '{"name": "TechStart Inc", "industry": "Technology", "employees": "50-100", "founded": "2018"}', 0.91, 'https://techstart.io/company'),
((SELECT id FROM enrichment_jobs WHERE domain = 'enterprise-solutions.com'), 'company_info', '{"name": "Enterprise Solutions LLC", "industry": "Software", "employees": "1000+", "founded": "2001"}', 0.96, 'https://enterprise-solutions.com/about');
