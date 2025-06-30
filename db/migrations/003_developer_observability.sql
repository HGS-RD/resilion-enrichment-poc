-- Developer Observability Enhancement Migration
-- Adds comprehensive debugging and analytics tables

-- Enhanced job logs with structured debugging data
CREATE TABLE enrichment_debug_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES enrichment_jobs(id) ON DELETE CASCADE,
    step_name VARCHAR(50) NOT NULL,
    log_level VARCHAR(20) NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    execution_time_ms INTEGER,
    memory_usage_mb INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexing for performance
    INDEX idx_debug_logs_job_step (job_id, step_name),
    INDEX idx_debug_logs_created (created_at DESC)
);

-- Store text chunks with metadata for analysis
CREATE TABLE enrichment_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES enrichment_jobs(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    content_length INTEGER NOT NULL,
    source_url TEXT,
    source_page_title TEXT,
    chunk_metadata JSONB DEFAULT '{}',
    quality_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_chunk_index CHECK (chunk_index >= 0),
    CONSTRAINT valid_content_length CHECK (content_length > 0),
    CONSTRAINT valid_quality_score CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 1)),
    
    -- Indexing
    INDEX idx_chunks_job_id (job_id),
    INDEX idx_chunks_job_index (job_id, chunk_index)
);

-- Store embedding metadata and quality metrics
CREATE TABLE enrichment_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES enrichment_jobs(id) ON DELETE CASCADE,
    chunk_id UUID NOT NULL REFERENCES enrichment_chunks(id) ON DELETE CASCADE,
    vector_id VARCHAR(255) NOT NULL, -- Pinecone/vector DB ID
    embedding_model VARCHAR(100) NOT NULL,
    vector_dimensions INTEGER NOT NULL,
    embedding_metadata JSONB DEFAULT '{}',
    similarity_scores JSONB DEFAULT '{}', -- Similarity to other embeddings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_vector_dimensions CHECK (vector_dimensions > 0),
    
    -- Indexing
    INDEX idx_embeddings_job_id (job_id),
    INDEX idx_embeddings_chunk_id (chunk_id),
    INDEX idx_embeddings_vector_id (vector_id)
);

-- Store prompt templates and execution details
CREATE TABLE enrichment_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES enrichment_jobs(id) ON DELETE CASCADE,
    step_name VARCHAR(50) NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    template_version VARCHAR(20) NOT NULL,
    system_prompt TEXT NOT NULL,
    user_prompt TEXT NOT NULL,
    rendered_prompt TEXT NOT NULL, -- Final prompt sent to model
    prompt_tokens INTEGER NOT NULL,
    max_tokens INTEGER NOT NULL,
    temperature DECIMAL(3,2) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_prompt_tokens CHECK (prompt_tokens > 0),
    CONSTRAINT valid_max_tokens CHECK (max_tokens > 0),
    CONSTRAINT valid_temperature CHECK (temperature >= 0 AND temperature <= 2),
    
    -- Indexing
    INDEX idx_prompts_job_id (job_id),
    INDEX idx_prompts_step (step_name),
    INDEX idx_prompts_template (template_name, template_version)
);

-- Store model responses and performance metrics
CREATE TABLE enrichment_model_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt_id UUID NOT NULL REFERENCES enrichment_prompts(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES enrichment_jobs(id) ON DELETE CASCADE,
    response_text TEXT,
    response_tokens INTEGER,
    total_tokens INTEGER,
    response_time_ms INTEGER NOT NULL,
    api_cost_usd DECIMAL(10,6),
    model_version VARCHAR(50),
    finish_reason VARCHAR(50),
    response_metadata JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_response_time CHECK (response_time_ms >= 0),
    CONSTRAINT valid_api_cost CHECK (api_cost_usd IS NULL OR api_cost_usd >= 0),
    
    -- Indexing
    INDEX idx_model_responses_prompt_id (prompt_id),
    INDEX idx_model_responses_job_id (job_id),
    INDEX idx_model_responses_created (created_at DESC)
);

-- Enhanced facts table with detailed source attribution
ALTER TABLE enrichment_facts ADD COLUMN IF NOT EXISTS chunk_id UUID REFERENCES enrichment_chunks(id);
ALTER TABLE enrichment_facts ADD COLUMN IF NOT EXISTS prompt_id UUID REFERENCES enrichment_prompts(id);
ALTER TABLE enrichment_facts ADD COLUMN IF NOT EXISTS model_response_id UUID REFERENCES enrichment_model_responses(id);
ALTER TABLE enrichment_facts ADD COLUMN IF NOT EXISTS extraction_metadata JSONB DEFAULT '{}';
ALTER TABLE enrichment_facts ADD COLUMN IF NOT EXISTS quality_metrics JSONB DEFAULT '{}';

-- Create indexes for the new foreign keys
CREATE INDEX IF NOT EXISTS idx_facts_chunk_id ON enrichment_facts(chunk_id);
CREATE INDEX IF NOT EXISTS idx_facts_prompt_id ON enrichment_facts(prompt_id);
CREATE INDEX IF NOT EXISTS idx_facts_model_response_id ON enrichment_facts(model_response_id);

-- Prompt experiment tracking for A/B testing
CREATE TABLE prompt_experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    experiment_name VARCHAR(100) NOT NULL,
    description TEXT,
    template_a_id UUID NOT NULL REFERENCES enrichment_prompts(id),
    template_b_id UUID NOT NULL REFERENCES enrichment_prompts(id),
    success_metric VARCHAR(50) NOT NULL, -- 'fact_count', 'avg_confidence', 'quality_score'
    results_a JSONB DEFAULT '{}',
    results_b JSONB DEFAULT '{}',
    winner VARCHAR(1) CHECK (winner IN ('A', 'B', 'T')), -- T for tie
    confidence_level DECIMAL(5,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexing
    INDEX idx_experiments_name (experiment_name),
    INDEX idx_experiments_created (created_at DESC)
);

-- Performance analytics aggregation table
CREATE TABLE enrichment_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES enrichment_jobs(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL, -- 'step_duration', 'token_usage', 'cost', 'quality'
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,6) NOT NULL,
    metric_unit VARCHAR(20), -- 'ms', 'tokens', 'usd', 'score'
    metric_metadata JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexing
    INDEX idx_performance_job_id (job_id),
    INDEX idx_performance_type (metric_type),
    INDEX idx_performance_name (metric_name),
    INDEX idx_performance_recorded (recorded_at DESC)
);

-- Quality assessment table for human validation
CREATE TABLE fact_quality_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fact_id UUID NOT NULL REFERENCES enrichment_facts(id) ON DELETE CASCADE,
    assessor_id VARCHAR(100), -- User/system that made the assessment
    accuracy_score INTEGER CHECK (accuracy_score >= 1 AND accuracy_score <= 5),
    relevance_score INTEGER CHECK (relevance_score >= 1 AND relevance_score <= 5),
    completeness_score INTEGER CHECK (completeness_score >= 1 AND completeness_score <= 5),
    overall_quality INTEGER CHECK (overall_quality >= 1 AND overall_quality <= 5),
    feedback_notes TEXT,
    assessment_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexing
    INDEX idx_quality_fact_id (fact_id),
    INDEX idx_quality_assessor (assessor_id),
    INDEX idx_quality_created (created_at DESC)
);

-- Create views for common debugging queries
CREATE OR REPLACE VIEW job_debug_summary AS
SELECT 
    j.id,
    j.domain,
    j.status,
    j.created_at,
    j.completed_at,
    -- Step status summary
    j.crawling_status,
    j.chunking_status,
    j.embedding_status,
    j.extraction_status,
    -- Progress metrics
    j.pages_crawled,
    j.chunks_created,
    j.embeddings_generated,
    j.facts_extracted,
    -- Performance metrics
    COUNT(DISTINCT c.id) as total_chunks,
    COUNT(DISTINCT e.id) as total_embeddings,
    COUNT(DISTINCT f.id) as total_facts,
    COUNT(DISTINCT p.id) as total_prompts,
    -- Quality metrics
    AVG(f.confidence_score) as avg_confidence,
    AVG(c.quality_score) as avg_chunk_quality,
    -- Cost metrics
    SUM(mr.api_cost_usd) as total_api_cost,
    SUM(mr.total_tokens) as total_tokens_used
FROM enrichment_jobs j
LEFT JOIN enrichment_chunks c ON j.id = c.job_id
LEFT JOIN enrichment_embeddings e ON j.id = e.job_id
LEFT JOIN enrichment_facts f ON j.id = f.job_id
LEFT JOIN enrichment_prompts p ON j.id = p.job_id
LEFT JOIN enrichment_model_responses mr ON j.id = mr.job_id
GROUP BY j.id, j.domain, j.status, j.created_at, j.completed_at,
         j.crawling_status, j.chunking_status, j.embedding_status, j.extraction_status,
         j.pages_crawled, j.chunks_created, j.embeddings_generated, j.facts_extracted;

-- Create view for step-by-step execution analysis
CREATE OR REPLACE VIEW job_step_analysis AS
SELECT 
    j.id as job_id,
    j.domain,
    'crawling' as step_name,
    j.crawling_status as status,
    NULL as prompt_count,
    NULL as avg_response_time,
    NULL as total_tokens,
    NULL as total_cost
FROM enrichment_jobs j
UNION ALL
SELECT 
    j.id as job_id,
    j.domain,
    'chunking' as step_name,
    j.chunking_status as status,
    NULL as prompt_count,
    NULL as avg_response_time,
    NULL as total_tokens,
    NULL as total_cost
FROM enrichment_jobs j
UNION ALL
SELECT 
    j.id as job_id,
    j.domain,
    'embedding' as step_name,
    j.embedding_status as status,
    NULL as prompt_count,
    NULL as avg_response_time,
    NULL as total_tokens,
    NULL as total_cost
FROM enrichment_jobs j
UNION ALL
SELECT 
    j.id as job_id,
    j.domain,
    'extraction' as step_name,
    j.extraction_status as status,
    COUNT(p.id) as prompt_count,
    AVG(mr.response_time_ms) as avg_response_time,
    SUM(mr.total_tokens) as total_tokens,
    SUM(mr.api_cost_usd) as total_cost
FROM enrichment_jobs j
LEFT JOIN enrichment_prompts p ON j.id = p.job_id AND p.step_name = 'extraction'
LEFT JOIN enrichment_model_responses mr ON p.id = mr.prompt
