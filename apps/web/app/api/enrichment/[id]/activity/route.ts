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

    // Get job logs which serve as activity events
    const logs = await jobRepo.getJobLogs(jobId, 50) // Get more logs for activity feed

    // Transform logs into activity events
    const activities = logs.map((log, index) => ({
      id: log.id || `activity-${index}`,
      timestamp: log.timestamp,
      type: mapLogLevelToActivityType(log.level, log.message),
      step: extractStepFromMessage(log.message),
      message: log.message,
      details: log.details,
      severity: mapLogLevelToSeverity(log.level),
      metadata: extractMetadataFromLog(log)
    }))

    // Add synthetic activity events based on job status
    const syntheticActivities = generateSyntheticActivities(job)
    
    // Combine and sort by timestamp
    const allActivities = [...activities, ...syntheticActivities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({
      success: true,
      activities: allActivities,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching job activity:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job activity' },
      { status: 500 }
    )
  }
}

function mapLogLevelToActivityType(level: string, message: string): string {
  if (level === 'error') return 'error'
  if (message.toLowerCase().includes('crawl')) return 'crawling'
  if (message.toLowerCase().includes('chunk')) return 'chunking'
  if (message.toLowerCase().includes('embed')) return 'embedding'
  if (message.toLowerCase().includes('extract') || message.toLowerCase().includes('fact')) return 'extraction'
  if (message.toLowerCase().includes('complet')) return 'completed'
  return 'info'
}

function extractStepFromMessage(message: string): string {
  const lowerMessage = message.toLowerCase()
  if (lowerMessage.includes('crawl')) return 'Web Crawling'
  if (lowerMessage.includes('chunk')) return 'Text Chunking'
  if (lowerMessage.includes('embed')) return 'Embeddings'
  if (lowerMessage.includes('extract') || lowerMessage.includes('fact')) return 'Fact Extraction'
  if (lowerMessage.includes('complet')) return 'Completion'
  return 'System'
}

function mapLogLevelToSeverity(level: string): string {
  switch (level) {
    case 'error': return 'critical'
    case 'warn': return 'medium'
    case 'info': return 'low'
    default: return 'low'
  }
}

function extractMetadataFromLog(log: any): Record<string, any> {
  const metadata: Record<string, any> = {}
  
  // Try to extract tokens, cost, duration from log message or details
  const message = `${log.message} ${log.details || ''}`.toLowerCase()
  
  // Extract token count
  const tokenMatch = message.match(/(\d+)\s*tokens?/)
  if (tokenMatch) {
    metadata.tokens = parseInt(tokenMatch[1])
  }
  
  // Extract cost
  const costMatch = message.match(/\$?(\d+\.?\d*)\s*(cost|usd|dollar)/)
  if (costMatch) {
    metadata.cost = parseFloat(costMatch[1])
  }
  
  // Extract duration
  const durationMatch = message.match(/(\d+\.?\d*)\s*(ms|seconds?|minutes?)/)
  if (durationMatch) {
    const value = parseFloat(durationMatch[1])
    const unit = durationMatch[2]
    if (unit.startsWith('ms')) {
      metadata.duration = value
    } else if (unit.startsWith('second')) {
      metadata.duration = value * 1000
    } else if (unit.startsWith('minute')) {
      metadata.duration = value * 60000
    }
  }
  
  return metadata
}

function generateSyntheticActivities(job: any): any[] {
  const activities = []
  const now = new Date().toISOString()
  
  // Add job creation activity
  if (job.created_at) {
    activities.push({
      id: `synthetic-created-${job.id}`,
      timestamp: job.created_at,
      type: 'info',
      step: 'Job Creation',
      message: `Enrichment job created for domain: ${job.domain}`,
      details: `Job ID: ${job.id}`,
      severity: 'low',
      metadata: {}
    })
  }
  
  // Add job start activity
  if (job.started_at) {
    activities.push({
      id: `synthetic-started-${job.id}`,
      timestamp: job.started_at,
      type: 'info',
      step: 'Job Start',
      message: `Job execution started`,
      details: `LLM: ${job.llm_used || 'Not specified'}`,
      severity: 'low',
      metadata: {}
    })
  }
  
  // Add completion activity
  if (job.completed_at) {
    activities.push({
      id: `synthetic-completed-${job.id}`,
      timestamp: job.completed_at,
      type: 'completed',
      step: 'Job Completion',
      message: `Job completed successfully`,
      details: `Total facts extracted: ${job.facts_extracted || 0}`,
      severity: 'low',
      metadata: {
        facts: job.facts_extracted || 0,
        duration: job.total_runtime_seconds ? job.total_runtime_seconds * 1000 : undefined
      }
    })
  }
  
  // Add error activity if job failed
  if (job.status === 'failed' && job.error_message) {
    activities.push({
      id: `synthetic-error-${job.id}`,
      timestamp: job.updated_at || now,
      type: 'error',
      step: 'Job Failure',
      message: `Job failed with error`,
      details: job.error_message,
      severity: 'critical',
      metadata: {}
    })
  }
  
  return activities
}
