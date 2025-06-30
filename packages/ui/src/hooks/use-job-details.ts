import { useState, useEffect, useCallback } from 'react';

export interface JobDetail {
  id: string;
  domain: string;
  status: 'pending' | 'running' | 'completed' | 'partial_success' | 'failed' | 'cancelled';
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  retry_count: number;
  llm_used?: string;
  pages_scraped: number;
  total_runtime_seconds: number;
  workflow: {
    steps: Array<{
      id: string;
      name: string;
      status: 'pending' | 'running' | 'completed' | 'failed';
    }>;
    currentStep: string;
    completedSteps: number;
    totalSteps: number;
    progress: {
      pagesCrawled: number;
      chunksCreated: number;
      embeddingsGenerated: number;
      factsExtracted: number;
    };
  };
}

export interface JobFact {
  id: string;
  type: string;
  data: Record<string, any>;
  confidence: number;
  evidence: string;
  sourceUrl?: string;
  tier?: number;
  validated: boolean;
  validationNotes?: string;
  createdAt: string;
}

export interface JobStatistics {
  total_facts: number;
  validated_facts: number;
  fact_types: Record<string, number>;
  avg_confidence: number;
  tier_distribution: Record<number, number>;
  tier_confidence: Record<number, number>;
  runtime: number;
  llmUsed?: string;
  pagesScraped: number;
}

export interface JobLog {
  id: string;
  level: string;
  message: string;
  details: any;
  timestamp: string;
}

export interface JobDetailsResponse {
  job: JobDetail;
  facts: JobFact[];
  statistics: JobStatistics;
  logs: JobLog[];
}

export function useJobDetails(jobId: string | null) {
  const [data, setData] = useState<JobDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchJobDetails = useCallback(async () => {
    if (!jobId) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/enrichment/${jobId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Job not found');
        }
        throw new Error(`Failed to fetch job details: ${response.statusText}`);
      }

      const jobData = await response.json();
      setData(jobData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job details';
      setError(errorMessage);
      console.error('Error fetching job details:', err);
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  // Initial fetch
  useEffect(() => {
    fetchJobDetails();
  }, [fetchJobDetails]);

  // Auto-refresh for running jobs
  useEffect(() => {
    if (!data?.job || data.job.status !== 'running') {
      return;
    }

    const interval = setInterval(() => {
      fetchJobDetails();
    }, 5000); // Refresh every 5 seconds for running jobs

    return () => clearInterval(interval);
  }, [data?.job?.status, fetchJobDetails]);

  const refreshJobDetails = useCallback(() => {
    fetchJobDetails();
  }, [fetchJobDetails]);

  return {
    data,
    isLoading,
    error,
    refreshJobDetails
  };
}

// Helper functions for working with job details
export const getJobStatusColor = (status: JobDetail['status']) => {
  switch (status) {
    case 'completed':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'running':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'pending':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'partial_success':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'failed':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'cancelled':
      return 'text-gray-600 bg-gray-50 border-gray-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

export const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return 'text-green-600';
  if (confidence >= 0.6) return 'text-yellow-600';
  return 'text-red-600';
};

export const getConfidenceLabel = (confidence: number) => {
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.6) return 'Medium';
  return 'Low';
};

export const getTierColor = (tier: number) => {
  switch (tier) {
    case 1:
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 2:
      return 'text-purple-600 bg-purple-50 border-purple-200';
    case 3:
      return 'text-orange-600 bg-orange-50 border-orange-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

export const getTierLabel = (tier: number) => {
  switch (tier) {
    case 1:
      return 'Corporate';
    case 2:
      return 'Professional';
    case 3:
      return 'News';
    default:
      return 'Unknown';
  }
};

export const formatDuration = (seconds: number) => {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
};

export const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString();
};
