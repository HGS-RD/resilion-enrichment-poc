import { vi } from 'vitest';
import { mockDomains, mockCrawledContent, mockTextChunks, mockEmbeddings, mockEnrichmentJobs, mockEnrichmentFacts } from '../__fixtures__/test-data';

// Mock Web Crawler Service
export const mockWebCrawlerService = {
  crawl: vi.fn(),
  validateDomain: vi.fn(),
  checkRobotsTxt: vi.fn(),
  extractContent: vi.fn(),
  
  // Default implementations
  __setupMocks: () => {
    mockWebCrawlerService.crawl.mockResolvedValue({
      pages: [
        {
          url: 'https://example.com',
          title: 'Example Company',
          content: mockCrawledContent.typical,
          metadata: {
            crawled_at: new Date().toISOString(),
            status_code: 200,
            content_type: 'text/html',
            word_count: 150
          }
        }
      ]
    });
    
    mockWebCrawlerService.validateDomain.mockImplementation((domain: string) => {
      return mockDomains.valid.includes(domain);
    });
    
    mockWebCrawlerService.checkRobotsTxt.mockResolvedValue(true);
    mockWebCrawlerService.extractContent.mockReturnValue(mockCrawledContent.typical);
  }
};

// Mock Text Chunking Service
export const mockTextChunkingService = {
  chunkText: vi.fn(),
  calculateOverlap: vi.fn(),
  validateChunkSize: vi.fn(),
  
  __setupMocks: () => {
    mockTextChunkingService.chunkText.mockResolvedValue(mockTextChunks);
    mockTextChunkingService.calculateOverlap.mockReturnValue(50);
    mockTextChunkingService.validateChunkSize.mockReturnValue(true);
  }
};

// Mock Embedding Service
export const mockEmbeddingService = {
  generateEmbeddings: vi.fn(),
  batchProcess: vi.fn(),
  storeInPinecone: vi.fn(),
  
  __setupMocks: () => {
    mockEmbeddingService.generateEmbeddings.mockResolvedValue(mockEmbeddings);
    mockEmbeddingService.batchProcess.mockResolvedValue(mockEmbeddings);
    mockEmbeddingService.storeInPinecone.mockResolvedValue({ success: true, ids: ['chunk-1', 'chunk-2'] });
  }
};

// Mock LLM Service
export const mockLLMService = {
  extractFacts: vi.fn(),
  validateSchema: vi.fn(),
  calculateConfidence: vi.fn(),
  
  __setupMocks: () => {
    mockLLMService.extractFacts.mockResolvedValue({
      facts: mockEnrichmentFacts.slice(0, 3),
      metadata: { model: 'gpt-4', tokens_used: 1500 }
    });
    
    mockLLMService.validateSchema.mockReturnValue({ valid: true, errors: [] });
    mockLLMService.calculateConfidence.mockReturnValue(0.85);
  }
};

// Mock Database Services
export const mockJobRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findByDomain: vi.fn(),
  updateStatus: vi.fn(),
  updateStepStatus: vi.fn(),
  updateProgress: vi.fn(),
  logError: vi.fn(),
  
  __setupMocks: () => {
    mockJobRepository.create.mockResolvedValue(mockEnrichmentJobs[0]);
    mockJobRepository.findById.mockResolvedValue(mockEnrichmentJobs[0]);
    mockJobRepository.findByDomain.mockResolvedValue([mockEnrichmentJobs[0]]);
    mockJobRepository.updateStatus.mockResolvedValue(undefined);
    mockJobRepository.updateStepStatus.mockResolvedValue(undefined);
    mockJobRepository.updateProgress.mockResolvedValue(undefined);
    mockJobRepository.logError.mockResolvedValue(undefined);
  }
};

export const mockFactRepository = {
  create: vi.fn(),
  findByJobId: vi.fn(),
  updateValidation: vi.fn(),
  
  __setupMocks: () => {
    mockFactRepository.create.mockResolvedValue(mockEnrichmentFacts[0]);
    mockFactRepository.findByJobId.mockResolvedValue(mockEnrichmentFacts.slice(0, 3));
    mockFactRepository.updateValidation.mockResolvedValue(undefined);
  }
};

// Mock Enrichment Agent
export const mockEnrichmentAgent = {
  processJob: vi.fn(),
  executeStep: vi.fn(),
  handleError: vi.fn(),
  
  __setupMocks: () => {
    mockEnrichmentAgent.processJob.mockResolvedValue({
      success: true,
      job: mockEnrichmentJobs[2], // completed job
      facts: mockEnrichmentFacts.slice(0, 3)
    });
    
    mockEnrichmentAgent.executeStep.mockResolvedValue({ success: true });
    mockEnrichmentAgent.handleError.mockResolvedValue(undefined);
  }
};

// Mock External APIs
export const mockOpenAIAPI = {
  createEmbedding: vi.fn(),
  createChatCompletion: vi.fn(),
  
  __setupMocks: () => {
    mockOpenAIAPI.createEmbedding.mockResolvedValue({
      data: [{ embedding: new Array(1536).fill(0).map(() => Math.random() - 0.5) }],
      usage: { total_tokens: 100 }
    });
    
    mockOpenAIAPI.createChatCompletion.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            facts: [
              {
                type: 'company_info',
                value: 'Test Company Inc.',
                confidence: 0.9
              }
            ]
          })
        }
      }],
      usage: { total_tokens: 500 }
    });
  }
};

export const mockPineconeAPI = {
  upsert: vi.fn(),
  query: vi.fn(),
  delete: vi.fn(),
  
  __setupMocks: () => {
    mockPineconeAPI.upsert.mockResolvedValue({ upsertedCount: 1 });
    mockPineconeAPI.query.mockResolvedValue({
      matches: [
        {
          id: 'chunk-1',
          score: 0.95,
          metadata: { text: 'Sample text', source: 'test' }
        }
      ]
    });
    mockPineconeAPI.delete.mockResolvedValue({ success: true });
  }
};

// Utility function to setup all mocks
export const setupAllMocks = () => {
  mockWebCrawlerService.__setupMocks();
  mockTextChunkingService.__setupMocks();
  mockEmbeddingService.__setupMocks();
  mockLLMService.__setupMocks();
  mockJobRepository.__setupMocks();
  mockFactRepository.__setupMocks();
  mockEnrichmentAgent.__setupMocks();
  mockOpenAIAPI.__setupMocks();
  mockPineconeAPI.__setupMocks();
};

// Utility function to reset all mocks
export const resetAllMocks = () => {
  vi.clearAllMocks();
  vi.resetAllMocks();
};

// Mock configurations
export const mockConfigs = {
  crawler: {
    max_pages: 10,
    delay_ms: 1000,
    timeout_ms: 30000,
    user_agent: 'Test-Bot/1.0',
    respect_robots_txt: true
  },
  chunking: {
    max_chunk_size: 1000,
    overlap_size: 100,
    min_chunk_size: 50
  },
  embedding: {
    model: 'text-embedding-ada-002',
    dimensions: 1536,
    batch_size: 100
  },
  extraction: {
    model: 'gpt-4',
    temperature: 0.1,
    max_tokens: 2000,
    confidence_threshold: 0.7
  }
};
