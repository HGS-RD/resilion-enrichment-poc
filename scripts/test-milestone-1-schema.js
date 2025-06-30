#!/usr/bin/env node

/**
 * Test Milestone 1 Schema Changes
 * Verifies that the new database fields and repository methods work correctly
 */

require('dotenv').config();
const { JobRepository } = require('../apps/web/lib/repositories/job-repository');
const { FactRepository } = require('../apps/web/lib/repositories/fact-repository');

async function testMilestone1Schema() {
  console.log('🧪 Testing Milestone 1 Schema Changes...\n');

  const jobRepo = new JobRepository();
  const factRepo = new FactRepository();

  try {
    // Test 1: Create a job with LLM specified
    console.log('📝 Test 1: Creating job with LLM specified...');
    const testJob = await jobRepo.create(
      'test-milestone1.com',
      { test: 'milestone1' },
      'gpt-4o'
    );
    console.log(`✅ Created job ${testJob.id} with LLM: ${testJob.llm_used}`);
    console.log(`   Pages scraped: ${testJob.pages_scraped}, Runtime: ${testJob.total_runtime_seconds}s`);

    // Test 2: Update Milestone 1 fields
    console.log('\n📝 Test 2: Updating Milestone 1 fields...');
    await jobRepo.updateMilestone1Fields(testJob.id, {
      pages_scraped: 15,
      total_runtime_seconds: 450
    });
    
    const updatedJob = await jobRepo.findById(testJob.id);
    console.log(`✅ Updated job fields - Pages: ${updatedJob.pages_scraped}, Runtime: ${updatedJob.total_runtime_seconds}s`);

    // Test 3: Create facts with tier information
    console.log('\n📝 Test 3: Creating facts with tier information...');
    const testFacts = [
      {
        job_id: testJob.id,
        fact_type: 'company_info',
        fact_data: { name: 'Test Company', industry: 'Technology' },
        confidence_score: 0.95,
        source_url: 'https://test-milestone1.com/about',
        source_text: 'Test Company is a leading technology firm...',
        validated: false,
        tier_used: 1
      },
      {
        job_id: testJob.id,
        fact_type: 'employee_count',
        fact_data: { count: 250, range: '200-300' },
        confidence_score: 0.80,
        source_url: 'https://linkedin.com/company/test-company',
        source_text: 'The company has approximately 250 employees...',
        validated: false,
        tier_used: 2
      },
      {
        job_id: testJob.id,
        fact_type: 'recent_news',
        fact_data: { headline: 'Test Company Raises Series B', date: '2024-12-01' },
        confidence_score: 0.75,
        source_url: 'https://techcrunch.com/test-company-funding',
        source_text: 'Test Company announced a $50M Series B round...',
        validated: false,
        tier_used: 3
      }
    ];

    const createdFacts = await factRepo.createBatch(testFacts);
    console.log(`✅ Created ${createdFacts.length} facts with tier information`);
    createdFacts.forEach(fact => {
      console.log(`   - ${fact.fact_type} (Tier ${fact.tier_used}, Confidence: ${fact.confidence_score})`);
    });

    // Test 4: Query facts by tier
    console.log('\n📝 Test 4: Querying facts by tier...');
    const tier1Facts = await factRepo.findByTier(1);
    const tier2Facts = await factRepo.findByTier(2);
    const tier3Facts = await factRepo.findByTier(3);
    console.log(`✅ Found facts by tier - Tier 1: ${tier1Facts.length}, Tier 2: ${tier2Facts.length}, Tier 3: ${tier3Facts.length}`);

    // Test 5: Get tier statistics
    console.log('\n📝 Test 5: Getting tier statistics...');
    const tierStats = await factRepo.getTierStatistics(testJob.id);
    console.log('✅ Tier statistics:');
    console.log('   Distribution:', tierStats.tier_distribution);
    console.log('   Confidence:', tierStats.tier_confidence);

    // Test 6: Update job status to partial_success
    console.log('\n📝 Test 6: Testing partial_success status...');
    await jobRepo.updateStatus(testJob.id, 'partial_success');
    const finalJob = await jobRepo.findById(testJob.id);
    console.log(`✅ Updated job status to: ${finalJob.status}`);

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await jobRepo.deleteJob(testJob.id);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All Milestone 1 schema tests passed!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Job creation with LLM tracking');
    console.log('   ✅ Milestone 1 field updates');
    console.log('   ✅ Fact creation with tier tracking');
    console.log('   ✅ Tier-based fact queries');
    console.log('   ✅ Tier statistics generation');
    console.log('   ✅ Partial success status support');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await jobRepo.close();
    await factRepo.close();
  }
}

testMilestone1Schema().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
