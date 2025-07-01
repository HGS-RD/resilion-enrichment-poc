"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Badge,
  Button,
  ScrollArea,
  Progress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@workspace/ui"
import { cn } from "@workspace/ui"
import {
  ChevronDown,
  ChevronRight,
  Code2,
  Database,
  Zap,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  FileText,
  Brain,
  Target,
  TrendingUp,
  Copy,
  ExternalLink,
  RefreshCw
} from "lucide-react"

interface JobDebugData {
  job: any
  steps: any[]
  logs: any[]
  metrics: any[]
  errors: any[]
  summary: {
    total_chunks: number
    total_embeddings: number
    total_facts: number
    total_prompts: number
    total_model_responses: number
    avg_confidence: number
    avg_chunk_quality: number
    total_api_cost: number
    total_tokens_used: number
    avg_response_time: number
    total_duration_ms: number
  }
}

interface PromptData {
  prompts: any[]
  analytics: any[]
  tokenUsage: any[]
  summary: {
    total_prompts: number
    total_cost: number
    total_tokens: number
    avg_response_time: number
  }
}

interface ChunkData {
  chunks: any[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  analytics: any
  sources: any[]
}

interface JobDebugPanelProps {
  jobId: string
  isOpen: boolean
  onClose: () => void
}

export function JobDebugPanel({ jobId, isOpen, onClose }: JobDebugPanelProps) {
  const [debugData, setDebugData] = useState<JobDebugData | null>(null)
  const [promptData, setPromptData] = useState<PromptData | null>(null)
  const [chunkData, setChunkData] = useState<ChunkData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen && jobId) {
      fetchDebugData()
    }
  }, [isOpen, jobId])

  const fetchDebugData = async () => {
    setIsLoading(true)
    try {
      // Fetch debug overview
      const debugResponse = await fetch(`/api/enrichment/${jobId}/debug`)
      if (debugResponse.ok) {
        const data = await debugResponse.json()
        setDebugData(data)
      }

      // Fetch prompt data
      const promptResponse = await fetch(`/api/enrichment/${jobId}/prompts`)
      if (promptResponse.ok) {
        const data = await promptResponse.json()
        setPromptData(data)
      }

      // Fetch chunk data
      const chunkResponse = await fetch(`/api/enrichment/${jobId}/chunks`)
      if (chunkResponse.ok) {
        const data = await chunkResponse.json()
        setChunkData(data)
      }
    } catch (error) {
      console.error('Failed to fetch debug data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const formatCost = (usd: number) => {
    return `$${usd.toFixed(4)}`
  }

  const getStepIcon = (stepName: string) => {
    switch (stepName) {
      case 'crawling': return <Database className="h-4 w-4" />
      case 'chunking': return <FileText className="h-4 w-4" />
      case 'embedding': return <Zap className="h-4 w-4" />
      case 'extraction': return <Brain className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success text-success-foreground'
      case 'running': return 'bg-info text-info-foreground'
      case 'pending': return 'bg-warning text-warning-foreground'
      case 'failed': return 'bg-destructive text-destructive-foreground'
      default: return 'bg-muted text-muted-foreground'
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Job Debug Panel
            {debugData && debugData.job && (
              <Badge variant="outline" className="ml-2">
                {debugData.job.domain}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Comprehensive debugging and analysis for enrichment job execution
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-96">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="prompts">Prompts</TabsTrigger>
                <TabsTrigger value="chunks">Chunks</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="logs">Logs</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-hidden">
                <TabsContent value="overview" className="h-full">
                  <ScrollArea className="h-full">
                    {debugData && debugData.job && (
                      <div className="space-y-6 p-1">
                        {/* Job Summary */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Target className="h-5 w-5" />
                              Job Summary
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Status</p>
                                <Badge className={getStatusColor(debugData.job.status)}>
                                  {debugData.job.status}
                                </Badge>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Duration</p>
                                <p className="font-mono text-sm">
                                  {formatDuration(debugData.summary?.total_duration_ms || 0)}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Total Cost</p>
                                <p className="font-mono text-sm">
                                  {formatCost(debugData.summary?.total_api_cost || 0)}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Facts Extracted</p>
                                <p className="font-mono text-sm">
                                  {debugData.summary?.total_facts || 0}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Step Breakdown */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Activity className="h-5 w-5" />
                              Step Execution
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {(debugData.steps || []).map((step, index) => (
                                <div key={step.step_name} className="flex items-center gap-4 p-4 border rounded-lg">
                                  <div className="flex items-center gap-2">
                                    {getStepIcon(step.step_name)}
                                    <span className="font-medium capitalize">{step.step_name}</span>
                                  </div>
                                  <Badge className={getStatusColor(step.status)}>
                                    {step.status}
                                  </Badge>
                                  {step.total_tokens && (
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                      <Zap className="h-3 w-3" />
                                      {step.total_tokens} tokens
                                    </div>
                                  )}
                                  {step.total_cost && (
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                      <DollarSign className="h-3 w-3" />
                                      {formatCost(step.total_cost)}
                                    </div>
                                  )}
                                  {step.avg_response_time && (
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                      <Clock className="h-3 w-3" />
                                      {formatDuration(step.avg_response_time)}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Quality Metrics */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <TrendingUp className="h-5 w-5" />
                              Quality Metrics
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Average Fact Confidence</p>
                                <div className="flex items-center gap-2">
                                  <Progress 
                                    value={(debugData.summary?.avg_confidence || 0) * 100} 
                                    className="flex-1"
                                  />
                                  <span className="text-sm font-mono">
                                    {((debugData.summary?.avg_confidence || 0) * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Average Chunk Quality</p>
                                <div className="flex items-center gap-2">
                                  <Progress 
                                    value={(debugData.summary?.avg_chunk_quality || 0) * 100} 
                                    className="flex-1"
                                  />
                                  <span className="text-sm font-mono">
                                    {((debugData.summary?.avg_chunk_quality || 0) * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Processing Efficiency</p>
                                <div className="flex items-center gap-2">
                                  <Progress 
                                    value={Math.min(100, ((debugData.summary?.total_facts || 0) / (debugData.summary?.total_chunks || 1)) * 100)} 
                                    className="flex-1"
                                  />
                                  <span className="text-sm font-mono">
                                    {(((debugData.summary?.total_facts || 0) / (debugData.summary?.total_chunks || 1)) * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Error Analysis */}
                        {(debugData.errors || []).length > 0 && (
                          <Card className="border-destructive/50">
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2 text-destructive">
                                <AlertTriangle className="h-5 w-5" />
                                Error Analysis
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {(debugData.errors || []).map((error, index) => (
                                  <div key={index} className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                                    <div className="flex items-center justify-between mb-2">
                                      <Badge variant="destructive">{error.step_name}</Badge>
                                      <span className="text-sm text-muted-foreground">
                                        {error.error_count} errors
                                      </span>
                                    </div>
                                    <div className="space-y-1">
                                      {error.error_messages.map((message: string, msgIndex: number) => (
                                        <p key={msgIndex} className="text-sm text-destructive">
                                          {message}
                                        </p>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="prompts" className="h-full">
                  <ScrollArea className="h-full">
                    {promptData ? (
                      <div className="space-y-6 p-1">
                        {/* Prompt Summary */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Code2 className="h-5 w-5" />
                              Prompt Analysis
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Total Prompts</p>
                                <p className="font-mono text-lg">{promptData.summary?.total_prompts || 0}</p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Total Tokens</p>
                                <p className="font-mono text-lg">{(promptData.summary?.total_tokens || 0).toLocaleString()}</p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Total Cost</p>
                                <p className="font-mono text-lg">{formatCost(promptData.summary?.total_cost || 0)}</p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Avg Response Time</p>
                                <p className="font-mono text-lg">{formatDuration(promptData.summary?.avg_response_time || 0)}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Prompt Details */}
                        <Card>
                          <CardHeader>
                            <CardTitle>Prompt Execution Details</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {(promptData.prompts || []).map((prompt, index) => (
                                <div key={prompt.id} className="border rounded-lg">
                                  <Button
                                    variant="ghost"
                                    className="flex items-center justify-between w-full p-4 h-auto hover:bg-muted/50"
                                    onClick={() => toggleSection(`prompt-${prompt.id}`)}
                                  >
                                    <div className="flex items-center gap-4">
                                      <div className="flex items-center gap-2">
                                        {expandedSections.has(`prompt-${prompt.id}`) ? 
                                          <ChevronDown className="h-4 w-4" /> : 
                                          <ChevronRight className="h-4 w-4" />
                                        }
                                        <Badge variant="outline">{prompt.step_name}</Badge>
                                      </div>
                                      <span className="font-medium">{prompt.template_name}</span>
                                      <Badge variant="secondary">{prompt.model_name}</Badge>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                      <span>{prompt.total_tokens} tokens</span>
                                      <span>{formatCost(prompt.api_cost_usd || 0)}</span>
                                      <span>{formatDuration(prompt.response_time_ms || 0)}</span>
                                    </div>
                                  </Button>
                                  {expandedSections.has(`prompt-${prompt.id}`) && (
                                    <div className="p-4 border-t space-y-4">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                          <h4 className="font-medium mb-2">System Prompt</h4>
                                          <div className="p-3 bg-muted rounded-lg">
                                            <pre className="text-xs whitespace-pre-wrap">
                                              {prompt.system_prompt.substring(0, 300)}
                                              {prompt.system_prompt.length > 300 && '...'}
                                            </pre>
                                          </div>
                                        </div>
                                        <div>
                                          <h4 className="font-medium mb-2">User Prompt</h4>
                                          <div className="p-3 bg-muted rounded-lg">
                                            <pre className="text-xs whitespace-pre-wrap">
                                              {prompt.user_prompt.substring(0, 300)}
                                              {prompt.user_prompt.length > 300 && '...'}
                                            </pre>
                                          </div>
                                        </div>
                                      </div>
                                      {prompt.response_text && (
                                        <div>
                                          <h4 className="font-medium mb-2">Model Response</h4>
                                          <div className="p-3 bg-muted rounded-lg">
                                            <pre className="text-xs whitespace-pre-wrap">
                                              {prompt.response_text.substring(0, 500)}
                                              {prompt.response_text.length > 500 && '...'}
                                            </pre>
                                          </div>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-4 text-sm">
                                        <span>Facts Generated: {prompt.facts_generated}</span>
                                        <span>Avg Confidence: {(prompt.avg_fact_confidence * 100).toFixed(1)}%</span>
                                        <span>Temperature: {prompt.temperature}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-96">
                        <div className="text-center">
                          <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Prompt data not available</p>
                          <p className="text-xs text-muted-foreground mt-1">Advanced observability features are not yet implemented</p>
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="chunks" className="h-full">
                  <ScrollArea className="h-full">
                    {chunkData ? (
                      <div className="space-y-6 p-1">
                        {/* Chunk Summary */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <FileText className="h-5 w-5" />
                              Chunk Analysis
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Total Chunks</p>
                                <p className="font-mono text-lg">{chunkData.analytics?.total_chunks || 0}</p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Avg Length</p>
                                <p className="font-mono text-lg">{Math.round(chunkData.analytics?.avg_content_length || 0)} chars</p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Avg Quality</p>
                                <p className="font-mono text-lg">{((chunkData.analytics?.avg_quality_score || 0) * 100).toFixed(1)}%</p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Unique Sources</p>
                                <p className="font-mono text-lg">{chunkData.analytics?.unique_sources || 0}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Chunk Quality Distribution */}
                        <Card>
                          <CardHeader>
                            <CardTitle>Quality Distribution</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-success"></div>
                                  <span className="text-sm">High Quality (≥80%)</span>
                                </div>
                                <Progress value={((chunkData.analytics?.high_quality_chunks || 0) / (chunkData.analytics?.total_chunks || 1)) * 100} className="flex-1" />
                                <span className="text-sm font-mono">{chunkData.analytics?.high_quality_chunks || 0}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-warning"></div>
                                  <span className="text-sm">Medium Quality (60-80%)</span>
                                </div>
                                <Progress value={((chunkData.analytics?.medium_quality_chunks || 0) / (chunkData.analytics?.total_chunks || 1)) * 100} className="flex-1" />
                                <span className="text-sm font-mono">{chunkData.analytics?.medium_quality_chunks || 0}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-destructive"></div>
                                  <span className="text-sm">Low Quality ({"<"}60%)</span>
                                </div>
                                <Progress value={((chunkData.analytics?.low_quality_chunks || 0) / (chunkData.analytics?.total_chunks || 1)) * 100} className="flex-1" />
                                <span className="text-sm font-mono">{chunkData.analytics?.low_quality_chunks || 0}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Source Breakdown */}
                        <Card>
                          <CardHeader>
                            <CardTitle>Source URL Breakdown</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Source URL</TableHead>
                                  <TableHead>Chunks</TableHead>
                                  <TableHead>Avg Length</TableHead>
                                  <TableHead>Avg Quality</TableHead>
                                  <TableHead>Facts Generated</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(chunkData.sources || []).map((source, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="font-mono text-xs max-w-xs truncate">
                                      {source.source_url}
                                    </TableCell>
                                    <TableCell>{source.chunk_count}</TableCell>
                                    <TableCell>{Math.round(source.avg_content_length)}</TableCell>
                                    <TableCell>
                                      <Badge variant={source.avg_quality_score >= 0.8 ? "default" : source.avg_quality_score >= 0.6 ? "secondary" : "destructive"}>
                                        {(source.avg_quality_score * 100).toFixed(1)}%
                                      </Badge>
                                    </TableCell>
                                    <TableCell>{source.facts_generated}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-96">
                        <div className="text-center">
                          <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">Chunk data not available</p>
                          <p className="text-xs text-muted-foreground mt-1">Advanced observability features are not yet implemented</p>
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="performance" className="h-full">
                  <ScrollArea className="h-full">
                    {debugData && (
                      <div className="space-y-6 p-1">
                        {/* Performance Overview */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <TrendingUp className="h-5 w-5" />
                              Performance Overview
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Total Duration</p>
                                <p className="text-2xl font-bold">{formatDuration(debugData.summary?.total_duration_ms || 0)}</p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Avg Response Time</p>
                                <p className="text-2xl font-bold">{formatDuration(debugData.summary?.avg_response_time || 0)}</p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Total Tokens</p>
                                <p className="text-2xl font-bold">{(debugData.summary?.total_tokens_used || 0).toLocaleString()}</p>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Total Cost</p>
                                <p className="text-2xl font-bold">{formatCost(debugData.summary?.total_api_cost || 0)}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Performance Metrics */}
                        {(debugData.metrics || []).length > 0 && (
                          <Card>
                            <CardHeader>
                              <CardTitle>Detailed Metrics</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Metric Type</TableHead>
                                    <TableHead>Metric Name</TableHead>
                                    <TableHead>Value</TableHead>
                                    <TableHead>Unit</TableHead>
                                    <TableHead>Recorded At</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {(debugData.metrics || []).map((metric, index) => (
                                    <TableRow key={index}>
                                      <TableCell>
                                        <Badge variant="outline">{metric.metric_type}</Badge>
                                      </TableCell>
                                      <TableCell>{metric.metric_name}</TableCell>
                                      <TableCell className="font-mono">{metric.metric_value}</TableCell>
                                      <TableCell>{metric.metric_unit}</TableCell>
                                      <TableCell className="text-sm text-muted-foreground">
                                        {new Date(metric.recorded_at).toLocaleString()}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="logs" className="h-full">
                  <ScrollArea className="h-full">
                    {debugData && (
                      <div className="space-y-6 p-1">
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Activity className="h-5 w-5" />
                              Debug Logs
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {(debugData.logs || []).map((log, index) => (
                                <div key={index} className={cn(
                                  "p-3 rounded-lg border text-sm",
                                  log.log_level === 'error' && "border-destructive/50 bg-destructive/5",
                                  log.log_level === 'warn' && "border-warning/50 bg-warning/5",
                                  log.log_level === 'info' && "border-border bg-muted/30"
                                )}>
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {log.step_name}
                                      </Badge>
                                      <Badge variant={
                                        log.log_level === 'error' ? 'destructive' :
                                        log.log_level === 'warn' ? 'secondary' : 'default'
                                      } className="text-xs">
                                        {log.log_level}
                                      </Badge>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(log.created_at).toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <p className="text-sm">{log.message}</p>
                                  {log.execution_time_ms && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Execution time: {formatDuration(log.execution_time_ms)}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </div>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
