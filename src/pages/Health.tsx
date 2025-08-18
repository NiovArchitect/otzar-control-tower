import { useState } from "react"
import { Layout } from "@/components/Layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Activity, 
  Server, 
  Database, 
  Shield, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Cpu,
  HardDrive,
  Network,
  Bot,
  Users,
  Zap
} from "lucide-react"

const systemComponents = [
  { name: "API Gateway", status: "healthy", uptime: "99.98%", responseTime: "45ms" },
  { name: "Authentication Service", status: "healthy", uptime: "99.95%", responseTime: "32ms" },
  { name: "AI Processing Engine", status: "healthy", uptime: "99.92%", responseTime: "180ms" },
  { name: "Database Cluster", status: "healthy", uptime: "99.99%", responseTime: "8ms" },
  { name: "File Storage", status: "degraded", uptime: "98.45%", responseTime: "95ms" },
  { name: "Message Queue", status: "healthy", uptime: "99.87%", responseTime: "12ms" },
  { name: "Analytics Engine", status: "healthy", uptime: "99.76%", responseTime: "220ms" },
  { name: "Notification Service", status: "maintenance", uptime: "97.23%", responseTime: "0ms" }
]

const aiTeammates = [
  { id: "ai-001", name: "Customer Support AI", status: "active", health: 98, requests: 1247, errors: 3 },
  { id: "ai-002", name: "Data Analyst AI", status: "active", health: 95, requests: 892, errors: 8 },
  { id: "ai-003", name: "Content Creator AI", status: "idle", health: 92, requests: 456, errors: 2 },
  { id: "ai-004", name: "Code Review AI", status: "active", health: 89, requests: 334, errors: 12 },
  { id: "ai-005", name: "Security Scanner AI", status: "error", health: 45, requests: 123, errors: 67 }
]

const alerts = [
  { id: 1, type: "warning", message: "High memory usage on AI Processing Node 3", time: "2 min ago", component: "Infrastructure" },
  { id: 2, type: "info", message: "Scheduled maintenance completed successfully", time: "15 min ago", component: "Notification Service" },
  { id: 3, type: "error", message: "Security Scanner AI experiencing high error rates", time: "23 min ago", component: "AI Teammates" },
  { id: 4, type: "warning", message: "File Storage response times elevated", time: "1 hour ago", component: "Storage" }
]

export default function Health() {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 2000)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
      case "active":
        return "bg-status-success text-status-success-foreground"
      case "degraded":
      case "idle":
        return "bg-status-warning text-status-warning-foreground"
      case "maintenance":
        return "bg-status-info text-status-info-foreground"
      case "error":
        return "bg-status-danger text-status-danger-foreground"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
      case "active":
        return <CheckCircle className="h-4 w-4" />
      case "degraded":
      case "idle":
        return <AlertTriangle className="h-4 w-4" />
      case "maintenance":
        return <Clock className="h-4 w-4" />
      case "error":
        return <XCircle className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case "error":
        return "border-status-danger"
      case "warning":
        return "border-status-warning"
      case "info":
        return "border-status-info"
      default:
        return "border-border"
    }
  }

  const overallHealth = Math.round(systemComponents.filter(c => c.status === "healthy").length / systemComponents.length * 100)

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">System Health</h1>
            <p className="text-muted-foreground">Monitor system status, AI teammates, and infrastructure health</p>
          </div>
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Overall Health Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Health</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{overallHealth}%</div>
              <p className="text-xs text-muted-foreground">
                {systemComponents.filter(c => c.status === "healthy").length}/{systemComponents.length} services healthy
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI Teammates</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {aiTeammates.filter(ai => ai.status === "active").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Active out of {aiTeammates.length} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {alerts.filter(a => a.type === "error" || a.type === "warning").length}
              </div>
              <p className="text-xs text-muted-foreground">
                Requiring attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">85ms</div>
              <p className="text-xs text-status-success">
                +5% improvement
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="system" className="space-y-4">
          <TabsList>
            <TabsTrigger value="system">System Components</TabsTrigger>
            <TabsTrigger value="ai">AI Teammates</TabsTrigger>
            <TabsTrigger value="infrastructure">Infrastructure</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  System Components
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {systemComponents.map((component, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(component.status)}
                      <div>
                        <h4 className="font-medium text-foreground">{component.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Uptime: {component.uptime} • Response: {component.responseTime}
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(component.status)}>
                      {component.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  AI Teammates Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {aiTeammates.map((ai) => (
                  <div key={ai.id} className="p-4 border border-border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(ai.status)}
                        <div>
                          <h4 className="font-medium text-foreground">{ai.name}</h4>
                          <p className="text-sm text-muted-foreground">ID: {ai.id}</p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(ai.status)}>
                        {ai.status}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Health Score</span>
                        <span className="text-foreground font-medium">{ai.health}%</span>
                      </div>
                      <Progress value={ai.health} className="h-2" />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Requests (24h): {ai.requests}</span>
                      <span className="text-muted-foreground">Errors: {ai.errors}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="infrastructure" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Cpu className="h-4 w-4" />
                    CPU Usage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-2xl font-bold text-foreground">67%</div>
                  <Progress value={67} className="h-2" />
                  <p className="text-xs text-muted-foreground">Across 8 nodes</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <HardDrive className="h-4 w-4" />
                    Memory Usage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-2xl font-bold text-foreground">82%</div>
                  <Progress value={82} className="h-2" />
                  <p className="text-xs text-muted-foreground">245GB / 300GB</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Network className="h-4 w-4" />
                    Network I/O
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-2xl font-bold text-foreground">1.2GB/s</div>
                  <Progress value={45} className="h-2" />
                  <p className="text-xs text-muted-foreground">Throughput</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Database Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 border border-border rounded-lg">
                    <div className="text-lg font-semibold text-foreground">0.8ms</div>
                    <div className="text-xs text-muted-foreground">Avg Query Time</div>
                  </div>
                  <div className="text-center p-3 border border-border rounded-lg">
                    <div className="text-lg font-semibold text-foreground">1,247</div>
                    <div className="text-xs text-muted-foreground">Queries/sec</div>
                  </div>
                  <div className="text-center p-3 border border-border rounded-lg">
                    <div className="text-lg font-semibold text-foreground">99.9%</div>
                    <div className="text-xs text-muted-foreground">Availability</div>
                  </div>
                  <div className="text-center p-3 border border-border rounded-lg">
                    <div className="text-lg font-semibold text-foreground">45GB</div>
                    <div className="text-xs text-muted-foreground">Storage Used</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Recent Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div key={alert.id} className={`p-4 border-l-4 border border-border rounded-lg ${getAlertColor(alert.type)}`}>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={alert.type === "error" ? "destructive" : alert.type === "warning" ? "secondary" : "default"}>
                                {alert.type}
                              </Badge>
                              <span className="text-sm text-muted-foreground">{alert.component}</span>
                            </div>
                            <p className="text-foreground">{alert.message}</p>
                            <p className="text-xs text-muted-foreground">{alert.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}