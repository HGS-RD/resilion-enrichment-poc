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
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  try {
    const client = await pool.connect();

    try {
      // Get chunks with their embeddings and facts
      const chunksQuery = `
        SELECT 
          c.id,
          c.chunk_index,
          c.content,
          c.content_length,
          c.source_url,
          c.source_page_title,
          c.chunk_metadata,
          c.quality_score,
          c.created_at,
          -- Embedding info
          e.id as embedding_id,
          e.vector_id,
          e.embedding_model,
          e.vector_dimensions,
          e.embedding_metadata,
          -- Facts generated from this chunk
          COUNT(f.id) as facts_generated,
          AVG(f.confidence_score) as avg_fact_confidence,
          array_agg(f.fact_type) FILTER (WHERE f.fact_type IS NOT NULL) as fact_types
        FROM enrichment_chunks c
        LEFT JOIN enrichment_embeddings e ON c.id = e.chunk_id
        LEFT JOIN enrichment_facts f ON c.id = f.chunk_id
        WHERE c.job_id = $1
        GROUP BY c.id, e.id
        ORDER BY c.chunk_index ASC
        LIMIT $2 OFFSET $3
      `;

      const chunksResult = await client.query(chunksQuery, [jobId, limit, offset]);

      // Get total count for pagination
      const countQuery = `
        SELECT COUNT(*) as total
        FROM enrichment_chunks
        WHERE job_id = $1
      `;

      const countResult = await client.query(countQuery, [jobId]);
      const totalChunks = parseInt(countResult.rows[0].total);

      // Get chunk analytics
      const analyticsQuery = `
        SELECT 
          COUNT(*) as total_chunks,
          AVG(content_length) as avg_content_length,
          MAX(content_length) as max_content_length,
          MIN(content_length) as min_content_length,
          AVG(quality_score) as avg_quality_score,
          COUNT(DISTINCT source_url) as unique_sources,
          -- Quality distribution
          COUNT(CASE WHEN quality_score >= 0.8 THEN 1 END) as high_quality_chunks,
          COUNT(CASE WHEN quality_score >= 0.6 AND quality_score < 0.8 THEN 1 END) as medium_quality_chunks,
          COUNT(CASE WHEN quality_score < 0.6 THEN 1 END) as low_quality_chunks
        FROM enrichment_chunks
        WHERE job_id = $1
      `;

      const analyticsResult = await client.query(analyticsQuery, [jobId]);

      // Get source URL breakdown
      const sourcesQuery = `
        SELECT 
          source_url,
          source_page_title,
          COUNT(*) as chunk_count,
          AVG(content_length) as avg_content_length,
          AVG(quality_score) as avg_quality_score,
          SUM(CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END) as facts_generated
        FROM enrichment_chunks c
        LEFT JOIN enrichment_facts f ON c.id = f.chunk_id
        WHERE c.job_id = $1
        GROUP BY source_url, source_page_title
        ORDER BY chunk_count DESC
      `;

      const sourcesResult = await client.query(sourcesQuery, [jobId]);

      const chunkData = {
        chunks: chunksResult.rows,
        pagination: {
          page,
          limit,
          total: totalChunks,
          totalPages: Math.ceil(totalChunks / limit),
          hasNext: page * limit < totalChunks,
          hasPrev: page > 1
        },
        analytics: analyticsResult.rows[0],
        sources: sourcesResult.rows
      };

      return NextResponse.json(chunkData);

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Chunks API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chunk information' },
      { status: 500 }
    );
  }
}
