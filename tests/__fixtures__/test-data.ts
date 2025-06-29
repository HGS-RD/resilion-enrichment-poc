import { EnrichmentJob, EnrichmentFact, JobStatus, StepStatus } from '../../apps/web/lib/types/enrichment';

export const mockDomains = {
  valid: [
    'example.com',
    'test-company.org',
    'manufacturing-corp.net',
    'acme-industries.com'
  ],
  invalid: [
    'invalid-domain',
    'localhost',
    '192.168.1.1',
    'not-a-domain',
    ''
  ],
  edge_cases: [
    'very-long-domain-name-that-exceeds-normal-limits-and-tests-validation.com',
    'sub.domain.example.com',
    'domain-with-hyphens.com'
  ]
};

export const mockCrawledContent = {
  typical: `
    <html>
      <head><title>Acme Manufacturing</title></head>
      <body>
        <h1>About Acme Manufacturing</h1>
        <p>We are a leading manufacturer of industrial components.</p>
        <div class="contact">
          <p>Location: 123 Industrial Blvd, Detroit, MI 48201</p>
          <p>Phone: (555) 123-4567</p>
        </div>
      </body>
    </html>
  `,
  large: 'A'.repeat(100000), // 100KB of content
  empty: '<html><head></head><body></body></html>',
  malformed: '<html><head><title>Test</title><body><p>Unclosed paragraph</body></html>',
  javascript_heavy: `
    <html>
      <head><title>Dynamic Content</title></head>
      <body>
        <div id="content">Loading...</div>
        <script>
          document.getElementById('content').innerHTML = 'Dynamically loaded content about manufacturing';
        </script>
      </body>
    </html>
  `
};

export const mockTextChunks = [
  {
    id: 'chunk-1',
    text: 'Acme Manufacturing is a leading manufacturer of industrial components.',
    source: 'about-page',
    metadata: {
      page_title: 'About Us',
      url: 'https://example.com/about'
    }
  },
  {
    id: 'chunk-2',
    text: 'Our facility is located at 123 Industrial Blvd, Detroit, MI 48201.',
    source: 'contact-page',
    metadata: {
      page_title: 'Contact',
      url: 'https://example.com/contact'
    }
  }
];

export const mockEmbeddings = [
  {
    id: 'chunk-1',
    values: new Array(1536).fill(0).map(() => Math.random() - 0.5),
    metadata: {
      text: 'Acme Manufacturing is a leading manufacturer of industrial components.',
      source: 'about-page',
      job_id: 'job-123'
    }
  }
];

export const mockEnrichmentJobs: Partial<EnrichmentJob>[] = [
  {
    id: 'job-123',
    domain: 'example.com',
    status: 'pending',
    created_at: '2025-06-29T10:00:00Z',
    updated_at: '2025-06-29T10:00:00Z',
    retry_count: 0,
    metadata: {},
    crawling_status: 'pending',
    chunking_status: 'pending',
    embedding_status: 'pending',
    extraction_status: 'pending',
    pages_crawled: 0,
    chunks_created: 0,
    embeddings_generated: 0,
    facts_extracted: 0
  },
  {
    id: 'job-456',
    domain: 'test-company.org',
    status: 'running',
    created_at: '2025-06-29T09:30:00Z',
    updated_at: '2025-06-29T10:15:00Z',
    started_at: '2025-06-29T09:30:00Z',
    retry_count: 0,
    metadata: {},
    crawling_status: 'completed',
    chunking_status: 'running',
    embedding_status: 'pending',
    extraction_status: 'pending',
    pages_crawled: 5,
    chunks_created: 0,
    embeddings_generated: 0,
    facts_extracted: 0
  },
  {
    id: 'job-789',
    domain: 'manufacturing-corp.net',
    status: 'completed',
    created_at: '2025-06-29T08:00:00Z',
    updated_at: '2025-06-29T09:45:00Z',
    started_at: '2025-06-29T08:00:00Z',
    completed_at: '2025-06-29T09:45:00Z',
    retry_count: 0,
    metadata: {},
    crawling_status: 'completed',
    chunking_status: 'completed',
    embedding_status: 'completed',
    extraction_status: 'completed',
    pages_crawled: 12,
    chunks_created: 45,
    embeddings_generated: 45,
    facts_extracted: 8
  },
  {
    id: 'job-error',
    domain: 'failed-domain.com',
    status: 'failed',
    created_at: '2025-06-29T07:00:00Z',
    updated_at: '2025-06-29T07:30:00Z',
    started_at: '2025-06-29T07:00:00Z',
    error_message: 'Failed to crawl domain: Connection timeout',
    retry_count: 1,
    metadata: {},
    crawling_status: 'failed',
    chunking_status: 'pending',
    embedding_status: 'pending',
    extraction_status: 'pending',
    pages_crawled: 0,
    chunks_created: 0,
    embeddings_generated: 0,
    facts_extracted: 0
  }
];

export const mockEnrichmentFacts: Partial<EnrichmentFact>[] = [
  {
    id: 'fact-1',
    job_id: 'job-789',
    fact_type: 'company_info',
    fact_data: {
      category: 'basic_info',
      value: 'Manufacturing Corp Inc.'
    },
    confidence_score: 0.95,
    source_url: 'https://manufacturing-corp.net/about',
    source_text: 'Manufacturing Corp Inc. is a leading manufacturer...',
    embedding_id: 'chunk-1',
    created_at: '2025-06-29T09:30:00Z',
    validated: false
  },
  {
    id: 'fact-2',
    job_id: 'job-789',
    fact_type: 'location',
    fact_data: {
      category: 'contact_info',
      value: '456 Manufacturing Way, Cleveland, OH 44101'
    },
    confidence_score: 0.88,
    source_url: 'https://manufacturing-corp.net/contact',
    source_text: 'Our facility is located at 456 Manufacturing Way...',
    embedding_id: 'chunk-2',
    created_at: '2025-06-29T09:32:00Z',
    validated: false
  },
  {
    id: 'fact-3',
    job_id: 'job-789',
    fact_type: 'industry',
    fact_data: {
      category: 'business_info',
      value: 'Industrial Manufacturing'
    },
    confidence_score: 0.92,
    source_url: 'https://manufacturing-corp.net/about',
    source_text: 'We specialize in industrial manufacturing...',
    embedding_id: 'chunk-1',
    created_at: '2025-06-29T09:35:00Z',
    validated: true
  },
  {
    id: 'fact-low-confidence',
    job_id: 'job-789',
    fact_type: 'employee_count',
    fact_data: {
      category: 'business_info',
      value: 'Approximately 50-100 employees'
    },
    confidence_score: 0.45,
    source_url: 'https://manufacturing-corp.net/careers',
    source_text: 'Join our growing team of professionals...',
    embedding_id: 'chunk-3',
    created_at: '2025-06-29T09:40:00Z',
    validated: false
  }
];

export const mockApiResponses = {
  createJob: {
    success: {
      id: 'job-new-123',
      domain: 'example.com',
      status: 'pending',
      created_at: new Date().toISOString()
    },
    duplicate: {
      id: 'job-existing-456',
      domain: 'example.com',
      status: 'running',
      message: 'Job already exists for this domain'
    },
    error: {
      error: 'Invalid domain format',
      message: 'Domain must be a valid hostname'
    }
  },
  jobStatus: {
    pending: mockEnrichmentJobs[0],
    running: mockEnrichmentJobs[1],
    completed: mockEnrichmentJobs[2],
    failed: mockEnrichmentJobs[3]
  }
};

export const mockDatabaseResponses = {
  insertJob: {
    success: mockEnrichmentJobs[0],
    error: new Error('Database connection failed')
  },
  updateJobStatus: {
    success: { ...mockEnrichmentJobs[1], status: 'completed' as const },
    error: new Error('Job not found')
  },
  insertFacts: {
    success: mockEnrichmentFacts.slice(0, 3),
    error: new Error('Failed to insert facts')
  }
};

// Test utilities for creating mock data
export const createMockJob = (overrides: Partial<EnrichmentJob> = {}): EnrichmentJob => ({
  id: 'test-job-' + Math.random().toString(36).substr(2, 9),
  domain: 'test-domain.com',
  status: 'pending',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  retry_count: 0,
  metadata: {},
  crawling_status: 'pending',
  chunking_status: 'pending',
  embedding_status: 'pending',
  extraction_status: 'pending',
  pages_crawled: 0,
  chunks_created: 0,
  embeddings_generated: 0,
  facts_extracted: 0,
  ...overrides
});

export const createMockFact = (overrides: Partial<EnrichmentFact> = {}): EnrichmentFact => ({
  id: 'test-fact-' + Math.random().toString(36).substr(2, 9),
  job_id: 'test-job-123',
  fact_type: 'company_info',
  fact_data: {
    category: 'basic_info',
    value: 'Test Company Inc.'
  },
  confidence_score: 0.85,
  source_url: 'https://test-domain.com/about',
  created_at: new Date().toISOString(),
  validated: false,
  ...overrides
});
