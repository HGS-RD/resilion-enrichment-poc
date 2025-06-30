import { NextRequest, NextResponse } from 'next/server';
import { JobRepository } from '../../../../../lib/repositories/job-repository';
import { EnrichmentAgent } from '../../../../../lib/services/enrichment-agent';

/**
 * API Route: POST /api/enrichment/[id]/start
 * 
 * Starts an enrichment job by ID.
 * Returns the updated job status.
 */

export async function POST(
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

    // Initialize repositories and services
    const jobRepository = new JobRepository();
    const enrichmentAgent = new EnrichmentAgent(jobRepository);

    // Check if job exists
    const job = await jobRepository.findById(jobId);
    if (!job) {
      return NextResponse.json({
        error: 'Not found',
        message: 'Job not found'
      }, { status: 404 });
    }

    // Check if job is in a startable state
    if (job.status !== 'pending') {
      return NextResponse.json({
        error: 'Invalid state',
        message: `Job cannot be started from status: ${job.status}`
      }, { status: 400 });
    }

    // Start the job asynchronously (don't wait for completion)
    // In production, this would typically be handled by a job queue
    enrichmentAgent.processJob(jobId).catch(error => {
      console.error(`Background job ${jobId} failed:`, error);
    });

    // Return immediately with running status
    await jobRepository.updateStatus(jobId, 'running');
    const updatedJob = await jobRepository.findById(jobId);

    return NextResponse.json({
      success: true,
      job: updatedJob
    });

  } catch (error) {
    console.error('Error starting enrichment job:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to start enrichment job'
    }, { status: 500 });
  }
}
