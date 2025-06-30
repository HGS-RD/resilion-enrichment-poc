-- Add final missing columns for Milestone 1
-- Created: 2025-06-30

-- Add llm_used column to enrichment_jobs table
ALTER TABLE enrichment_jobs ADD COLUMN llm_used VARCHAR(50);

-- Add tier_used column to enrichment_facts table
ALTER TABLE enrichment_facts ADD COLUMN tier_used INTEGER CHECK (tier_used >= 1 AND tier_used <= 3);

-- Update the status constraint to include 'partial_success'
ALTER TABLE enrichment_jobs DROP CONSTRAINT valid_status;
ALTER TABLE enrichment_jobs ADD CONSTRAINT valid_status CHECK (status IN ('pending', 'running', 'completed', 'partial_success', 'failed', 'cancelled'));

-- Create indexes on new columns
CREATE INDEX idx_enrichment_facts_tier_used ON enrichment_facts(tier_used);
CREATE INDEX idx_enrichment_jobs_llm_used ON enrichment_jobs(llm_used);

-- Update sample data
UPDATE enrichment_jobs SET llm_used = 'gpt-4o' WHERE llm_used IS NULL;
UPDATE enrichment_facts SET tier_used = 1 WHERE tier_used IS NULL;
