import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: "active" | "inactive" | "pending" | "warning" | "error" | "success" | "planned" | "completed" | "in-progress"
  children: React.ReactNode
  className?: string
}

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  const statusStyles = {
    active: "bg-status-success/10 text-status-success border-status-success/20",
    inactive: "bg-muted text-muted-foreground border-border",
    pending: "bg-status-warning/10 text-status-warning border-status-warning/20",
    warning: "bg-status-warning/10 text-status-warning border-status-warning/20",
    error: "bg-status-danger/10 text-status-danger border-status-danger/20",
    success: "bg-status-success/10 text-status-success border-status-success/20",
    planned: "bg-chart-3/10 text-chart-3 border-chart-3/20",
    completed: "bg-status-success/10 text-status-success border-status-success/20",
    "in-progress": "bg-chart-4/10 text-chart-4 border-chart-4/20"
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        statusStyles[status],
        className
      )}
    >
      {children}
    </span>
  )
}