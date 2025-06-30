import { NextRequest, NextResponse } from 'next/server';
import { JobRepository } from '../../../../lib/repositories/job-repository';
import { FactRepository } from '../../../../lib/repositories/fact-repository';

/**
 * GET /api/enrichment/[id]
 * 
 * Fetches detailed information about a specific enrichment job,
 * including all associated facts and metadata.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const jobRepository = new JobRepository();
    const factRepository = new FactRepository();

    // Fetch job details
    const job = await jobRepository.findById(jobId);
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Fetch all facts for this job
    const facts = await factRepository.findByJobId(jobId);
    
    // Get fact statistics
    const factStats = await factRepository.getJobStatistics(jobId);
    
    // Get tier statistics
    const tierStats = await factRepository.getTierStatistics(jobId);
    
    // Get job logs for debugging
    const logs = await jobRepository.getJobLogs(jobId, 20);

    // Calculate workflow progress based on job status and step statuses
    const workflowSteps = [
      { id: 'crawling', name: 'Web Crawling', status: job.crawling_status },
      { id: 'chunking', name: 'Text Chunking', status: job.chunking_status },
      { id: 'embedding', name: 'Embeddings', status: job.embedding_status },
      { id: 'extraction', name: 'Fact Extraction', status: job.extraction_status }
    ];

    const completedSteps = workflowSteps.filter(step => step.status === 'completed').length;
    const currentStep = workflowSteps.find(step => step.status === 'running')?.id || 
                      (job.status === 'completed' ? 'completed' : 'pending');

    // Prepare response data
    const response = {
      job: {
        ...job,
        workflow: {
          steps: workflowSteps,
          currentStep,
          completedSteps,
          totalSteps: workflowSteps.length,
          progress: {
            pagesCrawled: job.pages_crawled,
            chunksCreated: job.chunks_created,
            embeddingsGenerated: job.embeddings_generated,
            factsExtracted: job.facts_extracted
          }
        }
      },
      facts: facts.map(fact => ({
        id: fact.id,
        type: fact.fact_type,
        data: fact.fact_data,
        confidence: fact.confidence_score,
        evidence: fact.source_text,
        sourceUrl: fact.source_url,
        tier: fact.tier_used,
        validated: fact.validated,
        validationNotes: fact.validation_notes,
        createdAt: fact.created_at
      })),
      statistics: {
        ...factStats,
        ...tierStats,
        runtime: job.total_runtime_seconds,
        llmUsed: job.llm_used,
        pagesScraped: job.pages_scraped
      },
      logs: logs.map(log => ({
        id: log.id,
        level: log.level,
        message: log.message,
        details: log.details,
        timestamp: log.timestamp
      }))
    };

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error fetching job details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job details' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/enrichment/[id]
 * 
 * Deletes a specific enrichment job and all associated data.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const jobRepository = new JobRepository();
    
    // Check if job exists
    const job = await jobRepository.findById(jobId);
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Delete the job and all associated data
    const deleted = await jobRepository.deleteJob(jobId);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete job' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Job deleted successfully' 
    });
    
  } catch (error) {
    console.error('Error deleting job:', error);
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    );
  }
}
