"use client"

import { useState, useEffect, useCallback } from "react"

export interface EnrichmentJob {
  id: string
  domain: string
  status: "pending" | "running" | "completed" | "failed"
  startTime: string
  endTime?: string
  factsFound: number
  progress?: {
    currentStep: string
    stepsCompleted: number
    totalSteps: number
    pagesCrawled: number
    chunksCreated: number
    embeddingsProgress: number
  }
  error?: string
}

export interface JobStats {
  totalJobs: number
  successRate: number
  avgConfidence: number
  factsFound: number
}

interface UseEnrichmentJobsReturn {
  jobs: EnrichmentJob[]
  stats: JobStats
  isLoading: boolean
  error: string | null
  createJob: (domain: string) => Promise<string | null>
  startJob: (jobId: string) => Promise<boolean>
  refreshJobs: () => Promise<void>
  getJobById: (jobId: string) => EnrichmentJob | undefined
  deleteJob: (jobId: string) => Promise<boolean>
}

// Initial empty stats - will be populated from real data
const initialStats: JobStats = {
  totalJobs: 0,
  successRate: 0,
  avgConfidence: 0,
  factsFound: 0
}

// Helper functions to convert backend job format to frontend format
function getStepFromStatus(job: any): string {
  if (job.status === 'completed') return 'completed'
  if (job.status === 'failed') return 'failed'
  if (job.status === 'pending') return 'pending'
  
  // For running jobs, determine current step based on step statuses
  if (job.extraction_status === 'running') return 'extraction'
  if (job.embedding_status === 'running') return 'embedding'
  if (job.chunking_status === 'running') return 'chunking'
  if (job.crawling_status === 'running') return 'crawling'
  
  // Default to first step if running but no specific step is running
  return 'crawling'
}

function getCompletedSteps(job: any): number {
  let completed = 0
  if (job.crawling_status === 'completed') completed++
  if (job.chunking_status === 'completed') completed++
  if (job.embedding_status === 'completed') completed++
  if (job.extraction_status === 'completed') completed++
  return completed
}

function getEmbeddingProgress(job: any): number {
  if (job.status === 'completed') return 100
  if (job.status === 'failed') return 0
  
  // Calculate progress based on completed steps and current progress
  const completedSteps = getCompletedSteps(job)
  const baseProgress = (completedSteps / 4) * 100
  
  // Add some progress for current running step
  if (job.status === 'running') {
    return Math.min(baseProgress + 10, 95) // Never show 100% until actually completed
  }
  
  return baseProgress
}

export function useEnrichmentJobs(): UseEnrichmentJobsReturn {
  const [jobs, setJobs] = useState<EnrichmentJob[]>([])
  const [stats, setStats] = useState<JobStats>(initialStats)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch real jobs on mount
  useEffect(() => {
    refreshJobs()
  }, [])

  // Real-time updates for running jobs - fetch from backend instead of simulating
  useEffect(() => {
    const interval = setInterval(() => {
      // Only refresh if there are running jobs
      const hasRunningJobs = jobs.some(job => job.status === "running")
      if (hasRunningJobs) {
        refreshJobs()
      }
    }, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [jobs])

  const createJob = useCallback(async (domain: string): Promise<string | null> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/enrichment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create job')
      }

      if (data.success && data.job) {
        // Convert backend job format to frontend format
        const newJob: EnrichmentJob = {
          id: data.job.id,
          domain: data.job.domain,
          status: data.job.status,
          startTime: data.job.created_at,
          endTime: data.job.completed_at,
          factsFound: data.job.facts_extracted || 0,
          error: data.job.error_message,
          progress: {
            currentStep: getStepFromStatus(data.job),
            stepsCompleted: getCompletedSteps(data.job),
            totalSteps: 7,
            pagesCrawled: data.job.pages_crawled || 0,
            chunksCreated: data.job.chunks_created || 0,
            embeddingsProgress: getEmbeddingProgress(data.job)
          }
        }

        setJobs(currentJobs => {
          // Check if job already exists and update it, otherwise add new
          const existingIndex = currentJobs.findIndex(job => job.id === newJob.id)
          if (existingIndex >= 0) {
            const updated = [...currentJobs]
            updated[existingIndex] = newJob
            return updated
          }
          return [newJob, ...currentJobs]
        })

        return newJob.id
      }

      throw new Error('Invalid response format')
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job")
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const startJob = useCallback(async (jobId: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/enrichment/${jobId}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to start job')
      }

      if (data.success && data.job) {
        // Convert backend job format to frontend format and update state
        const updatedJob: EnrichmentJob = {
          id: data.job.id,
          domain: data.job.domain,
          status: data.job.status,
          startTime: data.job.created_at,
          endTime: data.job.completed_at,
          factsFound: data.job.facts_extracted || 0,
          error: data.job.error_message,
          progress: {
            currentStep: getStepFromStatus(data.job),
            stepsCompleted: getCompletedSteps(data.job),
            totalSteps: 7,
            pagesCrawled: data.job.pages_crawled || 0,
            chunksCreated: data.job.chunks_created || 0,
            embeddingsProgress: getEmbeddingProgress(data.job)
          }
        }

        setJobs(currentJobs =>
          currentJobs.map(job =>
            job.id === jobId ? updatedJob : job
          )
        )

        return true
      }

      throw new Error('Invalid response format')
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start job")
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refreshJobs = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/enrichment', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch jobs')
      }

      if (data.success && data.jobs) {
        // Convert backend jobs format to frontend format
        const fetchedJobs: EnrichmentJob[] = data.jobs.map((job: any) => ({
          id: job.id,
          domain: job.domain,
          status: job.status,
          startTime: job.created_at,
          endTime: job.completed_at,
          factsFound: job.facts_extracted || 0,
          error: job.error_message,
          progress: {
            currentStep: getStepFromStatus(job),
            stepsCompleted: getCompletedSteps(job),
            totalSteps: 7,
            pagesCrawled: job.pages_crawled || 0,
            chunksCreated: job.chunks_created || 0,
            embeddingsProgress: getEmbeddingProgress(job)
          }
        }))

        setJobs(fetchedJobs)

        // Update stats based on fetched jobs
        const totalJobs = fetchedJobs.length
        const completedJobs = fetchedJobs.filter(job => job.status === 'completed').length
        const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0
        const totalFacts = fetchedJobs.reduce((sum, job) => sum + job.factsFound, 0)

        setStats({
          totalJobs,
          successRate,
          avgConfidence: 87.5, // This would come from backend in real implementation
          factsFound: totalFacts
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh jobs")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deleteJob = useCallback(async (jobId: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/enrichment/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete job')
      }

      if (data.success) {
        // Refresh jobs list after deletion
        await refreshJobs()
        
        return true
      }

      throw new Error('Invalid response format')
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete job")
      return false
    } finally {
      setIsLoading(false)
    }
  }, [refreshJobs])

  const getJobById = useCallback((jobId: string): EnrichmentJob | undefined => {
    return jobs.find(job => job.id === jobId)
  }, [jobs])

  return {
    jobs,
    stats,
    isLoading,
    error,
    createJob,
    startJob,
    refreshJobs,
    getJobById,
    deleteJob
  }
}
