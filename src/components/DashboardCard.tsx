import { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface DashboardCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: "positive" | "negative" | "neutral"
  icon?: ReactNode
  className?: string
  trend?: "up" | "down" | "flat"
}

export function DashboardCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
  className,
  trend
}: DashboardCardProps) {
  const changeStyles = {
    positive: "text-status-success",
    negative: "text-status-danger", 
    neutral: "text-muted-foreground"
  }

  return (
    <Card className={cn("shadow-card hover:shadow-elevated transition-all duration-200", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className="h-5 w-5 text-muted-foreground">
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
        {change && (
          <div className="flex items-center space-x-1">
            {trend && (
              <div className={cn(
                "w-3 h-3 flex items-center justify-center",
                trend === "up" && "text-status-success",
                trend === "down" && "text-status-danger",
                trend === "flat" && "text-muted-foreground"
              )}>
                {trend === "up" && "↗"}
                {trend === "down" && "↘"}
                {trend === "flat" && "→"}
              </div>
            )}
            <p className={cn("text-xs", changeStyles[changeType])}>
              {change}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}