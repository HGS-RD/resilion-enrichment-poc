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
import { AlertTriangle, ExternalLink } from "lucide-react"

interface ErrorItem {
  type: string
  count: number
  description: string
  severity: "high" | "medium" | "low"
}

const errorData: ErrorItem[] = [
  {
    type: "Connection Timeout",
    count: 8,
    description: "Network issues",
    severity: "high",
  },
  {
    type: "Parse Error",
    count: 5,
    description: "Invalid JSON",
    severity: "medium",
  },
  {
    type: "Rate Limited",
    count: 3,
    description: "API throttling",
    severity: "medium",
  },
  {
    type: "Auth Failed",
    count: 2,
    description: "Access denied",
    severity: "high",
  },
]

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
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-medium">Top Errors</CardTitle>
          <CardDescription>
            Most frequent errors in the last 24 hours
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm">
          View All
          <ExternalLink className="ml-2 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {errorData.map((error, index) => (
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
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
