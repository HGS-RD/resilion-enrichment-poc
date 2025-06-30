import { Card, CardContent, CardHeader, CardTitle } from "../../@workspace/ui/components/card"
import { Button } from "../../@workspace/ui/components/button"
import { Badge } from "../../@workspace/ui/components/badge"
import { Progress } from "../../@workspace/ui/components/progress"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../@workspace/ui/components/accordion"
import { Check, X, ChevronDown, ChevronUp, ExternalLink, Calendar, Database, Shield } from "lucide-react"
import { useState } from "react"
import { cn } from "../lib/utils"

interface FactCardProps {
  fact: {
    id: string
    type: string
    value?: string
    data: Record<string, any>
    confidence: number
    evidence: string
    sourceUrl?: string
    tier?: number
    validated: boolean
    validationNotes?: string
    createdAt: string
    metadata?: Record<string, any>
  }
  onAccept?: (factId: string) => void
  onReject?: (factId: string) => void
  className?: string
}

export function FactCard({ fact, onAccept, onReject, className }: FactCardProps) {
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

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 1:
        return "text-blue-600 bg-blue-50 border-blue-200"
      case 2:
        return "text-purple-600 bg-purple-50 border-purple-200"
      case 3:
        return "text-orange-600 bg-orange-50 border-orange-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const getTierLabel = (tier: number) => {
    switch (tier) {
      case 1:
        return "Corporate"
      case 2:
        return "Professional"
      case 3:
        return "News"
      default:
        return "Unknown"
    }
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  // Extract main value from fact data
  const getFactValue = () => {
    if (fact.value) return fact.value
    if (fact.data && typeof fact.data === 'object') {
      // Try common value fields
      const valueFields = ['value', 'name', 'title', 'description', 'content', 'text']
      for (const field of valueFields) {
        if (fact.data[field]) return fact.data[field]
      }
      // If no common field, return first string value
      const firstStringValue = Object.values(fact.data).find(v => typeof v === 'string')
      if (firstStringValue) return firstStringValue
    }
    return 'No value available'
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-medium">
              {fact.type}
            </CardTitle>
            {fact.validated && (
              <div className="flex items-center" title="Validated">
                <Shield className="h-4 w-4 text-green-600" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {fact.tier && (
              <Badge variant="outline" className={getTierColor(fact.tier)}>
                Tier {fact.tier}: {getTierLabel(fact.tier)}
              </Badge>
            )}
            <Badge variant="outline" className={getConfidenceColor(fact.confidence)}>
              {getConfidenceLabel(fact.confidence)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Fact Value */}
        <div>
          <label className="text-sm font-medium text-muted-foreground">Value</label>
          <p className="text-sm mt-1 font-medium">{getFactValue()}</p>
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

        {/* Source URL */}
        {fact.sourceUrl && (
          <div>
            <label className="text-sm font-medium text-muted-foreground">Source</label>
            <div className="mt-1">
              <a 
                href={fact.sourceUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                {fact.sourceUrl.length > 60 ? `${fact.sourceUrl.substring(0, 60)}...` : fact.sourceUrl}
              </a>
            </div>
          </div>
        )}

        {/* Metadata and Details */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="details" className="border-none">
            <AccordionTrigger className="text-sm font-medium text-muted-foreground hover:text-foreground py-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                View Details & Metadata
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              {/* Fact Data JSON */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Fact Data</label>
                <div className="mt-1 p-3 bg-gray-50 border rounded-md max-h-48 overflow-y-auto">
                  <pre className="text-xs font-mono text-gray-800">
                    {JSON.stringify(fact.data, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Validation Notes */}
              {fact.validationNotes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Validation Notes</label>
                  <p className="text-sm mt-1 text-gray-700">{fact.validationNotes}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  <span>Created: {formatDateTime(fact.createdAt)}</span>
                </div>
              </div>

              {/* Additional Metadata */}
              {fact.metadata && Object.keys(fact.metadata).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Additional Metadata</label>
                  <div className="mt-1 p-3 bg-gray-50 border rounded-md max-h-48 overflow-y-auto">
                    <pre className="text-xs font-mono text-gray-800">
                      {JSON.stringify(fact.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

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
