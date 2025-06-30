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
  
  // Milestone 1 additions
  llm_used?: string;                    // LLM model used for this job
  pages_scraped: number;                // Total pages scraped across all tiers
  total_runtime_seconds: number;        // Total runtime in seconds
}

export type JobStatus = 'pending' | 'running' | 'completed' | 'partial_success' | 'failed' | 'cancelled';
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
  
  // Milestone 1 additions
  tier_used?: number;                   // Tier (1-3) from which this fact was extracted
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

// Milestone 1: LLM Selection and Tiered Enrichment Types
export type LLMProvider = 'openai' | 'anthropic' | 'google';
export type LLMModel = 'gpt-4o' | 'gpt-4o-mini' | 'claude-3-5-sonnet' | 'claude-3-haiku' | 'gemini-1.5-pro' | 'gemini-1.5-flash';

export interface LLMConfig {
  provider: LLMProvider;
  model: LLMModel;
  temperature: number;
  max_tokens: number;
  timeout_ms: number;
}

export interface TierConfig {
  tier: 1 | 2 | 3;
  name: string;
  sources: string[];
  max_pages: number;
  confidence_threshold: number;
  timeout_minutes: number;
}

export interface EnrichmentTiers {
  tier1: TierConfig;  // Corporate website, press releases, SEC filings
  tier2: TierConfig;  // LinkedIn company page, job postings
  tier3: TierConfig;  // News articles from reputable outlets
}

export interface EnrichmentJobConfig {
  llm: LLMConfig;
  tiers: EnrichmentTiers;
  max_total_runtime_minutes: number;
  max_retries: number;
  stop_on_confidence_threshold: boolean;
  global_confidence_threshold: number;
}

export interface TierResult {
  tier: number;
  sources_attempted: string[];
  pages_scraped: number;
  facts_extracted: number;
  average_confidence: number;
  runtime_seconds: number;
  status: 'completed' | 'partial' | 'failed' | 'timeout';
  error_message?: string;
}

export interface EnrichmentJobResult {
  job_id: string;
  total_runtime_seconds: number;
  tiers_completed: TierResult[];
  final_status: JobStatus;
  total_facts_extracted: number;
  average_confidence: number;
  llm_used: string;
  stopped_early: boolean;
  stop_reason?: 'confidence_threshold_met' | 'timeout' | 'max_retries' | 'error';
}
