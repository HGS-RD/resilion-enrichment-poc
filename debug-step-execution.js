const { Pool } = require('pg');

async function debugStepExecution() {
  try {
    // Load environment variables
    require('dotenv').config({ path: './apps/web/.env' });
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Get the latest job
    const result = await pool.query('SELECT * FROM enrichment_jobs ORDER BY created_at DESC LIMIT 1');
    
    if (result.rows.length === 0) {
      console.log('No jobs found');
      return;
    }
    
    const job = result.rows[0];
    console.log('Job status:');
    console.log(`ID: ${job.id}`);
    console.log(`Domain: ${job.domain}`);
    console.log(`Status: ${job.status}`);
    console.log(`crawling_status: ${job.crawling_status}`);
    console.log(`chunking_status: ${job.chunking_status}`);
    console.log(`embedding_status: ${job.embedding_status}`);
    console.log(`extraction_status: ${job.extraction_status}`);
    
    // Create a mock context to test step canHandle methods
    const context = {
      job: job,
      crawled_pages: [],
      text_chunks: [],
      embeddings: [],
      extracted_facts: [],
      step_results: {}
    };
    
    console.log('\nTesting step canHandle methods:');
    
    // Test WebCrawlerStep canHandle
    const webCrawlerCanHandle = !!(
      context.job && 
      (context.job.crawling_status === undefined || 
       context.job.crawling_status === null || 
       context.job.crawling_status === 'pending' || 
       context.job.crawling_status === 'failed')
    );
    console.log(`WebCrawlerStep.canHandle: ${webCrawlerCanHandle}`);
    
    // Test TextChunkingStep canHandle
    const textChunkingCanHandle = !!(
      context.job && 
      context.job.crawling_status === 'completed' &&
      (context.job.chunking_status === undefined || 
       context.job.chunking_status === null || 
       context.job.chunking_status === 'pending' || 
       context.job.chunking_status === 'failed') &&
      context.crawled_pages &&
      context.crawled_pages.length > 0
    );
    console.log(`TextChunkingStep.canHandle: ${textChunkingCanHandle}`);
    
    // Test FactExtractionStep canHandle
    const factExtractionCanHandle = !!(
      context.job && 
      context.job.chunking_status === 'completed' &&
      (context.job.extraction_status === undefined || 
       context.job.extraction_status === null || 
       context.job.extraction_status === 'pending' || 
       context.job.extraction_status === 'failed') &&
      context.text_chunks &&
      context.text_chunks.length > 0
    );
    console.log(`FactExtractionStep.canHandle: ${factExtractionCanHandle}`);
    
    await pool.end();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugStepExecution();
