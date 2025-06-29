/**
 * Enrichment Job Data Model
 * 
 * This file documents the enrichment_job data model and related types
 * used throughout the enrichment process.
 */

export interface EnrichmentJob {
  id: string;
  domain: string;
  status: JobStatus;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  retry_count: number;
  metadata: Record<string, any>;
  
  // Workflow step tracking
  crawling_status: StepStatus;
  chunking_status: StepStatus;
  embedding_status: StepStatus;
  extraction_status: StepStatus;
  
  // Progress tracking
  pages_crawled: number;
  chunks_created: number;
  embeddings_generated: number;
  facts_extracted: number;
}

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface EnrichmentFact {
  id: string;
  job_id: string;
  fact_type: string;
  fact_data: Record<string, any>;
  confidence_score: number;
  source_url?: string;
  source_text?: string;
  embedding_id?: string;
  created_at: string;
  validated: boolean;
  validation_notes?: string;
}

export interface CrawledPage {
  url: string;
  title: string;
  content: string;
  metadata: {
    crawled_at: string;
    status_code: number;
    content_type: string;
    word_count: number;
  };
}

export interface TextChunk {
  id: string;
  content: string;
  metadata: {
    source_url: string;
    chunk_index: number;
    word_count: number;
    created_at: string;
  };
}

export interface EmbeddingResult {
  chunk_id: string;
  embedding_id: string;
  vector: number[];
  metadata: Record<string, any>;
}

// Chain-of-Responsibility Pattern Interfaces
export interface EnrichmentStep {
  name: string;
  execute(context: EnrichmentContext): Promise<EnrichmentContext>;
  canHandle(context: EnrichmentContext): boolean;
}

export interface EnrichmentContext {
  job: EnrichmentJob;
  crawled_pages?: CrawledPage[];
  text_chunks?: TextChunk[];
  embeddings?: EmbeddingResult[];
  extracted_facts?: EnrichmentFact[];
  error?: Error;
  step_results?: Record<string, any>;
}

export interface EnrichmentChain {
  addStep(step: EnrichmentStep): EnrichmentChain;
  execute(context: EnrichmentContext): Promise<EnrichmentContext>;
}

// Database Repository Interfaces
export interface JobRepository {
  create(domain: string, metadata?: Record<string, any>): Promise<EnrichmentJob>;
  findById(id: string): Promise<EnrichmentJob | null>;
  findByDomain(domain: string): Promise<EnrichmentJob[]>;
  updateStatus(id: string, status: JobStatus): Promise<void>;
  updateStepStatus(id: string, step: keyof Pick<EnrichmentJob, 'crawling_status' | 'chunking_status' | 'embedding_status' | 'extraction_status'>, status: StepStatus): Promise<void>;
  updateProgress(id: string, progress: Partial<Pick<EnrichmentJob, 'pages_crawled' | 'chunks_created' | 'embeddings_generated' | 'facts_extracted'>>): Promise<void>;
  logError(id: string, error: string, step?: string): Promise<void>;
  incrementRetryCount(id: string): Promise<void>;
}

export interface FactRepository {
  create(fact: Omit<EnrichmentFact, 'id' | 'created_at'>): Promise<EnrichmentFact>;
  findByJobId(jobId: string): Promise<EnrichmentFact[]>;
  updateValidation(id: string, validated: boolean, notes?: string): Promise<void>;
}

// Service Configuration
export interface CrawlerConfig {
  max_pages: number;
  delay_ms: number;
  timeout_ms: number;
  user_agent: string;
  respect_robots_txt: boolean;
}

export interface ChunkingConfig {
  max_chunk_size: number;
  overlap_size: number;
  min_chunk_size: number;
}

export interface EmbeddingConfig {
  model: string;
  dimensions: number;
  batch_size: number;
}

export interface ExtractionConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  confidence_threshold: number;
}
