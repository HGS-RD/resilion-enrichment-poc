-- Migration 007: Add crawled_pages table for enhanced web crawler observability
-- This table tracks every page crawled during enrichment jobs

CREATE TABLE IF NOT EXISTS crawled_pages (
    id SERIAL PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES enrichment_jobs(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT,
    status_code INTEGER NOT NULL,
    content_length INTEGER,
    word_count INTEGER,
    priority_score INTEGER DEFAULT 1,
    crawled_at TIMESTAMP DEFAULT NOW(),
    error_message TEXT,
    
    -- Indexes for performance
    CONSTRAINT crawled_pages_job_url_unique UNIQUE(job_id, url)
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_crawled_pages_job_id ON crawled_pages(job_id);
CREATE INDEX IF NOT EXISTS idx_crawled_pages_status_code ON crawled_pages(status_code);
CREATE INDEX IF NOT EXISTS idx_crawled_pages_crawled_at ON crawled_pages(crawled_at);

-- Add comments for documentation
COMMENT ON TABLE crawled_pages IS 'Tracks individual pages crawled during enrichment jobs for observability and debugging';
COMMENT ON COLUMN crawled_pages.job_id IS 'Reference to the enrichment job';
COMMENT ON COLUMN crawled_pages.url IS 'Full URL of the crawled page';
COMMENT ON COLUMN crawled_pages.title IS 'Page title extracted from HTML';
COMMENT ON COLUMN crawled_pages.status_code IS 'HTTP response status code';
COMMENT ON COLUMN crawled_pages.content_length IS 'Length of extracted content in characters';
COMMENT ON COLUMN crawled_pages.word_count IS 'Number of words in extracted content';
COMMENT ON COLUMN crawled_pages.priority_score IS 'Priority score assigned by URL prioritization algorithm';
COMMENT ON COLUMN crawled_pages.error_message IS 'Error message if crawling failed';
