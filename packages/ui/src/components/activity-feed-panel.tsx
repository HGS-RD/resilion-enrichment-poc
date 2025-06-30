"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  ScrollArea,
  Button
} from "@workspace/ui"
import {
  Activity,
  Globe,
  FileText,
  Zap,
  Database,
  CheckCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Pause,
  Play,
  Filter
} from "lucide-react"

interface ActivityEvent {
  id: string
  timestamp: string
  type: 'crawling' | 'chunking' | 'embedding' | 'extraction' | 'completed' | 'error' | 'info'
  step: string
  message: string
  details?: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  metadata?: Record<string, any>
}

interface ActivityFeedPanelProps {
  jobId?: string
  className?: string
}

export function ActivityFeedPanel({ jobId, className }: ActivityFeedPanelProps) {
  const [activities, setActivities] = useState<ActivityEvent[]>([])
  const [isLive, setIsLive] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(false)

  // Fetch real activity data from API
  useEffect(() => {
    if (!jobId) {
      setActivities([])
      return
    }

    const fetchActivities = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/enrichment/${jobId}/activity`)
        if (response.ok) {
          const data = await response.json()
          setActivities(data.activities || [])
        } else {
          // If no activity endpoint exists yet, show empty state
          setActivities([])
        }
      } catch (error) {
        console.error('Failed to fetch activities:', error)
        setActivities([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchActivities()

    // Set up polling for real-time updates only if live mode is enabled
    let interval: NodeJS.Timeout | null = null
    if (isLive) {
      interval = setInterval(fetchActivities, 5000) // Poll every 5 seconds
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [jobId, isLive])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'crawling': return <Globe className="h-4 w-4 text-info" />
      case 'chunking': return <FileText className="h-4 w-4 text-warning" />
      case 'embedding': return <Zap className="h-4 w-4 text-primary" />
      case 'extraction': return <Database className="h-4 w-4 text-success" />
      case 'completed': return <CheckCircle className="h-4 w-4 text-success" />
      case 'error': return <AlertTriangle className="h-4 w-4 text-destructive" />
      default: return <Activity className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'border-destructive bg-destructive/5'
      case 'high': return 'border-destructive/60 bg-destructive/5'
      case 'medium': return 'border-warning/60 bg-warning/5'
      case 'low': return 'border-border bg-muted/30'
      default: return 'border-border bg-muted/30'
    }
  }

  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true
    if (filter === 'errors') return activity.type === 'error'
    if (filter === 'processing') return ['crawling', 'chunking', 'embedding', 'extraction'].includes(activity.type)
    return activity.type === filter
  })

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return ''
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Activity className="h-4 w-4" />
            Activity Feed
            {jobId && (
              <Badge variant={isLive ? "default" : "secondary"} className="text-xs">
                {isLive ? "Live" : "Paused"}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setIsLive(!isLive)}
            >
              {isLive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setActivities([])}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size="sm"
            className="h-6 text-xs"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'processing' ? 'default' : 'ghost'}
            size="sm"
            className="h-6 text-xs"
            onClick={() => setFilter('processing')}
          >
            Processing
          </Button>
          <Button
            variant={filter === 'errors' ? 'default' : 'ghost'}
            size="sm"
            className="h-6 text-xs"
            onClick={() => setFilter('errors')}
          >
            Errors
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {!jobId ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select a job to view activity</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filteredActivities.map((activity) => (
                <div 
                  key={activity.id} 
                  className={`p-3 rounded-lg border transition-all duration-200 ${getSeverityColor(activity.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {activity.step}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(activity.timestamp)}
                          </span>
                        </div>
                        {activity.metadata?.duration && (
                          <span className="text-xs text-muted-foreground">
                            {formatDuration(activity.metadata.duration)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">
                        {activity.message}
                      </p>
                      {activity.details && (
                        <p className="text-xs text-muted-foreground">
                          {activity.details}
                        </p>
                      )}
                      {(activity.metadata?.tokens || activity.metadata?.cost) && (
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {activity.metadata.tokens && (
                            <span className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              {activity.metadata.tokens} tokens
                            </span>
                          )}
                          {activity.metadata.cost && (
                            <span className="flex items-center gap-1">
                              <span className="text-xs">$</span>
                              {activity.metadata.cost}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {filteredActivities.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No activities found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
