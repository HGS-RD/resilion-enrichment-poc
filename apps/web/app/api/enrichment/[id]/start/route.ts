import { NextRequest, NextResponse } from 'next/server';
import { JobRepository } from '../../../../../lib/repositories/job-repository';
import { PostgresOrganizationRepository } from '../../../../../lib/repositories/organization-repository';
import { PostgresSiteRepository } from '../../../../../lib/repositories/site-repository';
import { UnifiedEnrichmentOrchestrator } from '../../../../../lib/services/unified-enrichment-orchestrator';
import { getDatabasePool } from '../../../../../lib/utils/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    
    if (!jobId) {
      return NextResponse.json({
        error: 'Job ID is required'
      }, { status: 400 });
    }

    const jobRepository = new JobRepository();
    
    // Check if job exists
    const job = await jobRepository.findById(jobId);
    if (!job) {
      return NextResponse.json({
        error: 'Job not found'
      }, { status: 404 });
    }

    // Check if job is already running or completed
    if (job.status === 'running') {
      return NextResponse.json({
        success: true,
        message: 'Job is already running',
        job: job
      });
    }

    if (job.status === 'completed') {
      return NextResponse.json({
        success: true,
        message: 'Job is already completed',
        job: job
      });
    }

    // Process job asynchronously using the Advanced Enrichment Orchestrator
    setImmediate(async () => {
      try {
        console.log(`Starting advanced multi-tiered enrichment process for job ${jobId} (domain: ${job.domain})`);
        
        // Initialize database connection and repositories for advanced orchestrator
        const db = getDatabasePool();
        const orgRepository = new PostgresOrganizationRepository(db);
        const siteRepository = new PostgresSiteRepository(db);
        
        // Create a mock EnrichmentJobRecordRepository (we'll use the existing JobRepository for now)
        const jobRecordRepository = {
          create: async (jobData: any) => jobData,
          findById: async (id: string) => null,
          findByDomain: async (domain: string) => [],
          findByStatus: async (status: string) => [],
          update: async (id: string, updates: any) => updates,
          delete: async (id: string) => {},
          getJobStats: async () => ({ total: 0, completed: 0, failed: 0, pending: 0, running: 0, averageProcessingTime: 0 })
        };
        
        // Initialize the unified orchestrator with multi-tiered processing
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
            enable_tier_1: true,  // Corporate Website + Financial Reports
            enable_tier_2: true,  // LinkedIn, Job Postings
            enable_tier_3: true,  // News Articles
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
        
        console.log(`Advanced orchestrator initialized for job ${jobId} with all tiers enabled`);
        
        // Execute the advanced enrichment with multi-tiered data sourcing
        const result = await orchestrator.executeEnrichment(job);
        
        if (result.final_status === 'completed') {
          console.log(`Advanced enrichment process completed successfully for job ${jobId}`);
          console.log(`Results: ${result.total_facts_extracted} facts extracted, confidence: ${result.average_confidence.toFixed(3)}`);
          console.log(`Tiers completed: ${result.tiers_completed.length}, Runtime: ${result.total_runtime_seconds}s`);
          console.log(`Stop reason: ${result.stop_reason || 'completed normally'}`);
        } else {
          console.error(`Advanced enrichment process failed for job ${jobId}, status: ${result.final_status}`);
          if (result.stop_reason) {
            console.error(`Stop reason: ${result.stop_reason}`);
          }
        }
      } catch (error) {
        console.error(`Error in advanced enrichment process for job ${jobId}:`, error);
        // Log the error to the job record
        try {
          await jobRepository.logError(jobId, error instanceof Error ? error.message : 'Unknown error in advanced enrichment process');
        } catch (logError) {
          console.error('Failed to log enrichment error:', logError);
        }
      }
    });

    // Update job status to running
    await jobRepository.updateStatus(jobId, 'running');

    return NextResponse.json({
      success: true,
      message: 'Job started successfully',
      jobId: jobId
    });

  } catch (error) {
    console.error('Error starting enrichment job:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to start enrichment job'
    }, { status: 500 });
  }
}
