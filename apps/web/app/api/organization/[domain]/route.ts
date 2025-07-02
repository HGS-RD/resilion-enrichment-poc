import { NextRequest, NextResponse } from 'next/server';
import { EnrichmentViewerData } from '../../../../lib/types/viewer';
import { ViewerDataService } from '../../../../lib/services/viewer-data-service';

/**
 * API Route: GET /api/organization/[domain]
 * 
 * Returns hierarchical organization data for the fact viewer
 * Uses ViewerDataService to fetch real data from database and facts
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;

    // Use ViewerDataService to get real data
    const viewerDataService = new ViewerDataService();
    const organizationData = await viewerDataService.getViewerDataByDomain(domain);

    if (!organizationData) {
      return NextResponse.json({
        error: 'Organization not found',
        message: `No data found for domain: ${domain}`
      }, { status: 404 });
    }

    return NextResponse.json(organizationData);

  } catch (error) {
    console.error('Error fetching organization data:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to fetch organization data'
    }, { status: 500 });
  }
}
