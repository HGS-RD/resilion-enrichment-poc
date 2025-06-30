"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  Badge,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@workspace/ui"
import {
  GitBranch,
  Globe,
  FileText,
  Zap,
  Database,
  CheckCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  BarChart3,
  TrendingUp,
  Layers
} from "lucide-react"

interface PipelineStep {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  itemsProcessed: number
  totalItems: number
  quality: number
  bottleneck?: boolean
  errors: number
  avgProcessingTime: number
}

interface DataFlowPanelProps {
  jobId?: string
  className?: string
}

export function DataFlowPanel({ jobId, className }: DataFlowPanelProps) {
  const [steps, setSteps] = useState<PipelineStep[]>([])
  const [selectedStep, setSelectedStep] = useState<string | null>(null)

  // Fetch real pipeline data from API
  useEffect(() => {
    if (!jobId) {
      setSteps([])
      return
    }

    const fetchPipelineData = async () => {
      try {
        const response = await fetch(`/api/enrichment/${jobId}/pipeline`)
        if (response.ok) {
          const data = await response.json()
          setSteps(data.steps || [])
        } else {
          // If no pipeline endpoint exists yet, show empty state
          setSteps([])
        }
      } catch (error) {
        console.error('Failed to fetch pipeline data:', error)
        setSteps([])
      }
    }

    fetchPipelineData()

    // Set up polling for real-time updates every 10 seconds
    const interval = setInterval(fetchPipelineData, 10000)
    return () => clearInterval(interval)
  }, [jobId])

  const getStepIcon = (stepId: string) => {
    switch (stepId) {
      case 'crawling': return <Globe className="h-5 w-5" />
      case 'chunking': return <FileText className="h-5 w-5" />
      case 'embedding': return <Zap className="h-5 w-5" />
      case 'extraction': return <Database className="h-5 w-5" />
      default: return <Layers className="h-5 w-5" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-success border-success bg-success/10'
      case 'running': return 'text-info border-info bg-info/10'
      case 'pending': return 'text-muted-foreground border-border bg-muted/30'
      case 'failed': return 'text-destructive border-destructive bg-destructive/10'
      default: return 'text-muted-foreground border-border bg-muted/30'
    }
  }

  const getQualityColor = (quality: number) => {
    if (quality >= 0.8) return 'text-success'
    if (quality >= 0.6) return 'text-warning'
    return 'text-destructive'
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const selectedStepData = steps.find(step => step.id === selectedStep)

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <GitBranch className="h-4 w-4" />
          Data Flow Pipeline
          {jobId && (
            <Badge variant="outline" className="ml-auto text-xs">
              Live
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {!jobId ? (
          <div className="text-center py-8 text-muted-foreground">
            <GitBranch className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select a job to view pipeline</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pipeline Visualization */}
            <div className="relative">
              <div className="flex items-center justify-between">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            className={`relative p-4 h-auto flex-col gap-2 border-2 transition-all duration-200 ${getStatusColor(step.status)} ${
                              selectedStep === step.id ? 'ring-2 ring-primary' : ''
                            } ${step.bottleneck ? 'ring-2 ring-destructive animate-pulse' : ''}`}
                            onClick={() => setSelectedStep(step.id === selectedStep ? null : step.id)}
                          >
                            {step.bottleneck && (
                              <AlertTriangle className="absolute -top-2 -right-2 h-4 w-4 text-destructive" />
                            )}
                            <div className={getStatusColor(step.status).split(' ')[0]}>
                              {getStepIcon(step.id)}
                            </div>
                            <span className="text-xs font-medium">{step.name}</span>
                            <div className="w-full">
                              <Progress value={step.progress} className="h-1" />
                              <span className="text-xs text-muted-foreground">
                                {Math.round(step.progress)}%
                              </span>
                            </div>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1 text-xs">
                            <p className="font-medium">{step.name}</p>
                            <p>Status: {step.status}</p>
                            <p>Progress: {Math.round(step.progress)}%</p>
                            <p>Items: {step.itemsProcessed}/{step.totalItems}</p>
                            <p>Quality: {(step.quality * 100).toFixed(1)}%</p>
                            <p>Avg Time: {formatDuration(step.avgProcessingTime)}</p>
                            {step.errors > 0 && <p className="text-destructive">Errors: {step.errors}</p>}
                            {step.bottleneck && <p className="text-destructive">⚠ Bottleneck detected</p>}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {index < steps.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground mx-2" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Quality Heatmap */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Quality Metrics
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {steps.map((step) => (
                  <div key={`quality-${step.id}`} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{step.name}</span>
                      <span className={`text-xs font-medium ${getQualityColor(step.quality)}`}>
                        {(step.quality * 100).toFixed(0)}%
                      </span>
                    </div>
                    <Progress 
                      value={step.quality * 100} 
                      className="h-2"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Throughput Metrics */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Throughput Analysis
              </h4>
              <div className="grid grid-cols-2 gap-4">
                {steps.map((step) => (
                  <div key={`throughput-${step.id}`} className="p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium">{step.name}</span>
                      {step.bottleneck && (
                        <Badge variant="destructive" className="text-xs">
                          Bottleneck
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Processed:</span>
                        <span>{step.itemsProcessed}/{step.totalItems}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Time:</span>
                        <span>{formatDuration(step.avgProcessingTime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Rate:</span>
                        <span>{Math.round(step.itemsProcessed / (step.avgProcessingTime / 1000))}/s</span>
                      </div>
                      {step.errors > 0 && (
                        <div className="flex justify-between text-destructive">
                          <span>Errors:</span>
                          <span>{step.errors}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Step Details */}
            {selectedStepData && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  {getStepIcon(selectedStepData.id)}
                  {selectedStepData.name} Details
                </h4>
                <div className="p-4 rounded-lg border bg-muted/30">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className={`ml-2 ${getStatusColor(selectedStepData.status)}`}>
                        {selectedStepData.status}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Progress:</span>
                      <span className="ml-2 font-medium">{Math.round(selectedStepData.progress)}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Items Processed:</span>
                      <span className="ml-2 font-medium">{selectedStepData.itemsProcessed}/{selectedStepData.totalItems}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Quality Score:</span>
                      <span className={`ml-2 font-medium ${getQualityColor(selectedStepData.quality)}`}>
                        {(selectedStepData.quality * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Avg Processing Time:</span>
                      <span className="ml-2 font-medium">{formatDuration(selectedStepData.avgProcessingTime)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Error Count:</span>
                      <span className={`ml-2 font-medium ${selectedStepData.errors > 0 ? 'text-destructive' : 'text-success'}`}>
                        {selectedStepData.errors}
                      </span>
                    </div>
                  </div>
                  {selectedStepData.bottleneck && (
                    <div className="mt-3 p-2 rounded bg-destructive/10 border border-destructive/20">
                      <div className="flex items-center gap-2 text-destructive text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">Bottleneck Detected</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        This step is processing slower than expected and may be limiting overall throughput.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
