import { NextRequest, NextResponse } from 'next/server'
import { JobRepository } from '../../../../../lib/repositories/job-repository'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params
    const jobRepo = new JobRepository()
    
    // Get job details
    const job = await jobRepo.findById(jobId)
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Calculate metrics based on job data
    const now = new Date()
    const startTime = job.started_at ? new Date(job.started_at) : new Date(job.created_at)
    const elapsedTimeMs = now.getTime() - startTime.getTime()
    const elapsedTimeSeconds = Math.floor(elapsedTimeMs / 1000)

    // Get job statistics for additional metrics - use facts_extracted as proxy for total facts
    const totalFacts = job.facts_extracted || 0
    
    // Calculate processing speed (pages per minute)
    const pagesScraped = job.pages_scraped || 0
    const processingSpeed = elapsedTimeSeconds > 0 ? (pagesScraped / (elapsedTimeSeconds / 60)) : 0

    // Estimate API costs (rough calculation based on token usage)
    const estimatedTokens = totalFacts * 150 // Rough estimate
    const estimatedCost = estimatedTokens * 0.00002 // Rough GPT-4 pricing

    // Calculate completion percentage based on job status
    let completionPercentage = 0
    if (job.status === 'completed') {
      completionPercentage = 100
    } else if (job.status === 'running') {
      // Estimate based on facts found vs expected
      completionPercentage = Math.min(90, totalFacts * 10)
    } else if (job.status === 'failed') {
      completionPercentage = 0
    }

    // Memory usage estimation (rough calculation)
    const memoryUsage = Math.max(50, totalFacts * 0.5 + 30)

    const metrics = {
      processingSpeed: {
        value: Math.round(processingSpeed * 10) / 10,
        unit: 'pages/min',
        trend: 'stable' as const
      },
      apiCost: {
        value: estimatedCost,
        unit: 'USD',
        trend: 'up' as const
      },
      tokenUsage: {
        value: estimatedTokens,
        unit: 'tokens',
        trend: 'up' as const
      },
      completionPercentage: {
        value: completionPercentage,
        unit: '%',
        trend: job.status === 'running' ? 'up' as const : 'stable' as const
      },
      memoryUsage: {
        value: Math.round(memoryUsage),
        unit: 'MB',
        trend: 'stable' as const
      },
      elapsedTime: {
        value: elapsedTimeSeconds,
        unit: 'seconds',
        trend: job.status === 'running' ? 'up' as const : 'stable' as const
      }
    }

    return NextResponse.json({
      success: true,
      metrics,
      timestamp: now.toISOString()
    })

  } catch (error) {
    console.error('Error fetching job metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job metrics' },
      { status: 500 }
    )
  }
}
