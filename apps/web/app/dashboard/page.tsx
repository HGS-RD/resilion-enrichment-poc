"use client"

import { 
  StatCard, 
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  EnrichmentTrendChart,
  TopErrorsBlock
} from "@workspace/ui"
import { useEnrichmentJobs } from "@workspace/ui"
import { 
  TrendingUp, 
  CheckCircle, 
  Target, 
  Database,
  AlertTriangle,
  Bell
} from "lucide-react"


export default function DashboardPage() {
  const { jobs, stats } = useEnrichmentJobs()
  
  // Get recent jobs (last 5)
  const recentJobs = jobs.slice(0, 5)
  
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header with breadcrumb */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <span>Dashboard</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        </div>
        <Button variant="ghost" size="sm">
          <Bell className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Jobs"
          value={stats.totalJobs.toLocaleString()}
          icon={<Database className="h-4 w-4 text-blue-500" />}
          trend={{ value: 12, isPositive: true }}
          description="+12% this month"
          className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
        />
        <StatCard
          title="Success Rate"
          value={`${stats.successRate}%`}
          icon={<CheckCircle className="h-4 w-4 text-green-500" />}
          trend={{ value: 2.1, isPositive: true }}
          description="+2.1% this week"
          className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
        />
        <StatCard
          title="Avg Confidence"
          value={`${stats.avgConfidence}%`}
          icon={<Target className="h-4 w-4 text-yellow-500" />}
          trend={{ value: -1.2, isPositive: false }}
          description="-1.2% this week"
          className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800"
        />
        <StatCard
          title="Facts Found"
          value={stats.factsFound.toLocaleString()}
          icon={<TrendingUp className="h-4 w-4 text-purple-500" />}
          trend={{ value: 18, isPositive: true }}
          description="+18% this month"
          className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enrichment Jobs Trend Chart */}
        <div className="lg:col-span-2">
          <EnrichmentTrendChart />
        </div>

        {/* Top Errors */}
        <TopErrorsBlock />
      </div>

      {/* Recent Enrichment Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Enrichment Activity</CardTitle>
          <Button variant="ghost" size="sm" className="text-blue-600">
            View All
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job ID</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Facts Found</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-mono text-sm">{job.id}</TableCell>
                  <TableCell>{job.domain}</TableCell>
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
    </div>
  )
}
