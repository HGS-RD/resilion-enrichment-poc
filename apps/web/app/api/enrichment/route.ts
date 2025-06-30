import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { JobRepository } from '../../../lib/repositories/job-repository';
import { EnrichmentAgent } from '../../../lib/services/enrichment-agent';
import { validateDomain } from '../../../lib/utils/domain-validator';

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
