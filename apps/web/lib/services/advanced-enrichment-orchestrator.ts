/**
 * Advanced Enrichment Orchestrator
 * 
 * Main orchestrator that integrates the enrichment chaining engine,
 * job lifecycle manager, and tier processors into the existing system.
 */

import { EnrichmentChainingEngine } from './enrichment-chaining-engine';
import { JobLifecycleManager } from './job-lifecycle-manager';
import { Tier1Processor } from './tier-processors/tier-1-processor';
import { Tier2Processor } from './tier-processors/tier-2-processor';
import { Tier3Processor } from './tier-processors/tier-3-processor';
import { 
  OrganizationRepository,
  SiteRepository,
  EnrichmentJobRecordRepository 
} from '../types/data-model';
import { JobRepository } from '../repositories/job-repository';
import { EnrichmentContext, EnrichmentJob, EnrichmentJobResult } from '../types/enrichment';

export interface OrchestratorConfig {
  confidence_threshold: number;
  max_job_runtime_minutes: number;
  max_retries: number;
  enable_tier_1: boolean;
  enable_tier_2: boolean;
  enable_tier_3: boolean;
}

export class AdvancedEnrichmentOrchestrator {
  private chainingEngine: EnrichmentChainingEngine;
  private lifecycleManager: JobLifecycleManager;
  private tier1Processor: Tier1Processor;
  private tier2Processor: Tier2Processor;
  private tier3Processor: Tier3Processor;
  private config: OrchestratorConfig;

  constructor(
    orgRepository: OrganizationRepository,
    siteRepository: SiteRepository,
    jobRecordRepository: EnrichmentJobRecordRepository,
    jobRepository: JobRepository,
    config: Partial<OrchestratorConfig> = {}
  ) {
    this.config = {
      confidence_threshold: 0.7,
      max_job_runtime_minutes: 30,
      max_retries: 3,
      enable_tier_1: true,
      enable_tier_2: true,
      enable_tier_3: true,
      ...config
    };

    // Initialize lifecycle manager
    this.lifecycleManager = new JobLifecycleManager({
      maxJobRuntimeMinutes: this.config.max_job_runtime_minutes,
      retryConfig: {
        maxRetries: this.config.max_retries,
        baseDelayMs: 1000,
        maxDelayMs: 60000,
        exponentialBase: 2
      }
    });

    // Initialize chaining engine
    this.chainingEngine = new EnrichmentChainingEngine(
      orgRepository,
      siteRepository,
      jobRecordRepository,
      {
        confidence_threshold: this.config.confidence_threshold,
        max_total_runtime_minutes: this.config.max_job_runtime_minutes,
        max_retries_per_tier: this.config.max_retries,
        stop_on_confidence_threshold: true
      }
    );

    // Initialize tier processors
    this.tier1Processor = new Tier1Processor(jobRepository);
    this.tier2Processor = new Tier2Processor();
    this.tier3Processor = new Tier3Processor();

    // Register tier processors with the chaining engine
    if (this.config.enable_tier_1) {
      this.chainingEngine.registerTierProcessor(this.tier1Processor);
    }
    if (this.config.enable_tier_2) {
      this.chainingEngine.registerTierProcessor(this.tier2Processor);
    }
    if (this.config.enable_tier_3) {
      this.chainingEngine.registerTierProcessor(this.tier3Processor);
    }

    console.log('Advanced Enrichment Orchestrator initialized');
    console.log(`Configuration: ${JSON.stringify(this.config, null, 2)}`);
  }

  /**
   * Execute advanced enrichment for a job
   */
  async executeEnrichment(job: EnrichmentJob): Promise<EnrichmentJobResult> {
    console.log(`Starting advanced enrichment for job ${job.id}, domain: ${job.domain}`);

    // Create enrichment context
    const context: EnrichmentContext = {
      job,
      extracted_facts: [],
      step_results: {}
    };

    // Execute enrichment with lifecycle management
    return new Promise((resolve, reject) => {
      this.lifecycleManager.startJob(
        job.id,
        job.domain,
        async (executionContext) => {
          try {
            console.log(`Executing enrichment chain for job ${job.id} (attempt ${executionContext.attempt})`);
            
            // Execute the enrichment chain
            const result = await this.chainingEngine.executeChain(context);
            
            console.log(`Enrichment chain completed for job ${job.id}`);
            console.log(`Result: ${result.final_status}, Facts: ${result.total_facts_extracted}, Confidence: ${result.average_confidence.toFixed(3)}`);
            
            resolve(result);
            
          } catch (error) {
            console.error(`Error in enrichment execution for job ${job.id}:`, error);
            reject(error);
          }
        }
      ).catch(reject);
    });
  }

  /**
   * Get job status with detailed information
   */
  async getJobStatus(jobId: string): Promise<{
    lifecycle_status: any;
    active_jobs: string[];
    retry_queue: string[];
  }> {
    const lifecycleStatus = await this.lifecycleManager.getJobStatus(jobId);
    const activeJobs = this.lifecycleManager.getActiveJobs();
    const retryQueue = this.lifecycleManager.getRetryQueue();

    return {
      lifecycle_status: lifecycleStatus,
      active_jobs: activeJobs,
      retry_queue: retryQueue
    };
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string, reason?: string): Promise<void> {
    console.log(`Cancelling job ${jobId}: ${reason || 'User requested'}`);
    await this.lifecycleManager.cancelJob(jobId, reason);
  }

  /**
   * Get orchestrator statistics
   */
  getStatistics(): {
    active_jobs_count: number;
    retry_queue_count: number;
    configuration: OrchestratorConfig;
  } {
    return {
      active_jobs_count: this.lifecycleManager.getActiveJobs().length,
      retry_queue_count: this.lifecycleManager.getRetryQueue().length,
      configuration: this.config
    };
  }

  /**
   * Update orchestrator configuration
   */
  updateConfiguration(newConfig: Partial<OrchestratorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log(`Updated orchestrator configuration: ${JSON.stringify(this.config, null, 2)}`);
  }

  /**
   * Health check for all components
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: {
      lifecycle_manager: 'healthy' | 'unhealthy';
      chaining_engine: 'healthy' | 'unhealthy';
      tier_processors: {
        tier_1: 'enabled' | 'disabled';
        tier_2: 'enabled' | 'disabled';
        tier_3: 'enabled' | 'disabled';
      };
    };
    active_jobs: number;
    retry_queue: number;
  }> {
    try {
      const activeJobs = this.lifecycleManager.getActiveJobs().length;
      const retryQueue = this.lifecycleManager.getRetryQueue().length;

      const components = {
        lifecycle_manager: 'healthy' as const,
        chaining_engine: 'healthy' as const,
        tier_processors: {
          tier_1: this.config.enable_tier_1 ? 'enabled' as const : 'disabled' as const,
          tier_2: this.config.enable_tier_2 ? 'enabled' as const : 'disabled' as const,
          tier_3: this.config.enable_tier_3 ? 'enabled' as const : 'disabled' as const,
        }
      };

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      // Check if we have too many jobs in retry queue
      if (retryQueue > 10) {
        status = 'degraded';
      }
      
      // Check if we have too many active jobs
      if (activeJobs > 50) {
        status = 'degraded';
      }

      return {
        status,
        components,
        active_jobs: activeJobs,
        retry_queue: retryQueue
      };

    } catch (error) {
      console.error('Health check failed:', error);
      return {
        status: 'unhealthy',
        components: {
          lifecycle_manager: 'unhealthy',
          chaining_engine: 'unhealthy',
          tier_processors: {
            tier_1: 'disabled',
            tier_2: 'disabled',
            tier_3: 'disabled'
          }
        },
        active_jobs: 0,
        retry_queue: 0
      };
    }
  }

  /**
   * Shutdown the orchestrator gracefully
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down Advanced Enrichment Orchestrator...');
    
    try {
      // Stop the lifecycle manager
      this.lifecycleManager.stop();
      
      console.log('Advanced Enrichment Orchestrator shutdown complete');
    } catch (error) {
      console.error('Error during orchestrator shutdown:', error);
      throw error;
    }
  }

  /**
   * Integration method for existing enrichment system
   */
  static async integrateWithExistingSystem(
    orgRepository: OrganizationRepository,
    siteRepository: SiteRepository,
    jobRecordRepository: EnrichmentJobRecordRepository,
    jobRepository: JobRepository
  ): Promise<AdvancedEnrichmentOrchestrator> {
    console.log('Integrating Advanced Enrichment Orchestrator with existing system...');
    
    const orchestrator = new AdvancedEnrichmentOrchestrator(
      orgRepository,
      siteRepository,
      jobRecordRepository,
      jobRepository,
      {
        confidence_threshold: 0.7,
        max_job_runtime_minutes: 30,
        max_retries: 3,
        enable_tier_1: true,
        enable_tier_2: true,
        enable_tier_3: true
      }
    );

    // Perform health check
    const health = await orchestrator.healthCheck();
    console.log(`Integration complete. System health: ${health.status}`);
    
    return orchestrator;
  }
}
