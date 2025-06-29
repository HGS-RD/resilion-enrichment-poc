import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { JobRepository } from '@/lib/repositories/job-repository';
import { EnrichmentAgent } from '@/lib/services/enrichment-agent';
import { validateDomain } from '@/lib/utils/domain-validator';

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
  metadata: z.record(z.any()).optional().default({})
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const { domain, metadata } = CreateJobSchema.parse(body);

    // Initialize repositories and services
    const jobRepository = new JobRepository();
    const enrichmentAgent = new EnrichmentAgent(jobRepository);

    // Check if job already exists for this domain
    const existingJobs = await jobRepository.findByDomain(domain);
    const activeJob = existingJobs.find(job => 
      job.status === 'pending' || job.status === 'running'
    );

    if (activeJob) {
      return NextResponse.json({
        id: activeJob.id,
        domain: activeJob.domain,
        status: activeJob.status,
        message: 'Job already exists for this domain',
        created_at: activeJob.created_at
      }, { status: 200 });
    }

    // Create new enrichment job
    const job = await jobRepository.create(domain, metadata);

    // Start enrichment process asynchronously
    // Note: In production, this would be handled by a queue system
    enrichmentAgent.processJob(job.id).catch(error => {
      console.error(`Failed to process job ${job.id}:`, error);
      jobRepository.logError(job.id, error.message, 'initialization');
    });

    return NextResponse.json({
      id: job.id,
      domain: job.domain,
      status: job.status,
      created_at: job.created_at,
      message: 'Enrichment job created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating enrichment job:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation failed',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }, { status: 400 });
    }

    // Handle other errors
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to create enrichment job'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');
    const jobId = searchParams.get('id');

    const jobRepository = new JobRepository();

    if (jobId) {
      // Get specific job by ID
      const job = await jobRepository.findById(jobId);
      if (!job) {
        return NextResponse.json({
          error: 'Job not found'
        }, { status: 404 });
      }
      return NextResponse.json(job);
    }

    if (domain) {
      // Get jobs for specific domain
      const jobs = await jobRepository.findByDomain(domain);
      return NextResponse.json({ jobs });
    }

    // Return error if no parameters provided
    return NextResponse.json({
      error: 'Missing required parameter',
      message: 'Provide either "id" or "domain" parameter'
    }, { status: 400 });

  } catch (error) {
    console.error('Error fetching enrichment job:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to fetch enrichment job'
    }, { status: 500 });
  }
}
