import { NextRequest, NextResponse } from 'next/server'
import { JobRepository } from '../../../../lib/repositories/job-repository'

const jobRepository = new JobRepository()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const job = await jobRepository.findById(id)
    
    if (!job) {
      return NextResponse.json(
        { success: false, message: 'Job not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      job
    })
  } catch (error) {
    console.error('Error fetching job:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to fetch job' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const jobId = id

    // Check if job exists
    const existingJob = await jobRepository.findById(jobId)
    if (!existingJob) {
      return NextResponse.json(
        { success: false, message: 'Job not found' },
        { status: 404 }
      )
    }

    // Delete the job and all associated data
    const deleted = await jobRepository.deleteJob(jobId)
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, message: 'Failed to delete job' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Job and all associated data deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting job:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to delete job' },
      { status: 500 }
    )
  }
}
