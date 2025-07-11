"use client"

import { useState } from "react"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  WorkflowProgress,
  ScrollArea,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@workspace/ui"
import { useEnrichmentJobs, cn, JobDebugPanel, DeveloperObservatory } from "@workspace/ui"
import { extractDomain } from "../../lib/utils/url-utils"
import { 
  Search, 
  Play, 
  Bell,
  HelpCircle,
  Filter,
  Download,
  MoreHorizontal,
  RefreshCw,
  AlertCircle,
  Trash2,
  Eye,
  Activity,
  Globe,
  FileText,
  Zap,
  Database,
  CheckCircle,
  Clock,
  Code2
} from "lucide-react"

// Real-time activity hook
const useJobActivity = (jobId: string | null) => {
  const [activities, setActivities] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // In a real implementation, this would use WebSocket or polling
  // For now, we'll simulate real-time updates
  const fetchActivities = async () => {
    if (!jobId) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/enrichment/${jobId}/activity`)
      if (response.ok) {
        const data = await response.json()
        setActivities(data.activities || [])
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return { activities, isLoading, fetchActivities }
}

export default function JobsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("All")
  const [domainInput, setDomainInput] = useState("")
  const [selectedLLM, setSelectedLLM] = useState<string>("gpt-4o")
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [debugJobId, setDebugJobId] = useState<string | null>(null)
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([])
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  
  const { 
    jobs, 
    isLoading, 
    error, 
    createJob, 
    startJob, 
    refreshJobs,
    deleteJob 
  } = useEnrichmentJobs()

  const { activities, isLoading: activitiesLoading, fetchActivities } = useJobActivity(selectedJobId)

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.id.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (activeTab === "All") return matchesSearch
    return matchesSearch && job.status === activeTab.toLowerCase()
  })

  const runningJob = jobs.find(job => job.status === "running")
  const selectedJob = jobs.find(job => job.id === selectedJobId)

  const handleStartEnrichment = async () => {
    if (!domainInput.trim()) return
    
    // Extract domain from URL if a full URL was provided
    const cleanDomain = extractDomain(domainInput.trim())
    
    const jobId = await createJob(cleanDomain, selectedLLM)
    if (jobId) {
      await startJob(jobId)
      setDomainInput("")
      setSelectedJobId(jobId) // Auto-select the new job for monitoring
    }
  }

  const handleDeleteJob = async () => {
    if (!deleteJobId) return
    
    setIsDeleting(true)
    try {
      await deleteJob(deleteJobId)
      setDeleteJobId(null)
      if (selectedJobId === deleteJobId) {
        setSelectedJobId(null)
      }
    } catch (error) {
      console.error('Failed to delete job:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSelectJob = (jobId: string) => {
    setSelectedJobId(jobId)
    // Fetch activities when job is selected
    setTimeout(fetchActivities, 100)
  }

  // Selection handlers
  const handleSelectRow = (jobId: string, checked: boolean) => {
    if (checked) {
      setSelectedJobIds(prev => [...prev, jobId])
    } else {
      setSelectedJobIds(prev => prev.filter(id => id !== jobId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedJobIds(filteredJobs.map(job => job.id))
    } else {
      setSelectedJobIds([])
    }
  }

  const isAllSelected = filteredJobs.length > 0 && selectedJobIds.length === filteredJobs.length
  const isIndeterminate = selectedJobIds.length > 0 && selectedJobIds.length < filteredJobs.length

  // Bulk delete handlers
  const handleBulkDelete = async () => {
    if (selectedJobIds.length === 0) return
    
    setIsBulkDeleting(true)
    try {
      // For now, delete jobs one by one (we'll create bulk API later)
      for (const jobId of selectedJobIds) {
        await deleteJob(jobId)
      }
      setSelectedJobIds([])
      setShowBulkDeleteDialog(false)
    } catch (error) {
      console.error('Failed to bulk delete jobs:', error)
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'crawling': return <Globe className="h-4 w-4 text-info" />
      case 'chunking': return <FileText className="h-4 w-4 text-warning" />
      case 'embedding': return <Zap className="h-4 w-4 text-primary" />
      case 'extraction': return <Database className="h-4 w-4 text-success" />
      case 'completed': return <CheckCircle className="h-4 w-4 text-success" />
      default: return <Activity className="h-4 w-4 text-muted-foreground" />
    }
  }


  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span>Dashboard</span>
            <span>/</span>
            <span>Enrichment Jobs</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Enrichment Jobs
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button variant="ghost" size="sm" className="h-9 w-9">
            <Bell className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-fit grid-cols-5">
          <TabsTrigger value="All">
            All
          </TabsTrigger>
          <TabsTrigger value="Pending" className="text-warning">
            <div className="w-2 h-2 rounded-full bg-warning mr-2" />
            Pending
          </TabsTrigger>
          <TabsTrigger value="Running" className="text-info">
            <div className="w-2 h-2 rounded-full bg-info mr-2" />
            Running
          </TabsTrigger>
          <TabsTrigger value="Completed" className="text-success">
            <div className="w-2 h-2 rounded-full bg-success mr-2" />
            Completed
          </TabsTrigger>
          <TabsTrigger value="Failed" className="text-destructive">
            <div className="w-2 h-2 rounded-full bg-destructive mr-2" />
            Failed
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="space-y-6">
            {/* Job Management Section */}
            <div className="space-y-6">
              {/* Start New Enrichment Job */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    Start New Enrichment Job
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Company Domain
                      </label>
                      <Input
                        value={domainInput}
                        onChange={(e) => setDomainInput(e.target.value)}
                        placeholder="e.g. globalsteel.org"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        LLM Model
                      </label>
                      <Select value={selectedLLM} onValueChange={setSelectedLLM}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select LLM model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gpt-4o">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              GPT-4o (OpenAI)
                            </div>
                          </SelectItem>
                          <SelectItem value="claude-3-opus">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500" />
                              Claude 3 Opus (Anthropic)
                            </div>
                          </SelectItem>
                          <SelectItem value="gemini-1.5-pro">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-purple-500" />
                              Gemini 1.5 Pro (Google)
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      This will crawl the company website, extract facts, and prepare them for risk analysis using the selected LLM model.
                    </p>
                    <Button 
                      onClick={handleStartEnrichment}
                      disabled={!domainInput.trim()}
                      className="ml-4"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Enrichment
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Current Job Workflow */}
              {runningJob && (
                <WorkflowProgress
                  jobId={runningJob.id}
                  domain={runningJob.domain}
                  currentStep={runningJob.progress?.currentStep || "pending"}
                  stepsCompleted={runningJob.progress?.stepsCompleted || 0}
                  totalSteps={runningJob.progress?.totalSteps || 7}
                  progress={runningJob.progress ? {
                    pagesCrawled: runningJob.progress.pagesCrawled,
                    chunksCreated: runningJob.progress.chunksCreated,
                    embeddingsProgress: runningJob.progress.embeddingsProgress
                  } : undefined}
                />
              )}

              {/* Error Display */}
              {error && (
                <Card className="border-destructive/50 bg-destructive/5">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium">Error:</span>
                      <span>{error}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recent Enrichment Jobs */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Recent Enrichment Jobs</CardTitle>
                  <div className="flex items-center gap-2">
                    {selectedJobIds.length > 0 && (
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => setShowBulkDeleteDialog(true)}
                        className="mr-2"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete ({selectedJobIds.length})
                      </Button>
                    )}
                    <Button variant="ghost" size="sm">
                      <Filter className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={refreshJobs}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <input
                            type="checkbox"
                            checked={isAllSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = isIndeterminate
                            }}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </TableHead>
                        <TableHead>Domain</TableHead>
                        <TableHead>Job ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Start Time</TableHead>
                        <TableHead>End Time</TableHead>
                        <TableHead># Facts Found</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredJobs.map((job) => (
                        <TableRow 
                          key={job.id}
                          className={cn(
                            "hover:bg-muted/50 transition-colors",
                            selectedJobId === job.id && "bg-primary/5 border-primary/20",
                            selectedJobIds.includes(job.id) && "bg-blue-50 dark:bg-blue-950/20"
                          )}
                        >
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedJobIds.includes(job.id)}
                              onChange={(e) => handleSelectRow(job.id, e.target.checked)}
                              className="rounded border-gray-300 text-primary focus:ring-primary"
                            />
                          </TableCell>
                          <TableCell className="font-medium">{job.domain}</TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">{job.id}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                              job.status === 'completed' ? 'bg-success/10 text-success border-success/20' :
                              job.status === 'running' ? 'bg-info/10 text-info border-info/20' :
                              job.status === 'pending' ? 'bg-warning/10 text-warning border-warning/20' :
                              'bg-destructive/10 text-destructive border-destructive/20'
                            }`}>
                              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDateTime(job.startTime)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {job.endTime ? formatDateTime(job.endTime) : "-"}
                          </TableCell>
                          <TableCell className="font-medium">{job.factsFound}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={() => window.open(`/jobs/${job.id}`, '_blank')}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={() => setDeleteJobId(job.id)}
                                title="Delete Job"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Developer Observatory - Full Width Below Jobs Table */}
              {selectedJobId && (
                <DeveloperObservatory 
                  selectedJobId={selectedJobId}
                  className="w-full"
                />
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Job Modal - Custom Implementation */}
      {deleteJobId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80" 
            onClick={() => setDeleteJobId(null)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-background border rounded-lg shadow-lg w-full max-w-lg mx-4 p-6">
            {/* Header */}
            <div className="flex items-center gap-2 text-destructive mb-4">
              <Trash2 className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Delete Enrichment Job</h2>
            </div>
            
            {/* Description */}
            <p className="text-sm text-muted-foreground mb-4">
              This action cannot be undone. This will permanently delete the enrichment job and all associated data including:
            </p>
            
            {/* List */}
            <ul className="space-y-2 text-sm text-muted-foreground mb-4">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                Job execution history and logs
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                Crawled web pages and content
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                Text chunks and embeddings
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                Extracted facts and analysis results
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                Vector database entries
              </li>
            </ul>
            
            {/* Job Info */}
            {deleteJobId && deleteJobId !== 'test' && (
              <div className="mb-4 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium text-foreground">Job to delete:</p>
                <p className="text-sm text-muted-foreground font-mono">{deleteJobId}</p>
                <p className="text-sm text-muted-foreground">
                  Domain: {jobs.find(j => j.id === deleteJobId)?.domain}
                </p>
              </div>
            )}
            
            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <Button variant="outline" onClick={() => setDeleteJobId(null)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteJob}
                disabled={isDeleting}
                className="mb-2 sm:mb-0"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Permanently
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Dialog */}
      {showBulkDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80" 
            onClick={() => setShowBulkDeleteDialog(false)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-background border rounded-lg shadow-lg w-full max-w-2xl mx-4 p-6">
            {/* Header */}
            <div className="flex items-center gap-2 text-destructive mb-4">
              <Trash2 className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Delete Multiple Enrichment Jobs</h2>
            </div>
            
            {/* Description */}
            <p className="text-sm text-muted-foreground mb-4">
              This action cannot be undone. You are about to permanently delete <strong>{selectedJobIds.length}</strong> enrichment jobs and all their associated data.
            </p>
            
            {/* Selected Jobs List */}
            <div className="mb-4 p-4 bg-muted rounded-lg max-h-60 overflow-y-auto">
              <p className="text-sm font-medium text-foreground mb-3">Jobs to be deleted:</p>
              <div className="space-y-2">
                {selectedJobIds.map(jobId => {
                  const job = jobs.find(j => j.id === jobId)
                  return (
                    <div key={jobId} className="flex items-center justify-between p-2 bg-background rounded border">
                      <div>
                        <p className="text-sm font-medium">{job?.domain || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground font-mono">{jobId}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                        job?.status === 'completed' ? 'bg-success/10 text-success border-success/20' :
                        job?.status === 'running' ? 'bg-info/10 text-info border-info/20' :
                        job?.status === 'pending' ? 'bg-warning/10 text-warning border-warning/20' :
                        'bg-destructive/10 text-destructive border-destructive/20'
                      }`}>
                        {job?.status?.charAt(0).toUpperCase()}{job?.status?.slice(1)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Data Impact Warning */}
            <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
              <p className="text-sm font-medium text-destructive mb-2">This will permanently delete:</p>
              <ul className="space-y-1 text-sm text-destructive">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  All job execution history and logs
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  Crawled web pages and content
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  Text chunks and embeddings
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  Extracted facts and analysis results
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  Vector database entries
                </li>
              </ul>
            </div>
            
            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="mb-2 sm:mb-0"
              >
                {isBulkDeleting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Deleting {selectedJobIds.length} jobs...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete {selectedJobIds.length} Jobs Permanently
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Job Debug Panel */}
      <JobDebugPanel
        jobId={debugJobId || ""}
        isOpen={!!debugJobId}
        onClose={() => setDebugJobId(null)}
      />
    </div>
  )
}
