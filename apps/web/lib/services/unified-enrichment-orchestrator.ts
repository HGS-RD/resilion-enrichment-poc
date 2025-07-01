/**
 * Unified Enrichment Orchestrator
 * 
 * Single, consolidated orchestrator that combines all enrichment pipeline functionality:
 * - Multi-tier processing (Tier 1, 2, 3)
 * - Job lifecycle management with timeouts and retries
 * - Confidence-based progression and early termination
 * - Hierarchical data model integration
 * - Robust error handling and monitoring
 */

import { Pool } from 'pg';
import { 
  EnrichmentContext, 
  EnrichmentFact, 
  JobStatus,
  TierResult,
  EnrichmentJobResult,
  EnrichmentJob 
} from '../types/enrichment';
import { 
  Organization, 
  Site, 
  EnrichmentJobRecord,
  OrganizationRepository,
  SiteRepository,
  EnrichmentJobRecordRepository 
} from '../types/data-model';
import { JobRepository } from '../repositories/job-repository';
import { Tier1Processor } from './tier-processors/tier-1-processor';
import { Tier2Processor } from './tier-processors/tier-2-processor';
import { Tier3Processor } from './tier-processors/tier-3-processor';

export interface TierProcessor {
  tier: number;
  name: string;
  execute(context: EnrichmentContext): Promise<TierProcessingResult>;
  canHandle(context: EnrichmentContext): boolean;
}

export interface TierProcessingResult {
  tier: number;
  facts: EnrichmentFact[];
  sources_attempted: string[];
  pages_scraped: number;
  runtime_seconds: number;
  status: 'completed' | 'partial' | 'failed' | 'timeout';
  error_message?: string;
  average_confidence: number;
}

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

export interface UnifiedOrchestratorConfig {
  confidence_threshold: number;
  max_job_runtime_minutes: number;
  max_retries_per_tier: number;
  stop_on_confidence_threshold: boolean;
  enable_tier_1: boolean;
  enable_tier_2: boolean;
  enable_tier_3: boolean;
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

export class UnifiedEnrichmentOrchestrator {
  private pool: Pool;
  private config: UnifiedOrchestratorConfig;
  private tierProcessors: Map<number, TierProcessor> = new Map();
  private orgRepository: OrganizationRepository;
  private siteRepository: SiteRepository;
  private jobRecordRepository: EnrichmentJobRecordRepository;
  private jobRepo: JobRepository;
  
  // Job lifecycle management
  private activeJobs: Map<string, JobTimeout> = new Map();
  private retryQueue: Map<string, NodeJS.Timeout> = new Map();
  private cleanupInterval?: NodeJS.Timeout;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(
    orgRepository: OrganizationRepository,
    siteRepository: SiteRepository,
    jobRecordRepository: EnrichmentJobRecordRepository,
    jobRepository: JobRepository,
    config: Partial<UnifiedOrchestratorConfig> = {}
  ) {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    this.orgRepository = orgRepository;
    this.siteRepository = siteRepository;
    this.jobRecordRepository = jobRecordRepository;
    this.jobRepo = jobRepository;
    
    this.config = {
      confidence_threshold: 0.7,
      max_job_runtime_minutes: 30,
      max_retries_per_tier: 3,
      stop_on_confidence_threshold: true,
      enable_tier_1: true,
      enable_tier_2: true,
      enable_tier_3: true,
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

    // Initialize tier processors
    this.initializeTierProcessors();
    
    // Start background tasks
    this.startBackgroundTasks();

    console.log('Unified Enrichment Orchestrator initialized');
    console.log(`Configuration: ${JSON.stringify(this.config, null, 2)}`);
  }

  /**
   * Initialize and register tier processors
   */
  private initializeTierProcessors(): void {
    if (this.config.enable_tier_1) {
      const tier1 = new Tier1Processor(this.jobRepo);
      this.tierProcessors.set(1, tier1);
      console.log(`Registered tier 1 processor: ${tier1.name}`);
    }
    
    if (this.config.enable_tier_2) {
      const tier2 = new Tier2Processor();
      this.tierProcessors.set(2, tier2);
      console.log(`Registered tier 2 processor: ${tier2.name}`);
    }
    
    if (this.config.enable_tier_3) {
      const tier3 = new Tier3Processor();
      this.tierProcessors.set(3, tier3);
      console.log(`Registered tier 3 processor: ${tier3.name}`);
    }
  }

  /**
   * Execute enrichment for a job with full lifecycle management
   */
  async executeEnrichment(job: EnrichmentJob): Promise<EnrichmentJobResult> {
    console.log(`Starting unified enrichment for job ${job.id}, domain: ${job.domain}`);

    return new Promise((resolve, reject) => {
      this.startJobWithLifecycle(
        job.id,
        job.domain,
        async (executionContext) => {
          try {
            console.log(`Executing enrichment chain for job ${job.id} (attempt ${executionContext.attempt})`);
            
            // Create enrichment context
            const context: EnrichmentContext = {
              job,
              extracted_facts: [],
              step_results: {}
            };
            
            // Execute the enrichment chain
            const result = await this.executeEnrichmentChain(context);
            
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
   * Execute the enrichment chain with tier progression logic
   */
  private async executeEnrichmentChain(context: EnrichmentContext): Promise<EnrichmentJobResult> {
    const startTime = Date.now();
    const jobId = context.job.id;
    
    console.log(`Starting enrichment chain for job ${jobId}, domain: ${context.job.domain}`);
    
    // Update job status to running
    await this.updateJobStatus(jobId, 'running');
    
    const tierResults: TierResult[] = [];
    let allFacts: EnrichmentFact[] = [];
    let currentConfidence = 0;
    let stoppedEarly = false;
    let stopReason: 'timeout' | 'confidence_threshold_met' | 'max_retries' | 'error' | undefined;
    
    try {
      // Process tiers sequentially (1, 2, 3)
      for (let tierNumber = 1; tierNumber <= 3; tierNumber++) {
        const processor = this.tierProcessors.get(tierNumber);
        
        if (!processor) {
          console.warn(`No processor registered for tier ${tierNumber}, skipping`);
          continue;
        }
        
        // Check timeout before starting tier
        const elapsedMinutes = (Date.now() - startTime) / (1000 * 60);
        if (elapsedMinutes >= this.config.max_job_runtime_minutes) {
          console.log(`Job timeout reached before tier ${tierNumber}, stopping chain`);
          stoppedEarly = true;
          stopReason = 'timeout';
          break;
        }
        
        console.log(`Starting tier ${tierNumber} processing`);
        
        // Execute tier with retry logic
        const tierResult = await this.executeTierWithRetry(
          processor, 
          context, 
          this.config.max_retries_per_tier
        );
        
        tierResults.push({
          tier: tierNumber,
          sources_attempted: tierResult.sources_attempted,
          pages_scraped: tierResult.pages_scraped,
          facts_extracted: tierResult.facts.length,
          average_confidence: tierResult.average_confidence,
          runtime_seconds: tierResult.runtime_seconds,
          status: tierResult.status,
          error_message: tierResult.error_message
        });
        
        // Add facts to collection
        allFacts.push(...tierResult.facts);
        
        // Calculate overall confidence
        if (allFacts.length > 0) {
          currentConfidence = allFacts.reduce((sum, fact) => sum + fact.confidence_score, 0) / allFacts.length;
        }
        
        // Update UI progress fields based on tier results
        await this.updateUIProgress(jobId, tierNumber, tierResult, allFacts.length);
        
        console.log(`Tier ${tierNumber} completed. Facts: ${tierResult.facts.length}, Avg Confidence: ${tierResult.average_confidence.toFixed(3)}, Overall: ${currentConfidence.toFixed(3)}`);
        
        // Check if we should stop early due to confidence threshold
        if (this.config.stop_on_confidence_threshold && 
            currentConfidence >= this.config.confidence_threshold) {
          console.log(`Confidence threshold ${this.config.confidence_threshold} met (${currentConfidence.toFixed(3)}), stopping chain early`);
          stoppedEarly = true;
          stopReason = 'confidence_threshold_met';
          break;
        }
        
        // Update context with new facts for next tier
        context.extracted_facts = allFacts;
      }
      
      // Determine final status
      const finalStatus = this.determineFinalStatus(tierResults, currentConfidence);
      
      // Store results in new data model
      await this.storeEnrichmentResults(context, allFacts, jobId);
      
      // Update job record
      await this.updateJobCompletion(jobId, finalStatus, Date.now() - startTime);
      
      const result: EnrichmentJobResult = {
        job_id: jobId,
        total_runtime_seconds: Math.floor((Date.now() - startTime) / 1000),
        tiers_completed: tierResults,
        final_status: finalStatus,
        total_facts_extracted: allFacts.length,
        average_confidence: currentConfidence,
        llm_used: context.job.llm_used || 'unknown',
        stopped_early: stoppedEarly,
        stop_reason: stopReason
      };
      
      console.log(`Enrichment chain completed for job ${jobId}. Status: ${finalStatus}, Facts: ${allFacts.length}, Confidence: ${currentConfidence.toFixed(3)}`);
      
      return result;
      
    } catch (error) {
      console.error(`Error in enrichment chain for job ${jobId}:`, error);
      
      await this.updateJobStatus(jobId, 'failed');
      await this.updateJobError(jobId, `Chain execution failed: ${error}`);
      
      return {
        job_id: jobId,
        total_runtime_seconds: Math.floor((Date.now() - startTime) / 1000),
        tiers_completed: tierResults,
        final_status: 'failed',
        total_facts_extracted: allFacts.length,
        average_confidence: currentConfidence,
        llm_used: context.job.llm_used || 'unknown',
        stopped_early: true,
        stop_reason: 'error'
      };
    }
  }

  /**
   * Execute a tier with retry logic
   */
  private async executeTierWithRetry(
    processor: TierProcessor,
    context: EnrichmentContext,
    maxRetries: number
  ): Promise<TierProcessingResult> {
    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Tier ${processor.tier} attempt ${attempt}/${maxRetries}`);
        
        const result = await processor.execute(context);
        
        // If we got some results, consider it successful
        if (result.status === 'completed' || result.status === 'partial') {
          return result;
        }
        
        // If failed but we have more retries, continue
        if (attempt < maxRetries) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
          console.log(`Tier ${processor.tier} attempt ${attempt} failed, retrying in ${backoffMs}ms`);
          await this.sleep(backoffMs);
          continue;
        }
        
        // Last attempt failed
        return result;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Tier ${processor.tier} attempt ${attempt} error:`, error);
        
        if (attempt < maxRetries) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          console.log(`Retrying tier ${processor.tier} in ${backoffMs}ms`);
          await this.sleep(backoffMs);
          continue;
        }
      }
    }
    
    // All retries exhausted
    return {
      tier: processor.tier,
      facts: [],
      sources_attempted: [],
      pages_scraped: 0,
      runtime_seconds: 0,
      status: 'failed',
      error_message: lastError?.message || 'All retry attempts failed',
      average_confidence: 0
    };
  }

  /**
   * Job lifecycle management - start job with timeout and retry handling
   */
  private async startJobWithLifecycle(
    jobId: string, 
    domain: string,
    executionFunction: (context: JobExecutionContext) => Promise<void>
  ): Promise<void> {
    console.log(`Starting job ${jobId} with ${this.config.max_job_runtime_minutes} minute timeout`);

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
    const timeoutMs = this.config.max_job_runtime_minutes * 60 * 1000;
    const timeoutHandle = setTimeout(async () => {
      console.log(`Job ${jobId} timed out after ${this.config.max_job_runtime_minutes} minutes`);
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
   * Determine final job status based on tier results and confidence
   */
  private determineFinalStatus(tierResults: TierResult[], overallConfidence: number): JobStatus {
    const completedTiers = tierResults.filter(t => t.status === 'completed').length;
    const partialTiers = tierResults.filter(t => t.status === 'partial').length;
    const failedTiers = tierResults.filter(t => t.status === 'failed').length;
    
    // If all tiers failed, job failed
    if (failedTiers === tierResults.length) {
      return 'failed';
    }
    
    // If we have some successful tiers and good confidence, completed
    if (completedTiers > 0 && overallConfidence >= this.config.confidence_threshold) {
      return 'completed';
    }
    
    // If we have some results but not great confidence, partial success
    if (completedTiers > 0 || partialTiers > 0) {
      return 'partial_success';
    }
    
    return 'failed';
  }

  /**
   * Store enrichment results in the hierarchical data model
   */
  private async storeEnrichmentResults(
    context: EnrichmentContext,
    facts: EnrichmentFact[],
    jobId: string
  ): Promise<void> {
    try {
      // Create or find organization
      let organization = await this.orgRepository.findByDomain(context.job.domain);
      
      if (!organization) {
        // Extract organization data from facts
        const orgData = this.extractOrganizationData(facts, context.job.domain);
        organization = await this.orgRepository.create(orgData);
        console.log(`Created organization: ${organization.organizationId}`);
      }
      
      // Extract and create sites
      const siteData = this.extractSiteData(facts, organization.organizationId, jobId);
      
      for (const site of siteData) {
        try {
          const createdSite = await this.siteRepository.create(site);
          console.log(`Created site: ${createdSite.siteId} - ${createdSite.siteName}`);
        } catch (error) {
          console.error(`Error creating site ${site.siteName}:`, error);
        }
      }
      
    } catch (error) {
      console.error('Error storing enrichment results:', error);
      throw error;
    }
  }

  /**
   * Extract organization data from facts
   */
  private extractOrganizationData(
    facts: EnrichmentFact[],
    domain: string
  ): Omit<Organization, 'organizationId' | 'lastVerifiedDate'> {
    // Find organization-related facts
    const orgFacts = facts.filter(f => 
      f.fact_type.includes('company') || 
      f.fact_type.includes('organization') ||
      f.fact_type.includes('headquarters')
    );
    
    // Extract company name (fallback to domain)
    let companyName = domain.replace(/^www\./, '').replace(/\.(com|org|net)$/, '');
    const nameFact = orgFacts.find(f => f.fact_type.includes('company_name'));
    if (nameFact && nameFact.fact_data.value) {
      companyName = nameFact.fact_data.value;
    }
    
    // Extract headquarters
    let headquartersAddress = '';
    const hqFact = orgFacts.find(f => f.fact_type.includes('headquarters'));
    if (hqFact && hqFact.fact_data.value) {
      headquartersAddress = hqFact.fact_data.value;
    }
    
    // Extract industry sectors
    const industryFacts = facts.filter(f => f.fact_type.includes('industry') || f.fact_type.includes('sector'));
    const industrySectors = industryFacts.map(f => f.fact_data.value).filter(Boolean);
    
    // Extract subsidiaries
    const subsidiaryFacts = facts.filter(f => f.fact_type.includes('subsidiary'));
    const subsidiaries = subsidiaryFacts.map(f => f.fact_data.value).filter(Boolean);
    
    return {
      companyName,
      website: domain,
      headquartersAddress,
      industrySectors,
      subsidiaries
    };
  }

  /**
   * Extract site data from facts
   */
  private extractSiteData(
    facts: EnrichmentFact[],
    organizationId: string,
    enrichmentJobId: string
  ): Omit<Site, 'siteId' | 'lastVerifiedDate'>[] {
    // Group facts by site (using site_name or facility_name)
    const siteFactGroups = new Map<string, EnrichmentFact[]>();
    
    facts.forEach(fact => {
      let siteName = '';
      
      if (fact.fact_type.includes('site_name') || fact.fact_type.includes('facility_name')) {
        siteName = fact.fact_data.value || 'Unknown Site';
      } else if (fact.fact_type.includes('site') || fact.fact_type.includes('facility')) {
        // Try to extract site name from the fact data
        siteName = fact.fact_data.site_name || fact.fact_data.facility_name || 'Unknown Site';
      } else {
        siteName = 'Main Site'; // Default grouping
      }
      
      if (!siteFactGroups.has(siteName)) {
        siteFactGroups.set(siteName, []);
      }
      siteFactGroups.get(siteName)!.push(fact);
    });
    
    // Convert fact groups to sites
    const sites: Omit<Site, 'siteId' | 'lastVerifiedDate'>[] = [];
    
    siteFactGroups.forEach((siteFacts, siteName) => {
      const site = this.createSiteFromFacts(siteName, siteFacts, organizationId, enrichmentJobId);
      sites.push(site);
    });
    
    return sites;
  }

  /**
   * Create a site from a group of facts
   */
  private createSiteFromFacts(
    siteName: string,
    facts: EnrichmentFact[],
    organizationId: string,
    enrichmentJobId: string
  ): Omit<Site, 'siteId' | 'lastVerifiedDate'> {
    // Extract address components
    const addressFact = facts.find(f => f.fact_type.includes('address'));
    const address = addressFact?.fact_data.value || '';
    
    // Extract location components
    const cityFact = facts.find(f => f.fact_type.includes('city'));
    const stateFact = facts.find(f => f.fact_type.includes('state'));
    const countryFact = facts.find(f => f.fact_type.includes('country'));
    
    // Extract site type
    const typeFact = facts.find(f => f.fact_type.includes('site_type') || f.fact_type.includes('facility_type'));
    const siteType = typeFact?.fact_data.value || 'unknown';
    
    // Extract site purpose
    const purposeFact = facts.find(f => f.fact_type.includes('purpose') || f.fact_type.includes('description'));
    const sitePurpose = purposeFact?.fact_data.value || '';
    
    // Extract certifications
    const certFacts = facts.filter(f => f.fact_type.includes('certification'));
    const certifications = certFacts.map(f => f.fact_data.value).filter(Boolean);
    
    // Extract operating status
    const statusFact = facts.find(f => f.fact_type.includes('operating_status'));
    const operatingStatus = statusFact?.fact_data.value || 'active';
    
    // Extract capacity
    const capacityFact = facts.find(f => f.fact_type.includes('capacity'));
    const productionCapacity = capacityFact?.fact_data.value;
    
    // Extract employee count
    const employeeFact = facts.find(f => f.fact_type.includes('employee'));
    const employeeCount = employeeFact?.fact_data.value ? parseInt(employeeFact.fact_data.value) : undefined;
    
    // Extract products
    const productFacts = facts.filter(f => f.fact_type.includes('product'));
    const majorProducts = productFacts.map(f => f.fact_data.value).filter(Boolean);
    
    // Calculate confidence score
    const confidenceScore = facts.length > 0 
      ? facts.reduce((sum, fact) => sum + fact.confidence_score, 0) / facts.length 
      : 0;
    
    // Get best evidence text and source
    const bestFact = facts.reduce((best, current) => 
      current.confidence_score > best.confidence_score ? current : best
    );
    
    return {
      organizationId,
      siteName,
      address,
      city: cityFact?.fact_data.value || '',
      stateProvince: stateFact?.fact_data.value || '',
      country: countryFact?.fact_data.value || '',
      postalCode: '',
      siteType,
      sitePurpose,
      certifications,
      operatingStatus: operatingStatus as any,
      productionCapacity,
      employeeCount,
      regulatoryIds: [],
      supplyChainDependencies: [],
      majorProducts,
      evidenceText: bestFact.source_text || '',
      source: bestFact.source_url || '',
      confidenceScore,
      enrichmentJobId
    };
  }

  /**
   * Update UI progress fields based on tier results
   */
  private async updateUIProgress(
    jobId: string, 
    tierNumber: number, 
    tierResult: TierProcessingResult, 
    totalFacts: number
  ): Promise<void> {
    try {
      // Map tier processing to UI step statuses
      const stepStatus = tierResult.status === 'completed' ? 'completed' : 
                        tierResult.status === 'partial' ? 'completed' : 
                        tierResult.status === 'failed' ? 'failed' : 'running';

      // Update step statuses based on tier completion
      if (tierNumber >= 1) {
        await this.jobRepo.updateStepStatus(jobId, 'crawling_status', stepStatus);
        await this.jobRepo.updateProgress(jobId, { 
          pages_crawled: tierResult.pages_scraped 
        });
      }

      if (tierNumber >= 1 && tierResult.pages_scraped > 0) {
        // Estimate chunks created (roughly 4 chunks per page)
        const estimatedChunks = tierResult.pages_scraped * 4;
        await this.jobRepo.updateStepStatus(jobId, 'chunking_status', stepStatus);
        await this.jobRepo.updateProgress(jobId, { 
          chunks_created: estimatedChunks 
        });
      }

      if (tierNumber >= 1 && tierResult.pages_scraped > 0) {
        // Estimate embeddings (same as chunks)
        const estimatedEmbeddings = tierResult.pages_scraped * 4;
        await this.jobRepo.updateStepStatus(jobId, 'embedding_status', stepStatus);
        await this.jobRepo.updateProgress(jobId, { 
          embeddings_generated: estimatedEmbeddings 
        });
      }

      // Always update fact extraction with actual facts
      await this.jobRepo.updateStepStatus(jobId, 'extraction_status', stepStatus);
      await this.jobRepo.updateProgress(jobId, { 
        facts_extracted: totalFacts 
      });

      console.log(`Updated UI progress for job ${jobId}: tier ${tierNumber}, pages: ${tierResult.pages_scraped}, facts: ${totalFacts}`);

    } catch (error) {
      console.error(`Error updating UI progress for job ${jobId}:`, error);
      // Don't throw - this is just for UI updates
    }
  }

  // Job lifecycle management methods
  private async handleJobTimeout(jobId: string): Promise<void> {
    try {
      console.log(`Handling timeout for job ${jobId}`);
      
      // Update job status
      await this.updateJobStatus(jobId, 'failed');
      await this.updateJobError(jobId, `Job timed out after ${this.config.max_job_runtime_minutes} minutes`);
      await this.updateJobEndTime(jobId);
      
      // Log timeout event
      await this.logJobEvent(jobId, 'timeout', `Job exceeded maximum runtime of ${this.config.max_job_runtime_minutes} minutes`);
      
      // Clean up resources
      this.cleanupJob(jobId);
      
    } catch (error) {
      console.error(`Error handling timeout for job ${jobId}:`, error);
    }
  }

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
    lifecycle_status: any;
    active_jobs: string[];
    retry_queue: string[];
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
      time_remaining_seconds: timeRemainingSeconds,
      lifecycle_status: job,
      active_jobs: this.getActiveJobs(),
      retry_queue: this.getRetryQueue()
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
   * Get orchestrator statistics
   */
  getStatistics(): {
    active_jobs_count: number;
    retry_queue_count: number;
    configuration: UnifiedOrchestratorConfig;
  } {
    return {
      active_jobs_count: this.getActiveJobs().length,
      retry_queue_count: this.getRetryQueue().length,
      configuration: this.config
    };
  }

  /**
   * Update orchestrator configuration
   */
  updateConfiguration(newConfig: Partial<UnifiedOrchestratorConfig>): void {
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
      const activeJobs = this.getActiveJobs().length;
      const retryQueue = this.getRetryQueue().length;

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
   * Shutdown the orchestrator gracefully
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down Unified Enrichment Orchestrator...');
    
    try {
      // Stop background tasks
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
      
      console.log('Unified Enrichment Orchestrator shutdown complete');
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
  ): Promise<UnifiedEnrichmentOrchestrator> {
    console.log('Integrating Unified Enrichment Orchestrator with existing system...');
    
    const orchestrator = new UnifiedEnrichmentOrchestrator(
      orgRepository,
      siteRepository,
      jobRecordRepository,
      jobRepository,
      {
        confidence_threshold: 0.7,
        max_job_runtime_minutes: 30,
        max_retries_per_tier: 3,
        stop_on_confidence_threshold: true,
        enable_tier_1: true,
        enable_tier_2: true,
        enable_tier_3: true,
        retryConfig: {
          maxRetries: 3,
          baseDelayMs: 1000,
          maxDelayMs: 60000,
          exponentialBase: 2
        },
        cleanupIntervalMs: 60000,
        heartbeatIntervalMs: 30000
      }
    );

    // Perform health check
    const health = await orchestrator.healthCheck();
    console.log(`Integration complete. System health: ${health.status}`);
    
    return orchestrator;
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

  private async updateJobCompletion(jobId: string, status: JobStatus, runtimeMs: number): Promise<void> {
    const query = `
      UPDATE enrichment_jobs 
      SET status = $1, completed_at = CURRENT_TIMESTAMP, 
          total_runtime_seconds = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `;
    await this.pool.query(query, [status, Math.floor(runtimeMs / 1000), jobId]);
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
    const query = `
      SELECT * FROM enrichment_jobs 
      WHERE status = 'running' 
      AND started_at < NOW() - INTERVAL '${this.config.max_job_runtime_minutes} minutes'
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
