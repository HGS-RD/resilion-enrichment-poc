import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createTestDatabase, cleanupTestDatabase, getTestDatabaseUrl } from '../setup/test-database'

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
      const response = await fetch('http://localhost:3001/api/health')
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

      const response = await fetch('http://localhost:3001/api/enrichment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jobData)
      })

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

      const response = await fetch('http://localhost:3001/api/enrichment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidJobData)
      })

      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data).toHaveProperty('error')
      expect(data.error).toContain('domain')
    })

    it('should list enrichment jobs', async () => {
      const response = await fetch('http://localhost:3001/api/enrichment')
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

      const createResponse = await fetch('http://localhost:3001/api/enrichment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jobData)
      })

      const createdJob = await createResponse.json()
      
      // Then get job details
      const response = await fetch(`http://localhost:3001/api/enrichment/${createdJob.id}`)
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('id', createdJob.id)
      expect(data).toHaveProperty('domain', 'test.com')
      expect(data).toHaveProperty('statistics')
      expect(data).toHaveProperty('workflow')
    })

    it('should handle non-existent job ID', async () => {
      const response = await fetch('http://localhost:3001/api/enrichment/999999')
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

      const createResponse = await fetch('http://localhost:3001/api/enrichment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jobData)
      })

      const createdJob = await createResponse.json()
      
      // Then start the job
      const response = await fetch(`http://localhost:3001/api/enrichment/${createdJob.id}/start`, {
        method: 'POST'
      })

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
      const response = await fetch('http://localhost:3001/api/facts?job_id=1')
      
      // Should return empty array or facts
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(Array.isArray(data)).toBe(true)
    })

    it('should handle invalid job ID for facts', async () => {
      const response = await fetch('http://localhost:3001/api/facts?job_id=invalid')
      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await fetch('http://localhost:3001/api/enrichment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      })

      expect(response.status).toBe(400)
    })

    it('should handle missing required fields', async () => {
      const response = await fetch('http://localhost:3001/api/enrichment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    it('should handle unsupported HTTP methods', async () => {
      const response = await fetch('http://localhost:3001/api/enrichment', {
        method: 'DELETE'
      })

      expect(response.status).toBe(405)
    })
  })

  describe('Database Integration', () => {
    it('should persist job data correctly', async () => {
      const jobData = {
        domain: 'persistence-test.com',
        llm_choice: 'gpt-4o'
      }

      // Create job
      const createResponse = await fetch('http://localhost:3001/api/enrichment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(jobData)
      })

      const createdJob = await createResponse.json()
      
      // Verify job persisted by fetching it
      const fetchResponse = await fetch(`http://localhost:3001/api/enrichment/${createdJob.id}`)
      const fetchedJob = await fetchResponse.json()
      
      expect(fetchedJob.domain).toBe(jobData.domain)
      expect(fetchedJob.llm_used).toBe(jobData.llm_choice)
      expect(fetchedJob.created_at).toBeDefined()
    })

    it('should handle database connection errors gracefully', async () => {
      // Temporarily break database connection
      const originalUrl = process.env.DATABASE_URL
      process.env.DATABASE_URL = 'postgresql://invalid:invalid@localhost:5432/invalid'
      
      const response = await fetch('http://localhost:3001/api/enrichment')
      
      // Restore connection
      process.env.DATABASE_URL = originalUrl
      
      expect(response.status).toBe(500)
    })
  })

  describe('Performance and Load', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => 
        fetch('http://localhost:3001/api/enrichment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            domain: `concurrent-test-${i}.com`,
            llm_choice: 'gpt-4o'
          })
        })
      )

      const responses = await Promise.all(requests)
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201)
      })
    })

    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now()
      
      const response = await fetch('http://localhost:3001/api/health')
      
      const endTime = Date.now()
      const responseTime = endTime - startTime
      
      expect(response.status).toBe(200)
      expect(responseTime).toBeLessThan(1000) // Should respond within 1 second
    })
  })
})
