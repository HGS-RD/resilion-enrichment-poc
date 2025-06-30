import { 
  EnrichmentJob, 
  EnrichmentContext, 
  EnrichmentChain, 
  EnrichmentStep,
  JobRepository 
} from '../types/enrichment';
import { WebCrawlerStep } from './steps/web-crawler-step';
import { TextChunkingStep } from './steps/text-chunking-step';
import { EmbeddingStep } from './steps/embedding-step';
import { FactExtractionStep } from './steps/fact-extraction-step';

/**
 * EnrichmentAgent - Core orchestrator for the enrichment process
 * 
 * Implements the chain-of-responsibility pattern to process enrichment jobs
 * through a series of steps: crawling -> chunking -> embedding -> extraction
 */

export class EnrichmentAgent {
  private jobRepository: JobRepository;
  private chain: EnrichmentChain;

  constructor(jobRepository: JobRepository) {
    this.jobRepository = jobRepository;
    this.chain = this.buildProcessingChain();
  }

  /**
   * Processes an enrichment job through the complete workflow
   */
  async processJob(jobId: string): Promise<{
    success: boolean;
    job?: EnrichmentJob;
    error?: string;
  }> {
    try {
      // Get the job
      const job = await this.jobRepository.findById(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      // Update job status to running
      await this.jobRepository.updateStatus(jobId, 'running');

      // Create enrichment context
      const context: EnrichmentContext = {
        job: { ...job, status: 'running' },
        crawled_pages: [],
        text_chunks: [],
        embeddings: [],
        extracted_facts: [],
        step_results: {}
      };

      // Execute the enrichment chain
      const finalContext = await this.chain.execute(context);

      // Check for errors
      if (finalContext.error) {
        await this.jobRepository.logError(jobId, finalContext.error.message);
        return {
          success: false,
          error: finalContext.error.message
        };
      }

      // Update job status to completed
      await this.jobRepository.updateStatus(jobId, 'completed');

      // Get final job state
      const completedJob = await this.jobRepository.findById(jobId);

      return {
        success: true,
        job: completedJob!
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      try {
        await this.jobRepository.logError(jobId, errorMessage);
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Builds the processing chain with all enrichment steps
   */
  private buildProcessingChain(): EnrichmentChain {
    const chain = new ProcessingChain();

    // Add steps in order
    chain
      .addStep(new WebCrawlerStep(this.jobRepository))
      .addStep(new TextChunkingStep(this.jobRepository))
      .addStep(new EmbeddingStep(this.jobRepository))
      .addStep(new FactExtractionStep(this.jobRepository));

    return chain;
  }

  /**
   * Gets the current status of a job
   */
  async getJobStatus(jobId: string): Promise<EnrichmentJob | null> {
    return await this.jobRepository.findById(jobId);
  }

  /**
   * Retries a failed job
   */
  async retryJob(jobId: string): Promise<{
    success: boolean;
    job?: EnrichmentJob;
    error?: string;
  }> {
    try {
      const job = await this.jobRepository.findById(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      if (job.status !== 'failed') {
        throw new Error(`Job ${jobId} is not in failed state`);
      }

      // Increment retry count
      await this.jobRepository.incrementRetryCount(jobId);

      // Reset job status to pending
      await this.jobRepository.updateStatus(jobId, 'pending');

      // Process the job again
      return await this.processJob(jobId);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: errorMessage
      };
    }
  }
}

/**
 * Implementation of the EnrichmentChain interface
 */
class ProcessingChain implements EnrichmentChain {
  private steps: EnrichmentStep[] = [];

  addStep(step: EnrichmentStep): EnrichmentChain {
    this.steps.push(step);
    return this;
  }

  async execute(context: EnrichmentContext): Promise<EnrichmentContext> {
    let currentContext = { ...context };

    for (const step of this.steps) {
      try {
        // Check if step can handle the current context
        if (!step.canHandle(currentContext)) {
          console.log(`Skipping step ${step.name} - cannot handle current context`);
          continue;
        }

        console.log(`Executing step: ${step.name}`);
        
        // Execute the step
        currentContext = await step.execute(currentContext);

        // Check for errors after step execution
        if (currentContext.error) {
          console.error(`Step ${step.name} failed:`, currentContext.error.message);
          break;
        }

        console.log(`Step ${step.name} completed successfully`);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Step ${step.name} threw error:`, errorMessage);
        
        currentContext.error = error instanceof Error ? error : new Error(errorMessage);
        break;
      }
    }

    return currentContext;
  }
}
