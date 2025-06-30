-- Milestone 1: Core Backend Refactoring & LLM Integration
-- Database Schema Extension Migration (Simple approach)
-- Created: 2025-06-30

-- Add llm_used column to enrichment_jobs table
ALTER TABLE enrichment_jobs ADD COLUMN llm_used VARCHAR(50);

-- Add pages_scraped column to enrichment_jobs table  
ALTER TABLE enrichment_jobs ADD COLUMN pages_scraped INTEGER DEFAULT 0;

-- Add total_runtime_seconds column to enrichment_jobs table
ALTER TABLE enrichment_jobs ADD COLUMN total_runtime_seconds INTEGER DEFAULT 0;

-- Add tier_used column to enrichment_facts table
ALTER TABLE enrichment_facts ADD COLUMN tier_used INTEGER CHECK (tier_used >= 1 AND tier_used <= 3);

-- Update the status constraint to include 'partial_success'
ALTER TABLE enrichment_jobs DROP CONSTRAINT valid_status;
ALTER TABLE enrichment_jobs ADD CONSTRAINT valid_status CHECK (status IN ('pending', 'running', 'completed', 'partial_success', 'failed', 'cancelled'));

-- Create indexes
CREATE INDEX idx_enrichment_facts_tier_used ON enrichment_facts(tier_used);
CREATE INDEX idx_enrichment_jobs_llm_used ON enrichment_jobs(llm_used);

-- Update sample data to include new fields
UPDATE enrichment_jobs SET llm_used = 'gpt-4o' WHERE llm_used IS NULL;
UPDATE enrichment_jobs SET pages_scraped = pages_crawled WHERE pages_scraped = 0 OR pages_scraped IS NULL;
UPDATE enrichment_jobs SET total_runtime_seconds = CASE 
    WHEN status = 'completed' THEN FLOOR(RANDOM() * 1200 + 300)::INTEGER
    WHEN status = 'failed' THEN FLOOR(RANDOM() * 600 + 60)::INTEGER
    ELSE 0
END WHERE total_runtime_seconds = 0 OR total_runtime_seconds IS NULL;

-- Update sample facts to include tier information
UPDATE enrichment_facts SET tier_used = 1 WHERE tier_used IS NULL;
