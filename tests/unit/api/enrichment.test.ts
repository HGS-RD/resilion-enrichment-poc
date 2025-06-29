import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../../../apps/web/app/api/enrichment/route';
import { validateDomain } from '../../../apps/web/lib/utils/domain-validator';
import { JobRepository } from '../../../apps/web/lib/repositories/job-repository';
import { createMockJob } from '../../__fixtures__/test-data';

// Mock dependencies
vi.mock('../../../apps/web/lib/utils/domain-validator');
vi.mock('../../../apps/web/lib/repositories/job-repository');

describe('/api/enrichment', () => {
  let mockJobRepository: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock JobRepository
    mockJobRepository = {
      create: vi.fn(),
      findByDomain: vi.fn()
    };
    
    (JobRepository as any).mockImplementation(() => mockJobRepository);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST', () => {
    it('should create a new enrichment job for valid domain', async () => {
      // Mock domain validation
      (validateDomain as any).mockReturnValue(true);
      
      // Mock no existing jobs
      mockJobRepository.findByDomain.mockResolvedValue([]);
      
      // Mock job creation
      const mockJob = createMockJob({
        domain: 'example.com',
        status: 'pending'
      });
      mockJobRepository.create.mockResolvedValue(mockJob);

      const request = new NextRequest('http://localhost:3000/api/enrichment', {
        method: 'POST',
        body: JSON.stringify({ domain: 'example.com' }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.job.domain).toBe('example.com');
      expect(data.job.status).toBe('pending');
      expect(mockJobRepository.create).toHaveBeenCalledWith('example.com', {});
    });

    it('should return existing job if one is already running', async () => {
      // Mock domain validation
      (validateDomain as any).mockReturnValue(true);
      
      // Mock existing running job
      const existingJob = createMockJob({
        domain: 'example.com',
        status: 'running'
      });
      mockJobRepository.findByDomain.mockResolvedValue([existingJob]);

      const request = new NextRequest('http://localhost:3000/api/enrichment', {
        method: 'POST',
        body: JSON.stringify({ domain: 'example.com' }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.job.id).toBe(existingJob.id);
      expect(data.message).toContain('already exists');
      expect(mockJobRepository.create).not.toHaveBeenCalled();
    });

    it('should reject invalid domain', async () => {
      // Mock domain validation failure
      (validateDomain as any).mockReturnValue(false);

      const request = new NextRequest('http://localhost:3000/api/enrichment', {
        method: 'POST',
        body: JSON.stringify({ domain: 'invalid-domain' }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid domain');
      expect(mockJobRepository.create).not.toHaveBeenCalled();
    });

    it('should handle missing domain in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/enrichment', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Domain is required');
    });

    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/enrichment', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should handle database errors', async () => {
      // Mock domain validation
      (validateDomain as any).mockReturnValue(true);
      
      // Mock no existing jobs
      mockJobRepository.findByDomain.mockResolvedValue([]);
      
      // Mock database error
      mockJobRepository.create.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/enrichment', {
        method: 'POST',
        body: JSON.stringify({ domain: 'example.com' }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Internal server error');
    });

    it('should accept custom metadata', async () => {
      // Mock domain validation
      (validateDomain as any).mockReturnValue(true);
      
      // Mock no existing jobs
      mockJobRepository.findByDomain.mockResolvedValue([]);
      
      // Mock job creation
      const metadata = { source: 'api', priority: 'high' };
      const mockJob = createMockJob({
        domain: 'example.com',
        metadata
      });
      mockJobRepository.create.mockResolvedValue(mockJob);

      const request = new NextRequest('http://localhost:3000/api/enrichment', {
        method: 'POST',
        body: JSON.stringify({ 
          domain: 'example.com',
          metadata 
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(mockJobRepository.create).toHaveBeenCalledWith('example.com', metadata);
      expect(data.job.metadata).toEqual(metadata);
    });

    it('should normalize domain before processing', async () => {
      // Mock domain validation
      (validateDomain as any).mockReturnValue(true);
      
      // Mock no existing jobs
      mockJobRepository.findByDomain.mockResolvedValue([]);
      
      // Mock job creation
      const mockJob = createMockJob({
        domain: 'example.com',
        status: 'pending'
      });
      mockJobRepository.create.mockResolvedValue(mockJob);

      const request = new NextRequest('http://localhost:3000/api/enrichment', {
        method: 'POST',
        body: JSON.stringify({ domain: 'EXAMPLE.COM' }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(validateDomain).toHaveBeenCalledWith('EXAMPLE.COM');
    });

    it('should handle concurrent requests for same domain', async () => {
      // Mock domain validation
      (validateDomain as any).mockReturnValue(true);
      
      // Mock existing pending job (simulating race condition)
      const existingJob = createMockJob({
        domain: 'example.com',
        status: 'pending'
      });
      mockJobRepository.findByDomain.mockResolvedValue([existingJob]);

      const request = new NextRequest('http://localhost:3000/api/enrichment', {
        method: 'POST',
        body: JSON.stringify({ domain: 'example.com' }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.job.id).toBe(existingJob.id);
      expect(data.message).toContain('already exists');
    });
  });
});
