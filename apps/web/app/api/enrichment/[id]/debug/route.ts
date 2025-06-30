import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const jobId = id;

  try {
    const client = await pool.connect();

    try {
      // First check if job exists using basic query
      const jobQuery = `
        SELECT 
          j.*,
          COUNT(DISTINCT f.id) as total_facts,
          AVG(f.confidence_score) as avg_confidence,
          EXTRACT(EPOCH FROM (j.completed_at - j.started_at)) * 1000 as total_duration_ms
        FROM enrichment_jobs j
        LEFT JOIN enrichment_facts f ON j.id = f.job_id
        WHERE j.id = $1
        GROUP BY j.id
      `;

      const debugResult = await client.query(jobQuery, [jobId]);
      
      if (debugResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }

      const jobDebugInfo = debugResult.rows[0];

      // Get step-by-step breakdown using only existing tables
      const stepsQuery = `
        SELECT step_name, status FROM (
          SELECT 
            'crawling' as step_name, crawling_status as status, 1 as sort_order
          FROM enrichment_jobs WHERE id = $1
          UNION ALL
          SELECT 
            'chunking' as step_name, chunking_status as status, 2 as sort_order
          FROM enrichment_jobs WHERE id = $1
          UNION ALL
          SELECT 
            'embedding' as step_name, embedding_status as status, 3 as sort_order
          FROM enrichment_jobs WHERE id = $1
          UNION ALL
          SELECT 
            'extraction' as step_name, extraction_status as status, 4 as sort_order
          FROM enrichment_jobs WHERE id = $1
        ) steps
        ORDER BY sort_order
      `;

      const stepsResult = await client.query(stepsQuery, [jobId]);

      // Get job logs from existing job_logs table
      const logsQuery = `
        SELECT 
          level as log_level,
          message,
          details,
          created_at
        FROM job_logs
        WHERE job_id = $1
        ORDER BY created_at DESC
        LIMIT 100
      `;

      const logsResult = await client.query(logsQuery, [jobId]);

      const debugData = {
        job: jobDebugInfo,
        steps: stepsResult.rows,
        logs: logsResult.rows,
        metrics: [], // Empty until observability tables are implemented
        errors: [], // Empty until observability tables are implemented
        summary: {
          total_chunks: jobDebugInfo.chunks_created || 0,
          total_embeddings: jobDebugInfo.embeddings_generated || 0,
          total_facts: parseInt(jobDebugInfo.total_facts) || 0,
          total_prompts: 0, // Not available yet
          total_model_responses: 0, // Not available yet
          avg_confidence: parseFloat(jobDebugInfo.avg_confidence) || 0,
          avg_chunk_quality: 0, // Not available yet
          total_api_cost: 0, // Not available yet
          total_tokens_used: 0, // Not available yet
          avg_response_time: 0, // Not available yet
          total_duration_ms: parseFloat(jobDebugInfo.total_duration_ms) || 0
        }
      };

      return NextResponse.json(debugData);

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Debug API error:', error);
    
    // Check if it's a table not found error
    if (error instanceof Error && error.message.includes('does not exist')) {
      // Return empty data structure for missing tables
      return NextResponse.json({
        logs: [],
        performance: {
          total_processing_time: 0,
          avg_step_time: 0,
          slowest_step: null,
          fastest_step: null,
          memory_usage: 0,
          cpu_usage: 0
        },
        errors: [],
        warnings: [],
        system_info: {
          node_version: process.version,
          platform: process.platform,
          memory: process.memoryUsage(),
          uptime: process.uptime()
        }
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch debug information' },
      { status: 500 }
    );
  }
}
