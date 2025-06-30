import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const factId = id
    
    if (!factId) {
      return NextResponse.json({ error: 'Fact ID is required' }, { status: 400 })
    }

    const client = await pool.connect()
    
    try {
      // Update fact status to rejected
      const updateQuery = `
        UPDATE enrichment_facts 
        SET 
          status = 'rejected'
        WHERE id = $1
        RETURNING *
      `
      
      const result = await client.query(updateQuery, [factId])
      
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Fact not found' }, { status: 404 })
      }
      
      return NextResponse.json({
        success: true,
        fact: result.rows[0]
      })
      
    } finally {
      client.release()
    }
    
  } catch (error) {
    console.error('Reject fact API error:', error)
    return NextResponse.json(
      { error: 'Failed to reject fact' },
      { status: 500 }
    )
  }
}
