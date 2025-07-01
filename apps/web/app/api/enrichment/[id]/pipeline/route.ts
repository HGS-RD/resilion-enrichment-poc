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

    // Calculate pipeline steps based on job data
    const steps = [
      {
        id: 'crawling',
        name: 'Web Crawling',
        status: job.crawling_status || 'pending',
        progress: calculateStepProgress(job.crawling_status, job.pages_crawled, job.pages_scraped),
        itemsProcessed: job.pages_crawled || 0,
        totalItems: job.pages_scraped || 1,
        quality: calculateQualityScore(job.crawling_status, job.pages_crawled),
        bottleneck: isBottleneck('crawling', job),
        errors: 0, // Could be extracted from logs
        avgProcessingTime: estimateProcessingTime('crawling', job)
      },
      {
        id: 'chunking',
        name: 'Text Chunking',
        status: job.chunking_status || 'pending',
        progress: calculateStepProgress(job.chunking_status, job.chunks_created, job.pages_crawled),
        itemsProcessed: job.chunks_created || 0,
        totalItems: Math.max(job.pages_crawled || 0, 1),
        quality: calculateQualityScore(job.chunking_status, job.chunks_created),
        bottleneck: isBottleneck('chunking', job),
        errors: 0,
        avgProcessingTime: estimateProcessingTime('chunking', job)
      },
      {
        id: 'embedding',
        name: 'Embeddings',
        status: job.embedding_status || 'pending',
        progress: calculateStepProgress(job.embedding_status, job.embeddings_generated, job.chunks_created),
        itemsProcessed: job.embeddings_generated || 0,
        totalItems: Math.max(job.chunks_created || 0, 1),
        quality: calculateQualityScore(job.embedding_status, job.embeddings_generated),
        bottleneck: isBottleneck('embedding', job),
        errors: 0,
        avgProcessingTime: estimateProcessingTime('embedding', job)
      },
      {
        id: 'extraction',
        name: 'Fact Extraction',
        status: job.extraction_status || 'pending',
        progress: calculateStepProgress(job.extraction_status, job.facts_extracted, job.embeddings_generated),
        itemsProcessed: job.facts_extracted || 0,
        totalItems: Math.max(job.embeddings_generated || 0, 1),
        quality: calculateQualityScore(job.extraction_status, job.facts_extracted),
        bottleneck: isBottleneck('extraction', job),
        errors: 0,
        avgProcessingTime: estimateProcessingTime('extraction', job)
      }
    ]

    return NextResponse.json({
      success: true,
      steps,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching pipeline data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pipeline data' },
      { status: 500 }
    )
  }
}

function calculateStepProgress(status: string, processed: number, total: number): number {
  if (status === 'completed') return 100
  if (status === 'failed') return 0
  if (status === 'pending') return 0
  if (status === 'running') {
    if (total === 0) return 50 // Assume 50% if we don't have total
    return Math.min(95, (processed / total) * 100) // Cap at 95% for running jobs
  }
  return 0
}

function calculateQualityScore(status: string, itemsProcessed: number): number {
  if (status === 'failed') return 0
  if (status === 'pending') return 0
  if (status === 'completed') {
    // Quality based on items processed - more items generally means better quality
    if (itemsProcessed === 0) return 0.5
    if (itemsProcessed < 5) return 0.6
    if (itemsProcessed < 20) return 0.75
    if (itemsProcessed < 50) return 0.85
    return 0.9
  }
  if (status === 'running') {
    // Running quality is slightly lower
    if (itemsProcessed === 0) return 0.4
    if (itemsProcessed < 5) return 0.5
    if (itemsProcessed < 20) return 0.65
    if (itemsProcessed < 50) return 0.75
    return 0.8
  }
  return 0.5
}

function isBottleneck(stepId: string, job: any): boolean {
  // Simple heuristic: a step is a bottleneck if it's running but has low throughput
  const stepStatus = getStepStatus(stepId, job)
  if (stepStatus !== 'running') return false
  
  // Check if this step is significantly slower than others
  const processed = getStepProcessed(stepId, job)
  const runtime = job.total_runtime_seconds || 1
  
  // If processing rate is very low, consider it a bottleneck
  const processingRate = processed / runtime
  
  switch (stepId) {
    case 'crawling':
      return processingRate < 0.1 // Less than 0.1 pages per second
    case 'chunking':
      return processingRate < 0.5 // Less than 0.5 chunks per second
    case 'embedding':
      return processingRate < 0.3 // Less than 0.3 embeddings per second
    case 'extraction':
      return processingRate < 0.1 // Less than 0.1 facts per second
    default:
      return false
  }
}

function estimateProcessingTime(stepId: string, job: any): number {
  const runtime = job.total_runtime_seconds || 1
  const processed = getStepProcessed(stepId, job)
  
  if (processed === 0) {
    // Return estimated time based on step type
    switch (stepId) {
      case 'crawling': return 2000 // 2 seconds per page
      case 'chunking': return 500  // 0.5 seconds per chunk
      case 'embedding': return 1000 // 1 second per embedding
      case 'extraction': return 3000 // 3 seconds per fact
      default: return 1000
    }
  }
  
  // Calculate actual average time
  return (runtime * 1000) / processed // Convert to milliseconds
}

function getStepStatus(stepId: string, job: any): string {
  switch (stepId) {
    case 'crawling': return job.crawling_status || 'pending'
    case 'chunking': return job.chunking_status || 'pending'
    case 'embedding': return job.embedding_status || 'pending'
    case 'extraction': return job.extraction_status || 'pending'
    default: return 'pending'
  }
}

function getStepProcessed(stepId: string, job: any): number {
  switch (stepId) {
    case 'crawling': return job.pages_crawled || 0
    case 'chunking': return job.chunks_created || 0
    case 'embedding': return job.embeddings_generated || 0
    case 'extraction': return job.facts_extracted || 0
    default: return 0
  }
}
