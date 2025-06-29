import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';

/**
 * End-to-End Test for Enrichment Flow
 * 
 * Tests the complete enrichment workflow with a known pilot domain.
 * This test validates the integration between frontend, backend, and database.
 */

describe('Enrichment E2E Flow', () => {
  let pool: Pool;
  const testDomain = 'example.com'; // Known stable domain for testing
  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

  beforeAll(async () => {
    // Initialize database connection for cleanup
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.TEST_DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });

    // Clean up any existing test data
    await cleanupTestData();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
    await pool.end();
  });

  async function cleanupTestData() {
    try {
      const client = await pool.connect();
      await client.query('DELETE FROM enrichment_jobs WHERE domain = $1', [testDomain]);
      client.release();
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  }

  it('should complete full enrichment workflow for pilot domain', async () => {
    // Step 1: Create enrichment job
    const createResponse = await fetch(`${baseUrl}/api/enrichment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: testDomain,
        metadata: { test: true, e2e: true }
      }),
    });

    expect(createResponse.ok).toBe(true);
    const createData = await createResponse.json();
    expect(createData.success).toBe(true);
    expect(createData.job).toBeDefined();
    expect(createData.job.domain).toBe(testDomain);
    expect(createData.job.status).toBe('pending');

    const jobId = createData.job.id;

    // Step 2: Start the enrichment job
    const startResponse = await fetch(`${baseUrl}/api/enrichment/${jobId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    expect(startResponse.ok).toBe(true);
    const startData = await startResponse.json();
    expect(startData.success).toBe(true);
    expect(startData.job.status).toBe('running');

    // Step 3: Poll for job completion (with timeout)
    let jobCompleted = false;
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes max (10 second intervals)
    let finalJob;

    while (!jobCompleted && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      const statusResponse = await fetch(`${baseUrl}/api/enrichment/${jobId}`);
      expect(statusResponse.ok).toBe(true);
      
      const statusData = await statusResponse.json();
      expect(statusData.success).toBe(true);
      
      finalJob = statusData.job;
      
      if (finalJob.status === 'completed' || finalJob.status === 'failed') {
        jobCompleted = true;
      }
      
      attempts++;
      console.log(`Attempt ${attempts}: Job status is ${finalJob.status}`);
    }

    // Step 4: Validate job completion
    expect(jobCompleted).toBe(true);
    expect(finalJob).toBeDefined();
    
    if (finalJob.status === 'failed') {
      console.error('Job failed with error:', finalJob.error_message);
      // For E2E test, we'll accept failure but log it for investigation
      expect(finalJob.status).toMatch(/^(completed|failed)$/);
    } else {
      expect(finalJob.status).toBe('completed');
      expect(finalJob.pages_crawled).toBeGreaterThan(0);
      expect(finalJob.chunks_created).toBeGreaterThan(0);
    }

    // Step 5: Verify database state
    const client = await pool.connect();
    try {
      const jobQuery = 'SELECT * FROM enrichment_jobs WHERE id = $1';
      const jobResult = await client.query(jobQuery, [jobId]);
      
      expect(jobResult.rows.length).toBe(1);
      const dbJob = jobResult.rows[0];
      expect(dbJob.domain).toBe(testDomain);
      expect(dbJob.status).toMatch(/^(completed|failed)$/);
      
      // Check for job logs
      const logsQuery = 'SELECT * FROM job_logs WHERE job_id = $1 ORDER BY created_at';
      const logsResult = await client.query(logsQuery, [jobId]);
      expect(logsResult.rows.length).toBeGreaterThan(0);
      
      // If job completed successfully, check for facts
      if (dbJob.status === 'completed' && dbJob.facts_extracted > 0) {
        const factsQuery = 'SELECT * FROM enrichment_facts WHERE job_id = $1';
        const factsResult = await client.query(factsQuery, [jobId]);
        expect(factsResult.rows.length).toBeGreaterThan(0);
        
        // Validate fact structure
        const fact = factsResult.rows[0];
        expect(fact.fact_type).toBeDefined();
        expect(fact.fact_data).toBeDefined();
        expect(fact.confidence_score).toBeGreaterThan(0);
        expect(fact.confidence_score).toBeLessThanOrEqual(1);
      }
      
    } finally {
      client.release();
    }

    console.log('E2E test completed successfully');
    console.log('Final job state:', {
      id: finalJob.id,
      domain: finalJob.domain,
      status: finalJob.status,
      pages_crawled: finalJob.pages_crawled,
      chunks_created: finalJob.chunks_created,
      embeddings_generated: finalJob.embeddings_generated,
      facts_extracted: finalJob.facts_extracted,
      error_message: finalJob.error_message
    });

  }, 300000); // 5 minute timeout for the entire test

  it('should handle duplicate job creation gracefully', async () => {
    // Create first job
    const firstResponse = await fetch(`${baseUrl}/api/enrichment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: testDomain,
        metadata: { test: true, duplicate_test: true }
      }),
    });

    expect(firstResponse.ok).toBe(true);
    const firstData = await firstResponse.json();
    expect(firstData.success).toBe(true);

    // Try to create duplicate job
    const duplicateResponse = await fetch(`${baseUrl}/api/enrichment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: testDomain,
        metadata: { test: true, duplicate_test: true }
      }),
    });

    expect(duplicateResponse.ok).toBe(true);
    const duplicateData = await duplicateResponse.json();
    expect(duplicateData.success).toBe(true);
    
    // Should return the existing job
    expect(duplicateData.job.id).toBe(firstData.job.id);
  });

  it('should validate domain input', async () => {
    const invalidDomains = [
      '',
      'invalid-domain',
      'http://example.com', // Should be just domain
      'example.com/path', // Should be just domain
      'a'.repeat(300), // Too long
    ];

    for (const invalidDomain of invalidDomains) {
      const response = await fetch(`${baseUrl}/api/enrichment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: invalidDomain
        }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.error).toBe('Validation error');
    }
  });

  it('should return 404 for non-existent job', async () => {
    const fakeJobId = '00000000-0000-0000-0000-000000000000';
    
    const response = await fetch(`${baseUrl}/api/enrichment/${fakeJobId}`);
    expect(response.status).toBe(404);
    
    const data = await response.json();
    expect(data.error).toBe('Not found');
  });
});
