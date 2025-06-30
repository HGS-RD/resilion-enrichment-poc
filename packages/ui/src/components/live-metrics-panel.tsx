"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Progress,
  Badge,
  ScrollArea
} from "@workspace/ui"
import {
  TrendingUp,
  DollarSign,
  Zap,
  Clock,
  Target,
  Activity,
  AlertTriangle,
  CheckCircle
} from "lucide-react"

interface MetricData {
  label: string
  value: string | number
  change?: number
  trend?: 'up' | 'down' | 'stable'
  status?: 'success' | 'warning' | 'error' | 'info'
}

interface LiveMetricsPanelProps {
  jobId?: string
  className?: string
}

export function LiveMetricsPanel({ jobId, className }: LiveMetricsPanelProps) {
  const [metrics, setMetrics] = useState<MetricData[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Fetch real metrics from API
  useEffect(() => {
    if (!jobId) {
      setMetrics([])
      return
    }

    const fetchMetrics = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/enrichment/${jobId}/metrics`)
        if (response.ok) {
          const data = await response.json()
          // Convert metrics object to array format expected by the component
          if (data.metrics && typeof data.metrics === 'object') {
            const metricsArray: MetricData[] = [
              {
                label: "Processing Speed",
                value: `${data.metrics.processingSpeed?.value || 0} ${data.metrics.processingSpeed?.unit || 'pages/min'}`,
                trend: data.metrics.processingSpeed?.trend as 'up' | 'down' | 'stable',
                status: 'info'
              },
              {
                label: "API Cost",
                value: `$${(data.metrics.apiCost?.value || 0).toFixed(3)}`,
                trend: data.metrics.apiCost?.trend as 'up' | 'down' | 'stable',
                status: 'warning'
              },
              {
                label: "Token Usage",
                value: `${data.metrics.tokenUsage?.value || 0} tokens`,
                trend: data.metrics.tokenUsage?.trend as 'up' | 'down' | 'stable',
                status: 'info'
              },
              {
                label: "Completion",
                value: `${data.metrics.completionPercentage?.value || 0}%`,
                trend: data.metrics.completionPercentage?.trend as 'up' | 'down' | 'stable',
                status: data.metrics.completionPercentage?.value === 100 ? 'success' : 'info'
              },
              {
                label: "Memory Usage",
                value: `${data.metrics.memoryUsage?.value || 0} MB`,
                trend: data.metrics.memoryUsage?.trend as 'up' | 'down' | 'stable',
                status: 'info'
              },
              {
                label: "Runtime",
                value: `${Math.floor((data.metrics.elapsedTime?.value || 0) / 60)}m ${(data.metrics.elapsedTime?.value || 0) % 60}s`,
                trend: data.metrics.elapsedTime?.trend as 'up' | 'down' | 'stable',
                status: 'info'
              }
            ]
            setMetrics(metricsArray)
          } else {
            setMetrics([])
          }
        } else {
          // If no metrics endpoint exists yet, show empty state
          setMetrics([])
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error)
        setMetrics([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetrics()

    // Set up polling for real-time updates every 10 seconds
    const interval = setInterval(fetchMetrics, 10000)
    return () => clearInterval(interval)
  }, [jobId])

  const getMetricIcon = (label: string) => {
    switch (label) {
      case "Processing Speed": return <Activity className="h-4 w-4" />
      case "API Cost": return <DollarSign className="h-4 w-4" />
      case "Token Usage": return <Zap className="h-4 w-4" />
      case "Quality Score": return <Target className="h-4 w-4" />
      case "Error Rate": return <AlertTriangle className="h-4 w-4" />
      case "Response Time": return <Clock className="h-4 w-4" />
      default: return <TrendingUp className="h-4 w-4" />
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'text-success'
      case 'warning': return 'text-warning'
      case 'error': return 'text-destructive'
      case 'info': return 'text-info'
      default: return 'text-muted-foreground'
    }
  }

  const getTrendIcon = (trend?: string) => {
    if (trend === 'up') return <TrendingUp className="h-3 w-3 text-success" />
    if (trend === 'down') return <TrendingUp className="h-3 w-3 text-destructive rotate-180" />
    return <div className="h-3 w-3 rounded-full bg-muted-foreground" />
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <TrendingUp className="h-4 w-4" />
          Live Metrics
          {jobId && (
            <Badge variant="outline" className="ml-auto text-xs">
              Real-time
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {!jobId ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select a job to view metrics</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {metrics.map((metric, index) => (
              <div key={index} className="p-3 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={getStatusColor(metric.status)}>
                      {getMetricIcon(metric.label)}
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {metric.label}
                    </span>
                  </div>
                  {getTrendIcon(metric.trend)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">
                    {metric.value}
                  </span>
                  {metric.change !== undefined && (
                    <span className={`text-xs ${
                      metric.change > 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
