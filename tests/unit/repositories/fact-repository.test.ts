import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FactRepository } from '../../../apps/web/lib/repositories/fact-repository';
import { EnrichmentFact } from '../../../apps/web/lib/types/enrichment';

// Mock pg module
vi.mock('pg', () => ({
  Pool: vi.fn(() => ({
    connect: vi.fn(),
    end: vi.fn()
  }))
}));

describe('FactRepository', () => {
  let factRepository: FactRepository;
  let mockClient: any;
  let mockPool: any;

  beforeEach(() => {
    // Setup mock client
    mockClient = {
      query: vi.fn(),
      release: vi.fn()
    };

    // Setup mock pool
    mockPool = {
      connect: vi.fn().mockResolvedValue(mockClient),
      end: vi.fn()
    };

    // Mock the Pool constructor
    const { Pool } = require('pg');
    Pool.mockImplementation(() => mockPool);

    factRepository = new FactRepository();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new fact successfully', async () => {
      const mockFact = {
        job_id: 'job-123',
        fact_type: 'company_info',
        fact_data: { name: 'Test Company', industry: 'Technology' },
        confidence_score: 0.95,
        source_url: 'https://example.com',
        source_text: 'Test Company is a technology company',
        embedding_id: 'embed-123',
        validated: false,
        validation_notes: undefined
      };

      const mockDbResult = {
        rows: [{
          id: 'fact-123',
          job_id: 'job-123',
          fact_type: 'company_info',
          fact_data: JSON.stringify({ name: 'Test Company', industry: 'Technology' }),
          confidence_score: '0.95',
          source_url: 'https://example.com',
          source_text: 'Test Company is a technology company',
          embedding_id: 'embed-123',
          created_at: new Date('2023-01-01'),
          validated: false,
          validation_notes: null
        }]
      };

      mockClient.query.mockResolvedValue(mockDbResult);

      const result = await factRepository.create(mockFact);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO enrichment_facts'),
        expect.arrayContaining([
          'job-123',
          'company_info',
          JSON.stringify({ name: 'Test Company', industry: 'Technology' }),
          0.95,
          'https://example.com',
          'Test Company is a technology company',
          'embed-123',
          false,
          undefined
        ])
      );

      expect(result).toEqual({
        id: 'fact-123',
        job_id: 'job-123',
        fact_type: 'company_info',
        fact_data: { name: 'Test Company', industry: 'Technology' },
        confidence_score: 0.95,
        source_url: 'https://example.com',
        source_text: 'Test Company is a technology company',
        embedding_id: 'embed-123',
        created_at: '2023-01-01T00:00:00.000Z',
        validated: false,
        validation_notes: null
      });

      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const mockFact = {
        job_id: 'job-123',
        fact_type: 'company_info',
        fact_data: { name: 'Test Company' },
        confidence_score: 0.95,
        source_text: 'Test text',
        validated: false
      };

      mockClient.query.mockRejectedValue(new Error('Database error'));

      await expect(factRepository.create(mockFact)).rejects.toThrow('Database error');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('createBatch', () => {
    it('should create multiple facts in a transaction', async () => {
      const mockFacts = [
        {
          job_id: 'job-123',
          fact_type: 'company_info',
          fact_data: { name: 'Company A' },
          confidence_score: 0.95,
          source_text: 'Company A text',
          validated: false
        },
        {
          job_id: 'job-123',
          fact_type: 'location',
          fact_data: { city: 'New York' },
          confidence_score: 0.88,
          source_text: 'New York location',
          validated: false
        }
      ];

      const mockDbResults = [
        {
          rows: [{
            id: 'fact-1',
            job_id: 'job-123',
            fact_type: 'company_info',
            fact_data: JSON.stringify({ name: 'Company A' }),
            confidence_score: '0.95',
            source_text: 'Company A text',
            created_at: new Date('2023-01-01'),
            validated: false,
            validation_notes: null
          }]
        },
        {
          rows: [{
            id: 'fact-2',
            job_id: 'job-123',
            fact_type: 'location',
            fact_data: JSON.stringify({ city: 'New York' }),
            confidence_score: '0.88',
            source_text: 'New York location',
            created_at: new Date('2023-01-01'),
            validated: false,
            validation_notes: null
          }]
        }
      ];

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(mockDbResults[0]) // First INSERT
        .mockResolvedValueOnce(mockDbResults[1]) // Second INSERT
        .mockResolvedValueOnce(undefined); // COMMIT

      const results = await factRepository.createBatch(mockFacts);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(results).toHaveLength(2);
      expect(results[0].fact_type).toBe('company_info');
      expect(results[1].fact_type).toBe('location');
    });

    it('should rollback on error', async () => {
      const mockFacts = [
        {
          job_id: 'job-123',
          fact_type: 'company_info',
          fact_data: { name: 'Company A' },
          confidence_score: 0.95,
          source_text: 'Company A text',
          validated: false
        }
      ];

      mockClient.query
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('Insert failed')); // INSERT fails

      await expect(factRepository.createBatch(mockFacts)).rejects.toThrow('Insert failed');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should return empty array for empty input', async () => {
      const results = await factRepository.createBatch([]);
      expect(results).toEqual([]);
      expect(mockClient.query).not.toHaveBeenCalled();
    });
  });

  describe('findByJobId', () => {
    it('should find facts by job ID', async () => {
      const mockDbResult = {
        rows: [
          {
            id: 'fact-1',
            job_id: 'job-123',
            fact_type: 'company_info',
            fact_data: JSON.stringify({ name: 'Company A' }),
            confidence_score: '0.95',
            source_text: 'Company A text',
            created_at: new Date('2023-01-01'),
            validated: false,
            validation_notes: null
          },
          {
            id: 'fact-2',
            job_id: 'job-123',
            fact_type: 'location',
            fact_data: JSON.stringify({ city: 'New York' }),
            confidence_score: '0.88',
            source_text: 'New York location',
            created_at: new Date('2023-01-01'),
            validated: true,
            validation_notes: 'Verified'
          }
        ]
      };

      mockClient.query.mockResolvedValue(mockDbResult);

      const results = await factRepository.findByJobId('job-123');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM enrichment_facts'),
        ['job-123']
      );

      expect(results).toHaveLength(2);
      expect(results[0].fact_type).toBe('company_info');
      expect(results[0].fact_data).toEqual({ name: 'Company A' });
      expect(results[1].fact_type).toBe('location');
      expect(results[1].validated).toBe(true);
    });

    it('should return empty array when no facts found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });

      const results = await factRepository.findByJobId('nonexistent-job');

      expect(results).toEqual([]);
    });
  });

  describe('findByConfidenceThreshold', () => {
    it('should find facts above confidence threshold', async () => {
      const mockDbResult = {
        rows: [
          {
            id: 'fact-1',
            job_id: 'job-123',
            fact_type: 'company_info',
            fact_data: JSON.stringify({ name: 'Company A' }),
            confidence_score: '0.95',
            source_text: 'High confidence fact',
            created_at: new Date('2023-01-01'),
            validated: false,
            validation_notes: null
          }
        ]
      };

      mockClient.query.mockResolvedValue(mockDbResult);

      const results = await factRepository.findByConfidenceThreshold(0.9, 50);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE confidence_score >= $1'),
        [0.9, 50]
      );

      expect(results).toHaveLength(1);
      expect(results[0].confidence_score).toBe(0.95);
    });
  });

  describe('updateValidation', () => {
    it('should update fact validation status', async () => {
      mockClient.query.mockResolvedValue({});

      await factRepository.updateValidation('fact-123', true, 'Manually verified');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE enrichment_facts'),
        ['fact-123', true, 'Manually verified']
      );
    });
  });

  describe('getJobStatistics', () => {
    it('should return job statistics', async () => {
      const mockStatsResult = {
        rows: [{
          total_facts: '10',
          validated_facts: '7',
          avg_confidence: '0.85'
        }]
      };

      const mockTypesResult = {
        rows: [
          { fact_type: 'company_info', count: '5' },
          { fact_type: 'location', count: '3' },
          { fact_type: 'contact', count: '2' }
        ]
      };

      mockClient.query
        .mockResolvedValueOnce(mockStatsResult)
        .mockResolvedValueOnce(mockTypesResult);

      const stats = await factRepository.getJobStatistics('job-123');

      expect(stats).toEqual({
        total_facts: 10,
        validated_facts: 7,
        fact_types: {
          'company_info': 5,
          'location': 3,
          'contact': 2
        },
        avg_confidence: 0.85
      });
    });
  });

  describe('searchByText', () => {
    it('should search facts by text content', async () => {
      const mockDbResult = {
        rows: [
          {
            id: 'fact-1',
            job_id: 'job-123',
            fact_type: 'company_info',
            fact_data: JSON.stringify({ name: 'Technology Company' }),
            confidence_score: '0.95',
            source_text: 'This is a technology company',
            created_at: new Date('2023-01-01'),
            validated: false,
            validation_notes: null
          }
        ]
      };

      mockClient.query.mockResolvedValue(mockDbResult);

      const results = await factRepository.searchByText('technology', 25);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('source_text ILIKE $1 OR'),
        ['%technology%', 25]
      );

      expect(results).toHaveLength(1);
      expect(results[0].fact_data).toEqual({ name: 'Technology Company' });
    });
  });

  describe('close', () => {
    it('should close the database connection pool', async () => {
      await factRepository.close();
      expect(mockPool.end).toHaveBeenCalled();
    });
  });
});
