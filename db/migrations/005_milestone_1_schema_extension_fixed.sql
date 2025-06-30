-- Milestone 1: Core Backend Refactoring & LLM Integration
-- Database Schema Extension Migration (Fixed)
-- Created: 2025-06-30

-- Add llm_used column to enrichment_jobs table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='enrichment_jobs' AND column_name='llm_used') THEN
        ALTER TABLE enrichment_jobs ADD COLUMN llm_used VARCHAR(50);
    END IF;
END $$;

-- Add pages_scraped column to enrichment_jobs table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='enrichment_jobs' AND column_name='pages_scraped') THEN
        ALTER TABLE enrichment_jobs ADD COLUMN pages_scraped INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add total_runtime_seconds column to enrichment_jobs table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='enrichment_jobs' AND column_name='total_runtime_seconds') THEN
        ALTER TABLE enrichment_jobs ADD COLUMN total_runtime_seconds INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add tier_used column to enrichment_facts table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='enrichment_facts' AND column_name='tier_used') THEN
        ALTER TABLE enrichment_facts ADD COLUMN tier_used INTEGER CHECK (tier_used >= 1 AND tier_used <= 3);
    END IF;
END $$;

-- Update the status constraint to include 'partial_success'
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='valid_status' AND table_name='enrichment_jobs') THEN
        ALTER TABLE enrichment_jobs DROP CONSTRAINT valid_status;
    END IF;
    
    -- Add the updated constraint
    ALTER TABLE enrichment_jobs ADD CONSTRAINT valid_status CHECK (status IN ('pending', 'running', 'completed', 'partial_success', 'failed', 'cancelled'));
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_enrichment_facts_tier_used ON enrichment_facts(tier_used);
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_llm_used ON enrichment_jobs(llm_used);

-- Update sample data to include new fields (only if columns exist and data is null)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='enrichment_jobs' AND column_name='llm_used') THEN
        UPDATE enrichment_jobs 
        SET llm_used = 'gpt-4o'
        WHERE llm_used IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='enrichment_jobs' AND column_name='pages_scraped') THEN
        UPDATE enrichment_jobs 
        SET pages_scraped = pages_crawled
        WHERE pages_scraped = 0 OR pages_scraped IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='enrichment_jobs' AND column_name='total_runtime_seconds') THEN
        UPDATE enrichment_jobs 
        SET total_runtime_seconds = CASE 
            WHEN status = 'completed' THEN FLOOR(RANDOM() * 1200 + 300)::INTEGER -- 5-20 minutes
            WHEN status = 'failed' THEN FLOOR(RANDOM() * 600 + 60)::INTEGER -- 1-10 minutes
            ELSE 0
        END
        WHERE total_runtime_seconds = 0 OR total_runtime_seconds IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='enrichment_facts' AND column_name='tier_used') THEN
        UPDATE enrichment_facts 
        SET tier_used = 1 -- Assume all existing facts came from Tier 1 (corporate websites)
        WHERE tier_used IS NULL;
    END IF;
END $$;
