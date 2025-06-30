import { NextRequest, NextResponse } from 'next/server'
import { JobRepository } from '../../../../../lib/repositories/job-repository'

const jobRepository = new JobRepository()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const jobId = params.id

    // Check if job exists
    const job = await jobRepository.findById(jobId)
    if (!job) {
      return NextResponse.json(
        { success: false, message: 'Job not found' },
        { status: 404 }
      )
    }

    // Fetch real activity data from job_logs table
    const logs = await jobRepository.getJobLogs(jobId, 50)
    
    // Transform logs into activity format
    const activities = logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      type: determineActivityType(log.message, log.level),
      message: log.message,
      details: log.details ? formatLogDetails(log.details) : undefined
    }))

    // If no logs exist, generate basic status-based activities
    if (activities.length === 0) {
      const statusActivities = generateStatusBasedActivities(job)
      activities.push(...statusActivities)
    }

    return NextResponse.json({
      success: true,
      activities
    })
  } catch (error) {
    console.error('Error fetching job activity:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch job activity' },
      { status: 500 }
    )
  }
}

function determineActivityType(message: string, level: string): string {
  const lowerMessage = message.toLowerCase()
  
  if (level === 'error') return 'error'
  if (lowerMessage.includes('crawl')) return 'crawling'
  if (lowerMessage.includes('chunk')) return 'chunking'
  if (lowerMessage.includes('embed')) return 'embedding'
  if (lowerMessage.includes('extract') || lowerMessage.includes('fact')) return 'extraction'
  if (lowerMessage.includes('complet')) return 'completed'
  if (lowerMessage.includes('start')) return 'info'
  
  return 'info'
}

function formatLogDetails(details: any): string {
  if (typeof details === 'string') return details
  if (typeof details === 'object') {
    // Extract meaningful information from details object
    if (details.step) return `Step: ${details.step}`
    if (details.error_type) return `Error type: ${details.error_type}`
    if (details.pages_found) return `Found ${details.pages_found} pages`
    if (details.chunks_created) return `Created ${details.chunks_created} chunks`
    return JSON.stringify(details)
  }
  return ''
}

function generateStatusBasedActivities(job: any): any[] {
  const activities = []
  const baseTime = new Date(job.created_at).getTime()
  
  // Only generate basic status activities if no logs exist
  if (job.status === 'completed' || job.status === 'running') {
    activities.push({
      id: `status-${job.id}`,
      timestamp: job.created_at,
      type: 'info',
      message: `Job created for ${job.domain}`,
      details: 'Enrichment job initialized'
    })
    
    if (job.started_at) {
      activities.push({
        id: `started-${job.id}`,
        timestamp: job.started_at,
        type: 'info',
        message: `Started processing ${job.domain}`,
        details: 'Job execution began'
      })
    }
    
    if (job.status === 'completed' && job.completed_at) {
      activities.push({
        id: `completed-${job.id}`,
        timestamp: job.completed_at,
        type: 'completed',
        message: `Completed processing ${job.domain}`,
        details: `Processed ${job.pages_crawled} pages, created ${job.chunks_created} chunks, extracted ${job.facts_extracted} facts`
      })
    }
  }
  
  if (job.status === 'failed') {
    activities.push({
      id: `failed-${job.id}`,
      timestamp: job.updated_at,
      type: 'error',
      message: `Job failed: ${job.error_message || 'Unknown error'}`,
      details: 'Job processing encountered an error'
    })
  }
  
  return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}
