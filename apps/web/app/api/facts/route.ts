import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const domain = searchParams.get('domain')
    
    if (!domain) {
      return NextResponse.json({ error: 'Domain parameter is required' }, { status: 400 })
    }

    const client = await pool.connect()
    
    try {
      // Get facts for the specified domain
      const factsQuery = `
        SELECT 
          f.id,
          f.job_id,
          f.fact_type,
          f.fact_data,
          f.confidence_score,
          f.source_text,
          f.source_url,
          f.validated,
          f.validation_notes,
          f.embedding_id,
          f.created_at,
          j.domain,
          j.status as job_status
        FROM enrichment_facts f
        JOIN enrichment_jobs j ON f.job_id = j.id
        WHERE j.domain = $1
        ORDER BY f.confidence_score DESC, f.created_at DESC
      `
      
      const result = await client.query(factsQuery, [domain])
      
      return NextResponse.json({
        facts: result.rows,
        total: result.rows.length
      })
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('Facts API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch facts' },
      { status: 500 }
    )
  }
}
