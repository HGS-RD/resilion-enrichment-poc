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
  WorkflowProgress
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
  AlertCircle
} from "lucide-react"

// Mock data for demonstration
const mockJobs = [
  {
    id: "#JOB-2023-06-29-001",
    domain: "acme.com",
    status: "Running",
    startTime: "2024-01-15 10:30:00",
    endTime: "-",
    factsFound: 23
  },
  {
    id: "#JOB-2023-06-29-002", 
    domain: "example.org",
    status: "Completed",
    startTime: "2024-01-15 09:45:00",
    endTime: "2024-01-15 10:12:00",
    factsFound: 47
  },
  {
    id: "#JOB-2023-06-29-003",
    domain: "globex.net", 
    status: "Failed",
    startTime: "2024-01-15 09:30:00",
    endTime: "2024-01-15 09:35:00",
    factsFound: 0
  }
]

const workflowSteps = [
  { name: "Crawl", status: "Completed", icon: "🕷️" },
  { name: "Chunk", status: "Completed", icon: "➕" },
  { name: "Embed", status: "Running", icon: "🔗" },
  { name: "Extract", status: "Pending", icon: "📄" },
  { name: "Score", status: "Pending", icon: "⭐" },
  { name: "Persist", status: "Pending", icon: "💾" },
  { name: "Finalize", status: "Pending", icon: "📋" }
]

export default function JobsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("All")
  const [domainInput, setDomainInput] = useState("")
  
  const { 
    jobs, 
    isLoading, 
    error, 
    createJob, 
    startJob, 
    refreshJobs 
  } = useEnrichmentJobs()

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.id.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (activeTab === "All") return matchesSearch
    return matchesSearch && job.status === activeTab.toLowerCase()
  })

  const runningJob = jobs.find(job => job.status === "running")

  const handleStartEnrichment = async () => {
    if (!domainInput.trim()) return
    
    const jobId = await createJob(domainInput.trim())
    if (jobId) {
      await startJob(jobId)
      setDomainInput("")
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

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

        <TabsContent value={activeTab} className="mt-6 space-y-6">
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
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
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
                    <TableRow key={job.id}>
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
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
