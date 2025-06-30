"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../@workspace/ui/components/card"
import { Badge } from "../../@workspace/ui/components/badge"
import { Button } from "../../@workspace/ui/components/button"
import { AlertTriangle, ExternalLink, CheckCircle } from "lucide-react"
import { useEnrichmentJobs } from "../hooks/use-enrichment-jobs"

interface ErrorItem {
  type: string
  count: number
  description: string
  severity: "high" | "medium" | "low"
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "high":
      return "destructive"
    case "medium":
      return "secondary"
    case "low":
      return "outline"
    default:
      return "secondary"
  }
}

export function TopErrorsBlock() {
  const { jobs } = useEnrichmentJobs()
  
  // Generate error data from real failed jobs
  const generateErrorData = (): ErrorItem[] => {
    const failedJobs = jobs.filter(job => job.status === 'failed')
    
    if (failedJobs.length === 0) {
      return []
    }
    
    // Group errors by type (simplified categorization based on error messages)
    const errorGroups: { [key: string]: { count: number; description: string; severity: "high" | "medium" | "low" } } = {}
    
    failedJobs.forEach(job => {
      if (job.error) {
        const errorMessage = job.error.toLowerCase()
        let errorType = "Unknown Error"
        let description = "Unspecified error"
        let severity: "high" | "medium" | "low" = "medium"
        
        if (errorMessage.includes('timeout') || errorMessage.includes('connection')) {
          errorType = "Connection Timeout"
          description = "Network connectivity issues"
          severity = "high"
        } else if (errorMessage.includes('parse') || errorMessage.includes('json')) {
          errorType = "Parse Error"
          description = "Data parsing failures"
          severity = "medium"
        } else if (errorMessage.includes('rate') || errorMessage.includes('limit')) {
          errorType = "Rate Limited"
          description = "API throttling"
          severity = "medium"
        } else if (errorMessage.includes('auth') || errorMessage.includes('permission')) {
          errorType = "Auth Failed"
          description = "Access denied"
          severity = "high"
        } else if (errorMessage.includes('crawl')) {
          errorType = "Crawling Error"
          description = "Web crawling failures"
          severity = "medium"
        }
        
        if (!errorGroups[errorType]) {
          errorGroups[errorType] = { count: 0, description, severity }
        }
        errorGroups[errorType].count++
      }
    })
    
    // Convert to array and sort by count
    return Object.entries(errorGroups)
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4) // Top 4 errors
  }
  
  const errorData = generateErrorData()
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-medium">Recent Issues</CardTitle>
          <CardDescription>
            Error analysis from recent jobs
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm">
          View All
          <ExternalLink className="ml-2 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {errorData.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No recent errors</p>
                <p className="text-xs text-muted-foreground">All jobs completed successfully</p>
              </div>
            </div>
          ) : (
            errorData.map((error, index) => (
              <div
                key={index}
                className="flex items-center justify-between space-x-4"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {error.type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {error.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={getSeverityColor(error.severity) as any}>
                    {error.severity}
                  </Badge>
                  <div className="text-right">
                    <div className="text-lg font-bold">{error.count}</div>
                    <div className="text-xs text-muted-foreground">instances</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
