"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../../@workspace/ui/components/card"
import { Progress } from "../../@workspace/ui/components/progress"
import { Badge } from "../../@workspace/ui/components/badge"
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Loader2,
  Globe,
  Scissors,
  Link,
  FileText,
  Star,
  Database,
  CheckSquare
} from "lucide-react"

export interface WorkflowStep {
  id: string
  name: string
  description: string
  status: "pending" | "running" | "completed" | "failed"
  icon: React.ReactNode
  duration?: number
  error?: string
}

interface WorkflowProgressProps {
  jobId: string
  domain: string
  currentStep: string
  stepsCompleted: number
  totalSteps: number
  progress?: {
    pagesCrawled: number
    chunksCreated: number
    embeddingsProgress: number
  }
  className?: string
}

const workflowSteps: WorkflowStep[] = [
  {
    id: "crawling",
    name: "Web Crawling",
    description: "Extracting content from company website",
    status: "pending",
    icon: <Globe className="h-4 w-4" />
  },
  {
    id: "chunking",
    name: "Text Chunking",
    description: "Breaking content into manageable segments",
    status: "pending",
    icon: <Scissors className="h-4 w-4" />
  },
  {
    id: "embedding",
    name: "Embeddings",
    description: "Creating vector representations of text",
    status: "pending",
    icon: <Link className="h-4 w-4" />
  },
  {
    id: "extraction",
    name: "Fact Extraction",
    description: "Using AI to extract structured facts",
    status: "pending",
    icon: <FileText className="h-4 w-4" />
  },
  {
    id: "scoring",
    name: "Confidence Scoring",
    description: "Calculating confidence levels for facts",
    status: "pending",
    icon: <Star className="h-4 w-4" />
  },
  {
    id: "persistence",
    name: "Data Persistence",
    description: "Storing facts in database",
    status: "pending",
    icon: <Database className="h-4 w-4" />
  },
  {
    id: "finalization",
    name: "Finalization",
    description: "Completing job and cleanup",
    status: "pending",
    icon: <CheckSquare className="h-4 w-4" />
  }
]

export function WorkflowProgress({ 
  jobId, 
  domain, 
  currentStep, 
  stepsCompleted, 
  totalSteps,
  progress,
  className 
}: WorkflowProgressProps) {
  // Update step statuses based on current progress
  const updatedSteps = workflowSteps.map((step, index) => {
    if (index < stepsCompleted) {
      return { ...step, status: "completed" as const }
    } else if (step.id === currentStep) {
      return { ...step, status: "running" as const }
    } else {
      return { ...step, status: "pending" as const }
    }
  })

  const getStatusIcon = (status: WorkflowStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "running":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: WorkflowStep["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200"
      case "running":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "failed":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-600 border-gray-200"
    }
  }

  const overallProgress = (stepsCompleted / totalSteps) * 100

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Enrichment Workflow</CardTitle>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
            <span>Job ID: {jobId}</span>
            <span>•</span>
            <span>{domain}</span>
          </div>
        </div>
        <Badge variant="outline" className="text-blue-600 border-blue-200">
          {Math.round(overallProgress)}% Complete
        </Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-gray-600">
              {stepsCompleted} of {totalSteps} steps completed
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
        </div>

        {/* Workflow Steps */}
        <div className="space-y-3">
          {updatedSteps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                step.status === "running" ? "bg-blue-50 border-blue-200" : 
                step.status === "completed" ? "bg-green-50 border-green-200" :
                "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex-shrink-0">
                {getStatusIcon(step.status)}
              </div>
              <div className="flex-shrink-0 text-gray-600">
                {step.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-gray-900">
                    {step.name}
                  </h4>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getStatusColor(step.status)}`}
                  >
                    {step.status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {step.description}
                </p>
              </div>
              <div className="flex-shrink-0 text-xs text-gray-500">
                Step {index + 1}
              </div>
            </div>
          ))}
        </div>

        {/* Progress Statistics */}
        {progress && (
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {progress.pagesCrawled}
              </div>
              <div className="text-xs text-gray-600">Pages Crawled</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {progress.chunksCreated}
              </div>
              <div className="text-xs text-gray-600">Chunks Created</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {Math.round(progress.embeddingsProgress)}%
              </div>
              <div className="text-xs text-gray-600">Embeddings</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
