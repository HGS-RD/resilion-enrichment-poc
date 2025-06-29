import { Badge } from "../../@workspace/ui/components/badge"
import { cn } from "../lib/utils"

export type JobStatus = "pending" | "running" | "completed" | "failed"

interface JobStatusBadgeProps {
  status: JobStatus
  className?: string
}

const statusConfig = {
  pending: {
    label: "Pending",
    variant: "secondary" as const,
    className: "bg-gray-100 text-gray-800 hover:bg-gray-100"
  },
  running: {
    label: "Running",
    variant: "default" as const,
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100"
  },
  completed: {
    label: "Completed",
    variant: "default" as const,
    className: "bg-green-100 text-green-800 hover:bg-green-100"
  },
  failed: {
    label: "Failed",
    variant: "destructive" as const,
    className: "bg-red-100 text-red-800 hover:bg-red-100"
  }
}

export function JobStatusBadge({ status, className }: JobStatusBadgeProps) {
  const config = statusConfig[status]
  
  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
