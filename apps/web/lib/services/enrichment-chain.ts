import { Pool } from 'pg';
import { 
  EnrichmentStep, 
  EnrichmentContext, 
  EnrichmentChain,
  JobStatus,
  StepStatus 
} from '../types/enrichment';
import { WebCrawlerService } from './crawler';
import { TextChunkingService } from './chunker';
import { EmbeddingService } from './embeddings';

/**
 * Chain-of-Responsibility implementation for enrichment steps
 */
export class EnrichmentChainImpl implements EnrichmentChain {
  private steps: EnrichmentStep[] = [];
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  addStep(step: EnrichmentStep): EnrichmentChain {
    this.steps.push(step);
    return this;
  }

  async execute(context: EnrichmentContext): Promise<EnrichmentContext> {
    let currentContext = { ...context };

    // Update job status to running
    await this.updateJobStatus(currentContext.job.id, 'running');
    await this.logJobMessage(currentContext.job.id, 'info', 'Starting enrichment chain execution');

    for (const step of this.steps) {
      try {
        if (step.canHandle(currentContext)) {
          console.log(`Executing step: ${step.name}`);
          await this.logJobMessage(currentContext.job.id, 'info', `Starting step: ${step.name}`);
          
          currentContext = await step.execute(currentContext);
          
          await this.logJobMessage(currentContext.job.id, 'info', `Completed step: ${step.name}`);
        } else {
          console.log(`Skipping step: ${step.name} (cannot handle current context)`);
          await this.logJobMessage(currentContext.job.id, 'info', `Skipped step: ${step.name} (cannot handle current context)`);
        }
      } catch (error) {
        console.error(`Error in step ${step.name}:`, error);
        currentContext.error = error as Error;
        
        await this.logJobMessage(
          currentContext.job.id, 
          'error', 
          `Error in step ${step.name}: ${error}`,
          { step: step.name, error: error }
        );
        
        // Update job status to failed
        await this.updateJobStatus(currentContext.job.id, 'failed');
        await this.updateJobError(currentContext.job.id, `Failed at step: ${step.name} - ${error}`);
        
        break;
      }
    }

    // Update final job status
    if (!currentContext.error) {
      await this.updateJobStatus(currentContext.job.id, 'completed');
      await this.logJobMessage(currentContext.job.id, 'info', 'Enrichment chain completed successfully');
    }

    return currentContext;
  }

  private async updateJobStatus(jobId: string, status: JobStatus): Promise<void> {
    const query = `
      UPDATE enrichment_jobs 
      SET status = $1, ${status === 'running' ? 'started_at = CURRENT_TIMESTAMP,' : ''} 
          ${status === 'completed' ? 'completed_at = CURRENT_TIMESTAMP,' : ''} 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await this.pool.query(query, [status, jobId]);
  }

  private async updateJobError(jobId: string, errorMessage: string): Promise<void> {
    const query = `
      UPDATE enrichment_jobs 
      SET error_message = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await this.pool.query(query, [errorMessage, jobId]);
  }

  private async logJobMessage(
    jobId: string, 
    level: string, 
    message: string, 
    details?: any
  ): Promise<void> {
    const query = `
      INSERT INTO job_logs (job_id, level, message, details)
      VALUES ($1, $2, $3, $4)
    `;
    await this.pool.query(query, [jobId, level, message, details ? JSON.stringify(details) : null]);
  }
}

/**
 * Web Crawling Step
 */
export class CrawlingStep implements EnrichmentStep {
  name = 'crawling';
  private crawler: WebCrawlerService;
  private pool: Pool;

  constructor() {
    this.crawler = new WebCrawlerService({
      max_pages: 10,
      delay_ms: 2000,
      timeout_ms: 30000,
      respect_robots_txt: true,
    });
    
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  canHandle(context: EnrichmentContext): boolean {
    return context.job.crawling_status === 'pending' && !context.crawled_pages;
  }

  async execute(context: EnrichmentContext): Promise<EnrichmentContext> {
    // Update step status to running
    await this.updateStepStatus(context.job.id, 'running');

    try {
      const crawledPages = await this.crawler.crawlDomain(context.job.domain);
      
      // Update progress
      await this.updateProgress(context.job.id, crawledPages.length);
      
      // Update step status to completed
      await this.updateStepStatus(context.job.id, 'completed');

      return {
        ...context,
        crawled_pages: crawledPages,
        step_results: {
          ...context.step_results,
          crawling: {
            pages_found: crawledPages.length,
            total_content_length: crawledPages.reduce((sum, page) => sum + page.content.length, 0),
            sources: crawledPages.map(page => page.url),
          }
        }
      };

    } catch (error) {
      await this.updateStepStatus(context.job.id, 'failed');
      throw error;
    } finally {
      await this.crawler.close();
    }
  }

  private async updateStepStatus(jobId: string, status: StepStatus): Promise<void> {
    const query = `
      UPDATE enrichment_jobs 
      SET crawling_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await this.pool.query(query, [status, jobId]);
  }

  private async updateProgress(jobId: string, pagesCrawled: number): Promise<void> {
    const query = `
      UPDATE enrichment_jobs 
      SET pages_crawled = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await this.pool.query(query, [pagesCrawled, jobId]);
  }
}

/**
 * Text Chunking Step
 */
export class ChunkingStep implements EnrichmentStep {
  name = 'chunking';
  private chunker: TextChunkingService;
  private pool: Pool;

  constructor() {
    this.chunker = new TextChunkingService({
      max_chunk_size: 1000,
      overlap_size: 200,
      min_chunk_size: 100,
    });
    
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  canHandle(context: EnrichmentContext): boolean {
    return context.job.chunking_status === 'pending' && 
           !!context.crawled_pages && 
           context.crawled_pages.length > 0 &&
           !context.text_chunks;
  }

  async execute(context: EnrichmentContext): Promise<EnrichmentContext> {
    if (!context.crawled_pages) {
      throw new Error('No crawled pages available for chunking');
    }

    // Update step status to running
    await this.updateStepStatus(context.job.id, 'running');

    try {
      const textChunks = await this.chunker.chunkPages(context.crawled_pages);
      
      // Update progress
      await this.updateProgress(context.job.id, textChunks.length);
      
      // Update step status to completed
      await this.updateStepStatus(context.job.id, 'completed');

      // Get chunking statistics
      const stats = this.chunker.getChunkingStats(textChunks);

      return {
        ...context,
        text_chunks: textChunks,
        step_results: {
          ...context.step_results,
          chunking: {
            chunks_created: textChunks.length,
            avg_chunk_size: stats.avg_chunk_size,
            total_words: stats.total_words,
            min_chunk_size: stats.min_chunk_size,
            max_chunk_size: stats.max_chunk_size,
          }
        }
      };

    } catch (error) {
      await this.updateStepStatus(context.job.id, 'failed');
      throw error;
    }
  }

  private async updateStepStatus(jobId: string, status: StepStatus): Promise<void> {
    const query = `
      UPDATE enrichment_jobs 
      SET chunking_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await this.pool.query(query, [status, jobId]);
  }

  private async updateProgress(jobId: string, chunksCreated: number): Promise<void> {
    const query = `
      UPDATE enrichment_jobs 
      SET chunks_created = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await this.pool.query(query, [chunksCreated, jobId]);
  }
}

/**
 * Embedding Step
 */
export class EmbeddingStep implements EnrichmentStep {
  name = 'embedding';
  private embeddingService: EmbeddingService;
  private pool: Pool;

  constructor() {
    this.embeddingService = new EmbeddingService({
      model: 'text-embedding-3-small',
      dimensions: 1536,
      batch_size: 10,
    });
    
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  canHandle(context: EnrichmentContext): boolean {
    return context.job.embedding_status === 'pending' && 
           !!context.text_chunks && 
           context.text_chunks.length > 0 &&
           !context.embeddings;
  }

  async execute(context: EnrichmentContext): Promise<EnrichmentContext> {
    if (!context.text_chunks) {
      throw new Error('No text chunks available for embedding');
    }

    // Update step status to running
    await this.updateStepStatus(context.job.id, 'running');

    try {
      // Initialize Pinecone index if needed
      await this.embeddingService.initializeIndex();

      // Generate and store embeddings
      const embeddings = await this.embeddingService.embedAndStoreChunks(
        context.text_chunks,
        context.job.id,
        context.job.domain
      );
      
      // Update progress
      await this.updateProgress(context.job.id, embeddings.length);
      
      // Update step status to completed
      await this.updateStepStatus(context.job.id, 'completed');

      return {
        ...context,
        embeddings: embeddings,
        step_results: {
          ...context.step_results,
          embedding: {
            embeddings_generated: embeddings.length,
            model_used: 'text-embedding-3-small',
            dimensions: 1536,
            total_vectors_stored: embeddings.length,
          }
        }
      };

    } catch (error) {
      await this.updateStepStatus(context.job.id, 'failed');
      throw error;
    }
  }

  private async updateStepStatus(jobId: string, status: StepStatus): Promise<void> {
    const query = `
      UPDATE enrichment_jobs 
      SET embedding_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await this.pool.query(query, [status, jobId]);
  }

  private async updateProgress(jobId: string, embeddingsGenerated: number): Promise<void> {
    const query = `
      UPDATE enrichment_jobs 
      SET embeddings_generated = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await this.pool.query(query, [embeddingsGenerated, jobId]);
  }
}
