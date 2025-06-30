"use client"

import { useState, useEffect, useRef } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  ScrollArea,
  Button,
  Input,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@workspace/ui"
import {
  Terminal,
  Search,
  Filter,
  Download,
  Trash2,
  Play,
  Pause,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Database
} from "lucide-react"

interface LogEntry {
  id: string
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  source: string
  message: string
  details?: any
  duration?: number
  apiCall?: {
    method: string
    url: string
    status: number
    responseTime: number
  }
}

interface DebugConsolePanelProps {
  jobId?: string
  className?: string
}

export function DebugConsolePanel({ jobId, className }: DebugConsolePanelProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([])
  const [isLive, setIsLive] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('logs')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Fetch real logs from API
  useEffect(() => {
    if (!jobId) {
      setLogs([])
      return
    }

    const fetchLogs = async () => {
      try {
        const response = await fetch(`/api/enrichment/${jobId}/logs`)
        if (response.ok) {
          const data = await response.json()
          setLogs(data.logs || [])
        } else {
          // If no logs endpoint exists yet, show empty state
          setLogs([])
        }
      } catch (error) {
        console.error('Failed to fetch logs:', error)
        setLogs([])
      }
    }

    fetchLogs()

    // Set up polling for real-time updates only if live mode is enabled
    let interval: NodeJS.Timeout | null = null
    if (isLive) {
      interval = setInterval(fetchLogs, 5000) // Poll every 5 seconds
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [jobId, isLive])

  // Filter and search logs
  useEffect(() => {
    let filtered = logs

    // Apply level filter
    if (filter !== 'all') {
      filtered = filtered.filter(log => log.level === filter)
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.source.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredLogs(filtered)
  }, [logs, filter, searchTerm])

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current && isLive) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [filteredLogs, isLive])

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'debug': return <Terminal className="h-3 w-3 text-muted-foreground" />
      case 'info': return <Info className="h-3 w-3 text-info" />
      case 'warn': return <AlertTriangle className="h-3 w-3 text-warning" />
      case 'error': return <XCircle className="h-3 w-3 text-destructive" />
      default: return <Info className="h-3 w-3 text-muted-foreground" />
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'debug': return 'text-muted-foreground bg-muted/30'
      case 'info': return 'text-info bg-info/10'
      case 'warn': return 'text-warning bg-warning/10'
      case 'error': return 'text-destructive bg-destructive/10'
      default: return 'text-muted-foreground bg-muted/30'
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const timeString = date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit'
    })
    const ms = date.getMilliseconds().toString().padStart(3, '0')
    return `${timeString}.${ms}`
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return ''
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const apiLogs = logs.filter(log => log.apiCall)

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Terminal className="h-4 w-4" />
            Debug Console
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
              onClick={() => setLogs([])}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-7 text-xs"
            />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant={filter === 'all' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 text-xs"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'error' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 text-xs"
              onClick={() => setFilter('error')}
            >
              Errors
            </Button>
            <Button
              variant={filter === 'warn' ? 'default' : 'ghost'}
              size="sm"
              className="h-6 text-xs"
              onClick={() => setFilter('warn')}
            >
              Warnings
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {!jobId ? (
          <div className="text-center py-8 text-muted-foreground">
            <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Select a job to view debug console</p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="logs">Logs ({filteredLogs.length})</TabsTrigger>
              <TabsTrigger value="api">API Calls ({apiLogs.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="logs" className="mt-3">
              <ScrollArea className="h-[350px]" ref={scrollRef}>
                <div className="space-y-1 font-mono text-xs">
                  {filteredLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className={`p-2 rounded border-l-2 ${getLevelColor(log.level)}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {getLevelIcon(log.level)}
                        <span className="text-muted-foreground">
                          {formatTime(log.timestamp)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {log.source}
                        </Badge>
                        <Badge variant="outline" className="text-xs uppercase">
                          {log.level}
                        </Badge>
                        {log.duration && (
                          <span className="text-muted-foreground ml-auto">
                            {formatDuration(log.duration)}
                          </span>
                        )}
                      </div>
                      <p className="text-foreground">{log.message}</p>
                      {log.apiCall && (
                        <div className="mt-1 text-muted-foreground">
                          <span className="text-info">{log.apiCall.method}</span> {log.apiCall.url} → 
                          <span className={log.apiCall.status >= 400 ? 'text-destructive' : 'text-success'}>
                            {log.apiCall.status}
                          </span> ({formatDuration(log.apiCall.responseTime)})
                        </div>
                      )}
                      {log.details && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Show details
                          </summary>
                          <pre className="mt-1 p-2 bg-muted/50 rounded text-xs overflow-x-auto">
                            {typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                  {filteredLogs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No logs found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="api" className="mt-3">
              <ScrollArea className="h-[350px]">
                <div className="space-y-2">
                  {apiLogs.map((log) => (
                    <div key={log.id} className="p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {log.apiCall?.method}
                          </Badge>
                          <span className="font-mono text-xs">{log.apiCall?.url}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={log.apiCall?.status && log.apiCall.status >= 400 ? "destructive" : "default"}
                            className="text-xs"
                          >
                            {log.apiCall?.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDuration(log.apiCall?.responseTime)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatTime(log.timestamp)}</span>
                        <span>{log.source}</span>
                      </div>
                      <p className="text-sm mt-1">{log.message}</p>
                    </div>
                  ))}
                  {apiLogs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No API calls logged</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
