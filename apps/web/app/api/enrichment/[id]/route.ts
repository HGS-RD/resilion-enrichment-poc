import { NextRequest, NextResponse } from 'next/server';
import { JobRepository } from '@/lib/repositories/job-repository';

/**
 * API Route: GET /api/enrichment/[id]
 * 
 * Gets an enrichment job by ID.
 * Returns the job details and current status.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id;

    if (!jobId) {
      return NextResponse.json({
        error: 'Validation error',
        message: 'Job ID is required'
      }, { status: 400 });
    }

    // Initialize repository
    const jobRepository = new JobRepository();

    // Get the job
    const job = await jobRepository.findById(jobId);
    if (!job) {
      return NextResponse.json({
        error: 'Not found',
        message: 'Job not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      job: job
    });

  } catch (error) {
    console.error('Error fetching enrichment job:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to fetch enrichment job'
    }, { status: 500 });
  }
}
