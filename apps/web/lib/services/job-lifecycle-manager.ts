/**
 * Job Lifecycle Manager
 * 
 * Manages enrichment job lifecycle including timeouts, retries, and background processing.
 * Implements strict 30-minute job timeouts and exponential backoff retry logic.
 */

import { Pool } from 'pg';
import { EnrichmentJob, JobStatus } from '../types/enrichment';
import { EnrichmentJobRecord } from '../types/data-model';

export interface JobTimeout {
  jobId: string;
  timeoutId: NodeJS.Timeout;
  startTime: number;
  maxRuntimeMs: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBase: number;
}

export interface LifecycleConfig {
  maxJobRuntimeMinutes: number;
  retryConfig: RetryConfig;
  cleanupIntervalMs: number;
  heartbeatIntervalMs: number;
}

export interface JobExecutionContext {
  jobId: string;
  domain: string;
  attempt: number;
  startTime: number;
  timeoutHandle?: NodeJS.Timeout;
}

export class JobLifecycleManager {
  private pool: Pool;
  private config: LifecycleConfig;
  private activeJobs: Map<string, JobTimeout> = new Map();
  private retryQueue: Map<string, NodeJS.Timeout> = new Map();
  private cleanupInterval?: NodeJS.Timeout;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(config: Partial<LifecycleConfig> = {}) {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    this.config = {
      maxJobRuntimeMinutes: 30,
      retryConfig: {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 60000,
        exponentialBase: 2
      },
      cleanupIntervalMs: 60000, // 1 minute
      heartbeatIntervalMs: 30000, // 30 seconds
      ...config
    };

    this.startBackgroundTasks();
  }

  /**
   * Start a job with timeout management
   */
  async startJob(
    jobId: string, 
    domain: string,
    executionFunction: (context: JobExecutionContext) => Promise<void>
  ): Promise<void> {
    console.log(`Starting job ${jobId} with ${this.config.maxJobRuntimeMinutes} minute timeout`);

    // Update job status to running
    await this.updateJobStatus(jobId, 'running');
    await this.updateJobStartTime(jobId);

    // Create execution context
    const context: JobExecutionContext = {
      jobId,
      domain,
      attempt: 1,
      startTime: Date.now()
    };

    // Set up timeout
    const timeoutMs = this.config.maxJobRuntimeMinutes * 60 * 1000;
    const timeoutHandle = setTimeout(async () => {
      console.log(`Job ${jobId} timed out after ${this.config.maxJobRuntimeMinutes} minutes`);
      await this.handleJobTimeout(jobId);
    }, timeoutMs);

    context.timeoutHandle = timeoutHandle;

    // Track active job
    this.activeJobs.set(jobId, {
      jobId,
      timeoutId: timeoutHandle,
      startTime: Date.now(),
      maxRuntimeMs: timeoutMs
    });

    try {
      // Execute the job
      await executionFunction(context);
      
      // Job completed successfully
      await this.completeJob(jobId);
      
    } catch (error) {
      console.error(`Job ${jobId} failed:`, error);
      await this.handleJobFailure(jobId, error, context.attempt);
    } finally {
      // Clean up timeout and tracking
      this.cleanupJob(jobId);
    }
  }

  /**
   * Handle job timeout
   */
  private async handleJobTimeout(jobId: string): Promise<void> {
    try {
      console.log(`Handling timeout for job ${jobId}`);
      
      // Update job status
      await this.updateJobStatus(jobId, 'failed');
      await this.updateJobError(jobId, `Job timed out after ${this.config.maxJobRuntimeMinutes} minutes`);
      await this.updateJobEndTime(jobId);
      
      // Log timeout event
      await this.logJobEvent(jobId, 'timeout', `Job exceeded maximum runtime of ${this.config.maxJobRuntimeMinutes} minutes`);
      
      // Clean up resources
      this.cleanupJob(jobId);
      
    } catch (error) {
      console.error(`Error handling timeout for job ${jobId}:`, error);
    }
  }

  /**
   * Handle job failure with retry logic
   */
  private async handleJobFailure(jobId: string, error: any, currentAttempt: number): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Get current retry count from database
    const job = await this.getJob(jobId);
    if (!job) {
      console.error(`Job ${jobId} not found for retry handling`);
      return;
    }

    const retryCount = job.retry_count || 0;
    
    console.log(`Job ${jobId} failed (attempt ${currentAttempt}, retry count: ${retryCount}). Error: ${errorMessage}`);

    // Check if we should retry
    if (retryCount < this.config.retryConfig.maxRetries) {
      await this.scheduleRetry(jobId, retryCount + 1, errorMessage);
    } else {
      // Max retries exceeded, mark as permanently failed
      await this.updateJobStatus(jobId, 'failed');
      await this.updateJobError(jobId, `Job failed after ${this.config.retryConfig.maxRetries} retry attempts. Last error: ${errorMessage}`);
      await this.updateJobEndTime(jobId);
      
      await this.logJobEvent(jobId, 'max_retries_exceeded', `Job failed permanently after ${this.config.retryConfig.maxRetries} attempts`);
    }
  }

  /**
   * Schedule a job retry with exponential backoff
   */
  private async scheduleRetry(jobId: string, retryCount: number, lastError: string): Promise<void> {
    // Calculate delay with exponential backoff
    const baseDelay = this.config.retryConfig.baseDelayMs;
    const exponentialDelay = baseDelay * Math.pow(this.config.retryConfig.exponentialBase, retryCount - 1);
    const delayMs = Math.min(exponentialDelay, this.config.retryConfig.maxDelayMs);
    
    console.log(`Scheduling retry ${retryCount} for job ${jobId} in ${delayMs}ms`);
    
    // Update job status and retry count
    await this.updateJobStatus(jobId, 'pending');
    await this.incrementRetryCount(jobId);
    await this.updateJobError(jobId, `Retry ${retryCount} scheduled. Last error: ${lastError}`);
    
    // Log retry event
    await this.logJobEvent(jobId, 'retry_scheduled', `Retry ${retryCount} scheduled for ${delayMs}ms delay`);
    
    // Schedule the retry
    const retryTimeout = setTimeout(async () => {
      try {
        console.log(`Executing retry ${retryCount} for job ${jobId}`);
        
        // Remove from retry queue
        this.retryQueue.delete(jobId);
        
        // Get updated job data
        const job = await this.getJob(jobId);
        if (!job) {
          console.error(`Job ${jobId} not found for retry execution`);
          return;
        }
        
        // Re-trigger job execution (this would need to be implemented by the caller)
        await this.logJobEvent(jobId, 'retry_started', `Starting retry attempt ${retryCount}`);
        
        // The actual retry execution would be handled by the enrichment system
        // This manager just handles the scheduling and lifecycle
        
      } catch (error) {
        console.error(`Error executing retry for job ${jobId}:`, error);
        await this.handleJobFailure(jobId, error, retryCount);
      }
    }, delayMs);
    
    // Track the retry timeout
    this.retryQueue.set(jobId, retryTimeout);
  }

  /**
   * Complete a job successfully
   */
  private async completeJob(jobId: string): Promise<void> {
    console.log(`Completing job ${jobId}`);
    
    await this.updateJobStatus(jobId, 'completed');
    await this.updateJobEndTime(jobId);
    await this.logJobEvent(jobId, 'completed', 'Job completed successfully');
    
    this.cleanupJob(jobId);
  }

  /**
   * Clean up job tracking and timeouts
   */
  private cleanupJob(jobId: string): void {
    // Clear timeout if exists
    const activeJob = this.activeJobs.get(jobId);
    if (activeJob) {
      clearTimeout(activeJob.timeoutId);
      this.activeJobs.delete(jobId);
    }
    
    // Clear retry timeout if exists
    const retryTimeout = this.retryQueue.get(jobId);
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      this.retryQueue.delete(jobId);
    }
    
    console.log(`Cleaned up job ${jobId}`);
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string, reason: string = 'User cancelled'): Promise<void> {
    console.log(`Cancelling job ${jobId}: ${reason}`);
    
    await this.updateJobStatus(jobId, 'cancelled');
    await this.updateJobError(jobId, reason);
    await this.updateJobEndTime(jobId);
    await this.logJobEvent(jobId, 'cancelled', reason);
    
    this.cleanupJob(jobId);
  }

  /**
   * Get job status and runtime information
   */
  async getJobStatus(jobId: string): Promise<{
    status: JobStatus;
    runtime_seconds: number;
    retry_count: number;
    time_remaining_seconds?: number;
  } | null> {
    const job = await this.getJob(jobId);
    if (!job) return null;
    
    const runtimeSeconds = job.started_at 
      ? Math.floor((Date.now() - new Date(job.started_at).getTime()) / 1000)
      : 0;
    
    let timeRemainingSeconds: number | undefined;
    const activeJob = this.activeJobs.get(jobId);
    if (activeJob && job.status === 'running') {
      const elapsedMs = Date.now() - activeJob.startTime;
      const remainingMs = activeJob.maxRuntimeMs - elapsedMs;
      timeRemainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    }
    
    return {
      status: job.status,
      runtime_seconds: runtimeSeconds,
      retry_count: job.retry_count || 0,
      time_remaining_seconds: timeRemainingSeconds
    };
  }

  /**
   * Get all active jobs
   */
  getActiveJobs(): string[] {
    return Array.from(this.activeJobs.keys());
  }

  /**
   * Get jobs in retry queue
   */
  getRetryQueue(): string[] {
    return Array.from(this.retryQueue.keys());
  }

  /**
   * Start background cleanup and monitoring tasks
   */
  private startBackgroundTasks(): void {
    // Cleanup task - removes stale job tracking
    this.cleanupInterval = setInterval(async () => {
      await this.performCleanup();
    }, this.config.cleanupIntervalMs);
    
    // Heartbeat task - monitors job health
    this.heartbeatInterval = setInterval(async () => {
      await this.performHeartbeat();
    }, this.config.heartbeatIntervalMs);
    
    console.log('Started background lifecycle management tasks');
  }

  /**
   * Perform cleanup of stale jobs
   */
  private async performCleanup(): Promise<void> {
    try {
      // Find jobs that have been running too long
      const staleJobs = await this.findStaleJobs();
      
      for (const job of staleJobs) {
        console.log(`Found stale job ${job.id}, cleaning up`);
        await this.handleJobTimeout(job.id);
      }
      
      // Clean up completed jobs from tracking
      for (const [jobId, activeJob] of this.activeJobs.entries()) {
        const job = await this.getJob(jobId);
        if (!job || ['completed', 'failed', 'cancelled'].includes(job.status)) {
          this.cleanupJob(jobId);
        }
      }
      
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  /**
   * Perform heartbeat check on active jobs
   */
  private async performHeartbeat(): Promise<void> {
    try {
      const activeJobIds = this.getActiveJobs();
      console.log(`Heartbeat: ${activeJobIds.length} active jobs, ${this.retryQueue.size} in retry queue`);
      
      // Update heartbeat timestamp for active jobs
      for (const jobId of activeJobIds) {
        await this.updateJobHeartbeat(jobId);
      }
      
    } catch (error) {
      console.error('Error during heartbeat:', error);
    }
  }

  /**
   * Stop background tasks
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
    
    // Cancel all active jobs
    for (const jobId of this.activeJobs.keys()) {
      this.cleanupJob(jobId);
    }
    
    // Clear retry queue
    for (const timeout of this.retryQueue.values()) {
      clearTimeout(timeout);
    }
    this.retryQueue.clear();
    
    console.log('Stopped job lifecycle manager');
  }

  // Database operations
  private async getJob(jobId: string): Promise<EnrichmentJob | null> {
    const query = 'SELECT * FROM enrichment_jobs WHERE id = $1';
    const result = await this.pool.query(query, [jobId]);
    return result.rows[0] || null;
  }

  private async updateJobStatus(jobId: string, status: JobStatus): Promise<void> {
    const query = `
      UPDATE enrichment_jobs 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await this.pool.query(query, [status, jobId]);
  }

  private async updateJobStartTime(jobId: string): Promise<void> {
    const query = `
      UPDATE enrichment_jobs 
      SET started_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await this.pool.query(query, [jobId]);
  }

  private async updateJobEndTime(jobId: string): Promise<void> {
    const query = `
      UPDATE enrichment_jobs 
      SET completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await this.pool.query(query, [jobId]);
  }

  private async updateJobError(jobId: string, errorMessage: string): Promise<void> {
    const query = `
      UPDATE enrichment_jobs 
      SET error_message = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await this.pool.query(query, [errorMessage, jobId]);
  }

  private async incrementRetryCount(jobId: string): Promise<void> {
    const query = `
      UPDATE enrichment_jobs 
      SET retry_count = retry_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await this.pool.query(query, [jobId]);
  }

  private async updateJobHeartbeat(jobId: string): Promise<void> {
    const query = `
      UPDATE enrichment_jobs 
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await this.pool.query(query, [jobId]);
  }

  private async logJobEvent(jobId: string, eventType: string, message: string, details?: any): Promise<void> {
    const query = `
      INSERT INTO job_logs (job_id, level, message, details)
      VALUES ($1, $2, $3, $4)
    `;
    await this.pool.query(query, [jobId, 'info', `[${eventType}] ${message}`, details ? JSON.stringify(details) : null]);
  }

  private async findStaleJobs(): Promise<EnrichmentJob[]> {
    const staleThresholdMs = this.config.maxJobRuntimeMinutes * 60 * 1000;
    const query = `
      SELECT * FROM enrichment_jobs 
      WHERE status = 'running' 
      AND started_at < NOW() - INTERVAL '${this.config.maxJobRuntimeMinutes} minutes'
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }
}
