"use client"

import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../@workspace/ui/components/card";
import { Button } from "../../@workspace/ui/components/button";
import { Badge } from "../../@workspace/ui/components/badge";
import { RefreshCw, Download, Maximize2 } from "lucide-react";

interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

interface MermaidWorkflowProps {
  jobId: string;
  domain: string;
  steps: WorkflowStep[];
  currentStep: string;
  className?: string;
  onRefresh?: () => void;
}

export function MermaidWorkflow({ 
  jobId, 
  domain, 
  steps, 
  currentStep, 
  className,
  onRefresh 
}: MermaidWorkflowProps) {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mermaidLoaded, setMermaidLoaded] = useState(false);

  // Generate Mermaid diagram definition
  const generateMermaidDiagram = () => {
    const getNodeStyle = (status: string) => {
      switch (status) {
        case 'completed':
          return 'fill:#10b981,stroke:#059669,stroke-width:2px,color:#ffffff';
        case 'running':
          return 'fill:#3b82f6,stroke:#2563eb,stroke-width:3px,color:#ffffff';
        case 'failed':
          return 'fill:#ef4444,stroke:#dc2626,stroke-width:2px,color:#ffffff';
        default:
          return 'fill:#6b7280,stroke:#4b5563,stroke-width:1px,color:#ffffff';
      }
    };

    // Create a comprehensive workflow diagram showing the tiered enrichment process
    let diagram = `
graph TD
    Start([Job Started<br/>${domain}]) --> Tier1{Tier 1: Corporate}
    
    Tier1 --> T1_Crawl[Web Crawling<br/>Corporate Site]
    T1_Crawl --> T1_Parse[Content Parsing<br/>& Extraction]
    T1_Parse --> T1_Facts[Fact Extraction<br/>LLM Processing]
    T1_Facts --> T1_Eval{Confidence >= 0.7?}
    
    T1_Eval -->|Yes| Complete([Job Complete<br/>High Confidence])
    T1_Eval -->|No| Tier2{Tier 2: Professional}
    
    Tier2 --> T2_LinkedIn[LinkedIn Scraping<br/>Company Profile]
    Tier2 --> T2_Jobs[Job Postings<br/>Analysis]
    T2_LinkedIn --> T2_Facts[Fact Extraction<br/>Professional Data]
    T2_Jobs --> T2_Facts
    T2_Facts --> T2_Eval{Confidence >= 0.7?}
    
    T2_Eval -->|Yes| Complete
    T2_Eval -->|No| Tier3{Tier 3: News}
    
    Tier3 --> T3_News[News Articles<br/>Bing Search]
    T3_News --> T3_Parse[Article Analysis<br/>& Processing]
    T3_Parse --> T3_Facts[Fact Extraction<br/>News Data]
    T3_Facts --> T3_Final[Final Results<br/>All Tiers]
    T3_Final --> Complete
    
    Complete --> Store[(Database<br/>Storage)]
    
    classDef startNode fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px,color:#ffffff
    classDef tierNode fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#ffffff
    classDef processNode fill:#6b7280,stroke:#4b5563,stroke-width:1px,color:#ffffff
    classDef completeNode fill:#10b981,stroke:#059669,stroke-width:2px,color:#ffffff
    classDef storeNode fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#ffffff
    
    class Start startNode
    class Tier1,Tier2,Tier3 tierNode
    class Complete completeNode
    class Store storeNode
`;

    // Apply status-based styling to nodes based on current workflow steps
    steps.forEach((step) => {
      const nodeStyle = getNodeStyle(step.status);
      
      // Map step IDs to Mermaid node IDs
      const nodeMapping: Record<string, string[]> = {
        'crawling': ['T1_Crawl', 'T2_LinkedIn', 'T2_Jobs', 'T3_News'],
        'chunking': ['T1_Parse', 'T2_Facts', 'T3_Parse'],
        'embedding': ['T1_Facts', 'T2_Facts', 'T3_Facts'],
        'extraction': ['T1_Eval', 'T2_Eval', 'T3_Final']
      };

      const nodes = nodeMapping[step.id] || [];
      nodes.forEach(nodeId => {
        diagram += `\n    style ${nodeId} ${nodeStyle}`;
      });
    });

    // Highlight current step
    if (currentStep && currentStep !== 'completed') {
      diagram += `\n    style ${currentStep} fill:#3b82f6,stroke:#2563eb,stroke-width:3px,color:#ffffff`;
    }

    return diagram;
  };

  // Load Mermaid library dynamically
  useEffect(() => {
    const loadMermaid = async () => {
      try {
        if (typeof window === 'undefined') return;

        // Check if Mermaid is already loaded
        if (window.mermaid) {
          setMermaidLoaded(true);
          return;
        }

        // Load Mermaid from CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js';
        script.onload = () => {
          if (window.mermaid) {
            window.mermaid.initialize({ 
              startOnLoad: false,
              theme: 'default',
              themeVariables: {
                primaryColor: '#3b82f6',
                primaryTextColor: '#ffffff',
                primaryBorderColor: '#2563eb',
                lineColor: '#6b7280',
                secondaryColor: '#f3f4f6',
                tertiaryColor: '#ffffff'
              }
            });
            setMermaidLoaded(true);
          }
        };
        script.onerror = () => {
          setError('Failed to load Mermaid library');
          setIsLoading(false);
        };
        document.head.appendChild(script);
      } catch (err) {
        setError('Failed to initialize Mermaid');
        setIsLoading(false);
      }
    };

    loadMermaid();
  }, []);

  // Render diagram when Mermaid is loaded or steps change
  useEffect(() => {
    if (!mermaidLoaded || !mermaidRef.current) return;

    const renderDiagram = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const diagramDefinition = generateMermaidDiagram();
        
        // Clear previous diagram
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = '';
        }

        // Generate unique ID for this diagram
        const diagramId = `mermaid-${jobId}-${Date.now()}`;
        
        // Render the diagram
        const { svg } = await window.mermaid.render(diagramId, diagramDefinition);
        
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg;
        }
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError('Failed to render workflow diagram');
      } finally {
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, [mermaidLoaded, steps, currentStep, jobId]);

  const handleDownload = () => {
    if (!mermaidRef.current) return;

    const svg = mermaidRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = `enrichment-workflow-${jobId}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  };

  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Enrichment Workflow</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <span>Job: {jobId}</span>
            <span>•</span>
            <span>{domain}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-blue-600 border-blue-200">
            {Math.round(progress)}% Complete
          </Badge>
          <Button variant="ghost" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {error ? (
          <div className="flex items-center justify-center h-64 text-red-600">
            <div className="text-center">
              <p className="font-medium">Failed to load workflow diagram</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">Loading workflow diagram...</p>
            </div>
          </div>
        ) : (
          <div className="workflow-diagram">
            <div 
              ref={mermaidRef} 
              className="w-full overflow-x-auto"
              style={{ minHeight: '400px' }}
            />
            
            {/* Legend */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Status Legend</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-gray-500"></div>
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500"></div>
                  <span>Running</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-green-500"></div>
                  <span>Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-red-500"></div>
                  <span>Failed</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    mermaid: any;
  }
}
