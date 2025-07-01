/**
 * Direct test of the Unified Enrichment Orchestrator
 * 
 * This script tests the orchestrator directly without needing the web server
 */

const path = require('path');

// Mock the database and dependencies
const mockJobRepository = {
  updateJob: async (id, updates) => {
    console.log(`📝 Job ${id} updated:`, updates);
    return { id, ...updates };
  },
  getJobById: async (id) => {
    return {
      id,
      domain: 'example.com',
      status: 'running',
      llm_used: 'gpt-4o-mini'
    };
  }
};

const mockFactRepository = {
  createFacts: async (facts) => {
    console.log(`💾 Storing ${facts.length} facts:`, facts.map(f => f.fact_type));
    return facts;
  }
};

async function testOrchestrator() {
  console.log('🧪 Testing Unified Enrichment Orchestrator directly...\n');

  try {
    // Import the orchestrator (we'll need to handle ES modules)
    const { UnifiedEnrichmentOrchestrator } = await import('./apps/web/lib/services/unified-enrichment-orchestrator.ts');
    
    // Create orchestrator instance
    const orchestrator = new UnifiedEnrichmentOrchestrator(
      mockJobRepository,
      mockFactRepository
    );

    console.log('✅ Orchestrator created successfully');
    console.log('📊 Orchestrator capabilities:', orchestrator.getCapabilities());

    // Create test context
    const testContext = {
      job: {
        id: 'test-job-123',
        domain: 'example.com',
        status: 'running',
        llm_used: 'gpt-4o-mini'
      },
      extracted_facts: [],
      step_results: {}
    };

    console.log('\n🚀 Starting enrichment process...');
    
    // Execute enrichment
    const result = await orchestrator.execute(testContext);
    
    console.log('\n✅ Enrichment completed!');
    console.log('📈 Results summary:');
    console.log(`   - Status: ${result.error ? 'Failed' : 'Success'}`);
    console.log(`   - Facts extracted: ${result.extracted_facts?.length || 0}`);
    console.log(`   - Tiers processed: ${Object.keys(result.step_results || {}).length}`);
    
    if (result.extracted_facts && result.extracted_facts.length > 0) {
      console.log('\n🔍 Sample facts:');
      result.extracted_facts.slice(0, 3).forEach((fact, index) => {
        console.log(`   ${index + 1}. ${fact.fact_type}: ${JSON.stringify(fact.fact_data.value)}`);
        console.log(`      Tier: ${fact.tier_used}, Confidence: ${fact.confidence_score.toFixed(3)}`);
      });
    }

    if (result.error) {
      console.log('\n❌ Error occurred:', result.error.message);
    }

    console.log('\n🎉 Direct orchestrator test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testOrchestrator().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
