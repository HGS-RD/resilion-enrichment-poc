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
  JobStatusBadge,
  Button,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ErrorDialog
} from "@workspace/ui"
import { 
  Search, 
  Plus, 
  MoreHorizontal,
  ExternalLink,
  RefreshCw
} from "lucide-react"

// Mock data for demonstration
const mockJobs = [
  {
    id: "job-001",
    domain: "acme-corp.com",
    status: "running" as const,
    startTime: "2025-06-29 09:15:00",
    endTime: null,
    factsFound: 0,
    progress: 45
  },
  {
    id: "job-002", 
    domain: "techstart.io",
    status: "completed" as const,
    startTime: "2025-06-29 08:45:00",
    endTime: "2025-06-29 09:12:00",
    factsFound: 23,
    progress: 100
  },
  {
    id: "job-003",
    domain: "manufacturing-co.com", 
    status: "failed" as const,
    startTime: "2025-06-29 08:30:00",
    endTime: "2025-06-29 08:35:00",
    factsFound: 0,
    progress: 15
  },
  {
    id: "job-004",
    domain: "startup-hub.com",
    status: "pending" as const,
    startTime: null,
    endTime: null,
    factsFound: 0,
    progress: 0
  },
  {
    id: "job-005",
    domain: "enterprise-solutions.com",
    status: "completed" as const,
    startTime: "2025-06-29 07:30:00",
    endTime: "2025-06-29 08:15:00",
    factsFound: 45,
    progress: 100
  }
]

export default function JobsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  const filteredJobs = mockJobs.filter(job => {
    const matchesSearch = job.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.id.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (activeTab === "all") return matchesSearch
    return matchesSearch && job.status === activeTab
  })

  const getStatusCounts = () => {
    return {
      all: mockJobs.length,
      pending: mockJobs.filter(j => j.status === "pending").length,
      running: mockJobs.filter(j => j.status === "running").length,
      completed: mockJobs.filter(j => j.status === "completed").length,
      failed: mockJobs.filter(j => j.status === "failed").length
    }
  }

  const statusCounts = getStatusCounts()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enrichment Jobs</h1>
          <p className="text-gray-600 mt-1">
            Manage and monitor all enrichment jobs
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          New Job
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Jobs Overview</CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">
                All ({statusCounts.all})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({statusCounts.pending})
              </TabsTrigger>
              <TabsTrigger value="running">
                Running ({statusCounts.running})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({statusCounts.completed})
              </TabsTrigger>
              <TabsTrigger value="failed">
                Failed ({statusCounts.failed})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>End Time</TableHead>
                    <TableHead>Facts Found</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell className="font-mono text-sm">{job.id}</TableCell>
                      <TableCell className="font-medium">{job.domain}</TableCell>
                      <TableCell>
                        <JobStatusBadge status={job.status} />
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {job.startTime || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {job.endTime || "-"}
                      </TableCell>
                      <TableCell>{job.factsFound}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 w-8">
                            {job.progress}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                          {job.status === "failed" && (
                            <ErrorDialog
                              trigger={
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-3 w-3" />
                                </Button>
                              }
                              jobId={job.id}
                              domain={job.domain}
                              status="Failed"
                              failureTimestamp={job.endTime || "Unknown"}
                              errorSummary="Domain unreachable: Connection timeout after 30 seconds"
                              stackTrace={`Error: Connection timeout\n    at WebCrawler.fetchPage (crawler.ts:67:12)\n    at async WebCrawler.crawlDomain (crawler.ts:45:8)\n    at async EnrichmentAgent.processJob (agent.ts:89:5)`}
                              onRetry={() => console.log(`Retry job ${job.id}`)}
                            />
                          )}
                          {job.status === "completed" && (
                            <Button variant="ghost" size="sm">
                              View Facts
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredJobs.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No jobs found matching your criteria.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
