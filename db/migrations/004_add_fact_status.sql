-- Add status column to enrichment_facts table
ALTER TABLE enrichment_facts 
ADD COLUMN status VARCHAR(50) DEFAULT 'pending';

-- Add constraint for valid status values
ALTER TABLE enrichment_facts 
ADD CONSTRAINT valid_fact_status CHECK (status IN ('pending', 'approved', 'rejected'));

-- Update existing facts to have 'pending' status
UPDATE enrichment_facts SET status = 'pending' WHERE status IS NULL;
