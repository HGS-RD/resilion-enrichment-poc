"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Button,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ScrollArea,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  FactCard,
  MermaidWorkflow,
  useJobDetails, 
  getJobStatusColor, 
  formatDuration, 
  formatDateTime,
  type JobFact 
} from "@workspace/ui"
import { 
  ArrowLeft, 
  RefreshCw, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Database,
  BarChart3,
  FileText,
  ExternalLink,
  Trash2
} from "lucide-react"

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string
  
  const { data, isLoading, error, refreshJobDetails } = useJobDetails(jobId)
  const [showErrorDialog, setShowErrorDialog] = useState(false)
  const [factFilter, setFactFilter] = useState<'all' | 'validated' | 'unvalidated'>('all')
  const [tierFilter, setTierFilter] = useState<'all' | '1' | '2' | '3'>('all')

  if (isLoading) {
    return (
      <div className="flex-1 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">Loading job details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-600 mx-auto" />
            <p className="text-lg font-medium text-red-600 mt-2">Error Loading Job</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={refreshJobDetails}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex-1 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <FileText className="h-8 w-8 text-gray-400 mx-auto" />
            <p className="text-lg font-medium text-gray-600 mt-2">Job Not Found</p>
            <p className="text-sm text-muted-foreground mt-1">The requested job could not be found.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push('/jobs')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Jobs
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const { job, facts, statistics, logs } = data

  // Filter facts based on current filters
  const filteredFacts = facts.filter(fact => {
    if (factFilter === 'validated' && !fact.validated) return false
    if (factFilter === 'unvalidated' && fact.validated) return false
    if (tierFilter !== 'all' && fact.tier !== parseInt(tierFilter)) return false
    return true
  })

  const handleDeleteJob = async () => {
    try {
      const response = await fetch(`/api/enrichment/${jobId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        router.push('/jobs')
      } else {
        console.error('Failed to delete job')
      }
    } catch (error) {
      console.error('Error deleting job:', error)
    }
  }

  const downloadJobData = () => {
    const jobData = {
      job,
      facts,
      statistics,
      logs,
      exportedAt: new Date().toISOString()
    }
    
    const dataStr = JSON.stringify(jobData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = `job-${jobId}-data.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/jobs')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <span>Jobs</span>
              <span>/</span>
              <span>{job.domain}</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Job Details
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={refreshJobDetails}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={downloadJobData}>
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDeleteJob} className="text-red-600 hover:text-red-700">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Job Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Job Overview</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={getJobStatusColor(job.status)}>
                {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
              </Badge>
              {job.error_message && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowErrorDialog(true)}
                  className="text-red-600 hover:text-red-700"
                >
                  <AlertCircle className="h-4 w-4 mr-1" />
                  View Error
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Domain</label>
              <p className="text-lg font-semibold">{job.domain}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Job ID</label>
              <p className="text-sm font-mono text-muted-foreground">{job.id}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">LLM Used</label>
              <p className="text-sm">{job.llm_used || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Runtime</label>
              <p className="text-sm">{formatDuration(job.total_runtime_seconds)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Created</label>
              <p className="text-sm">{formatDateTime(job.created_at)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Started</label>
              <p className="text-sm">{job.started_at ? formatDateTime(job.started_at) : 'Not started'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Completed</label>
              <p className="text-sm">{job.completed_at ? formatDateTime(job.completed_at) : 'Not completed'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Retry Count</label>
              <p className="text-sm">{job.retry_count}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="workflow" className="space-y-6">
        <TabsList className="grid w-fit grid-cols-4">
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="facts">Facts ({facts.length})</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="logs">Logs ({logs.length})</TabsTrigger>
        </TabsList>

        {/* Workflow Tab */}
        <TabsContent value="workflow">
          <MermaidWorkflow
            jobId={job.id}
            domain={job.domain}
            steps={job.workflow.steps}
            currentStep={job.workflow.currentStep}
            onRefresh={refreshJobDetails}
          />
        </TabsContent>

        {/* Facts Tab */}
        <TabsContent value="facts" className="space-y-4">
          {/* Fact Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Extracted Facts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Validation:</label>
                  <select 
                    value={factFilter} 
                    onChange={(e) => setFactFilter(e.target.value as any)}
                    className="text-sm border rounded px-2 py-1"
                  >
                    <option value="all">All Facts</option>
                    <option value="validated">Validated Only</option>
                    <option value="unvalidated">Unvalidated Only</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Tier:</label>
                  <select 
                    value={tierFilter} 
                    onChange={(e) => setTierFilter(e.target.value as any)}
                    className="text-sm border rounded px-2 py-1"
                  >
                    <option value="all">All Tiers</option>
                    <option value="1">Tier 1 (Corporate)</option>
                    <option value="2">Tier 2 (Professional)</option>
                    <option value="3">Tier 3 (News)</option>
                  </select>
                </div>
                <div className="text-sm text-muted-foreground">
                  Showing {filteredFacts.length} of {facts.length} facts
                </div>
              </div>

              {filteredFacts.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-8 w-8 text-gray-400 mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">No facts match the current filters</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredFacts.map((fact) => (
                    <FactCard key={fact.id} fact={fact} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics">
          <div className="grid gap-6">
            {/* Summary Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Job Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{statistics.total_facts}</div>
                    <div className="text-sm text-muted-foreground">Total Facts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{statistics.validated_facts}</div>
                    <div className="text-sm text-muted-foreground">Validated</div>
                  </div>
                  <div className="text-2xl font-bold text-orange-600 text-center">
                    <div>{Math.round(statistics.avg_confidence * 100)}%</div>
                    <div className="text-sm text-muted-foreground">Avg Confidence</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{statistics.pagesScraped}</div>
                    <div className="text-sm text-muted-foreground">Pages Scraped</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fact Types Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Fact Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(statistics.fact_types).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm">{type}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tier Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Tier Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(statistics.tier_distribution).map(([tier, count]) => (
                    <div key={tier} className="flex items-center justify-between">
                      <span className="text-sm">Tier {tier}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{count} facts</Badge>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(statistics.tier_confidence[parseInt(tier)] * 100)}% avg confidence
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Job Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <Badge 
                        variant="outline" 
                        className={
                          log.level === 'error' ? 'text-red-600 border-red-200' :
                          log.level === 'warn' ? 'text-yellow-600 border-yellow-200' :
                          'text-blue-600 border-blue-200'
                        }
                      >
                        {log.level}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{log.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDateTime(log.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Error Dialog */}
      <Dialog open={showErrorDialog} onOpenChange={setShowErrorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Job Error Details
            </DialogTitle>
            <DialogDescription>
              This job failed with the following error message:
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 font-mono">{job.error_message}</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
