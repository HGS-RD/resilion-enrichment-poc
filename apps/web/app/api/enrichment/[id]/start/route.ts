import { NextRequest, NextResponse } from 'next/server';
// import { EnrichmentAgent } from '../../../../../lib/services/enrichment-agent';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;

  if (!jobId) {
    return NextResponse.json(
      { error: 'Job ID is required' },
      { status: 400 }
    );
  }

  try {
    // Temporary placeholder response for build
    return NextResponse.json({
      message: 'API endpoint temporarily disabled for build',
      job_id: jobId,
      status: 'under_construction'
    }, { status: 503 });

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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;

  if (!jobId) {
    return NextResponse.json(
      { error: 'Job ID is required' },
      { status: 400 }
    );
  }

  try {
    // Temporary placeholder response for build
    return NextResponse.json({
      message: 'API endpoint temporarily disabled for build',
      job_id: jobId,
      status: 'under_construction'
    }, { status: 503 });

  } catch (error) {
    console.error('Error getting job status:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get job status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
