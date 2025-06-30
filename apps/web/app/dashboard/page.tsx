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
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span>Dashboard</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Dashboard</h1>
        </div>
        <Button variant="ghost" size="sm" className="h-9 w-9">
          <Bell className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Jobs"
          value={stats.totalJobs.toLocaleString()}
          icon={<Database className="h-4 w-4 text-primary" />}
          trend={{ value: 12, isPositive: true }}
          description="+12% this month"
          className="border-primary/20 bg-primary/5"
        />
        <StatCard
          title="Success Rate"
          value={`${stats.successRate}%`}
          icon={<CheckCircle className="h-4 w-4 text-success" />}
          trend={{ value: 2.1, isPositive: true }}
          description="+2.1% this week"
          className="border-success/20 bg-success/5"
        />
        <StatCard
          title="Avg Confidence"
          value={`${stats.avgConfidence}%`}
          icon={<Target className="h-4 w-4 text-warning" />}
          trend={{ value: -1.2, isPositive: false }}
          description="-1.2% this week"
          className="border-warning/20 bg-warning/5"
        />
        <StatCard
          title="Facts Found"
          value={stats.factsFound.toLocaleString()}
          icon={<TrendingUp className="h-4 w-4 text-info" />}
          trend={{ value: 18, isPositive: true }}
          description="+18% this month"
          className="border-info/20 bg-info/5"
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
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
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
                <TableRow key={job.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono text-sm text-muted-foreground">{job.id}</TableCell>
                  <TableCell className="font-medium">{job.domain}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      job.status === 'completed' ? 'bg-success/10 text-success border border-success/20' :
                      job.status === 'running' ? 'bg-info/10 text-info border border-info/20' :
                      job.status === 'pending' ? 'bg-warning/10 text-warning border border-warning/20' :
                      'bg-destructive/10 text-destructive border border-destructive/20'
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
                    <Button variant="ghost" size="sm" className="h-8 px-3">
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
