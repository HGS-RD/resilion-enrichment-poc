"use client"

import { useState } from "react"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Input,
  Button,
  Badge,
  Progress
} from "@workspace/ui"
import { 
  Search, 
  Download,
  Bell,
  ExternalLink,
  Check,
  X,
  ChevronDown,
  ChevronUp
} from "lucide-react"

// Mock fact data based on the mockup
const mockFacts = [
  {
    id: "fact-001",
    type: "Company Revenue",
    category: "Financial",
    value: 2400000000,
    currency: "USD",
    period: "2023",
    confidence: 92,
    evidenceText: "Global Steel Corporation reported annual revenue of $2.4 billion for fiscal year 2023, representing a 15% increase from the previous year. The company's strong performance was driven by increased demand in the automotive and construction sectors...",
    sourceUrl: "https://globalsteel.org/investor-relations",
    extractedAt: "2024-01-15T10:30:00Z",
    jsonData: {
      fact_type: "revenue",
      value: 2400000000,
      currency: "USD",
      period: "2023",
      confidence_score: 0.92,
      source_url: "https://globalsteel.org/...",
      extracted_at: "2024-01-15T10:30:00Z"
    }
  },
  {
    id: "fact-002",
    type: "Employee Count",
    category: "Personnel",
    value: 15000,
    confidence: 78,
    evidenceText: "The company employs approximately 15,000 people across its global operations, with major facilities in North America, Europe, and Asia. This represents a 5% increase in workforce compared to the previous year...",
    sourceUrl: "https://globalsteel.org/about-us",
    extractedAt: "2024-01-15T10:32:00Z",
    jsonData: {
      fact_type: "employee_count",
      value: 15000,
      confidence_score: 0.78,
      source_url: "https://globalsteel.org/...",
      extracted_at: "2024-01-15T10:32:00Z"
    }
  }
]

export default function FactsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFact, setSelectedFact] = useState(mockFacts[0])
  const [isJsonExpanded, setIsJsonExpanded] = useState(false)

  const handleApprove = (factId: string) => {
    console.log("Approving fact:", factId)
  }

  const handleReject = (factId: string) => {
    console.log("Rejecting fact:", factId)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "bg-green-500"
    if (confidence >= 70) return "bg-yellow-500"
    return "bg-red-500"
  }

  const getConfidenceTextColor = (confidence: number) => {
    if (confidence >= 90) return "text-green-700"
    if (confidence >= 70) return "text-yellow-700"
    return "text-red-700"
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <span>Dashboard</span>
            <span>/</span>
            <span>Enrichment Jobs</span>
            <span>/</span>
            <span>Facts</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fact Viewer</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search facts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button variant="ghost" size="sm">
            <Bell className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Job Info Header */}
      <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <div>
          <h2 className="text-lg font-semibold">globalsteel.org</h2>
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>Job ID: ENR-2024-001</span>
            <span>•</span>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Completed
            </Badge>
            <span>•</span>
            <span>47 facts found</span>
          </div>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Current Fact */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-xl">{selectedFact.type}</CardTitle>
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                {selectedFact.category}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => handleApprove(selectedFact.id)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button 
                variant="destructive"
                onClick={() => handleReject(selectedFact.id)}
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Confidence Score */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Confidence:</span>
                <span className={`text-sm font-bold ${getConfidenceTextColor(selectedFact.confidence)}`}>
                  {selectedFact.confidence}%
                </span>
              </div>
              <Progress 
                value={selectedFact.confidence} 
                className="h-2"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Evidence Text */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Evidence Text</h3>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm leading-relaxed mb-4">
                    {selectedFact.evidenceText}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <ExternalLink className="h-3 w-3" />
                    <a 
                      href={selectedFact.sourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      Source: {selectedFact.sourceUrl}
                    </a>
                  </div>
                </div>
              </div>

              {/* JSON Data */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">JSON Data</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsJsonExpanded(!isJsonExpanded)}
                    className="text-blue-600"
                  >
                    {isJsonExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        Collapse
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        Expand
                      </>
                    )}
                  </Button>
                </div>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <pre>
                    {isJsonExpanded 
                      ? JSON.stringify(selectedFact.jsonData, null, 2)
                      : JSON.stringify(selectedFact.jsonData, null, 2).split('\n').slice(0, 6).join('\n') + '\n  ...'
                    }
                  </pre>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Facts Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Other Facts from this Job</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockFacts.map((fact) => (
                <div 
                  key={fact.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedFact.id === fact.id 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => setSelectedFact(fact)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="font-medium">{fact.type}</div>
                      <Badge variant="outline" className="text-xs">
                        {fact.category}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getConfidenceColor(fact.confidence)}`} />
                      <span className="text-sm text-gray-600">{fact.confidence}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
