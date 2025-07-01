import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { JobRepository } from '../../../lib/repositories/job-repository';
import { PostgresOrganizationRepository } from '../../../lib/repositories/organization-repository';
import { PostgresSiteRepository } from '../../../lib/repositories/site-repository';
import { UnifiedEnrichmentOrchestrator } from '../../../lib/services/unified-enrichment-orchestrator';
import { validateDomain } from '../../../lib/utils/domain-validator';
import { getDatabasePool } from '../../../lib/utils/database';

/**
 * API Route: POST /api/enrichment
 * 
 * Accepts a domain name and creates a new enrichment job.
 * Returns the job ID and initial status.
 */

// Request validation schema
const CreateJobSchema = z.object({
  domain: z.string()
    .min(1, 'Domain is required')
    .max(255, 'Domain too long')
    .refine(
      (domain) => validateDomain(domain),
      'Invalid domain format'
    ),
  llmUsed: z.string().optional(),
  metadata: z.record(z.any()).optional().default({})
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { domain, llmUsed, metadata } = CreateJobSchema.parse(body);

    // Initialize repositories and services
    const jobRepository = new JobRepository();

    // Check for existing active job for this domain
    const existingJobs = await jobRepository.findByDomain(domain);
    const activeJob = existingJobs.find(job => 
      job.status === 'pending' || job.status === 'running'
    );

    if (activeJob) {
      return NextResponse.json({
        success: true,
        job: activeJob,
        message: 'Job already exists for this domain'
      });
    }

    // Create new job with LLM selection
    const job = await jobRepository.create(domain, metadata, llmUsed);

    // Trigger the advanced enrichment process asynchronously
    // This ensures the job is processed without blocking the API response
    setImmediate(async () => {
      try {
        console.log(`Starting advanced multi-tiered enrichment process for job ${job.id} (domain: ${domain})`);
        
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
        
        console.log(`Advanced orchestrator initialized for job ${job.id} with all tiers enabled`);
        
        // Execute the advanced enrichment with multi-tiered data sourcing
        const result = await orchestrator.executeEnrichment(job);
        
        if (result.final_status === 'completed') {
          console.log(`Advanced enrichment process completed successfully for job ${job.id}`);
          console.log(`Results: ${result.total_facts_extracted} facts extracted, confidence: ${result.average_confidence.toFixed(3)}`);
          console.log(`Tiers completed: ${result.tiers_completed.length}, Runtime: ${result.total_runtime_seconds}s`);
          console.log(`Stop reason: ${result.stop_reason || 'completed normally'}`);
        } else {
          console.error(`Advanced enrichment process failed for job ${job.id}, status: ${result.final_status}`);
          if (result.stop_reason) {
            console.error(`Stop reason: ${result.stop_reason}`);
          }
        }
      } catch (error) {
        console.error(`Error in advanced enrichment process for job ${job.id}:`, error);
        // Log the error to the job record
        try {
          await jobRepository.logError(job.id, error instanceof Error ? error.message : 'Unknown error in advanced enrichment process');
        } catch (logError) {
          console.error('Failed to log enrichment error:', logError);
        }
      }
    });

    return NextResponse.json({
      success: true,
      job: job
    });

  } catch (error) {
    console.error('Error creating enrichment job:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        message: error.errors[0].message,
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to create enrichment job'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status') as any;

    const jobRepository = new JobRepository();
    
    let jobs;
    if (status) {
      jobs = await jobRepository.findByStatus(status, limit);
    } else {
      // Get all recent jobs - we'll need to implement this method
      jobs = await jobRepository.findRecent(limit);
    }

    return NextResponse.json({
      success: true,
      jobs: jobs
    });

  } catch (error) {
    console.error('Error fetching enrichment jobs:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to fetch enrichment jobs'
    }, { status: 500 });
  }
}
