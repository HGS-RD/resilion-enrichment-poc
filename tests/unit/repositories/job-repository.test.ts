import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { JobRepository } from '../../../apps/web/lib/repositories/job-repository';
import { JobStatus, StepStatus, type EnrichmentJob } from '../../../apps/web/lib/types/enrichment';
import { mockEnrichmentJobs, createMockJob } from '../../__fixtures__/test-data';

// Mock pg module
const mockPool = {
  query: vi.fn(),
  connect: vi.fn(),
  end: vi.fn()
};

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => mockPool)
}));

describe('JobRepository', () => {
  let repository: JobRepository;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Reset mock pool
    mockPool.query.mockReset();
    mockPool.connect.mockReset();
    mockPool.end.mockReset();

    repository = new JobRepository();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('should create a new enrichment job', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn()
      };
      mockPool.connect.mockResolvedValueOnce(mockClient);

      const mockJobData = createMockJob({
        domain: 'example.com',
        status: 'pending'
      });

      mockClient.query.mockResolvedValueOnce({
        rows: [mockJobData]
      });

      const result = await repository.create('example.com');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO enrichment_jobs'),
        expect.arrayContaining(['example.com', JSON.stringify({})])
      );
      expect(result.domain).toBe('example.com');
      expect(result.status).toBe('pending');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should create job with custom metadata', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn()
      };
      mockPool.connect.mockResolvedValueOnce(mockClient);

      const metadata = { source: 'test', priority: 'high' };
      const mockJobData = createMockJob({
        domain: 'example.com',
        metadata
      });

      mockClient.query.mockResolvedValueOnce({
        rows: [mockJobData]
      });

      const result = await repository.create('example.com', metadata);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO enrichment_jobs'),
        expect.arrayContaining(['example.com', JSON.stringify(metadata)])
      );
      expect(result.metadata).toEqual(metadata);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn()
      };
      mockPool.connect.mockResolvedValueOnce(mockClient);
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(repository.create('example.com')).rejects.toThrow('Database error');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should retrieve a job by ID', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn()
      };
      mockPool.connect.mockResolvedValueOnce(mockClient);

      const mockJob = mockEnrichmentJobs[0] as EnrichmentJob;
      mockClient.query.mockResolvedValueOnce({
        rows: [mockJob]
      });

      const result = await repository.findById(mockJob.id);

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM enrichment_jobs WHERE id = $1',
        [mockJob.id]
      );
      expect(result?.id).toBe(mockJob.id);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should return null for non-existent job', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn()
      };
      mockPool.connect.mockResolvedValueOnce(mockClient);

      mockClient.query.mockResolvedValueOnce({
        rows: []
      });

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findByDomain', () => {
    it('should retrieve jobs by domain', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn()
      };
      mockPool.connect.mockResolvedValueOnce(mockClient);

      const domain = 'example.com';
      const domainJobs = mockEnrichmentJobs.filter(job => job.domain === domain);

      mockClient.query.mockResolvedValueOnce({
        rows: domainJobs
      });

      const result = await repository.findByDomain(domain);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM enrichment_jobs'),
        [domain]
      );
      expect(result.length).toBe(domainJobs.length);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('should update job status', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn()
      };
      mockPool.connect.mockResolvedValueOnce(mockClient);

      const jobId = 'test-job-id';
      const newStatus: JobStatus = 'running';

      mockClient.query.mockResolvedValueOnce({
        rows: []
      });

      await repository.updateStatus(jobId, newStatus);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE enrichment_jobs'),
        expect.arrayContaining([jobId, newStatus])
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should set started_at when status is running', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn()
      };
      mockPool.connect.mockResolvedValueOnce(mockClient);

      await repository.updateStatus('job-id', 'running');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('started_at = NOW()'),
        expect.any(Array)
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should set completed_at when status is completed', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn()
      };
      mockPool.connect.mockResolvedValueOnce(mockClient);

      await repository.updateStatus('job-id', 'completed');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('completed_at = NOW()'),
        expect.any(Array)
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('updateStepStatus', () => {
    it('should update step status', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn()
      };
      mockPool.connect.mockResolvedValueOnce(mockClient);

      const jobId = 'test-job-id';
      const step = 'crawling_status';
      const status: StepStatus = 'running';

      await repository.updateStepStatus(jobId, step, status);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining(`SET ${step} = $2`),
        [jobId, status]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('updateProgress', () => {
    it('should update progress counters', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn()
      };
      mockPool.connect.mockResolvedValueOnce(mockClient);

      const jobId = 'test-job-id';
      const progress = { pages_crawled: 5, chunks_created: 20 };

      await repository.updateProgress(jobId, progress);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE enrichment_jobs'),
        expect.arrayContaining([jobId, 5, 20])
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should handle empty progress updates', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn()
      };
      mockPool.connect.mockResolvedValueOnce(mockClient);

      await repository.updateProgress('job-id', {});

      expect(mockClient.query).not.toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('logError', () => {
    it('should log error and set status to failed', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn()
      };
      mockPool.connect.mockResolvedValueOnce(mockClient);

      const jobId = 'test-job-id';
      const error = 'Test error message';

      await repository.logError(jobId, error);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE enrichment_jobs'),
        [jobId, error]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('incrementRetryCount', () => {
    it('should increment retry count', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn()
      };
      mockPool.connect.mockResolvedValueOnce(mockClient);

      const jobId = 'test-job-id';

      await repository.incrementRetryCount(jobId);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('retry_count = retry_count + 1'),
        [jobId]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('findByStatus', () => {
    it('should retrieve jobs by status with default limit', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn()
      };
      mockPool.connect.mockResolvedValueOnce(mockClient);

      const status: JobStatus = 'pending';
      const pendingJobs = mockEnrichmentJobs.filter(job => job.status === status);

      mockClient.query.mockResolvedValueOnce({
        rows: pendingJobs
      });

      const result = await repository.findByStatus(status);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE status = $1'),
        [status, 100]
      );
      expect(result.length).toBe(pendingJobs.length);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should retrieve jobs by status with custom limit', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn()
      };
      mockPool.connect.mockResolvedValueOnce(mockClient);

      const status: JobStatus = 'running';
      const limit = 5;

      mockClient.query.mockResolvedValueOnce({
        rows: []
      });

      await repository.findByStatus(status, limit);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2'),
        [status, limit]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should close the connection pool', async () => {
      await repository.close();

      expect(mockPool.end).toHaveBeenCalled();
    });
  });

  describe('mapRowToJob', () => {
    it('should correctly map database row to EnrichmentJob', async () => {
      const mockClient = {
        query: vi.fn(),
        release: vi.fn()
      };
      mockPool.connect.mockResolvedValueOnce(mockClient);

      const mockRow = {
        id: 'test-id',
        domain: 'example.com',
        status: 'pending',
        created_at: new Date('2025-06-29T10:00:00Z'),
        updated_at: new Date('2025-06-29T10:00:00Z'),
        started_at: null,
        completed_at: null,
        error_message: null,
        retry_count: 0,
        metadata: '{"test": "value"}',
        crawling_status: 'pending',
        chunking_status: 'pending',
        embedding_status: 'pending',
        extraction_status: 'pending',
        pages_crawled: 0,
        chunks_created: 0,
        embeddings_generated: 0,
        facts_extracted: 0
      };

      mockClient.query.mockResolvedValueOnce({
        rows: [mockRow]
      });

      const result = await repository.findById('test-id');

      expect(result).toEqual({
        id: 'test-id',
        domain: 'example.com',
        status: 'pending',
        created_at: '2025-06-29T10:00:00.000Z',
        updated_at: '2025-06-29T10:00:00.000Z',
        started_at: undefined,
        completed_at: undefined,
        error_message: null,
        retry_count: 0,
        metadata: { test: 'value' },
        crawling_status: 'pending',
        chunking_status: 'pending',
        embedding_status: 'pending',
        extraction_status: 'pending',
        pages_crawled: 0,
        chunks_created: 0,
        embeddings_generated: 0,
        facts_extracted: 0
      });
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
