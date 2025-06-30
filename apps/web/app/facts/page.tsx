"use client"

import { useState, useEffect } from "react"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Input,
  Button,
  Badge,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@workspace/ui"
import { 
  Search, 
  Download,
  Bell,
  ExternalLink,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from "lucide-react"
import { useEnrichmentJobs } from "@workspace/ui"

// Real fact data will be fetched from API
const useFacts = (selectedDomain: string | null) => {
  const [facts, setFacts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedDomain) {
      setFacts([])
      return
    }

    const fetchFacts = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/facts?domain=${encodeURIComponent(selectedDomain)}`)
        if (!response.ok) {
          throw new Error(`Failed to fetch facts: ${response.statusText}`)
        }
        const data = await response.json()
        setFacts(data.facts || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch facts')
        setFacts([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchFacts()
  }, [selectedDomain])

  return { facts, isLoading, error }
}

export default function FactsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null)
  const [selectedFact, setSelectedFact] = useState<any>(null)
  const [isJsonExpanded, setIsJsonExpanded] = useState(false)
  
  const { jobs } = useEnrichmentJobs()
  const { facts, isLoading, error } = useFacts(selectedDomain)

  // Get completed jobs with facts for domain selection
  const completedJobs = jobs.filter(job => job.status === 'completed' && job.factsFound > 0)

  // Filter facts based on search term
  const filteredFacts = facts.filter(fact => 
    !searchTerm || 
    fact.fact_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fact.source_text?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Set first fact as selected when facts change
  useEffect(() => {
    if (filteredFacts.length > 0 && !selectedFact) {
      setSelectedFact(filteredFacts[0])
    }
  }, [filteredFacts, selectedFact])

  const handleApprove = async (factId: string) => {
    try {
      const response = await fetch(`/api/facts/${factId}/approve`, {
        method: 'POST'
      })
      if (response.ok) {
        console.log("Fact approved:", factId)
        // Refresh facts
        // Could add optimistic update here
      }
    } catch (error) {
      console.error("Failed to approve fact:", error)
    }
  }

  const handleReject = async (factId: string) => {
    try {
      const response = await fetch(`/api/facts/${factId}/reject`, {
        method: 'POST'
      })
      if (response.ok) {
        console.log("Fact rejected:", factId)
        // Refresh facts
        // Could add optimistic update here
      }
    } catch (error) {
      console.error("Failed to reject fact:", error)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return "bg-success"
    if (confidence >= 70) return "bg-warning"
    return "bg-destructive"
  }

  const getConfidenceTextColor = (confidence: number) => {
    if (confidence >= 90) return "text-success"
    if (confidence >= 70) return "text-warning"
    return "text-destructive"
  }

  const formatFactType = (factType: string) => {
    return factType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const selectedJob = jobs.find(job => job.domain === selectedDomain)

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span>Dashboard</span>
            <span>/</span>
            <span>Enrichment Jobs</span>
            <span>/</span>
            <span>Facts</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Fact Viewer</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search facts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button variant="ghost" size="sm" className="h-9 w-9">
            <Bell className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Domain Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Domain</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Select value={selectedDomain || ""} onValueChange={setSelectedDomain}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a domain to view facts..." />
                </SelectTrigger>
                <SelectContent>
                  {completedJobs.map((job) => (
                    <SelectItem key={job.id} value={job.domain}>
                      {job.domain} ({job.factsFound} facts)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedDomain && (
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Facts
              </Button>
            )}
          </div>
          {completedJobs.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              No completed jobs with facts found. Run some enrichment jobs first.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Job Info Header */}
      {selectedJob && (
        <div className="flex items-center justify-between bg-muted/50 p-4 rounded-lg border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{selectedJob.domain}</h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Job ID: {selectedJob.id}</span>
              <span>•</span>
              <Badge className="bg-success/10 text-success border-success/20">
                {selectedJob.status}
              </Badge>
              <span>•</span>
              <span>{facts.length} facts found</span>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading facts...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Facts State */}
      {selectedDomain && !isLoading && !error && facts.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Facts Found</h3>
              <p className="text-muted-foreground">
                No facts were extracted for {selectedDomain}. The enrichment process may have failed or found no extractable information.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {selectedFact && facts.length > 0 && (
        <div className="space-y-6">
          {/* Current Fact */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl">{formatFactType(selectedFact.fact_type)}</CardTitle>
                <Badge variant="outline" className="text-primary border-primary/20">
                  {selectedFact.fact_type}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => handleApprove(selectedFact.id)}
                  className="bg-success hover:bg-success/90 text-success-foreground"
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
                  <span className={`text-sm font-bold ${getConfidenceTextColor(Math.round(selectedFact.confidence_score * 100))}`}>
                    {Math.round(selectedFact.confidence_score * 100)}%
                  </span>
                </div>
                <Progress 
                  value={selectedFact.confidence_score * 100} 
                  className="h-2"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Evidence Text */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Evidence Text</h3>
                  <div className="bg-muted/50 p-4 rounded-lg border">
                    <p className="text-sm leading-relaxed mb-4 text-foreground">
                      {selectedFact.source_text}
                    </p>
                    {selectedFact.source_url && (
                      <div className="flex items-center gap-2 text-sm text-primary">
                        <ExternalLink className="h-3 w-3" />
                        <a 
                          href={selectedFact.source_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          Source: {selectedFact.source_url}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* JSON Data */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">Fact Data</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsJsonExpanded(!isJsonExpanded)}
                      className="text-primary"
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
                        ? JSON.stringify(selectedFact.fact_data, null, 2)
                        : JSON.stringify(selectedFact.fact_data, null, 2).split('\n').slice(0, 6).join('\n') + '\n  ...'
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
              <CardTitle>Other Facts from {selectedDomain}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredFacts.map((fact) => (
                  <div 
                    key={fact.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedFact.id === fact.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-border hover:border-border/80 hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedFact(fact)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="font-medium text-foreground">{formatFactType(fact.fact_type)}</div>
                        <Badge variant="outline" className="text-xs">
                          {fact.fact_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${getConfidenceColor(Math.round(fact.confidence_score * 100))}`} />
                        <span className="text-sm text-muted-foreground">{Math.round(fact.confidence_score * 100)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
