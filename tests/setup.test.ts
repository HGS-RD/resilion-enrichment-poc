import { describe, it, expect } from 'vitest';
import { createMockJob, createMockFact } from './__fixtures__/test-data';
import { setupAllMocks, resetAllMocks } from './__mocks__/services';

describe('Test Infrastructure Setup', () => {
  it('should create mock jobs correctly', () => {
    const job = createMockJob({ domain: 'test.com' });
    
    expect(job).toBeDefined();
    expect(job.id).toMatch(/^test-job-/);
    expect(job.domain).toBe('test.com');
    expect(job.status).toBe('pending');
    expect(job.retry_count).toBe(0);
    expect(job.pages_crawled).toBe(0);
  });

  it('should create mock facts correctly', () => {
    const fact = createMockFact({ 
      fact_type: 'location',
      confidence_score: 0.95 
    });
    
    expect(fact).toBeDefined();
    expect(fact.id).toMatch(/^test-fact-/);
    expect(fact.fact_type).toBe('location');
    expect(fact.confidence_score).toBe(0.95);
    expect(fact.validated).toBe(false);
  });

  it('should setup and reset mocks correctly', () => {
    setupAllMocks();
    
    // Verify mocks are set up
    expect(global.fetch).toBeDefined();
    expect(global.testUtils).toBeDefined();
    expect(global.testUtils.mockFetch).toBeTypeOf('function');
    expect(global.testUtils.mockFetchError).toBeTypeOf('function');
    
    resetAllMocks();
    
    // Mocks should still exist but be reset
    expect(global.fetch).toBeDefined();
  });

  it('should have proper environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.DATABASE_URL).toBeDefined();
    expect(process.env.PINECONE_API_KEY).toBeDefined();
    expect(process.env.OPENAI_API_KEY).toBeDefined();
  });

  it('should have test utilities available', () => {
    // Test the mock fetch utility
    global.testUtils.mockFetch({ success: true }, 200);
    
    expect(global.fetch).toHaveBeenCalledTimes(0); // Not called yet
    
    // Test mock fetch error utility
    global.testUtils.mockFetchError('Network error');
    
    expect(global.fetch).toBeDefined();
  });
});
