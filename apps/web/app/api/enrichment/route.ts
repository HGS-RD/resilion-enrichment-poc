import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(request: NextRequest) {
  try {
    const { domain } = await request.json();

    // Validate domain input
    if (!domain || typeof domain !== 'string') {
      return NextResponse.json(
        { error: 'Domain is required and must be a string' },
        { status: 400 }
      );
    }

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: 'Invalid domain format' },
        { status: 400 }
      );
    }

    // Check for existing active job (idempotency)
    const existingJobQuery = `
      SELECT id, status, created_at 
      FROM enrichment_jobs 
      WHERE domain = $1 
        AND status IN ('pending', 'running') 
        AND created_at > NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const existingJobResult = await pool.query(existingJobQuery, [domain]);
    
    if (existingJobResult.rows.length > 0) {
      const existingJob = existingJobResult.rows[0];
      return NextResponse.json({
        message: 'Job already exists for this domain',
        job: {
          id: existingJob.id,
          domain,
          status: existingJob.status,
          created_at: existingJob.created_at
        }
      }, { status: 200 });
    }

    // Create new enrichment job
    const insertJobQuery = `
      INSERT INTO enrichment_jobs (domain, status, metadata)
      VALUES ($1, 'pending', $2)
      RETURNING id, domain, status, created_at, crawling_status, chunking_status, embedding_status, extraction_status
    `;

    const metadata = {
      source: 'api',
      user_agent: request.headers.get('user-agent') || 'unknown',
      ip_address: request.headers.get('x-forwarded-for') || 'unknown'
    };

    const result = await pool.query(insertJobQuery, [domain, JSON.stringify(metadata)]);
    const newJob = result.rows[0];

    // Log job creation
    const logQuery = `
      INSERT INTO job_logs (job_id, level, message, details)
      VALUES ($1, 'info', 'Enrichment job created', $2)
    `;
    
    await pool.query(logQuery, [
      newJob.id, 
      JSON.stringify({ domain, created_via: 'api' })
    ]);

    return NextResponse.json({
      message: 'Enrichment job created successfully',
      job: {
        id: newJob.id,
        domain: newJob.domain,
        status: newJob.status,
        created_at: newJob.created_at,
        workflow_status: {
          crawling: newJob.crawling_status,
          chunking: newJob.chunking_status,
          embedding: newJob.embedding_status,
          extraction: newJob.extraction_status
        }
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating enrichment job:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to create enrichment job'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('id');
    const domain = searchParams.get('domain');

    if (jobId) {
      // Get specific job by ID
      const jobQuery = `
        SELECT 
          id, domain, status, created_at, updated_at, started_at, completed_at,
          error_message, retry_count, metadata,
          crawling_status, chunking_status, embedding_status, extraction_status,
          pages_crawled, chunks_created, embeddings_generated, facts_extracted
        FROM enrichment_jobs 
        WHERE id = $1
      `;
      
      const result = await pool.query(jobQuery, [jobId]);
      
      if (result.rows.length === 0) {
        return NextResponse.json(
          { error: 'Job not found' },
          { status: 404 }
        );
      }

      const job = result.rows[0];
      return NextResponse.json({
        job: {
          ...job,
          workflow_status: {
            crawling: job.crawling_status,
            chunking: job.chunking_status,
            embedding: job.embedding_status,
            extraction: job.extraction_status
          }
        }
      });

    } else if (domain) {
      // Get jobs for specific domain
      const jobsQuery = `
        SELECT 
          id, domain, status, created_at, updated_at,
          crawling_status, chunking_status, embedding_status, extraction_status,
          pages_crawled, chunks_created, embeddings_generated, facts_extracted
        FROM enrichment_jobs 
        WHERE domain = $1
        ORDER BY created_at DESC
        LIMIT 10
      `;
      
      const result = await pool.query(jobsQuery, [domain]);
      
      return NextResponse.json({
        jobs: result.rows.map(job => ({
          ...job,
          workflow_status: {
            crawling: job.crawling_status,
            chunking: job.chunking_status,
            embedding: job.embedding_status,
            extraction: job.extraction_status
          }
        }))
      });

    } else {
      // Get all recent jobs
      const jobsQuery = `
        SELECT 
          id, domain, status, created_at, updated_at,
          crawling_status, chunking_status, embedding_status, extraction_status,
          pages_crawled, chunks_created, embeddings_generated, facts_extracted
        FROM enrichment_jobs 
        ORDER BY created_at DESC
        LIMIT 50
      `;
      
      const result = await pool.query(jobsQuery);
      
      return NextResponse.json({
        jobs: result.rows.map(job => ({
          ...job,
          workflow_status: {
            crawling: job.crawling_status,
            chunking: job.chunking_status,
            embedding: job.embedding_status,
            extraction: job.extraction_status
          }
        }))
      });
    }

  } catch (error) {
    console.error('Error fetching enrichment jobs:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to fetch enrichment jobs'
      },
      { status: 500 }
    );
  }
}
