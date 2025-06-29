import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
// import { JobRepository } from '@/lib/repositories/job-repository';
// import { EnrichmentAgent } from '@/lib/services/enrichment-agent';
// import { validateDomain } from '@/lib/utils/domain-validator';

/**
 * API Route: POST /api/enrichment
 * 
 * Accepts a domain name and creates a new enrichment job.
 * Returns the job ID and initial status.
 */

// Request validation schema (temporarily disabled for build)
// const CreateJobSchema = z.object({
//   domain: z.string()
//     .min(1, 'Domain is required')
//     .max(255, 'Domain too long')
//     .refine(
//       (domain) => validateDomain(domain),
//       'Invalid domain format'
//     ),
//   metadata: z.record(z.any()).optional().default({})
// });

export async function POST(request: NextRequest) {
  try {
    // Temporary placeholder response for build
    return NextResponse.json({
      message: 'API endpoint temporarily disabled for build',
      status: 'under_construction'
    }, { status: 503 });

    // TODO: Uncomment when dependencies are resolved
    // Parse and validate request body
    // const body = await request.json();
    // const { domain, metadata } = CreateJobSchema.parse(body);

    // Initialize repositories and services
    // const jobRepository = new JobRepository();
    // const enrichmentAgent = new EnrichmentAgent(jobRepository);

  } catch (error) {
    console.error('Error creating enrichment job:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to create enrichment job'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Temporary placeholder response for build
    return NextResponse.json({
      message: 'API endpoint temporarily disabled for build',
      status: 'under_construction'
    }, { status: 503 });

  } catch (error) {
    console.error('Error fetching enrichment job:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to fetch enrichment job'
    }, { status: 500 });
  }
}
