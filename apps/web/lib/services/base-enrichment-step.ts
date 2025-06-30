import { EnrichmentContext, EnrichmentStep, EnrichmentJob, JobRepository } from '../types/enrichment';

/**
 * Base class for enrichment steps
 */
export abstract class BaseEnrichmentStep implements EnrichmentStep {
  protected jobRepository: JobRepository;
  
  constructor(jobRepository: JobRepository) {
    this.jobRepository = jobRepository;
  }

  abstract get name(): string;
  abstract execute(context: EnrichmentContext): Promise<EnrichmentContext>;
  abstract canHandle(context: EnrichmentContext): boolean;

  /**
   * Helper method to update job progress
   */
  protected async updateProgress(
    jobId: string, 
    progress: Partial<Pick<EnrichmentJob, 'pages_crawled' | 'chunks_created' | 'embeddings_generated' | 'facts_extracted'>>
  ): Promise<void> {
    await this.jobRepository.updateProgress(jobId, progress);
  }

  /**
   * Helper method to update step status
   */
  protected async updateStepStatus(
    jobId: string,
    step: keyof Pick<EnrichmentJob, 'crawling_status' | 'chunking_status' | 'embedding_status' | 'extraction_status'>,
    status: 'pending' | 'running' | 'completed' | 'failed'
  ): Promise<void> {
    await this.jobRepository.updateStepStatus(jobId, step, status);
  }
}
