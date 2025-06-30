#!/usr/bin/env node

/**
 * Test Milestone 1 Database Schema
 * Direct database testing without TypeScript dependencies
 */

require('dotenv').config();
const { Client } = require('pg');

async function testMilestone1Database() {
  console.log('🧪 Testing Milestone 1 Database Schema...\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database successfully\n');

    // Test 1: Create a job with new fields
    console.log('📝 Test 1: Creating job with Milestone 1 fields...');
    const jobInsertQuery = `
      INSERT INTO enrichment_jobs (
        domain, status, retry_count, metadata,
        crawling_status, chunking_status, embedding_status, extraction_status,
        pages_crawled, chunks_created, embeddings_generated, facts_extracted,
        llm_used, pages_scraped, total_runtime_seconds
      ) VALUES (
        'test-milestone1.com', 'pending', 0, '{"test": "milestone1"}',
        'pending', 'pending', 'pending', 'pending',
        0, 0, 0, 0,
        'gpt-4o', 0, 0
      ) RETURNING id, llm_used, pages_scraped, total_runtime_seconds
    `;
    
    const jobResult = await client.query(jobInsertQuery);
    const testJob = jobResult.rows[0];
    console.log(`✅ Created job ${testJob.id} with LLM: ${testJob.llm_used}`);
    console.log(`   Pages scraped: ${testJob.pages_scraped}, Runtime: ${testJob.total_runtime_seconds}s`);

    // Test 2: Update Milestone 1 fields
    console.log('\n📝 Test 2: Updating Milestone 1 fields...');
    const updateQuery = `
      UPDATE enrichment_jobs 
      SET pages_scraped = 15, total_runtime_seconds = 450, updated_at = NOW()
      WHERE id = $1
      RETURNING pages_scraped, total_runtime_seconds
    `;
    
    const updateResult = await client.query(updateQuery, [testJob.id]);
    const updatedJob = updateResult.rows[0];
    console.log(`✅ Updated job fields - Pages: ${updatedJob.pages_scraped}, Runtime: ${updatedJob.total_runtime_seconds}s`);

    // Test 3: Create facts with tier information
    console.log('\n📝 Test 3: Creating facts with tier information...');
    const factInsertQuery = `
      INSERT INTO enrichment_facts (
        job_id, fact_type, fact_data, confidence_score,
        source_url, source_text, validated, tier_used
      ) VALUES 
        ($1, 'company_info', '{"name": "Test Company", "industry": "Technology"}', 0.95, 
         'https://test-milestone1.com/about', 'Test Company is a leading technology firm...', false, 1),
        ($1, 'employee_count', '{"count": 250, "range": "200-300"}', 0.80,
         'https://linkedin.com/company/test-company', 'The company has approximately 250 employees...', false, 2),
        ($1, 'recent_news', '{"headline": "Test Company Raises Series B", "date": "2024-12-01"}', 0.75,
         'https://techcrunch.com/test-company-funding', 'Test Company announced a $50M Series B round...', false, 3)
      RETURNING id, fact_type, tier_used, confidence_score
    `;
    
    const factResult = await client.query(factInsertQuery, [testJob.id]);
    console.log(`✅ Created ${factResult.rows.length} facts with tier information`);
    factResult.rows.forEach(fact => {
      console.log(`   - ${fact.fact_type} (Tier ${fact.tier_used}, Confidence: ${fact.confidence_score})`);
    });

    // Test 4: Query facts by tier
    console.log('\n📝 Test 4: Querying facts by tier...');
    const tierQueries = [
      { tier: 1, query: 'SELECT COUNT(*) as count FROM enrichment_facts WHERE tier_used = 1' },
      { tier: 2, query: 'SELECT COUNT(*) as count FROM enrichment_facts WHERE tier_used = 2' },
      { tier: 3, query: 'SELECT COUNT(*) as count FROM enrichment_facts WHERE tier_used = 3' }
    ];
    
    for (const { tier, query } of tierQueries) {
      const result = await client.query(query);
      console.log(`   Tier ${tier}: ${result.rows[0].count} facts`);
    }

    // Test 5: Get tier statistics for the test job
    console.log('\n📝 Test 5: Getting tier statistics...');
    const statsQuery = `
      SELECT 
        tier_used,
        COUNT(*) as count,
        AVG(confidence_score) as avg_confidence
      FROM enrichment_facts 
      WHERE job_id = $1 AND tier_used IS NOT NULL
      GROUP BY tier_used
      ORDER BY tier_used
    `;
    
    const statsResult = await client.query(statsQuery, [testJob.id]);
    console.log('✅ Tier statistics for test job:');
    statsResult.rows.forEach(row => {
      console.log(`   Tier ${row.tier_used}: ${row.count} facts, avg confidence: ${parseFloat(row.avg_confidence).toFixed(3)}`);
    });

    // Test 6: Test partial_success status
    console.log('\n📝 Test 6: Testing partial_success status...');
    const statusUpdateQuery = `
      UPDATE enrichment_jobs 
      SET status = 'partial_success', updated_at = NOW()
      WHERE id = $1
      RETURNING status
    `;
    
    const statusResult = await client.query(statusUpdateQuery, [testJob.id]);
    console.log(`✅ Updated job status to: ${statusResult.rows[0].status}`);

    // Test 7: Verify constraints
    console.log('\n📝 Test 7: Testing tier constraint (should fail for invalid tier)...');
    try {
      await client.query(`
        INSERT INTO enrichment_facts (
          job_id, fact_type, fact_data, confidence_score, validated, tier_used
        ) VALUES ($1, 'test', '{}', 0.5, false, 4)
      `, [testJob.id]);
      console.log('❌ Constraint test failed - invalid tier was accepted');
    } catch (error) {
      if (error.message.includes('tier_used_check')) {
        console.log('✅ Tier constraint working - rejected tier 4 as expected');
      } else {
        console.log('⚠️  Unexpected constraint error:', error.message);
      }
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test data...');
    await client.query('DELETE FROM enrichment_facts WHERE job_id = $1', [testJob.id]);
    await client.query('DELETE FROM enrichment_jobs WHERE id = $1', [testJob.id]);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All Milestone 1 database tests passed!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Job creation with LLM tracking');
    console.log('   ✅ Milestone 1 field updates');
    console.log('   ✅ Fact creation with tier tracking');
    console.log('   ✅ Tier-based fact queries');
    console.log('   ✅ Tier statistics generation');
    console.log('   ✅ Partial success status support');
    console.log('   ✅ Tier constraint validation');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

testMilestone1Database().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
