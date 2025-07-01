/**
 * Test script for the Unified Enrichment Orchestrator
 * 
 * This script tests the new multi-tiered enrichment system
 * to ensure all components work together properly.
 */

const { execSync } = require('child_process');

async function testUnifiedEnrichment() {
  console.log('🚀 Testing Unified Enrichment Orchestrator...\n');

  try {
    // Test 1: Create a new enrichment job
    console.log('📝 Test 1: Creating new enrichment job...');
    const createResponse = await fetch('http://localhost:3000/api/enrichment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain: 'example.com',
        llmUsed: 'gpt-4o-mini'
      })
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create job: ${createResponse.status} ${createResponse.statusText}`);
    }

    const createResult = await createResponse.json();
    console.log('✅ Job created successfully:', createResult.job.id);
    console.log(`   Domain: ${createResult.job.domain}`);
    console.log(`   Status: ${createResult.job.status}`);
    console.log(`   LLM: ${createResult.job.llm_used || 'default'}\n`);

    const jobId = createResult.job.id;

    // Wait a moment for the job to start processing
    console.log('⏳ Waiting for enrichment to complete...');
    await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds

    // Test 2: Check job status
    console.log('📊 Test 2: Checking job status...');
    const statusResponse = await fetch(`http://localhost:3000/api/enrichment/${jobId}`);
    
    if (!statusResponse.ok) {
      throw new Error(`Failed to get job status: ${statusResponse.status}`);
    }

    const statusResult = await statusResponse.json();
    console.log('✅ Job status retrieved:');
    console.log(`   Status: ${statusResult.job.status}`);
    console.log(`   Pages Crawled: ${statusResult.job.pages_crawled}`);
    console.log(`   Chunks Created: ${statusResult.job.chunks_created}`);
    console.log(`   Embeddings Generated: ${statusResult.job.embeddings_generated}`);
    console.log(`   Facts Extracted: ${statusResult.job.facts_extracted}`);
    console.log(`   Runtime: ${statusResult.job.total_runtime_seconds}s\n`);

    // Test 3: Get extracted facts
    console.log('🔍 Test 3: Retrieving extracted facts...');
    const factsResponse = await fetch(`http://localhost:3000/api/facts?jobId=${jobId}`);
    
    if (!factsResponse.ok) {
      throw new Error(`Failed to get facts: ${factsResponse.status}`);
    }

    const factsResult = await factsResponse.json();
    console.log('✅ Facts retrieved:');
    console.log(`   Total facts: ${factsResult.facts.length}`);
    
    if (factsResult.facts.length > 0) {
      console.log('   Sample facts:');
      factsResult.facts.slice(0, 3).forEach((fact, index) => {
        console.log(`   ${index + 1}. ${fact.fact_type}: ${JSON.stringify(fact.fact_data.value)}`);
        console.log(`      Confidence: ${fact.confidence_score.toFixed(3)}`);
        console.log(`      Tier: ${fact.tier_used || 'N/A'}`);
        console.log(`      Source: ${fact.source_url || 'N/A'}`);
      });
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📈 Summary:');
    console.log(`   Job ID: ${jobId}`);
    console.log(`   Final Status: ${statusResult.job.status}`);
    console.log(`   Total Facts: ${factsResult.facts.length}`);
    console.log(`   Processing Time: ${statusResult.job.total_runtime_seconds}s`);

    // Check if we have facts from multiple tiers
    const tierCounts = {};
    factsResult.facts.forEach(fact => {
      const tier = fact.tier_used || 'unknown';
      tierCounts[tier] = (tierCounts[tier] || 0) + 1;
    });

    console.log('\n🏆 Tier Distribution:');
    Object.entries(tierCounts).forEach(([tier, count]) => {
      console.log(`   Tier ${tier}: ${count} facts`);
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Check if the server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    if (!response.ok) {
      throw new Error('Server not responding');
    }
    console.log('✅ Server is running\n');
    return true;
  } catch (error) {
    console.log('❌ Server is not running. Please start the development server first:');
    console.log('   npm run dev\n');
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔧 Unified Enrichment System Test\n');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }

  await testUnifiedEnrichment();
}

// Run the test
main().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});
