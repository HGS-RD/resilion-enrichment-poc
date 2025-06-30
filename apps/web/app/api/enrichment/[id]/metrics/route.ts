import { NextRequest, NextResponse } from 'next/server'
import { JobRepository } from '../../../../../lib/repositories/job-repository'

const jobRepository = new JobRepository()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const jobId = id

    // Check if job exists
    const job = await jobRepository.findById(jobId)
    if (!job) {
      return NextResponse.json(
        { success: false, message: 'Job not found' },
        { status: 404 }
      )
    }

    // Calculate metrics based on job data
    const startTime = new Date(job.started_at || job.created_at)
    const currentTime = new Date()
    const elapsedTime = currentTime.getTime() - startTime.getTime()
    const elapsedMinutes = Math.floor(elapsedTime / (1000 * 60))
    const elapsedSeconds = Math.floor(elapsedTime / 1000)

    // Calculate processing speed (pages per minute)
    const processingSpeed = elapsedMinutes > 0 ? 
      Math.round((job.pages_crawled / elapsedMinutes) * 10) / 10 : 0

    // Estimate API cost based on pages crawled and embeddings
    const estimatedApiCost = (job.pages_crawled * 0.002) + (job.embeddings_generated * 0.0001)

    // Calculate token usage estimate
    const avgTokensPerPage = 1500
    const tokenUsage = job.pages_crawled * avgTokensPerPage

    // Calculate completion percentage
    const totalSteps = 4 // crawling, chunking, embedding, extraction
    let completedSteps = 0
    if (job.crawling_status === 'completed') completedSteps++
    if (job.chunking_status === 'completed') completedSteps++
    if (job.embedding_status === 'completed') completedSteps++
    if (job.extraction_status === 'completed') completedSteps++
    
    const completionPercentage = Math.round((completedSteps / totalSteps) * 100)

    // Memory usage estimate (MB)
    const memoryUsage = Math.min(512, job.chunks_created * 0.1 + job.embeddings_generated * 0.05)

    const metrics = {
      processingSpeed: {
        value: processingSpeed,
        unit: 'pages/min',
        trend: processingSpeed > 2 ? 'up' : processingSpeed > 1 ? 'stable' : 'down'
      },
      apiCost: {
        value: estimatedApiCost,
        unit: 'USD',
        trend: 'up'
      },
      tokenUsage: {
        value: tokenUsage,
        unit: 'tokens',
        trend: 'up'
      },
      completionPercentage: {
        value: completionPercentage,
        unit: '%',
        trend: job.status === 'running' ? 'up' : 'stable'
      },
      memoryUsage: {
        value: Math.round(memoryUsage),
        unit: 'MB',
        trend: 'up'
      },
      elapsedTime: {
        value: elapsedSeconds,
        unit: 'seconds',
        trend: 'up'
      },
      // Progress metrics
      pagesCrawled: job.pages_crawled,
      chunksCreated: job.chunks_created,
      embeddingsGenerated: job.embeddings_generated,
      factsExtracted: job.facts_extracted,
      // Status metrics
      currentStep: getCurrentStep(job),
      status: job.status
    }

    return NextResponse.json({
      success: true,
      metrics
    })
  } catch (error) {
    console.error('Error fetching job metrics:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}

function getCurrentStep(job: any): string {
  if (job.status === 'completed') return 'completed'
  if (job.status === 'failed') return 'failed'
  if (job.status === 'pending') return 'pending'
  
  // For running jobs, determine current step
  if (job.extraction_status === 'running') return 'extraction'
  if (job.embedding_status === 'running') return 'embedding'
  if (job.chunking_status === 'running') return 'chunking'
  if (job.crawling_status === 'running') return 'crawling'
  
  // Default to first step if running but no specific step is running
  return 'crawling'
}
