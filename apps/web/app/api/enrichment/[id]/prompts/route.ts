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
      // Get all prompts for the job with their responses
      const promptsQuery = `
        SELECT 
          p.id,
          p.step_name,
          p.template_name,
          p.template_version,
          p.system_prompt,
          p.user_prompt,
          p.rendered_prompt,
          p.prompt_tokens,
          p.max_tokens,
          p.temperature,
          p.model_name,
          p.created_at,
          -- Model response data
          mr.id as response_id,
          mr.response_text,
          mr.response_tokens,
          mr.total_tokens,
          mr.response_time_ms,
          mr.api_cost_usd,
          mr.model_version,
          mr.finish_reason,
          mr.response_metadata,
          mr.error_message as response_error,
          -- Facts generated from this prompt
          COUNT(f.id) as facts_generated,
          AVG(f.confidence_score) as avg_fact_confidence
        FROM enrichment_prompts p
        LEFT JOIN enrichment_model_responses mr ON p.id = mr.prompt_id
        LEFT JOIN enrichment_facts f ON p.id = f.prompt_id
        WHERE p.job_id = $1
        GROUP BY p.id, mr.id
        ORDER BY p.created_at ASC
      `;

      const promptsResult = await client.query(promptsQuery, [jobId]);

      // Get prompt performance analytics
      const analyticsQuery = `
        SELECT 
          p.step_name,
          p.template_name,
          COUNT(p.id) as prompt_count,
          AVG(mr.response_time_ms) as avg_response_time,
          AVG(mr.total_tokens) as avg_tokens,
          SUM(mr.api_cost_usd) as total_cost,
          AVG(f.confidence_score) as avg_confidence,
          COUNT(f.id) as total_facts
        FROM enrichment_prompts p
        LEFT JOIN enrichment_model_responses mr ON p.id = mr.prompt_id
        LEFT JOIN enrichment_facts f ON p.id = f.prompt_id
        WHERE p.job_id = $1
        GROUP BY p.step_name, p.template_name
        ORDER BY p.step_name
      `;

      const analyticsResult = await client.query(analyticsQuery, [jobId]);

      // Get token usage breakdown
      const tokenUsageQuery = `
        SELECT 
          p.step_name,
          SUM(p.prompt_tokens) as total_prompt_tokens,
          SUM(mr.response_tokens) as total_response_tokens,
          SUM(mr.total_tokens) as total_tokens,
          AVG(p.prompt_tokens) as avg_prompt_tokens,
          AVG(mr.response_tokens) as avg_response_tokens,
          MAX(p.prompt_tokens) as max_prompt_tokens,
          MIN(p.prompt_tokens) as min_prompt_tokens
        FROM enrichment_prompts p
        LEFT JOIN enrichment_model_responses mr ON p.id = mr.prompt_id
        WHERE p.job_id = $1
        GROUP BY p.step_name
        ORDER BY total_tokens DESC
      `;

      const tokenUsageResult = await client.query(tokenUsageQuery, [jobId]);

      const promptData = {
        prompts: promptsResult.rows,
        analytics: analyticsResult.rows,
        tokenUsage: tokenUsageResult.rows,
        summary: {
          total_prompts: promptsResult.rows.length,
          total_cost: promptsResult.rows.reduce((sum, row) => sum + (parseFloat(row.api_cost_usd) || 0), 0),
          total_tokens: promptsResult.rows.reduce((sum, row) => sum + (parseInt(row.total_tokens) || 0), 0),
          avg_response_time: promptsResult.rows.reduce((sum, row) => sum + (parseFloat(row.response_time_ms) || 0), 0) / promptsResult.rows.length || 0
        }
      };

      return NextResponse.json(promptData);

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Prompts API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prompt information' },
      { status: 500 }
    );
  }
}
