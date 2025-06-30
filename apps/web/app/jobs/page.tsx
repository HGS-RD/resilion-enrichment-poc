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
  DropdownMenuTrigger
} from "@workspace/ui"
import { useEnrichmentJobs } from "@workspace/ui"
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
  Clock
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
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
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
    
    const jobId = await createJob(domainInput.trim())
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'crawling': return <Globe className="h-4 w-4 text-blue-500" />
      case 'chunking': return <FileText className="h-4 w-4 text-orange-500" />
      case 'embedding': return <Zap className="h-4 w-4 text-purple-500" />
      case 'extraction': return <Database className="h-4 w-4 text-green-500" />
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  // Mock activity data for demonstration
  const mockActivities = selectedJob ? [
    {
      id: '1',
      timestamp: new Date().toISOString(),
      type: 'crawling',
      message: `Started crawling ${selectedJob.domain}`,
      details: 'Initializing web crawler with default settings'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 30000).toISOString(),
      type: 'crawling',
      message: 'Found 15 pages to crawl',
      details: 'Discovered sitemap and internal links'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 60000).toISOString(),
      type: 'crawling',
      message: 'Crawled page: /about',
      details: 'Extracted 2,340 characters of content'
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 90000).toISOString(),
      type: 'crawling',
      message: 'Crawled page: /products',
      details: 'Extracted 4,120 characters of content'
    },
    {
      id: '5',
      timestamp: new Date(Date.now() - 120000).toISOString(),
      type: 'chunking',
      message: 'Started text chunking',
      details: 'Breaking content into manageable segments'
    }
  ] : []

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <span>Dashboard</span>
            <span>/</span>
            <span>Enrichment Jobs</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Enrichment Pre-Loader
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button variant="ghost" size="sm">
            <Bell className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-fit grid-cols-5 bg-gray-100">
          <TabsTrigger value="All" className="data-[state=active]:bg-white">
            All
          </TabsTrigger>
          <TabsTrigger value="Pending" className="data-[state=active]:bg-white text-yellow-600">
            <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
            Pending
          </TabsTrigger>
          <TabsTrigger value="Running" className="data-[state=active]:bg-white text-blue-600">
            <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
            Running
          </TabsTrigger>
          <TabsTrigger value="Completed" className="data-[state=active]:bg-white text-green-600">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
            Completed
          </TabsTrigger>
          <TabsTrigger value="Failed" className="data-[state=active]:bg-white text-red-600">
            <div className="w-2 h-2 rounded-full bg-red-500 mr-2" />
            Failed
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Job Management */}
            <div className="lg:col-span-2 space-y-6">
              {/* Start New Enrichment Job */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    Start New Enrichment Job
                    <HelpCircle className="h-4 w-4 text-gray-400" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Domain
                      </label>
                      <Input
                        value={domainInput}
                        onChange={(e) => setDomainInput(e.target.value)}
                        placeholder="e.g. globalsteel.org"
                        className="w-full"
                      />
                    </div>
                    <Button 
                      onClick={handleStartEnrichment}
                      className="bg-blue-600 hover:bg-blue-700 mt-6"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Enrichment
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    This will crawl the company website, extract facts, and prepare them for risk analysis.
                  </p>
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
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-red-800">
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
                          className={selectedJobId === job.id ? "bg-blue-50 dark:bg-blue-950/20" : ""}
                        >
                          <TableCell className="font-medium">{job.domain}</TableCell>
                          <TableCell className="font-mono text-sm">{job.id}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              job.status === 'completed' ? 'bg-green-100 text-green-800' :
                              job.status === 'running' ? 'bg-blue-100 text-blue-800' :
                              job.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {formatDateTime(job.startTime)}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {job.endTime ? formatDateTime(job.endTime) : "-"}
                          </TableCell>
                          <TableCell>{job.factsFound}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleSelectJob(job.id)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Monitor Activity
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => setDeleteJobId(job.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Job
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Real-time Activity Panel */}
            <div className="space-y-6">
              <Card className="h-[600px] flex flex-col">
                <CardHeader className="flex-shrink-0">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Real-time Activity
                  </CardTitle>
                  {selectedJob && (
                    <p className="text-sm text-gray-600">
                      Monitoring: {selectedJob.domain}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="flex-1 p-0">
                  {selectedJob ? (
                    <ScrollArea className="h-full px-6 pb-6">
                      <div className="space-y-4">
                        {mockActivities.map((activity) => (
                          <div key={activity.id} className="flex gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <div className="flex-shrink-0 mt-1">
                              {getActivityIcon(activity.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {activity.message}
                                </p>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <Clock className="h-3 w-3" />
                                  {new Date(activity.timestamp).toLocaleTimeString()}
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {activity.details}
                              </p>
                            </div>
                          </div>
                        ))}
                        {mockActivities.length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No activity yet</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium">Select a job to monitor</p>
                        <p className="text-sm">Click "Monitor Activity" on any job to see real-time updates</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Job Modal */}
      <Dialog open={!!deleteJobId} onOpenChange={() => setDeleteJobId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Enrichment Job
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the enrichment job and all associated data including:
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                Job execution history and logs
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                Crawled web pages and content
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                Text chunks and embeddings
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                Extracted facts and analysis results
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                Vector database entries
              </li>
            </ul>
            {deleteJobId && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium">Job to delete:</p>
                <p className="text-sm text-gray-600 font-mono">{deleteJobId}</p>
                <p className="text-sm text-gray-600">
                  Domain: {jobs.find(j => j.id === deleteJobId)?.domain}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteJobId(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteJob}
              disabled={isDeleting}
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
