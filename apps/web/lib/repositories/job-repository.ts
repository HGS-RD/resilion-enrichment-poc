import { Pool } from 'pg';
import { EnrichmentJob, JobStatus, StepStatus, JobRepository as IJobRepository } from '../types/enrichment';

/**
 * Job Repository Implementation
 * 
 * Handles all database operations for enrichment jobs.
 * Implements the JobRepository interface defined in types.
 */

export class JobRepository implements IJobRepository {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }

  /**
   * Creates a new enrichment job
   */
  async create(domain: string, metadata: Record<string, any> = {}): Promise<EnrichmentJob> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        INSERT INTO enrichment_jobs (
          domain, status, retry_count, metadata,
          crawling_status, chunking_status, embedding_status, extraction_status,
          pages_crawled, chunks_created, embeddings_generated, facts_extracted,
          created_at, updated_at
        ) VALUES (
          $1, 'pending', 0, $2,
          'pending', 'pending', 'pending', 'pending',
          0, 0, 0, 0,
          NOW(), NOW()
        ) RETURNING *
      `;
      
      const result = await client.query(query, [domain, JSON.stringify(metadata)]);
      const row = result.rows[0];
      
      return this.mapRowToJob(row);
    } finally {
      client.release();
    }
  }

  /**
   * Finds a job by ID
   */
  async findById(id: string): Promise<EnrichmentJob | null> {
    const client = await this.pool.connect();
    
    try {
      const query = 'SELECT * FROM enrichment_jobs WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToJob(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Finds all jobs for a domain
   */
  async findByDomain(domain: string): Promise<EnrichmentJob[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM enrichment_jobs 
        WHERE domain = $1 
        ORDER BY created_at DESC
      `;
      const result = await client.query(query, [domain]);
      
      return result.rows.map(row => this.mapRowToJob(row));
    } finally {
      client.release();
    }
  }

  /**
   * Updates job status
   */
  async updateStatus(id: string, status: JobStatus): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const updates: string[] = ['status = $2', 'updated_at = NOW()'];
      const values: any[] = [id, status];
      
      // Set timestamps based on status
      if (status === 'running') {
        updates.push('started_at = NOW()');
      } else if (status === 'completed') {
        updates.push('completed_at = NOW()');
      }
      
      const query = `
        UPDATE enrichment_jobs 
        SET ${updates.join(', ')}
        WHERE id = $1
      `;
      
      await client.query(query, values);
    } finally {
      client.release();
    }
  }

  /**
   * Updates step status
   */
  async updateStepStatus(
    id: string, 
    step: keyof Pick<EnrichmentJob, 'crawling_status' | 'chunking_status' | 'embedding_status' | 'extraction_status'>, 
    status: StepStatus
  ): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE enrichment_jobs 
        SET ${step} = $2, updated_at = NOW()
        WHERE id = $1
      `;
      
      await client.query(query, [id, status]);
    } finally {
      client.release();
    }
  }

  /**
   * Updates progress counters
   */
  async updateProgress(
    id: string, 
    progress: Partial<Pick<EnrichmentJob, 'pages_crawled' | 'chunks_created' | 'embeddings_generated' | 'facts_extracted'>>
  ): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const updates: string[] = ['updated_at = NOW()'];
      const values: any[] = [id];
      let paramIndex = 2;
      
      for (const [key, value] of Object.entries(progress)) {
        if (value !== undefined) {
          updates.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }
      
      if (updates.length === 1) {
        return; // No updates to make
      }
      
      const query = `
        UPDATE enrichment_jobs 
        SET ${updates.join(', ')}
        WHERE id = $1
      `;
      
      await client.query(query, values);
    } finally {
      client.release();
    }
  }

  /**
   * Logs an error for a job
   */
  async logError(id: string, error: string, step?: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get job details for failed_jobs table
      const jobQuery = 'SELECT domain FROM enrichment_jobs WHERE id = $1';
      const jobResult = await client.query(jobQuery, [id]);
      
      if (jobResult.rows.length === 0) {
        throw new Error(`Job ${id} not found`);
      }

      const domain = jobResult.rows[0].domain;

      // Update job with error
      const updateQuery = `
        UPDATE enrichment_jobs 
        SET status = 'failed', error_message = $2, updated_at = NOW()
        WHERE id = $1
      `;
      
      await client.query(updateQuery, [id, error]);
      
      // Log to failed_jobs table (Dead Letter Queue)
      const failedJobQuery = `
        INSERT INTO failed_jobs (
          original_job_id, domain, failure_step, error_message, 
          error_details, failed_at, retry_attempted, retry_count
        ) VALUES ($1, $2, $3, $4, $5, NOW(), false, 0)
      `;
      
      const errorDetails = {
        timestamp: new Date().toISOString(),
        step: step || 'unknown',
        error_type: 'enrichment_failure',
        job_id: id
      };
      
      await client.query(failedJobQuery, [
        id, 
        domain, 
        step || 'unknown', 
        error, 
        JSON.stringify(errorDetails)
      ]);

      // Log to job_logs table for detailed tracking
      const logQuery = `
        INSERT INTO job_logs (job_id, level, message, details, created_at)
        VALUES ($1, 'error', $2, $3, NOW())
      `;
      
      await client.query(logQuery, [
        id,
        `Job failed at step: ${step || 'unknown'} - ${error}`,
        JSON.stringify(errorDetails)
      ]);

      await client.query('COMMIT');
    } catch (dbError) {
      await client.query('ROLLBACK');
      console.error('Failed to log error to database:', dbError);
      throw dbError;
    } finally {
      client.release();
    }
  }

  /**
   * Increments retry count
   */
  async incrementRetryCount(id: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        UPDATE enrichment_jobs 
        SET retry_count = retry_count + 1, updated_at = NOW()
        WHERE id = $1
      `;
      
      await client.query(query, [id]);
    } finally {
      client.release();
    }
  }

  /**
   * Gets jobs by status
   */
  async findByStatus(status: JobStatus, limit: number = 100): Promise<EnrichmentJob[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM enrichment_jobs 
        WHERE status = $1 
        ORDER BY created_at ASC
        LIMIT $2
      `;
      const result = await client.query(query, [status, limit]);
      
      return result.rows.map(row => this.mapRowToJob(row));
    } finally {
      client.release();
    }
  }

  /**
   * Gets recent jobs (all statuses)
   */
  async findRecent(limit: number = 50): Promise<EnrichmentJob[]> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT * FROM enrichment_jobs 
        ORDER BY created_at DESC
        LIMIT $1
      `;
      const result = await client.query(query, [limit]);
      
      return result.rows.map(row => this.mapRowToJob(row));
    } finally {
      client.release();
    }
  }

  /**
   * Maps database row to EnrichmentJob object
   */
  private mapRowToJob(row: any): EnrichmentJob {
    return {
      id: row.id,
      domain: row.domain,
      status: row.status,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
      started_at: row.started_at?.toISOString(),
      completed_at: row.completed_at?.toISOString(),
      error_message: row.error_message,
      retry_count: row.retry_count,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      
      // Step statuses
      crawling_status: row.crawling_status,
      chunking_status: row.chunking_status,
      embedding_status: row.embedding_status,
      extraction_status: row.extraction_status,
      
      // Progress counters
      pages_crawled: row.pages_crawled,
      chunks_created: row.chunks_created,
      embeddings_generated: row.embeddings_generated,
      facts_extracted: row.facts_extracted,
    };
  }

  /**
   * Closes the database connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
