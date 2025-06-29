import { NextRequest, NextResponse } from 'next/server';
import { EnrichmentAgent } from '../../../../../lib/services/enrichment-agent';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const jobId = params.id;

  if (!jobId) {
    return NextResponse.json(
      { error: 'Job ID is required' },
      { status: 400 }
    );
  }

  const agent = new EnrichmentAgent();

  try {
    // Start the enrichment process asynchronously
    // In a production environment, this would typically be handled by a job queue
    const enrichmentPromise = agent.startEnrichment(jobId);

    // Don't await the enrichment process - let it run in background
    enrichmentPromise.catch(error => {
      console.error(`Background enrichment failed for job ${jobId}:`, error);
    });

    return NextResponse.json({
      message: 'Enrichment process started',
      job_id: jobId,
      status: 'running'
    }, { status: 200 });

  } catch (error) {
    console.error('Error starting enrichment:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to start enrichment process',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const jobId = params.id;

  if (!jobId) {
    return NextResponse.json(
      { error: 'Job ID is required' },
      { status: 400 }
    );
  }

  const agent = new EnrichmentAgent();

  try {
    const statusResult = await agent.getJobStatus(jobId);

    if (!statusResult.job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      job: statusResult.job,
      progress: statusResult.progress
    });

  } catch (error) {
    console.error('Error getting job status:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get job status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    await agent.close();
  }
}
