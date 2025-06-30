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
      // Get comprehensive job debug information
      const debugQuery = `
        SELECT 
          j.*,
          -- Aggregated metrics
          COUNT(DISTINCT c.id) as total_chunks,
          COUNT(DISTINCT e.id) as total_embeddings,
          COUNT(DISTINCT f.id) as total_facts,
          COUNT(DISTINCT p.id) as total_prompts,
          COUNT(DISTINCT mr.id) as total_model_responses,
          -- Quality metrics
          AVG(f.confidence_score) as avg_confidence,
          AVG(c.quality_score) as avg_chunk_quality,
          -- Performance metrics
          SUM(mr.api_cost_usd) as total_api_cost,
          SUM(mr.total_tokens) as total_tokens_used,
          AVG(mr.response_time_ms) as avg_response_time,
          -- Timing analysis
          EXTRACT(EPOCH FROM (j.completed_at - j.started_at)) * 1000 as total_duration_ms
        FROM enrichment_jobs j
        LEFT JOIN enrichment_chunks c ON j.id = c.job_id
        LEFT JOIN enrichment_embeddings e ON j.id = e.job_id
        LEFT JOIN enrichment_facts f ON j.id = f.job_id
        LEFT JOIN enrichment_prompts p ON j.id = p.job_id
        LEFT JOIN enrichment_model_responses mr ON j.id = mr.job_id
        WHERE j.id = $1
        GROUP BY j.id
      `;

      const debugResult = await client.query(debugQuery, [jobId]);
      
      if (debugResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }

      const jobDebugInfo = debugResult.rows[0];

      // Get step-by-step breakdown
      const stepsQuery = `
        SELECT 
          step_name,
          status,
          COUNT(p.id) as prompt_count,
          AVG(mr.response_time_ms) as avg_response_time,
          SUM(mr.total_tokens) as total_tokens,
          SUM(mr.api_cost_usd) as total_cost,
          MIN(p.created_at) as step_started_at,
          MAX(mr.created_at) as step_completed_at
        FROM (
          SELECT 'crawling' as step_name, crawling_status as status FROM enrichment_jobs WHERE id = $1
          UNION ALL
          SELECT 'chunking' as step_name, chunking_status as status FROM enrichment_jobs WHERE id = $1
          UNION ALL
          SELECT 'embedding' as step_name, embedding_status as status FROM enrichment_jobs WHERE id = $1
          UNION ALL
          SELECT 'extraction' as step_name, extraction_status as status FROM enrichment_jobs WHERE id = $1
        ) steps
        LEFT JOIN enrichment_prompts p ON p.job_id = $1 AND p.step_name = steps.step_name
        LEFT JOIN enrichment_model_responses mr ON p.id = mr.prompt_id
        GROUP BY step_name, status
        ORDER BY 
          CASE step_name 
            WHEN 'crawling' THEN 1
            WHEN 'chunking' THEN 2
            WHEN 'embedding' THEN 3
            WHEN 'extraction' THEN 4
          END
      `;

      const stepsResult = await client.query(stepsQuery, [jobId]);

      // Get recent debug logs
      const logsQuery = `
        SELECT 
          step_name,
          log_level,
          message,
          details,
          execution_time_ms,
          memory_usage_mb,
          created_at
        FROM enrichment_debug_logs
        WHERE job_id = $1
        ORDER BY created_at DESC
        LIMIT 100
      `;

      const logsResult = await client.query(logsQuery, [jobId]);

      // Get performance metrics
      const metricsQuery = `
        SELECT 
          metric_type,
          metric_name,
          metric_value,
          metric_unit,
          metric_metadata,
          recorded_at
        FROM enrichment_performance_metrics
        WHERE job_id = $1
        ORDER BY recorded_at DESC
      `;

      const metricsResult = await client.query(metricsQuery, [jobId]);

      // Get error analysis
      const errorsQuery = `
        SELECT 
          step_name,
          COUNT(*) as error_count,
          array_agg(DISTINCT message) as error_messages,
          MAX(created_at) as last_error_at
        FROM enrichment_debug_logs
        WHERE job_id = $1 AND log_level = 'error'
        GROUP BY step_name
      `;

      const errorsResult = await client.query(errorsQuery, [jobId]);

      const debugData = {
        job: jobDebugInfo,
        steps: stepsResult.rows,
        logs: logsResult.rows,
        metrics: metricsResult.rows,
        errors: errorsResult.rows,
        summary: {
          total_chunks: parseInt(jobDebugInfo.total_chunks) || 0,
          total_embeddings: parseInt(jobDebugInfo.total_embeddings) || 0,
          total_facts: parseInt(jobDebugInfo.total_facts) || 0,
          total_prompts: parseInt(jobDebugInfo.total_prompts) || 0,
          total_model_responses: parseInt(jobDebugInfo.total_model_responses) || 0,
          avg_confidence: parseFloat(jobDebugInfo.avg_confidence) || 0,
          avg_chunk_quality: parseFloat(jobDebugInfo.avg_chunk_quality) || 0,
          total_api_cost: parseFloat(jobDebugInfo.total_api_cost) || 0,
          total_tokens_used: parseInt(jobDebugInfo.total_tokens_used) || 0,
          avg_response_time: parseFloat(jobDebugInfo.avg_response_time) || 0,
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
