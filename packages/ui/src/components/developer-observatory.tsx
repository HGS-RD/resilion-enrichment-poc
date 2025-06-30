"use client"

import { useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@workspace/ui"
import {
  Monitor,
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Rows
} from "lucide-react"
import { LiveMetricsPanel } from "./live-metrics-panel"
import { ActivityFeedPanel } from "./activity-feed-panel"
import { DataFlowPanel } from "./data-flow-panel"
import { DebugConsolePanel } from "./debug-console-panel"

interface DeveloperObservatoryProps {
  selectedJobId?: string
  className?: string
}

type LayoutMode = 'stacked' | 'focus'
type FocusPanel = 'metrics' | 'activity' | 'dataflow' | 'console'

export function DeveloperObservatory({ selectedJobId, className }: DeveloperObservatoryProps) {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('stacked')
  const [focusPanel, setFocusPanel] = useState<FocusPanel>('metrics')
  const [isExpanded, setIsExpanded] = useState(false)
  const [hiddenPanels, setHiddenPanels] = useState<Set<string>>(new Set())

  const togglePanelVisibility = (panelId: string) => {
    const newHidden = new Set(hiddenPanels)
    if (newHidden.has(panelId)) {
      newHidden.delete(panelId)
    } else {
      newHidden.add(panelId)
    }
    setHiddenPanels(newHidden)
  }

  const renderStackedLayout = () => (
    <div className="space-y-4">
      {!hiddenPanels.has('metrics') && (
        <LiveMetricsPanel jobId={selectedJobId} className="min-h-[200px]" />
      )}
      {!hiddenPanels.has('activity') && (
        <ActivityFeedPanel jobId={selectedJobId} className="min-h-[300px]" />
      )}
      {!hiddenPanels.has('dataflow') && (
        <DataFlowPanel jobId={selectedJobId} className="min-h-[250px]" />
      )}
      {!hiddenPanels.has('console') && (
        <DebugConsolePanel jobId={selectedJobId} className="min-h-[300px]" />
      )}
    </div>
  )

  const renderFocusLayout = () => {
    switch (focusPanel) {
      case 'metrics':
        return <LiveMetricsPanel jobId={selectedJobId} className="h-[400px]" />
      case 'activity':
        return <ActivityFeedPanel jobId={selectedJobId} className="h-[400px]" />
      case 'dataflow':
        return <DataFlowPanel jobId={selectedJobId} className="h-[400px]" />
      case 'console':
        return <DebugConsolePanel jobId={selectedJobId} className="h-[400px]" />
      default:
        return <LiveMetricsPanel jobId={selectedJobId} className="h-[400px]" />
    }
  }

  const renderLayout = () => {
    if (layoutMode === 'focus') {
      return renderFocusLayout()
    }
    return renderStackedLayout()
  }

  return (
    <div className={`${className} ${isExpanded ? 'fixed inset-4 z-50 bg-background border rounded-lg shadow-lg' : ''}`}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Monitor className="h-4 w-4" />
              Developer Observatory
              {selectedJobId && (
                <Badge variant="outline" className="text-xs">
                  Job: {selectedJobId.slice(0, 8)}...
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Layout Mode Selector */}
              <Select value={layoutMode} onValueChange={(value: LayoutMode) => setLayoutMode(value)}>
                <SelectTrigger className="w-32 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stacked">
                    <div className="flex items-center gap-2">
                      <Rows className="h-3 w-3" />
                      Stacked
                    </div>
                  </SelectItem>
                  <SelectItem value="focus">
                    <div className="flex items-center gap-2">
                      <Maximize2 className="h-3 w-3" />
                      Focus
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Focus Panel Selector (only shown in focus mode) */}
              {layoutMode === 'focus' && (
                <Select value={focusPanel} onValueChange={(value: FocusPanel) => setFocusPanel(value)}>
                  <SelectTrigger className="w-32 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metrics">Metrics</SelectItem>
                    <SelectItem value="activity">Activity</SelectItem>
                    <SelectItem value="dataflow">Data Flow</SelectItem>
                    <SelectItem value="console">Console</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {/* Panel Visibility Controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => togglePanelVisibility('metrics')}
                  title="Toggle Metrics Panel"
                >
                  {hiddenPanels.has('metrics') ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => togglePanelVisibility('activity')}
                  title="Toggle Activity Panel"
                >
                  {hiddenPanels.has('activity') ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => togglePanelVisibility('dataflow')}
                  title="Toggle Data Flow Panel"
                >
                  {hiddenPanels.has('dataflow') ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => togglePanelVisibility('console')}
                  title="Toggle Console Panel"
                >
                  {hiddenPanels.has('console') ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
              </div>

              {/* Expand/Collapse */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {!selectedJobId ? (
            <div className="text-center py-12 text-muted-foreground">
              <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Developer Observatory</h3>
              <p className="text-sm">
                Select a job to start monitoring real-time metrics, activity feeds, data flow, and debug logs.
              </p>
            </div>
          ) : (
            <div className={`${isExpanded ? 'h-[calc(100vh-8rem)] overflow-y-auto' : 'max-h-[80vh] overflow-y-auto'}`}>
              {renderLayout()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
