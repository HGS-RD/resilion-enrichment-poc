"use client"

import { 
  StatCard, 
  WorkflowProgress, 
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
  ErrorDialog,
  Button
} from "@workspace/ui"
import { 
  TrendingUp, 
  CheckCircle, 
  Target, 
  Database,
  AlertTriangle,
  ExternalLink
} from "lucide-react"

// Mock data for demonstration
const mockStats = {
  totalJobs: 1247,
  successRate: 94.2,
  avgConfidence: 87.5,
  factsFound: 15623
}

const mockWorkflowSteps = [
  {
    id: "1",
    name: "Web Crawling",
    status: "completed" as const,
    details: "Crawled 45 pages from acme-corp.com"
  },
  {
    id: "2", 
    name: "Text Chunking",
    status: "completed" as const,
    details: "Created 234 text chunks"
  },
  {
    id: "3",
    name: "Embedding Generation", 
    status: "running" as const,
    progress: 67,
    details: "Processing embeddings with Pinecone"
  },
  {
    id: "4",
    name: "Entity Extraction",
    status: "pending" as const,
    details: "Waiting for embeddings to complete"
  },
  {
    id: "5",
    name: "Fact Validation",
    status: "pending" as const,
    details: "AI-powered confidence scoring"
  }
]

const mockRecentActivity = [
  {
    id: "job-001",
    domain: "acme-corp.com",
    status: "running" as const,
    startTime: "2025-06-29 09:15:00",
    factsFound: 0
  },
  {
    id: "job-002", 
    domain: "techstart.io",
    status: "completed" as const,
    startTime: "2025-06-29 08:45:00",
    factsFound: 23
  },
  {
    id: "job-003",
    domain: "manufacturing-co.com", 
    status: "failed" as const,
    startTime: "2025-06-29 08:30:00",
    factsFound: 0
  }
]

const mockTopErrors = [
  {
    error: "Rate limit exceeded for OpenAI API",
    count: 12,
    lastOccurred: "2 hours ago"
  },
  {
    error: "Domain unreachable: Connection timeout",
    count: 8,
    lastOccurred: "4 hours ago"
  },
  {
    error: "Invalid JSON schema in extraction response",
    count: 5,
    lastOccurred: "6 hours ago"
  }
]

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Monitor enrichment jobs and system performance
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Jobs"
          value={mockStats.totalJobs.toLocaleString()}
          icon={<Database />}
          trend={{ value: 12.5, isPositive: true }}
        />
        <StatCard
          title="Success Rate"
          value={`${mockStats.successRate}%`}
          icon={<CheckCircle />}
          trend={{ value: 2.1, isPositive: true }}
        />
        <StatCard
          title="Avg Confidence"
          value={`${mockStats.avgConfidence}%`}
          icon={<Target />}
          trend={{ value: -1.2, isPositive: false }}
        />
        <StatCard
          title="Facts Found"
          value={mockStats.factsFound.toLocaleString()}
          icon={<TrendingUp />}
          trend={{ value: 8.7, isPositive: true }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow Progress */}
        <div className="lg:col-span-2">
          <WorkflowProgress steps={mockWorkflowSteps} />
        </div>

        {/* Top Errors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Top Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockTopErrors.map((error, index) => (
                <div key={index} className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {error.error}
                    </p>
                    <p className="text-xs text-gray-500">
                      {error.count} occurrences • {error.lastOccurred}
                    </p>
                  </div>
                  <ErrorDialog
                    trigger={
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    }
                    jobId="job-003"
                    domain="manufacturing-co.com"
                    status="Failed"
                    failureTimestamp="2025-06-29 08:30:00"
                    errorSummary={error.error}
                    stackTrace={`Error: ${error.error}\n    at EnrichmentAgent.extractEntities (agent.ts:145:12)\n    at async EnrichmentAgent.processJob (agent.ts:89:5)\n    at async JobProcessor.execute (processor.ts:34:7)`}
                    onRetry={() => console.log("Retry job")}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Enrichment Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job ID</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>Facts Found</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockRecentActivity.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-mono text-sm">{job.id}</TableCell>
                  <TableCell>{job.domain}</TableCell>
                  <TableCell>
                    <JobStatusBadge status={job.status} />
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {job.startTime}
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
    </div>
  )
}
