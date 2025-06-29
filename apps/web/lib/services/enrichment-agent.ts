import { Pool } from 'pg';
import { 
  EnrichmentJob, 
  EnrichmentContext,
  JobStatus 
} from '../types/enrichment';
import { 
  EnrichmentChainImpl, 
  CrawlingStep, 
  ChunkingStep, 
  EmbeddingStep 
} from './enrichment-chain';

/**
 * Main EnrichmentAgent service that orchestrates the entire enrichment process
 */
export class EnrichmentAgent {
  private pool: Pool;
  private chain: EnrichmentChainImpl;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Initialize the enrichment chain with all steps
    this.chain = new EnrichmentChainImpl()
      .addStep(new CrawlingStep())
      .addStep(new ChunkingStep())
      .addStep(new EmbeddingStep());
  }

  /**
   * Start enrichment process for a job
   */
  async startEnrichment(jobId: string): Promise<EnrichmentContext> {
    try {
      // Fetch the job from database
      const job = await this.getJobById(jobId);
      if (!job) {
        throw new Error(`Job not found: ${jobId}`);
      }

      // Check if job is in correct state
      if (job.status !== 'pending') {
        throw new Error(`Job ${jobId} is not in pending state. Current status: ${job.status}`);
      }

      console.log(`Starting enrichment for job ${jobId} (domain: ${job.domain})`);

      // Create initial context
      const context: EnrichmentContext = {
        job: job,
        step_results: {}
      };

      // Execute the enrichment chain
      const result = await this.chain.execute(context);

      console.log(`Enrichment completed for job ${jobId}`);
      return result;

    } catch (error) {
      console.error(`Error in enrichment process for job ${jobId}:`, error);
      
      // Update job status to failed
      await this.updateJobStatus(jobId, 'failed');
      await this.logJobError(jobId, `Enrichment failed: ${error}`);
      
      throw error;
    }
  }

  /**
   * Get job by ID from database
   */
  private async getJobById(jobId: string): Promise<EnrichmentJob | null> {
    const query = `
      SELECT 
        id, domain, status, created_at, updated_at, started_at, completed_at,
        error_message, retry_count, metadata,
        crawling_status, chunking_status, embedding_status, extraction_status,
        pages_crawled, chunks_created, embeddings_generated, facts_extracted
      FROM enrichment_jobs 
      WHERE id = $1
    `;
    
    const result = await this.pool.query(query, [jobId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as EnrichmentJob;
  }

  /**
   * Update job status
   */
  private async updateJobStatus(jobId: string, status: JobStatus): Promise<void> {
    const query = `
      UPDATE enrichment_jobs 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await this.pool.query(query, [status, jobId]);
  }

  /**
   * Log job error
   */
  private async logJobError(jobId: string, errorMessage: string): Promise<void> {
    const errorQuery = `
      UPDATE enrichment_jobs 
      SET error_message = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await this.pool.query(errorQuery, [errorMessage, jobId]);

    const logQuery = `
      INSERT INTO job_logs (job_id, level, message, details)
      VALUES ($1, 'error', $2, $3)
    `;
    await this.pool.query(logQuery, [jobId, 'Enrichment process failed', JSON.stringify({ error: errorMessage })]);
  }

  /**
   * Get job status and progress
   */
  async getJobStatus(jobId: string): Promise<{
    job: EnrichmentJob | null;
    progress: {
      current_step: string;
      completion_percentage: number;
      steps_completed: number;
      total_steps: number;
    };
  }> {
    const job = await this.getJobById(jobId);
    
    if (!job) {
      return {
        job: null,
        progress: {
          current_step: 'unknown',
          completion_percentage: 0,
          steps_completed: 0,
          total_steps: 4,
        }
      };
    }

    // Calculate progress based on step statuses
    const steps = [
      { name: 'crawling', status: job.crawling_status },
      { name: 'chunking', status: job.chunking_status },
      { name: 'embedding', status: job.embedding_status },
      { name: 'extraction', status: job.extraction_status },
    ];

    const completedSteps = steps.filter(step => step.status === 'completed').length;
    const runningStep = steps.find(step => step.status === 'running');
    const currentStep = runningStep ? runningStep.name : 
                       job.status === 'completed' ? 'completed' :
                       job.status === 'failed' ? 'failed' :
                       steps.find(step => step.status === 'pending')?.name || 'pending';

    const completionPercentage = Math.round((completedSteps / steps.length) * 100);

    return {
      job,
      progress: {
        current_step: currentStep,
        completion_percentage: completionPercentage,
        steps_completed: completedSteps,
        total_steps: steps.length,
      }
    };
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<EnrichmentContext> {
    const job = await this.getJobById(jobId);
    
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.status !== 'failed') {
      throw new Error(`Job ${jobId} is not in failed state. Current status: ${job.status}`);
    }

    console.log(`Retrying job ${jobId}`);

    // Reset job status and step statuses
    await this.resetJobForRetry(jobId);

    // Increment retry count
    await this.incrementRetryCount(jobId);

    // Start enrichment process
    return await this.startEnrichment(jobId);
  }

  /**
   * Reset job for retry
   */
  private async resetJobForRetry(jobId: string): Promise<void> {
    const query = `
      UPDATE enrichment_jobs 
      SET 
        status = 'pending',
        error_message = NULL,
        started_at = NULL,
        completed_at = NULL,
        crawling_status = 'pending',
        chunking_status = 'pending',
        embedding_status = 'pending',
        extraction_status = 'pending',
        pages_crawled = 0,
        chunks_created = 0,
        embeddings_generated = 0,
        facts_extracted = 0,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await this.pool.query(query, [jobId]);
  }

  /**
   * Increment retry count
   */
  private async incrementRetryCount(jobId: string): Promise<void> {
    const query = `
      UPDATE enrichment_jobs 
      SET retry_count = retry_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await this.pool.query(query, [jobId]);
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = await this.getJobById(jobId);
    
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (!['pending', 'running'].includes(job.status)) {
      throw new Error(`Cannot cancel job ${jobId}. Current status: ${job.status}`);
    }

    console.log(`Cancelling job ${jobId}`);

    const query = `
      UPDATE enrichment_jobs 
      SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await this.pool.query(query, [jobId]);

    // Log cancellation
    const logQuery = `
      INSERT INTO job_logs (job_id, level, message)
      VALUES ($1, 'info', 'Job cancelled by user')
    `;
    await this.pool.query(logQuery, [jobId]);
  }

  /**
   * Get job logs
   */
  async getJobLogs(jobId: string, limit: number = 50): Promise<Array<{
    id: string;
    level: string;
    message: string;
    details: any;
    created_at: string;
  }>> {
    const query = `
      SELECT id, level, message, details, created_at
      FROM job_logs 
      WHERE job_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    
    const result = await this.pool.query(query, [jobId, limit]);
    return result.rows;
  }

  /**
   * Clean up resources
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
