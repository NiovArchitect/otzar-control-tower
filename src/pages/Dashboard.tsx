import { Users, Bot, Shield, Activity, AlertTriangle, CheckCircle, Clock, TrendingUp } from "lucide-react"
import { DashboardCard } from "@/components/DashboardCard"
import { DataTable } from "@/components/DataTable"
import { StatusBadge } from "@/components/StatusBadge"
import { AnalyticsChart } from "@/components/AnalyticsChart"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Mock data
const recentUsers = [
  { name: "Sarah Martinez", role: "Design Manager", status: "active", lastSeen: "2 min ago", aiTeammate: "Creative AI-01" },
  { name: "John Doe", role: "Sales Rep", status: "active", lastSeen: "5 min ago", aiTeammate: "Sales AI-12" },
  { name: "Angela Chen", role: "Data Analyst", status: "inactive", lastSeen: "2 hours ago", aiTeammate: "Analytics AI-03" },
  { name: "Mark Wilson", role: "Marketing Lead", status: "active", lastSeen: "1 min ago", aiTeammate: "Marketing AI-07" },
]

const aiTeammateData = [
  { name: "Sales AI-12", owner: "John Doe", status: "active", tasks: 24, efficiency: "94%" },
  { name: "Creative AI-01", owner: "Sarah Martinez", status: "active", tasks: 18, efficiency: "97%" },
  { name: "Analytics AI-03", owner: "Angela Chen", status: "pending", tasks: 12, efficiency: "89%" },
  { name: "Marketing AI-07", owner: "Mark Wilson", status: "active", tasks: 31, efficiency: "92%" },
]

const usageData = [
  { month: "Jan", usage: 2400 },
  { month: "Feb", usage: 1398 },
  { month: "Mar", usage: 9800 },
  { month: "Apr", usage: 3908 },
  { month: "May", usage: 4800 },
  { month: "Jun", usage: 3800 },
]

const departmentData = [
  { name: "Sales", value: 35, color: "hsl(var(--chart-1))" },
  { name: "Marketing", value: 25, color: "hsl(var(--chart-2))" },
  { name: "Design", value: 20, color: "hsl(var(--chart-3))" },
  { name: "Analytics", value: 20, color: "hsl(var(--chart-4))" },
]

const userColumns = [
  { key: "name", header: "User" },
  { key: "role", header: "Role" },
  {
    key: "status", 
    header: "Status",
    cell: (row: any) => (
      <StatusBadge status={row.status as any}>
        {row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : 'Unknown'}
      </StatusBadge>
    ),
  },
  { key: "lastSeen", header: "Last Seen" },
  { key: "aiTeammate", header: "AI Teammate" },
]

const aiTeammateColumns = [
  { key: "name", header: "AI Teammate" },
  { key: "owner", header: "Owner" },
  {
    key: "status",
    header: "Status", 
    cell: (row: any) => (
      <StatusBadge status={row.status as any}>
        {row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : 'Unknown'}
      </StatusBadge>
    ),
  },
  { key: "tasks", header: "Tasks Today" },
  { key: "efficiency", header: "Efficiency" },
]

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Enterprise Dashboard</h1>
          <p className="text-muted-foreground">Monitor your AI teammates and system performance</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Activity className="h-4 w-4 mr-2" />
            System Health
          </Button>
          <Button variant="enterprise">
            <TrendingUp className="h-4 w-4 mr-2" />
            View Analytics
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Active Users"
          value="1,247"
          change="+12.5% from last month"
          changeType="positive"
          trend="up"
          icon={<Users />}
        />
        <DashboardCard
          title="AI Teammates"
          value="89"
          change="+4 new this week"
          changeType="positive"
          trend="up"
          icon={<Bot />}
        />
        <DashboardCard
          title="Security Score"
          value="97%"
          change="Excellent rating"
          changeType="positive"
          trend="up"
          icon={<Shield />}
        />
        <DashboardCard
          title="System Health"
          value="99.9%"
          change="All systems operational"
          changeType="positive"
          trend="flat"
          icon={<CheckCircle />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsChart
          title="AI Usage Trends"
          data={usageData}
          type="line"
          dataKey="usage"
          xAxisKey="month"
          height={300}
        />
        <AnalyticsChart
          title="Department Distribution"
          data={departmentData}
          type="donut"
          dataKey="value"
          xAxisKey="name"
          height={300}
        />
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-status-warning">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-status-warning" />
              <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">3</div>
            <p className="text-xs text-muted-foreground">AI teammate approvals needed</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-status-success">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-status-success" />
              <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">142</div>
            <p className="text-xs text-muted-foreground">Automated tasks today</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">28.5h</div>
            <p className="text-xs text-muted-foreground">Employee hours saved today</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DataTable
          title="Recent User Activity"
          data={recentUsers}
          columns={userColumns}
          actions={
            <Button variant="default" size="sm">
              Manage Users
            </Button>
          }
        />
        <DataTable
          title="AI Teammate Performance"
          data={aiTeammateData}
          columns={aiTeammateColumns}
          actions={
            <Button variant="default" size="sm">
              View All
            </Button>
          }
        />
      </div>
    </div>
  )
}