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

    // Get job logs which represent activities
    const logs = await jobRepository.getJobLogs(jobId, 50)
    
    // Transform logs into activity format
    const activities = logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      type: determineActivityType(log.message, log.level),
      message: log.message,
      details: log.details?.message || log.message,
      level: log.level
    }))

    // If no logs exist but job is running, create some basic activities
    if (activities.length === 0 && job.status === 'running') {
      activities.push({
        id: 'init',
        timestamp: job.started_at || job.created_at,
        type: 'system',
        message: `Job started for ${job.domain}`,
        details: 'Enrichment job initialized',
        level: 'info'
      })
    }

    return NextResponse.json({
      success: true,
      activities: activities.reverse() // Show newest first
    })
  } catch (error) {
    console.error('Error fetching job activities:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}

function determineActivityType(message: string, level: string): string {
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('crawl')) return 'crawling'
  if (lowerMessage.includes('chunk')) return 'chunking'
  if (lowerMessage.includes('embed')) return 'embedding'
  if (lowerMessage.includes('extract') || lowerMessage.includes('fact')) return 'extraction'
  if (lowerMessage.includes('completed') || lowerMessage.includes('finished')) return 'completed'
  if (level === 'error') return 'error'
  
  return 'processing'
}
