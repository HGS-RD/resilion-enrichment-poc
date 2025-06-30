-- Milestone 1: Core Backend Refactoring & LLM Integration
-- Database Schema Extension Migration
-- Created: 2025-06-30

-- Add new columns to enrichment_jobs table (if they don't exist)
ALTER TABLE enrichment_jobs 
ADD COLUMN IF NOT EXISTS llm_used VARCHAR(50),
ADD COLUMN IF NOT EXISTS pages_scraped INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_runtime_seconds INTEGER DEFAULT 0;

-- Update the status constraint to include 'partial_success'
ALTER TABLE enrichment_jobs 
DROP CONSTRAINT IF EXISTS valid_status;

ALTER TABLE enrichment_jobs 
ADD CONSTRAINT valid_status CHECK (status IN ('pending', 'running', 'completed', 'partial_success', 'failed', 'cancelled'));

-- Add tier_used column to enrichment_facts table (if it doesn't exist)
ALTER TABLE enrichment_facts 
ADD COLUMN IF NOT EXISTS tier_used INTEGER CHECK (tier_used >= 1 AND tier_used <= 3);

-- Create index on tier_used for better query performance (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_enrichment_facts_tier_used ON enrichment_facts(tier_used);

-- Create index on llm_used for analytics (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_llm_used ON enrichment_jobs(llm_used);

-- Update sample data to include new fields
UPDATE enrichment_jobs 
SET llm_used = 'gpt-4o', 
    pages_scraped = pages_crawled,
    total_runtime_seconds = CASE 
        WHEN status = 'completed' THEN FLOOR(RANDOM() * 1200 + 300)::INTEGER -- 5-20 minutes
        WHEN status = 'failed' THEN FLOOR(RANDOM() * 600 + 60)::INTEGER -- 1-10 minutes
        ELSE 0
    END
WHERE llm_used IS NULL;

-- Update sample facts to include tier information
UPDATE enrichment_facts 
SET tier_used = 1 -- Assume all existing facts came from Tier 1 (corporate websites)
WHERE tier_used IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN enrichment_jobs.llm_used IS 'The LLM model used for this enrichment job (e.g., gpt-4o, claude-3-opus, gemini-1.5-pro)';
COMMENT ON COLUMN enrichment_jobs.pages_scraped IS 'Total number of pages scraped across all tiers for this job';
COMMENT ON COLUMN enrichment_jobs.total_runtime_seconds IS 'Total runtime of the enrichment job in seconds';
COMMENT ON COLUMN enrichment_facts.tier_used IS 'The tier (1-3) from which this fact was extracted';
