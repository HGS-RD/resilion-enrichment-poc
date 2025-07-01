import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createTestDatabase, cleanupTestDatabase, getTestDatabaseUrl } from '../setup/test-database'
import { NextRequest } from 'next/server'

// Import API route handlers directly
import { GET as healthGet } from '../../apps/web/app/api/health/route'
import { GET as enrichmentGet, POST as enrichmentPost } from '../../apps/web/app/api/enrichment/route'
import { GET as enrichmentDetailGet } from '../../apps/web/app/api/enrichment/[id]/route'
import { POST as enrichmentStartPost } from '../../apps/web/app/api/enrichment/[id]/start/route'
import { GET as factsGet } from '../../apps/web/app/api/facts/route'

describe('API Endpoints Integration Tests', () => {
  let testDbUrl: string

  beforeAll(async () => {
    testDbUrl = await createTestDatabase()
    process.env.DATABASE_URL = testDbUrl
  })

  afterAll(async () => {
    await cleanupTestDatabase()
  })

  beforeEach(async () => {
    // Clean up test data before each test
    // This would typically truncate tables or reset to known state
  })

  describe('Health Check Endpoint', () => {
    it('should return healthy status', async () => {
      const request = new NextRequest('http://localhost:3002/api/health')
      const response = await healthGet(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('status', 'healthy')
      expect(data).toHaveProperty('timestamp')
      expect(data).toHaveProperty('database')
    })
  })

  describe('Enrichment Job Endpoints', () => {
    it('should create a new enrichment job', async () => {
      const jobData = {
        domain: 'example.com',
        llm_choice: 'gpt-4o'
      }

      const request = new NextRequest('http://localhost:3002/api/enrichment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jobData)
      })

      const response = await enrichmentPost(request)
      expect(response.status).toBe(201)
      
      const data = await response.json()
      expect(data).toHaveProperty('id')
      expect(data).toHaveProperty('domain', 'example.com')
      expect(data).toHaveProperty('llm_used', 'gpt-4o')
      expect(data).toHaveProperty('status', 'pending')
    })

    it('should validate domain input', async () => {
      const invalidJobData = {
        domain: 'invalid-domain',
        llm_choice: 'gpt-4o'
      }

      const request = new NextRequest('http://localhost:3002/api/enrichment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidJobData)
      })

      const response = await enrichmentPost(request)
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data.error).toContain('domain')
    })

    it('should list enrichment jobs', async () => {
      const request = new NextRequest('http://localhost:3002/api/enrichment')
      const response = await enrichmentGet(request)
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
    })

    it('should get specific job details', async () => {
      // First create a job
      const jobData = {
        domain: 'test.com',
        llm_choice: 'claude-3-opus'
      }

      const createRequest = new NextRequest('http://localhost:3002/api/enrichment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jobData)
      })

      const createResponse = await enrichmentPost(createRequest)
      const createdJob = await createResponse.json()
      
      // Then get job details
      const detailRequest = new NextRequest(`http://localhost:3002/api/enrichment/${createdJob.id}`)
      const response = await enrichmentDetailGet(detailRequest, { params: Promise.resolve({ id: createdJob.id }) })
      
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('id', createdJob.id)
      expect(data).toHaveProperty('domain', 'test.com')
      expect(data).toHaveProperty('statistics')
      expect(data).toHaveProperty('workflow')
    })

    it('should handle non-existent job ID', async () => {
      const request = new NextRequest('http://localhost:3002/api/enrichment/999999')
      const response = await enrichmentDetailGet(request, { params: Promise.resolve({ id: '999999' }) })
      
      expect(response.status).toBe(404)
      
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should start job execution', async () => {
      // First create a job
      const jobData = {
        domain: 'startup.com',
        llm_choice: 'gemini-1.5-pro'
      }

      const createRequest = new NextRequest('http://localhost:3002/api/enrichment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jobData)
      })

      const createResponse = await enrichmentPost(createRequest)
      const createdJob = await createResponse.json()
      
      // Then start the job
      const startRequest = new NextRequest(`http://localhost:3002/api/enrichment/${createdJob.id}/start`, {
        method: 'POST'
      })

      const response = await enrichmentStartPost(startRequest, { params: Promise.resolve({ id: createdJob.id }) })
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('message')
      expect(data.message).toContain('started')
    })
  })

  describe('Facts Endpoints', () => {
    it('should list facts for a job', async () => {
      // This test would require a job with facts
      // For now, test the endpoint structure
      const request = new NextRequest('http://localhost:3002/api/facts?job_id=1')
      const response = await factsGet(request)
      
      // Should return empty array or facts
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
    })

    it('should handle invalid job ID for facts', async () => {
      const request = new NextRequest('http://localhost:3002/api/facts?job_id=invalid')
      const response = await factsGet(request)
      
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const request = new NextRequest('http://localhost:3002/api/enrichment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      })

      const response = await enrichmentPost(request)
      expect(response.status).toBe(400)
    })

    it('should handle missing required fields', async () => {
      const request = new NextRequest('http://localhost:3002/api/enrichment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      const response = await enrichmentPost(request)
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })
  })

  describe('Database Integration', () => {
    it('should persist job data correctly', async () => {
      const jobData = {
        domain: 'persistence-test.com',
        llm_choice: 'gpt-4o'
      }

      // Create job
      const createRequest = new NextRequest('http://localhost:3002/api/enrichment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jobData)
      })

      const createResponse = await enrichmentPost(createRequest)
      const createdJob = await createResponse.json()
      
      // Verify job persisted by fetching it
      const fetchRequest = new NextRequest(`http://localhost:3002/api/enrichment/${createdJob.id}`)
      const fetchResponse = await enrichmentDetailGet(fetchRequest, { params: Promise.resolve({ id: createdJob.id }) })
      const fetchedJob = await fetchResponse.json()
      
      expect(fetchedJob.domain).toBe(jobData.domain)
      expect(fetchedJob.llm_used).toBe(jobData.llm_choice)
      expect(fetchedJob.created_at).toBeDefined()
    })

    it('should handle database connection errors gracefully', async () => {
      // Temporarily break database connection
      const originalUrl = process.env.DATABASE_URL
      process.env.DATABASE_URL = 'postgresql://invalid:invalid@localhost:5432/invalid'
      
      const request = new NextRequest('http://localhost:3002/api/enrichment')
      const response = await enrichmentGet(request)
      
      // Restore connection
      process.env.DATABASE_URL = originalUrl
      
      expect(response.status).toBe(500)
    })
  })

  describe('Performance and Load', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => {
        const request = new NextRequest('http://localhost:3002/api/enrichment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            domain: `concurrent-test-${i}.com`,
            llm_choice: 'gpt-4o'
          })
        })
        return enrichmentPost(request)
      })

      const responses = await Promise.all(requests)
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201)
      })
    })

    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now()
      
      const request = new NextRequest('http://localhost:3002/api/health')
      const response = await healthGet(request)
      
      const endTime = Date.now()
      const responseTime = endTime - startTime
      
      expect(response.status).toBe(200)
      expect(responseTime).toBeLessThan(1000) // Should respond within 1 second
    })
  })
})
