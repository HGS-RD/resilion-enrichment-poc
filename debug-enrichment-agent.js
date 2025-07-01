const { JobRepository } = require('./apps/web/lib/repositories/job-repository');
const { EnrichmentAgent } = require('./apps/web/lib/services/enrichment-agent');

async function testEnrichmentAgent() {
  try {
    console.log('Starting enrichment agent test...');
    
    const jobRepository = new JobRepository();
    
    // Get the most recent job
    const jobs = await jobRepository.findRecent(1);
    if (jobs.length === 0) {
      console.log('No jobs found');
      return;
    }
    
    const job = jobs[0];
    console.log(`Testing job: ${job.id} (${job.domain}) - Status: ${job.status}`);
    
    if (job.status !== 'running') {
      console.log('Job is not in running status, updating to running...');
      await jobRepository.updateStatus(job.id, 'running');
    }
    
    // Create enrichment agent
    const enrichmentAgent = new EnrichmentAgent(jobRepository);
    
    console.log('Starting enrichment process...');
    const result = await enrichmentAgent.processJob(job.id);
    
    console.log('Enrichment result:', result);
    
    // Check final job status
    const finalJob = await jobRepository.findById(job.id);
    console.log('Final job status:', {
      status: finalJob.status,
      crawling_status: finalJob.crawling_status,
      chunking_status: finalJob.chunking_status,
      embedding_status: finalJob.embedding_status,
      extraction_status: finalJob.extraction_status,
      pages_crawled: finalJob.pages_crawled,
      chunks_created: finalJob.chunks_created,
      embeddings_generated: finalJob.embeddings_generated,
      facts_extracted: finalJob.facts_extracted
    });
    
  } catch (error) {
    console.error('Error in enrichment test:', error);
  }
}

testEnrichmentAgent();
