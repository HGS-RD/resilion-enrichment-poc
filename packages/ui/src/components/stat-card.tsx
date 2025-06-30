import { Card, CardContent, CardHeader, CardTitle } from "../../@workspace/ui/components/card"
import { cn } from "../lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  className
}: StatCardProps) {
  return (
    <Card className={cn("transition-all duration-200 hover:shadow-md", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className="h-5 w-5 opacity-80">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {trend && (
          <div className="flex items-center gap-1">
            <span
              className={cn(
                "text-xs font-medium px-1.5 py-0.5 rounded-full",
                trend.isPositive 
                  ? "text-success bg-success/10" 
                  : "text-destructive bg-destructive/10"
              )}
            >
              {trend.isPositive ? "+" : ""}{trend.value}%
            </span>
            <span className="text-xs text-muted-foreground">
              from last month
            </span>
          </div>
        )}
        {description && !trend && (
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
