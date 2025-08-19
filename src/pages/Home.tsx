import { Users, Bot, Shield, Activity, AlertTriangle, CheckCircle, Clock, TrendingUp } from "lucide-react"
import { DashboardCard } from "@/components/DashboardCard"
import { DataTable } from "@/components/DataTable"
import { StatusBadge } from "@/components/StatusBadge"
import { AnalyticsChart } from "@/components/AnalyticsChart"
import { PageHeader } from "@/components/PageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Link } from "react-router-dom"

// Mock data - Cohesive metrics showing AI teammate value
const recentUsers = [
  { name: "Sarah Martinez", role: "Design Manager", status: "active", lastSeen: "2 min ago", aiTeammate: "Creative AI-01" },
  { name: "John Doe", role: "Sales Rep", status: "active", lastSeen: "5 min ago", aiTeammate: "Sales AI-12" },
  { name: "Angela Chen", role: "Data Analyst", status: "active", lastSeen: "8 min ago", aiTeammate: "Analytics AI-03" },
  { name: "Mark Wilson", role: "Marketing Lead", status: "active", lastSeen: "1 min ago", aiTeammate: "Marketing AI-07" },
]

const aiTeammateData = [
  { name: "Sales AI-12", owner: "John Doe", status: "active", tasks: 47, efficiency: "96%" },
  { name: "Creative AI-01", owner: "Sarah Martinez", status: "active", tasks: 38, efficiency: "94%" },
  { name: "Analytics AI-03", owner: "Angela Chen", status: "active", tasks: 52, efficiency: "98%" },
  { name: "Marketing AI-07", owner: "Mark Wilson", status: "active", tasks: 41, efficiency: "95%" },
]

const usageData = [
  { month: "Jan", usage: 8200 },
  { month: "Feb", usage: 12400 },
  { month: "Mar", usage: 15600 },
  { month: "Apr", usage: 18900 },
  { month: "May", usage: 22100 },
  { month: "Jun", usage: 24800 },
]

const departmentData = [
  { name: "Sales", value: 35, color: "hsl(var(--chart-1))" },
  { name: "Marketing", value: 28, color: "hsl(var(--chart-2))" },
  { name: "Engineering", value: 22, color: "hsl(var(--chart-3))" },
  { name: "Operations", value: 15, color: "hsl(var(--chart-4))" },
]

const userColumns = [
  { 
    key: "name", 
    header: "User",
    cell: (row: any) => (
      <Link to={`/users?search=${row.name}`} className="text-primary hover:underline font-medium">
        {row.name}
      </Link>
    )
  },
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
  { 
    key: "aiTeammate", 
    header: "AI Teammate",
    cell: (row: any) => (
      <Link to={`/ai-teammates?search=${row.aiTeammate}`} className="text-primary hover:underline">
        {row.aiTeammate}
      </Link>
    )
  },
]

const aiTeammateColumns = [
  { 
    key: "name", 
    header: "AI Teammate",
    cell: (row: any) => (
      <Link to={`/ai-teammates?search=${row.name}`} className="text-primary hover:underline font-medium">
        {row.name}
      </Link>
    )
  },
  { 
    key: "owner", 
    header: "Owner",
    cell: (row: any) => (
      <Link to={`/users?search=${row.owner}`} className="text-primary hover:underline">
        {row.owner}
      </Link>
    )
  },
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

export default function Home() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="Otzar Enterprise Console"
        description="Monitor your AI teammates and system performance"
        showBackButton={false}
      >
        <Button variant="outline" asChild>
          <Link to="/health">
            <Activity className="h-4 w-4 mr-2" />
            System Health
          </Link>
        </Button>
        <Button variant="enterprise" asChild>
          <Link to="/analytics">
            <TrendingUp className="h-4 w-4 mr-2" />
            View Analytics
          </Link>
        </Button>
      </PageHeader>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/users" className="block hover:scale-105 transition-transform">
          <DashboardCard
            title="Active Users"
            value="1,247"
            change="+12.5% from last month"
            changeType="positive"
            trend="up"
            icon={<Users />}
          />
        </Link>
        <Link to="/ai-teammates" className="block hover:scale-105 transition-transform">
          <DashboardCard
            title="AI Teammates"
            value="387"
            change="+12 new this week"
            changeType="positive"
            trend="up"
            icon={<Bot />}
          />
        </Link>
        <Link to="/security" className="block hover:scale-105 transition-transform">
          <DashboardCard
            title="Security Score"
            value="97%"
            change="Excellent rating"
            changeType="positive"
            trend="up"
            icon={<Shield />}
          />
        </Link>
        <Link to="/health" className="block hover:scale-105 transition-transform">
          <DashboardCard
            title="System Health"
            value="99.9%"
            change="All systems operational"
            changeType="positive"
            trend="flat"
            icon={<CheckCircle />}
          />
        </Link>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Link to="/analytics" className="block hover:scale-105 transition-transform">
          <AnalyticsChart
            title="AI Usage Trends"
            data={usageData}
            type="line"
            dataKey="usage"
            xAxisKey="month"
            height={300}
            className="cursor-pointer"
          />
        </Link>
        <Link to="/analytics" className="block hover:scale-105 transition-transform">
          <AnalyticsChart
            title="Department Distribution"
            data={departmentData}
            type="donut"
            dataKey="value"
            xAxisKey="name"
            height={300}
            className="cursor-pointer"
          />
        </Link>
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/ai-teammates" className="block hover:scale-105 transition-transform">
          <Card className="border-l-4 border-l-status-warning cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-status-warning" />
                <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">8</div>
              <p className="text-xs text-muted-foreground">AI teammate approvals needed</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/analytics" className="block hover:scale-105 transition-transform">
          <Card className="border-l-4 border-l-status-success cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-status-success" />
                <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">1,847</div>
              <p className="text-xs text-muted-foreground">Automated tasks today</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/workflow-automation" className="block hover:scale-105 transition-transform">
          <Card className="border-l-4 border-l-primary cursor-pointer">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">156.7h</div>
              <p className="text-xs text-muted-foreground">Employee hours saved today</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Data Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DataTable
          title="Recent User Activity"
          data={recentUsers}
          columns={userColumns}
          actions={
            <Button variant="default" size="sm" asChild>
              <Link to="/users">
                Manage Users
              </Link>
            </Button>
          }
        />
        <DataTable
          title="AI Teammate Performance"
          data={aiTeammateData}
          columns={aiTeammateColumns}
          actions={
            <Button variant="default" size="sm" asChild>
              <Link to="/ai-teammates">
                View All
              </Link>
            </Button>
          }
        />
      </div>
    </div>
  )
}