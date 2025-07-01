/**
 * Enrichment Chaining Engine
 * 
 * Implements sophisticated multi-tier enrichment logic with confidence-based
 * progression and early termination capabilities.
 */

import { Pool } from 'pg';
import { 
  EnrichmentContext, 
  EnrichmentFact, 
  JobStatus,
  TierResult,
  EnrichmentJobResult 
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

export interface ChainConfig {
  confidence_threshold: number;
  max_total_runtime_minutes: number;
  max_retries_per_tier: number;
  stop_on_confidence_threshold: boolean;
}

export class EnrichmentChainingEngine {
  private pool: Pool;
  private tierProcessors: Map<number, TierProcessor> = new Map();
  private config: ChainConfig;
  private orgRepository: OrganizationRepository;
  private siteRepository: SiteRepository;
  private jobRepository: EnrichmentJobRecordRepository;
  private jobRepo: JobRepository; // For updating UI progress fields

  constructor(
    orgRepository: OrganizationRepository,
    siteRepository: SiteRepository,
    jobRepository: EnrichmentJobRecordRepository,
    config: Partial<ChainConfig> = {}
  ) {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    this.orgRepository = orgRepository;
    this.siteRepository = siteRepository;
    this.jobRepository = jobRepository;
    this.jobRepo = new JobRepository(); // Initialize for UI progress updates
    
    this.config = {
      confidence_threshold: 0.7,
      max_total_runtime_minutes: 30,
      max_retries_per_tier: 3,
      stop_on_confidence_threshold: true,
      ...config
    };
  }

  /**
   * Register a tier processor
   */
  registerTierProcessor(processor: TierProcessor): void {
    this.tierProcessors.set(processor.tier, processor);
    console.log(`Registered tier ${processor.tier} processor: ${processor.name}`);
  }

  /**
   * Execute the enrichment chain with tier progression logic
   */
  async executeChain(context: EnrichmentContext): Promise<EnrichmentJobResult> {
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
        if (elapsedMinutes >= this.config.max_total_runtime_minutes) {
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
   * Store enrichment results in the new hierarchical data model
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
   * Update job completion
   */
  private async updateJobCompletion(jobId: string, status: JobStatus, runtimeMs: number): Promise<void> {
    const query = `
      UPDATE enrichment_jobs 
      SET status = $1, completed_at = CURRENT_TIMESTAMP, 
          total_runtime_seconds = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `;
    await this.pool.query(query, [status, Math.floor(runtimeMs / 1000), jobId]);
  }

  /**
   * Update job error
   */
  private async updateJobError(jobId: string, errorMessage: string): Promise<void> {
    const query = `
      UPDATE enrichment_jobs 
      SET error_message = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    await this.pool.query(query, [errorMessage, jobId]);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
