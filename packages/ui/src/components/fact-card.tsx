import { Card, CardContent, CardHeader, CardTitle } from "../../@workspace/ui/components/card"
import { Button } from "../../@workspace/ui/components/button"
import { Badge } from "../../@workspace/ui/components/badge"
import { Progress } from "../../@workspace/ui/components/progress"
import { Check, X, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { cn } from "../lib/utils"

interface FactCardProps {
  fact: {
    id: string
    type: string
    value: string
    confidence: number
    evidence: string
    metadata?: Record<string, any>
  }
  onAccept?: (factId: string) => void
  onReject?: (factId: string) => void
  className?: string
}

export function FactCard({ fact, onAccept, onReject, className }: FactCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showJson, setShowJson] = useState(false)

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600"
    if (confidence >= 0.6) return "text-yellow-600"
    return "text-red-600"
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return "High"
    if (confidence >= 0.6) return "Medium"
    return "Low"
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">
            {fact.type}
          </CardTitle>
          <Badge variant="outline" className={getConfidenceColor(fact.confidence)}>
            {getConfidenceLabel(fact.confidence)}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Fact Value */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">Value</label>
          <p className="text-sm mt-1">{fact.value}</p>
        </div>

        {/* Confidence Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-muted-foreground">
              Confidence Score
            </label>
            <span className={cn("text-sm font-medium", getConfidenceColor(fact.confidence))}>
              {Math.round(fact.confidence * 100)}%
            </span>
          </div>
          <Progress value={fact.confidence * 100} className="h-2" />
        </div>

        {/* Evidence */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">Evidence</label>
          <div className="mt-1 p-3 bg-gray-50 border rounded-md">
            <p className="text-sm text-gray-700">{fact.evidence}</p>
          </div>
        </div>

        {/* JSON Metadata (Collapsible) */}
        {fact.metadata && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowJson(!showJson)}
              className="h-8 p-0 text-muted-foreground hover:text-foreground"
            >
              {showJson ? (
                <ChevronUp className="h-4 w-4 mr-1" />
              ) : (
                <ChevronDown className="h-4 w-4 mr-1" />
              )}
              {showJson ? "Hide" : "Show"} JSON Data
            </Button>
            
            {showJson && (
              <div className="mt-2 p-3 bg-gray-50 border rounded-md max-h-48 overflow-y-auto">
                <pre className="text-xs font-mono text-gray-800">
                  {JSON.stringify(fact.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {(onAccept || onReject) && (
          <div className="flex gap-2 pt-2 border-t">
            {onAccept && (
              <Button
                size="sm"
                onClick={() => onAccept(fact.id)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Check className="h-3 w-3 mr-1" />
                Accept
              </Button>
            )}
            {onReject && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onReject(fact.id)}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <X className="h-3 w-3 mr-1" />
                Reject
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
