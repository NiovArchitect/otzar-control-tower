import { Layout } from "@/components/Layout"
import { DashboardCard } from "@/components/DashboardCard"
import { AnalyticsChart } from "@/components/AnalyticsChart"
import { DataTable } from "@/components/DataTable"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  TrendingUp, 
  Users, 
  Bot, 
  Clock, 
  Activity, 
  Download,
  Calendar,
  BarChart3,
  PieChart,
  LineChart
} from "lucide-react"

// Mock data for analytics
const performanceMetrics = [
  { name: "Jan", aiRequests: 4000, userSessions: 2400, efficiency: 85 },
  { name: "Feb", aiRequests: 3000, userSessions: 1398, efficiency: 78 },
  { name: "Mar", aiRequests: 2000, userSessions: 9800, efficiency: 92 },
  { name: "Apr", aiRequests: 2780, userSessions: 3908, efficiency: 88 },
  { name: "May", aiRequests: 1890, userSessions: 4800, efficiency: 95 },
  { name: "Jun", aiRequests: 2390, userSessions: 3800, efficiency: 90 }
]

const departmentUsage = [
  { name: "Engineering", value: 35, hours: 420 },
  { name: "Sales", value: 25, hours: 300 },
  { name: "Marketing", value: 20, hours: 240 },
  { name: "Support", value: 15, hours: 180 },
  { name: "HR", value: 5, hours: 60 }
]

const aiTeammatePerformance = [
  { name: "Sarah AI", tasksCompleted: 156, accuracy: 94, responseTime: "1.2s", status: "active" },
  { name: "DataBot Pro", tasksCompleted: 142, accuracy: 89, responseTime: "0.8s", status: "active" },
  { name: "SalesAssist", tasksCompleted: 98, accuracy: 96, responseTime: "2.1s", status: "training" },
  { name: "CodeHelper", tasksCompleted: 87, accuracy: 92, responseTime: "1.5s", status: "active" },
  { name: "ContentGen", tasksCompleted: 76, accuracy: 88, responseTime: "3.2s", status: "active" }
]

const userEngagement = [
  { user: "john.smith@company.com", sessions: 45, aiInteractions: 234, lastActive: "2 hours ago" },
  { user: "mary.johnson@company.com", sessions: 38, aiInteractions: 189, lastActive: "30 min ago" },
  { user: "david.wilson@company.com", sessions: 32, aiInteractions: 156, lastActive: "1 hour ago" },
  { user: "sarah.brown@company.com", sessions: 28, aiInteractions: 143, lastActive: "45 min ago" },
  { user: "mike.davis@company.com", sessions: 24, aiInteractions: 98, lastActive: "3 hours ago" }
]

const aiTeammateColumns = [
  { key: "name", header: "AI Teammate" },
  { key: "tasksCompleted", header: "Tasks Completed" },
  { key: "accuracy", header: "Accuracy", cell: (value: number) => `${value}%` },
  { key: "responseTime", header: "Avg Response Time" },
  { 
    key: "status", 
    header: "Status",
    cell: (value: string) => (
      <Badge variant={value === "active" ? "default" : "secondary"}>
        {value}
      </Badge>
    )
  }
]

const userEngagementColumns = [
  { key: "user", header: "User" },
  { key: "sessions", header: "Sessions" },
  { key: "aiInteractions", header: "AI Interactions" },
  { key: "lastActive", header: "Last Active" }
]

export default function Analytics() {
  return (
    <Layout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive insights into AI performance, user engagement, and system metrics
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              Date Range
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard
            title="Total AI Requests"
            value="24,567"
            change="+12.5% from last month"
            changeType="positive"
            trend="up"
            icon={<Bot />}
          />
          <DashboardCard
            title="Active Users"
            value="1,847"
            change="+8.2% from last month"
            changeType="positive"
            trend="up"
            icon={<Users />}
          />
          <DashboardCard
            title="Avg Response Time"
            value="1.4s"
            change="-15% from last month"
            changeType="positive"
            trend="down"
            icon={<Clock />}
          />
          <DashboardCard
            title="System Uptime"
            value="99.97%"
            change="Above SLA target"
            changeType="positive"
            trend="up"
            icon={<Activity />}
          />
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="usage">Usage Patterns</TabsTrigger>
            <TabsTrigger value="teams">AI Teams</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalyticsChart
                title="AI Requests & User Sessions"
                data={performanceMetrics}
                type="line"
                dataKey="aiRequests"
                height={350}
              />
              <AnalyticsChart
                title="Department Usage Distribution"
                data={departmentUsage}
                type="donut"
                dataKey="value"
                height={350}
              />
            </div>

            {/* Efficiency Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Efficiency Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">92%</div>
                  <p className="text-sm text-muted-foreground">+5% from last week</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Cost Savings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">$45,670</div>
                  <p className="text-sm text-muted-foreground">This month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="w-5 h-5" />
                    Time Saved
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">1,247h</div>
                  <p className="text-sm text-muted-foreground">This month</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalyticsChart
                title="System Performance Trends"
                data={performanceMetrics}
                type="bar"
                dataKey="efficiency"
                xAxisKey="name"
                height={400}
              />
              <Card>
                <CardHeader>
                  <CardTitle>Performance Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Peak Usage Hours</span>
                    <span className="text-sm text-muted-foreground">9 AM - 11 AM</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Fastest Response</span>
                    <span className="text-sm text-muted-foreground">0.3s</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Error Rate</span>
                    <span className="text-sm text-muted-foreground">0.12%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Cache Hit Rate</span>
                    <span className="text-sm text-muted-foreground">94.5%</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="usage" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalyticsChart
                title="Department Usage Hours"
                data={departmentUsage}
                type="bar"
                dataKey="hours"
                xAxisKey="name"
                height={350}
              />
              <DataTable
                title="Top User Engagement"
                data={userEngagement}
                columns={userEngagementColumns}
              />
            </div>
          </TabsContent>

          <TabsContent value="teams" className="space-y-6">
            <DataTable
              title="AI Teammate Performance"
              data={aiTeammatePerformance}
              columns={aiTeammateColumns}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Total AI Teammates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">12</div>
                  <p className="text-sm text-muted-foreground">5 active, 2 training</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Avg Accuracy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">91.8%</div>
                  <p className="text-sm text-muted-foreground">Across all teammates</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tasks Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">2,847</div>
                  <p className="text-sm text-muted-foreground">This week</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}