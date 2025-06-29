import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../@workspace/ui/components/dialog"
import { Button } from "../../@workspace/ui/components/button"
import { Badge } from "../../@workspace/ui/components/badge"
import { AlertCircle, Copy } from "lucide-react"
import { cn } from "../lib/utils"

interface ErrorDialogProps {
  trigger: React.ReactNode
  jobId: string
  domain: string
  status: string
  failureTimestamp: string
  errorSummary: string
  stackTrace: string
  onRetry?: () => void
  className?: string
}

export function ErrorDialog({
  trigger,
  jobId,
  domain,
  status,
  failureTimestamp,
  errorSummary,
  stackTrace,
  onRetry,
  className
}: ErrorDialogProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className={cn("max-w-4xl max-h-[80vh] overflow-hidden", className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Error Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 overflow-y-auto">
          {/* Job Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Job ID</label>
              <p className="text-sm font-mono">{jobId}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Domain</label>
              <p className="text-sm">{domain}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Status</label>
              <Badge variant="destructive" className="mt-1">
                {status}
              </Badge>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Failure Time</label>
              <p className="text-sm">{failureTimestamp}</p>
            </div>
          </div>

          {/* Error Summary */}
          <div>
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Error Summary
            </label>
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{errorSummary}</p>
            </div>
          </div>

          {/* Stack Trace */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-muted-foreground">
                Stack Trace
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(stackTrace)}
                className="h-8"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <div className="mt-2 p-3 bg-gray-50 border rounded-md max-h-64 overflow-y-auto">
              <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap">
                {stackTrace}
              </pre>
            </div>
          </div>

          {/* Actions */}
          {onRetry && (
            <div className="flex justify-end pt-4 border-t">
              <Button onClick={onRetry} className="bg-blue-600 hover:bg-blue-700">
                Retry Job
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
