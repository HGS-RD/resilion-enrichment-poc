import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FactExtractionStep } from '../../../../apps/web/lib/services/steps/fact-extraction-step';
import { EnrichmentContext, EnrichmentJob } from '../../../../apps/web/lib/types/enrichment';

// Mock dependencies
vi.mock('../../../../apps/web/lib/repositories/fact-repository');
vi.mock('../../../../apps/web/lib/services/prompt-templates');
vi.mock('../../../../apps/web/lib/services/schema-validator');
vi.mock('@ai-sdk/openai');
vi.mock('ai');

describe('FactExtractionStep', () => {
  let factExtractionStep: FactExtractionStep;
  let mockJobRepository: any;
  let mockFactRepository: any;
  let mockPromptBuilder: any;
  let mockSchemaValidator: any;

  beforeEach(() => {
    // Mock job repository
    mockJobRepository = {
      updateStepStatus: vi.fn(),
      updateProgress: vi.fn()
    };

    // Mock fact repository
    mockFactRepository = {
      createBatch: vi.fn(),
      close: vi.fn()
    };

    // Mock prompt builder
    mockPromptBuilder = {
      buildExtractionPrompt: vi.fn().mockReturnValue({
        systemPrompt: 'System prompt',
        userPrompt: 'User prompt',
        schema: { type: 'object' }
      })
    };

    // Mock schema validator
    mockSchemaValidator = {
      validateExtractionResult: vi.fn().mockReturnValue({
        isValid: true,
        validFacts: [],
        invalidFacts: [],
        errors: []
      }),
      validateForPersistence: vi.fn().mockReturnValue({
        validFacts: [],
        invalidFacts: [],
        errors: []
      })
    };

    // Setup module mocks
    const { FactRepository } = require('../../../../apps/web/lib/repositories/fact-repository');
    FactRepository.mockImplementation(() => mockFactRepository);

    const { promptBuilder } = require('../../../../apps/web/lib/services/prompt-templates');
    Object.assign(promptBuilder, mockPromptBuilder);

    const { factSchemaValidator } = require('../../../../apps/web/lib/services/schema-validator');
    Object.assign(factSchemaValidator, mockSchemaValidator);

    factExtractionStep = new FactExtractionStep(mockJobRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('canHandle', () => {
    it('should return true when embedding is completed and extraction is not completed', () => {
      const context: EnrichmentContext = {
        job: {
          id: 'job-123',
          embedding_status: 'completed',
          extraction_status: 'pending'
        } as EnrichmentJob,
        embeddings: [{ chunk_id: 'chunk-1', embedding_id: 'embed-1', vector: [], metadata: {} }]
      };

      const result = factExtractionStep.canHandle(context);
      expect(result).toBe(true);
    });

    it('should return false when embedding is not completed', () => {
      const context: EnrichmentContext = {
        job: {
          id: 'job-123',
          embedding_status: 'pending',
          extraction_status: 'pending'
        } as EnrichmentJob,
        embeddings: []
      };

      const result = factExtractionStep.canHandle(context);
      expect(result).toBe(false);
    });

    it('should return false when extraction is already completed', () => {
      const context: EnrichmentContext = {
        job: {
          id: 'job-123',
          embedding_status: 'completed',
          extraction_status: 'completed'
        } as EnrichmentJob,
        embeddings: [{ chunk_id: 'chunk-1', embedding_id: 'embed-1', vector: [], metadata: {} }]
      };

      const result = factExtractionStep.canHandle(context);
      expect(result).toBe(false);
    });

    it('should return false when no embeddings are available', () => {
      const context: EnrichmentContext = {
        job: {
          id: 'job-123',
          embedding_status: 'completed',
          extraction_status: 'pending'
        } as EnrichmentJob,
        embeddings: []
      };

      const result = factExtractionStep.canHandle(context);
      expect(result).toBe(false);
    });
  });

  describe('execute', () => {
    it('should return error when no text chunks are available', async () => {
      const context: EnrichmentContext = {
        job: {
          id: 'job-123',
          domain: 'example.com',
          embedding_status: 'completed',
          extraction_status: 'pending'
        } as EnrichmentJob,
        text_chunks: [],
        embeddings: [{ chunk_id: 'chunk-1', embedding_id: 'embed-1', vector: [], metadata: {} }]
      };

      const result = await factExtractionStep.execute(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('No text chunks available');
    });

    it('should successfully extract and persist facts', async () => {
      // Mock AI SDK response
      const { generateObject } = require('ai');
      generateObject.mockResolvedValue({
        object: {
          facts: [
            {
              fact_type: 'company_info',
              fact_data: { name: 'ACME Corp', industry: 'Manufacturing' },
              confidence_score: 0.95,
              source_text: 'ACME Corp is a manufacturing company'
            }
          ]
        }
      });

      // Mock schema validation
      mockSchemaValidator.validateExtractionResult.mockReturnValue({
        isValid: true,
        validFacts: [
          {
            fact_type: 'company_info',
            fact_data: { name: 'ACME Corp', industry: 'Manufacturing' },
            confidence_score: 0.95,
            source_text: 'ACME Corp is a manufacturing company'
          }
        ],
        invalidFacts: [],
        errors: []
      });

      mockSchemaValidator.validateForPersistence.mockReturnValue({
        validFacts: [
          {
            job_id: 'job-123',
            fact_type: 'company_info',
            fact_data: { name: 'ACME Corp', industry: 'Manufacturing' },
            confidence_score: 0.95,
            source_text: 'ACME Corp is a manufacturing company',
            validated: false
          }
        ],
        invalidFacts: [],
        errors: []
      });

      // Mock fact repository response
      mockFactRepository.createBatch.mockResolvedValue([
        {
          id: 'fact-123',
          job_id: 'job-123',
          fact_type: 'company_info',
          fact_data: { name: 'ACME Corp', industry: 'Manufacturing' },
          confidence_score: 0.95,
          source_text: 'ACME Corp is a manufacturing company',
          created_at: '2023-01-01T00:00:00.000Z',
          validated: false
        }
      ]);

      const context: EnrichmentContext = {
        job: {
          id: 'job-123',
          domain: 'example.com',
          embedding_status: 'completed',
          extraction_status: 'pending'
        } as EnrichmentJob,
        text_chunks: [
          {
            id: 'chunk-1',
            content: 'ACME Corp is a manufacturing company based in Detroit.',
            metadata: {
              source_url: 'https://example.com/about',
              chunk_index: 0,
              word_count: 10,
              created_at: '2023-01-01T00:00:00.000Z'
            }
          }
        ],
        embeddings: [{ chunk_id: 'chunk-1', embedding_id: 'embed-1', vector: [], metadata: {} }]
      };

      const result = await factExtractionStep.execute(context);

      expect(result.error).toBeUndefined();
      expect(result.extracted_facts).toHaveLength(1);
      expect(result.extracted_facts?.[0].fact_type).toBe('company_info');
      expect(result.step_results?.extraction?.total_facts).toBe(1);
      expect(result.step_results?.extraction?.validation_enabled).toBe(true);

      // Verify repository calls
      expect(mockJobRepository.updateStepStatus).toHaveBeenCalledWith('job-123', 'extraction_status', 'running');
      expect(mockJobRepository.updateStepStatus).toHaveBeenCalledWith('job-123', 'extraction_status', 'completed');
      expect(mockJobRepository.updateProgress).toHaveBeenCalledWith('job-123', { facts_extracted: 1 });
      expect(mockFactRepository.createBatch).toHaveBeenCalled();
    });

    it('should handle AI SDK errors gracefully', async () => {
      // Mock AI SDK to throw error
      const { generateObject } = require('ai');
      generateObject.mockRejectedValue(new Error('AI SDK error'));

      const context: EnrichmentContext = {
        job: {
          id: 'job-123',
          domain: 'example.com',
          embedding_status: 'completed',
          extraction_status: 'pending'
        } as EnrichmentJob,
        text_chunks: [
          {
            id: 'chunk-1',
            content: 'Test content',
            metadata: {
              source_url: 'https://example.com',
              chunk_index: 0,
              word_count: 2,
              created_at: '2023-01-01T00:00:00.000Z'
            }
          }
        ],
        embeddings: [{ chunk_id: 'chunk-1', embedding_id: 'embed-1', vector: [], metadata: {} }]
      };

      const result = await factExtractionStep.execute(context);

      // Should complete successfully even with batch errors
      expect(result.error).toBeUndefined();
      expect(result.extracted_facts).toHaveLength(0);
      expect(mockJobRepository.updateStepStatus).toHaveBeenCalledWith('job-123', 'extraction_status', 'completed');
    });

    it('should filter facts by confidence threshold', async () => {
      // Mock AI SDK response with mixed confidence scores
      const { generateObject } = require('ai');
      generateObject.mockResolvedValue({
        object: {
          facts: [
            {
              fact_type: 'company_info',
              fact_data: { name: 'High Confidence Corp' },
              confidence_score: 0.95,
              source_text: 'High confidence fact'
            },
            {
              fact_type: 'company_info',
              fact_data: { name: 'Low Confidence Corp' },
              confidence_score: 0.5, // Below threshold
              source_text: 'Low confidence fact'
            }
          ]
        }
      });

      // Mock schema validation to return both facts as valid
      mockSchemaValidator.validateExtractionResult.mockReturnValue({
        isValid: true,
        validFacts: [
          {
            fact_type: 'company_info',
            fact_data: { name: 'High Confidence Corp' },
            confidence_score: 0.95,
            source_text: 'High confidence fact'
          },
          {
            fact_type: 'company_info',
            fact_data: { name: 'Low Confidence Corp' },
            confidence_score: 0.5,
            source_text: 'Low confidence fact'
          }
        ],
        invalidFacts: [],
        errors: []
      });

      const context: EnrichmentContext = {
        job: {
          id: 'job-123',
          domain: 'example.com',
          embedding_status: 'completed',
          extraction_status: 'pending'
        } as EnrichmentJob,
        text_chunks: [
          {
            id: 'chunk-1',
            content: 'Test content',
            metadata: {
              source_url: 'https://example.com',
              chunk_index: 0,
              word_count: 2,
              created_at: '2023-01-01T00:00:00.000Z'
            }
          }
        ],
        embeddings: [{ chunk_id: 'chunk-1', embedding_id: 'embed-1', vector: [], metadata: {} }]
      };

      const result = await factExtractionStep.execute(context);

      // Should only include high confidence facts
      expect(result.step_results?.extraction?.filtered_facts).toBeGreaterThan(0);
    });

    it('should handle database persistence errors', async () => {
      // Mock successful AI extraction
      const { generateObject } = require('ai');
      generateObject.mockResolvedValue({
        object: {
          facts: [
            {
              fact_type: 'company_info',
              fact_data: { name: 'Test Corp' },
              confidence_score: 0.95,
              source_text: 'Test fact'
            }
          ]
        }
      });

      mockSchemaValidator.validateExtractionResult.mockReturnValue({
        isValid: true,
        validFacts: [
          {
            fact_type: 'company_info',
            fact_data: { name: 'Test Corp' },
            confidence_score: 0.95,
            source_text: 'Test fact'
          }
        ],
        invalidFacts: [],
        errors: []
      });

      mockSchemaValidator.validateForPersistence.mockReturnValue({
        validFacts: [
          {
            job_id: 'job-123',
            fact_type: 'company_info',
            fact_data: { name: 'Test Corp' },
            confidence_score: 0.95,
            source_text: 'Test fact',
            validated: false
          }
        ],
        invalidFacts: [],
        errors: []
      });

      // Mock database error
      mockFactRepository.createBatch.mockRejectedValue(new Error('Database error'));

      const context: EnrichmentContext = {
        job: {
          id: 'job-123',
          domain: 'example.com',
          embedding_status: 'completed',
          extraction_status: 'pending'
        } as EnrichmentJob,
        text_chunks: [
          {
            id: 'chunk-1',
            content: 'Test content',
            metadata: {
              source_url: 'https://example.com',
              chunk_index: 0,
              word_count: 2,
              created_at: '2023-01-01T00:00:00.000Z'
            }
          }
        ],
        embeddings: [{ chunk_id: 'chunk-1', embedding_id: 'embed-1', vector: [], metadata: {} }]
      };

      const result = await factExtractionStep.execute(context);

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Fact persistence failed');
      expect(mockJobRepository.updateStepStatus).toHaveBeenCalledWith('job-123', 'extraction_status', 'failed');
    });
  });

  describe('batch processing', () => {
    it('should process chunks in batches', async () => {
      // Create many chunks to test batching
      const manyChunks = Array.from({ length: 12 }, (_, i) => ({
        id: `chunk-${i}`,
        content: `Content ${i}`,
        metadata: {
          source_url: 'https://example.com',
          chunk_index: i,
          word_count: 2,
          created_at: '2023-01-01T00:00:00.000Z'
        }
      }));

      // Mock AI SDK to return empty facts
      const { generateObject } = require('ai');
      generateObject.mockResolvedValue({
        object: { facts: [] }
      });

      const context: EnrichmentContext = {
        job: {
          id: 'job-123',
          domain: 'example.com',
          embedding_status: 'completed',
          extraction_status: 'pending'
        } as EnrichmentJob,
        text_chunks: manyChunks,
        embeddings: [{ chunk_id: 'chunk-1', embedding_id: 'embed-1', vector: [], metadata: {} }]
      };

      await factExtractionStep.execute(context);

      // Should call generateObject multiple times for batches (12 chunks / 5 per batch = 3 batches)
      expect(generateObject).toHaveBeenCalledTimes(3);
    });
  });

  describe('cleanup', () => {
    it('should close fact repository connection', async () => {
      await factExtractionStep.cleanup();
      expect(mockFactRepository.close).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      mockFactRepository.close.mockRejectedValue(new Error('Cleanup error'));
      
      // Should not throw
      await expect(factExtractionStep.cleanup()).resolves.toBeUndefined();
    });
  });

  describe('name property', () => {
    it('should return correct step name', () => {
      expect(factExtractionStep.name).toBe('FactExtraction');
    });
  });
});
