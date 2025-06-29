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
  SelectValue
} from "@workspace/ui"
import { 
  TrendingUp, 
  CheckCircle, 
  Target, 
  Database,
  AlertTriangle,
  Bell
} from "lucide-react"

// Mock data matching the dashboard mockup
const mockStats = {
  totalJobs: 247,
  successRate: 94.2,
  avgConfidence: 87.5,
  factsFound: 8429
}

const mockTopErrors = [
  {
    type: "Connection Timeout",
    description: "Network issues",
    count: 8,
    color: "text-red-600"
  },
  {
    type: "Parse Error", 
    description: "Invalid JSON",
    count: 5,
    color: "text-orange-600"
  },
  {
    type: "Rate Limited",
    description: "API throttling", 
    count: 3,
    color: "text-yellow-600"
  },
  {
    type: "Auth Failed",
    description: "Access denied",
    count: 2,
    color: "text-purple-600"
  }
]

const mockRecentActivity = [
  {
    id: "ENR-2024-001",
    domain: "globalsteel.org",
    status: "Completed",
    startTime: "2024-01-15 10:30:00",
    endTime: "2024-01-15 10:45:00",
    factsFound: 47
  },
  {
    id: "ENR-2024-002", 
    domain: "techcorp.io",
    status: "Running",
    startTime: "2024-01-15 11:15:00",
    endTime: "-",
    factsFound: 23
  },
  {
    id: "ENR-2024-003",
    domain: "acme-corp.com", 
    status: "Failed",
    startTime: "2024-01-15 09:45:00",
    endTime: "2024-01-15 09:47:00",
    factsFound: 0
  }
]

export default function DashboardPage() {
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
          value={mockStats.totalJobs.toLocaleString()}
          icon={<Database className="h-4 w-4 text-blue-500" />}
          trend={{ value: 12, isPositive: true }}
          description="+12% this month"
          className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
        />
        <StatCard
          title="Success Rate"
          value={`${mockStats.successRate}%`}
          icon={<CheckCircle className="h-4 w-4 text-green-500" />}
          trend={{ value: 2.1, isPositive: true }}
          description="+2.1% this week"
          className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
        />
        <StatCard
          title="Avg Confidence"
          value={`${mockStats.avgConfidence}%`}
          icon={<Target className="h-4 w-4 text-yellow-500" />}
          trend={{ value: -1.2, isPositive: false }}
          description="-1.2% this week"
          className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800"
        />
        <StatCard
          title="Facts Found"
          value={mockStats.factsFound.toLocaleString()}
          icon={<TrendingUp className="h-4 w-4 text-purple-500" />}
          trend={{ value: 18, isPositive: true }}
          description="+18% this month"
          className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enrichment Jobs Trend Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Enrichment Jobs Trend</CardTitle>
              <Select defaultValue="30">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Chart placeholder</p>
                  <p className="text-sm text-gray-400">Trend visualization will be implemented</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Errors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Top Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockTopErrors.map((error, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-sm">{error.type}</div>
                      <div className="text-right">
                        <div className="font-bold text-lg">{error.count}</div>
                        <div className="text-xs text-gray-500">instances</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{error.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
              {mockRecentActivity.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-mono text-sm">{job.id}</TableCell>
                  <TableCell>{job.domain}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      job.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      job.status === 'Running' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {job.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {job.startTime}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {job.endTime}
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
