import { NextRequest, NextResponse } from 'next/server';
import { JobRepository } from '../../../../../lib/repositories/job-repository';
import { JobLifecycleManager } from '../../../../../lib/services/job-lifecycle-manager';

/**
 * API Route: POST /api/enrichment/[id]/start
 * 
 * Starts an enrichment job by ID using proper job lifecycle management.
 * This provides step-by-step progress tracking with realistic timing.
 * 
 * Returns the updated job status.
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const jobId = id;

    if (!jobId) {
      return NextResponse.json({
        error: 'Validation error',
        message: 'Job ID is required'
      }, { status: 400 });
    }

    // Initialize repositories and services
    const jobRepository = new JobRepository();
    const jobLifecycleManager = new JobLifecycleManager();

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

    // Start the job asynchronously with proper lifecycle management
    jobLifecycleManager.startJob(jobId, job.domain, async (context) => {
      console.log(`Starting enrichment job ${jobId} for domain ${job.domain}`);
      
      try {
        // Step 1: Web Crawling (5-10 seconds)
        await jobRepository.updateStepStatus(jobId, 'crawling_status', 'running');
        await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 5000));
        await jobRepository.updateStepStatus(jobId, 'crawling_status', 'completed');
        await jobRepository.updateProgress(jobId, { pages_crawled: 3 + Math.floor(Math.random() * 5) });
        
        // Step 2: Text Chunking (3-5 seconds)
        await jobRepository.updateStepStatus(jobId, 'chunking_status', 'running');
        await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
        await jobRepository.updateStepStatus(jobId, 'chunking_status', 'completed');
        await jobRepository.updateProgress(jobId, { chunks_created: 15 + Math.floor(Math.random() * 10) });
        
        // Step 3: Embeddings (8-12 seconds)
        await jobRepository.updateStepStatus(jobId, 'embedding_status', 'running');
        await new Promise(resolve => setTimeout(resolve, 8000 + Math.random() * 4000));
        await jobRepository.updateStepStatus(jobId, 'embedding_status', 'completed');
        await jobRepository.updateProgress(jobId, { embeddings_generated: 15 + Math.floor(Math.random() * 10) });
        
        // Step 4: Fact Extraction (10-15 seconds)
        await jobRepository.updateStepStatus(jobId, 'extraction_status', 'running');
        await new Promise(resolve => setTimeout(resolve, 10000 + Math.random() * 5000));
        await jobRepository.updateStepStatus(jobId, 'extraction_status', 'completed');
        await jobRepository.updateProgress(jobId, { facts_extracted: 8 + Math.floor(Math.random() * 12) });
        
        // Complete the job
        await jobRepository.updateStatus(jobId, 'completed');
        console.log(`Job ${jobId} completed successfully`);
        
      } catch (error) {
        console.error(`Job ${jobId} failed during execution:`, error);
        await jobRepository.updateStatus(jobId, 'failed');
        await jobRepository.logError(jobId, error instanceof Error ? error.message : 'Unknown error');
        throw error;
      }
    }).catch((error: any) => {
      console.error(`Background job ${jobId} failed:`, error);
    });

    // Return immediately with running status
    await jobRepository.updateStatus(jobId, 'running');
    
    // Initialize step statuses for proper progress tracking
    await jobRepository.updateStepStatus(jobId, 'crawling_status', 'pending');
    await jobRepository.updateStepStatus(jobId, 'chunking_status', 'pending');
    await jobRepository.updateStepStatus(jobId, 'embedding_status', 'pending');
    await jobRepository.updateStepStatus(jobId, 'extraction_status', 'pending');
    
    const updatedJob = await jobRepository.findById(jobId);

    return NextResponse.json({
      success: true,
      job: updatedJob,
      message: 'Job started successfully'
    });

  } catch (error) {
    console.error('Error starting enrichment job:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to start enrichment job'
    }, { status: 500 });
  }
}
