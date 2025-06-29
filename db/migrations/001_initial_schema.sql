-- Migration: 001_initial_schema
-- Description: Create initial database schema for Resilion Enrichment POC
-- Created: 2025-06-29

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enrichment Jobs Table
CREATE TABLE IF NOT EXISTS enrichment_jobs (
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
CREATE TABLE IF NOT EXISTS enrichment_facts (
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
);

-- Job Logs Table
CREATE TABLE IF NOT EXISTS job_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES enrichment_jobs(id) ON DELETE CASCADE,
    level VARCHAR(20) NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_enrichment_facts_job_id ON enrichment_facts(job_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_facts_type ON enrichment_facts(fact_type);
CREATE INDEX IF NOT EXISTS idx_enrichment_facts_confidence ON enrichment_facts(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_enrichment_facts_created ON enrichment_facts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_logs_job_id ON job_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_logs_level ON job_logs(level);
CREATE INDEX IF NOT EXISTS idx_job_logs_created ON job_logs(created_at DESC);

-- Update trigger for enrichment_jobs
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_enrichment_jobs_updated_at ON enrichment_jobs;
CREATE TRIGGER update_enrichment_jobs_updated_at 
    BEFORE UPDATE ON enrichment_jobs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
