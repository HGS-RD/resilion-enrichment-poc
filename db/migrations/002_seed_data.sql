-- Migration: 002_seed_data
-- Description: Insert sample data for development and testing
-- Created: 2025-06-29

-- Sample enrichment jobs
INSERT INTO enrichment_jobs (domain, status, pages_crawled, chunks_created, facts_extracted, crawling_status, chunking_status, embedding_status, extraction_status, started_at, completed_at) VALUES
('acme-corp.com', 'completed', 45, 234, 23, 'completed', 'completed', 'completed', 'completed', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '30 minutes'),
('techstart.io', 'completed', 12, 89, 45, 'completed', 'completed', 'completed', 'completed', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '3 hours'),
('manufacturing-co.com', 'failed', 8, 45, 0, 'completed', 'completed', 'failed', 'pending', NOW() - INTERVAL '1 hour', NULL),
('startup-hub.com', 'pending', 0, 0, 0, 'pending', 'pending', 'pending', 'pending', NULL, NULL),
('enterprise-solutions.com', 'completed', 67, 312, 67, 'completed', 'completed', 'completed', 'completed', NOW() - INTERVAL '6 hours', NOW() - INTERVAL '5 hours')
ON CONFLICT DO NOTHING;

-- Sample enrichment facts
INSERT INTO enrichment_facts (job_id, fact_type, fact_data, confidence_score, source_url) VALUES
((SELECT id FROM enrichment_jobs WHERE domain = 'acme-corp.com' LIMIT 1), 'company_info', '{"name": "ACME Corporation", "industry": "Manufacturing", "employees": "500-1000", "founded": "1985"}', 0.94, 'https://acme-corp.com/about'),
((SELECT id FROM enrichment_jobs WHERE domain = 'acme-corp.com' LIMIT 1), 'location', '{"headquarters": "Detroit, MI", "facilities": ["Detroit, MI", "Austin, TX", "Portland, OR"]}', 0.87, 'https://acme-corp.com/locations'),
((SELECT id FROM enrichment_jobs WHERE domain = 'acme-corp.com' LIMIT 1), 'products', '{"primary": "Industrial Equipment", "categories": ["Heavy Machinery", "Automation Systems", "Quality Control"]}', 0.91, 'https://acme-corp.com/products'),
((SELECT id FROM enrichment_jobs WHERE domain = 'techstart.io' LIMIT 1), 'company_info', '{"name": "TechStart Inc", "industry": "Technology", "employees": "50-100", "founded": "2018"}', 0.91, 'https://techstart.io/company'),
((SELECT id FROM enrichment_jobs WHERE domain = 'techstart.io' LIMIT 1), 'funding', '{"series": "Series A", "amount": "$5M", "investors": ["Venture Capital Partners", "Tech Accelerator Fund"]}', 0.88, 'https://techstart.io/news/funding'),
((SELECT id FROM enrichment_jobs WHERE domain = 'enterprise-solutions.com' LIMIT 1), 'company_info', '{"name": "Enterprise Solutions LLC", "industry": "Software", "employees": "1000+", "founded": "2001"}', 0.96, 'https://enterprise-solutions.com/about'),
((SELECT id FROM enrichment_jobs WHERE domain = 'enterprise-solutions.com' LIMIT 1), 'services', '{"primary": "Enterprise Software", "specialties": ["CRM", "ERP", "Business Intelligence"]}', 0.93, 'https://enterprise-solutions.com/services')
ON CONFLICT DO NOTHING;

-- Sample failed job
INSERT INTO failed_jobs (original_job_id, domain, failure_step, error_message, error_details) VALUES
((SELECT id FROM enrichment_jobs WHERE domain = 'manufacturing-co.com' LIMIT 1), 'manufacturing-co.com', 'embedding', 'Pinecone API rate limit exceeded', '{"error_code": "RATE_LIMIT", "retry_after": 60, "timestamp": "2025-06-29T09:30:00Z"}')
ON CONFLICT DO NOTHING;

-- Sample job logs
INSERT INTO job_logs (job_id, level, message, details) VALUES
((SELECT id FROM enrichment_jobs WHERE domain = 'acme-corp.com' LIMIT 1), 'info', 'Job started successfully', '{"step": "initialization"}'),
((SELECT id FROM enrichment_jobs WHERE domain = 'acme-corp.com' LIMIT 1), 'info', 'Crawling completed', '{"pages_found": 45, "pages_processed": 45}'),
((SELECT id FROM enrichment_jobs WHERE domain = 'acme-corp.com' LIMIT 1), 'info', 'Text chunking completed', '{"chunks_created": 234, "avg_chunk_size": 512}'),
((SELECT id FROM enrichment_jobs WHERE domain = 'acme-corp.com' LIMIT 1), 'info', 'Embeddings generated successfully', '{"vectors_created": 234, "dimension": 1536}'),
((SELECT id FROM enrichment_jobs WHERE domain = 'acme-corp.com' LIMIT 1), 'info', 'Fact extraction completed', '{"facts_extracted": 23, "avg_confidence": 0.91}'),
((SELECT id FROM enrichment_jobs WHERE domain = 'manufacturing-co.com' LIMIT 1), 'error', 'Embedding generation failed', '{"error": "Pinecone API rate limit exceeded", "step": "embedding", "retry_count": 3}')
ON CONFLICT DO NOTHING;
