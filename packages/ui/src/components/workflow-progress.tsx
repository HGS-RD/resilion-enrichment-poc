import { Card, CardContent, CardHeader, CardTitle } from "../../@workspace/ui/components/card"
import { Badge } from "../../@workspace/ui/components/badge"
import { Progress } from "../../@workspace/ui/components/progress"
import { CheckCircle, Circle, Loader2 } from "lucide-react"
import { cn } from "../lib/utils"

export type WorkflowStepStatus = "pending" | "running" | "completed" | "failed"

interface WorkflowStep {
  id: string
  name: string
  status: WorkflowStepStatus
  progress?: number
  details?: string
}

interface WorkflowProgressProps {
  steps: WorkflowStep[]
  className?: string
}

const statusConfig = {
  pending: {
    icon: Circle,
    className: "text-gray-400",
    bgClassName: "bg-gray-100"
  },
  running: {
    icon: Loader2,
    className: "text-blue-600 animate-spin",
    bgClassName: "bg-blue-100"
  },
  completed: {
    icon: CheckCircle,
    className: "text-green-600",
    bgClassName: "bg-green-100"
  },
  failed: {
    icon: Circle,
    className: "text-red-600",
    bgClassName: "bg-red-100"
  }
}

export function WorkflowProgress({ steps, className }: WorkflowProgressProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <CardTitle className="text-lg">Enrichment Workflow</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => {
            const config = statusConfig[step.status]
            const Icon = config.icon
            const isLast = index === steps.length - 1
            
            return (
              <div key={step.id} className="relative">
                {/* Step Content */}
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2",
                    config.bgClassName,
                    step.status === 'completed' ? 'border-green-600' :
                    step.status === 'running' ? 'border-blue-600' :
                    step.status === 'failed' ? 'border-red-600' :
                    'border-gray-300'
                  )}>
                    <Icon className={cn("h-4 w-4", config.className)} />
                  </div>
                  
                  {/* Step Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900">
                        {step.name}
                      </h4>
                      <Badge
                        variant={
                          step.status === 'completed' ? 'default' :
                          step.status === 'running' ? 'default' :
                          step.status === 'failed' ? 'destructive' :
                          'secondary'
                        }
                        className={cn(
                          step.status === 'completed' && 'bg-green-100 text-green-800 hover:bg-green-100',
                          step.status === 'running' && 'bg-blue-100 text-blue-800 hover:bg-blue-100',
                          step.status === 'pending' && 'bg-gray-100 text-gray-800 hover:bg-gray-100'
                        )}
                      >
                        {step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                      </Badge>
                    </div>
                    
                    {step.details && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {step.details}
                      </p>
                    )}
                    
                    {step.progress !== undefined && step.status === 'running' && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress</span>
                          <span>{step.progress}%</span>
                        </div>
                        <Progress value={step.progress} className="h-1.5" />
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Connector Line */}
                {!isLast && (
                  <div className="absolute left-4 top-8 w-0.5 h-6 bg-gray-200" />
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
