import { useState } from "react"
import { Layout } from "@/components/Layout"
import { DashboardCard } from "@/components/DashboardCard"
import { DataTable } from "@/components/DataTable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { 
  Play, 
  Copy, 
  Upload, 
  Download,
  TestTube,
  Zap,
  Target,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Bot,
  Workflow,
  Shield,
  BarChart3,
  GitBranch,
  RefreshCw,
  Eye,
  Settings,
  Rocket,
  Users,
  DollarSign,
  Activity
} from "lucide-react"

// Mock data for playground environments
const sandboxEnvironments = [
  {
    id: "sb_001",
    name: "Marketing AI Test",
    type: "AI Teammate",
    status: "running",
    progress: 75,
    accuracy: 94.2,
    timeSaved: "2.3h",
    riskScore: "Low",
    readinessScore: 87,
    createdBy: "Sarah Chen",
    lastRun: "2 minutes ago"
  },
  {
    id: "sb_002", 
    name: "Finance Workflow V2",
    type: "Workflow",
    status: "completed",
    progress: 100,
    accuracy: 98.1,
    timeSaved: "4.7h",
    riskScore: "Very Low",
    readinessScore: 95,
    createdBy: "Finance Team",
    lastRun: "1 hour ago"
  },
  {
    id: "sb_003",
    name: "Customer Data Analysis",
    type: "Dataset",
    status: "failed",
    progress: 45,
    accuracy: 67.8,
    timeSaved: "1.1h",
    riskScore: "High",
    readinessScore: 23,
    createdBy: "Data Team",
    lastRun: "30 minutes ago"
  },
  {
    id: "sb_004",
    name: "Sales Assistant Clone",
    type: "AI Teammate",
    status: "pending",
    progress: 0,
    accuracy: null,
    timeSaved: null,
    riskScore: null,
    readinessScore: null,
    createdBy: "Marcus Johnson",
    lastRun: "Not started"
  }
]

const simulationMetrics = [
  { metric: "Accuracy Improvement", current: 89.2, projected: 94.7, change: "+5.5%" },
  { metric: "Time Saved (hrs/day)", current: 12.4, projected: 18.9, change: "+52%" },
  { metric: "Error Rate", current: 2.3, projected: 0.8, change: "-65%" },
  { metric: "Compliance Score", current: 92, projected: 98, change: "+6%" },
  { metric: "Cost per Task", current: 12.50, projected: 7.80, change: "-38%" },
  { metric: "User Satisfaction", current: 4.2, projected: 4.7, change: "+12%" }
]

const testScenarios = [
  { name: "High Volume Processing", description: "Simulate peak workload conditions", status: "ready" },
  { name: "Edge Case Handling", description: "Test unusual data inputs and scenarios", status: "running" },
  { name: "Integration Stress Test", description: "Validate external API connections", status: "completed" },
  { name: "Compliance Validation", description: "Ensure regulatory requirements met", status: "ready" },
  { name: "Security Penetration", description: "Test security vulnerabilities", status: "scheduled" },
  { name: "Performance Benchmark", description: "Compare against baseline metrics", status: "ready" }
]

const promotionHistory = [
  { 
    config: "Sales AI Assistant v2.1", 
    promotedBy: "Marcus Johnson", 
    date: "2024-01-15", 
    success: true,
    rollback: false,
    impact: "+23% productivity"
  },
  { 
    config: "Customer Support Workflow", 
    promotedBy: "Support Team", 
    date: "2024-01-12", 
    success: true,
    rollback: false,
    impact: "-40% response time"
  },
  { 
    config: "Data Processing Pipeline", 
    promotedBy: "Data Team", 
    date: "2024-01-10", 
    success: false,
    rollback: true,
    impact: "Rolled back due to errors"
  }
]

export default function Playground() {
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>("")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSimulationRunning, setIsSimulationRunning] = useState(false)

  const sandboxColumns = [
    {
      key: "name",
      header: "Environment",
      cell: (row: any) => (
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center">
            {row.type === "AI Teammate" ? <Bot className="h-4 w-4 text-white" /> :
             row.type === "Workflow" ? <Workflow className="h-4 w-4 text-white" /> :
             <Database className="h-4 w-4 text-white" />}
          </div>
          <div>
            <div className="font-medium text-foreground">{row.name}</div>
            <div className="text-sm text-muted-foreground">{row.type}</div>
          </div>
        </div>
      )
    },
    {
      key: "status",
      header: "Status",
      cell: (row: any) => {
        const variant = row.status === "completed" ? "default" :
                      row.status === "running" ? "secondary" :
                      row.status === "failed" ? "destructive" : "outline"
        return (
          <div className="flex items-center gap-2">
            <Badge variant={variant}>{row.status}</Badge>
            {row.status === "running" && (
              <Progress value={row.progress} className="w-16 h-2" />
            )}
          </div>
        )
      }
    },
    {
      key: "readinessScore",
      header: "Readiness Score",
      cell: (row: any) => (
        <div className="flex items-center gap-2">
          {row.readinessScore ? (
            <>
              <div className="text-lg font-bold">{row.readinessScore}</div>
              <Progress value={row.readinessScore} className="w-12 h-2" />
            </>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
      )
    },
    {
      key: "metrics",
      header: "Performance",
      cell: (row: any) => (
        <div className="space-y-1">
          {row.accuracy && <div className="text-sm">Accuracy: {row.accuracy}%</div>}
          {row.timeSaved && <div className="text-sm text-muted-foreground">Saved: {row.timeSaved}</div>}
        </div>
      )
    },
    {
      key: "risk",
      header: "Risk Level",
      cell: (row: any) => (
        row.riskScore ? (
          <Badge variant={
            row.riskScore === "Very Low" ? "default" :
            row.riskScore === "Low" ? "secondary" :
            row.riskScore === "Medium" ? "outline" : "destructive"
          }>
            {row.riskScore}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      )
    },
    {
      key: "createdBy",
      header: "Created By"
    }
  ]

  const runSimulation = () => {
    setIsSimulationRunning(true)
    // Simulate running process
    setTimeout(() => setIsSimulationRunning(false), 3000)
  }

  return (
    <Layout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Sandbox Playground</h1>
            <p className="text-muted-foreground mt-2">
              Test AI teammates, workflows, and datasets in a safe virtual environment
            </p>
          </div>
          <div className="flex gap-3">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <TestTube className="w-4 h-4" />
                  Create Environment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Sandbox Environment</DialogTitle>
                  <DialogDescription>
                    Clone an existing configuration for safe testing
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Environment Name</Label>
                      <Input placeholder="e.g., Marketing AI Test v2" />
                    </div>
                    <div className="space-y-2">
                      <Label>Clone Source</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select source" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ai1">Sarah AI Assistant</SelectItem>
                          <SelectItem value="wf1">Finance Workflow</SelectItem>
                          <SelectItem value="ds1">Customer Dataset</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Test Data Source</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select data source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="synthetic">Synthetic Data</SelectItem>
                        <SelectItem value="anonymized">Anonymized Production Data</SelectItem>
                        <SelectItem value="sample">Sample Dataset</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Test Scenarios</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {testScenarios.slice(0, 4).map((scenario) => (
                        <div key={scenario.name} className="flex items-center space-x-2">
                          <Switch id={scenario.name} />
                          <Label htmlFor={scenario.name} className="text-sm">{scenario.name}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button>Create Environment</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard
            title="Active Tests"
            value="12"
            change="+3 this week"
            changeType="positive"
            trend="up"
            icon={<TestTube />}
          />
          <DashboardCard
            title="Success Rate"
            value="94.2%"
            change="+2.1% vs last month"
            changeType="positive"
            trend="up"
            icon={<CheckCircle />}
          />
          <DashboardCard
            title="Avg Readiness Score"
            value="87"
            change="High confidence"
            changeType="positive"
            trend="up"
            icon={<Target />}
          />
          <DashboardCard
            title="Time to Production"
            value="2.3 days"
            change="-40% faster"
            changeType="positive"
            trend="down"
            icon={<Clock />}
          />
        </div>

        <Tabs defaultValue="environments" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="environments">Environments</TabsTrigger>
            <TabsTrigger value="simulations">Simulations</TabsTrigger>
            <TabsTrigger value="scenarios">Test Scenarios</TabsTrigger>
            <TabsTrigger value="promotion">Promotion</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="environments" className="space-y-6">
            <DataTable
              title="Sandbox Environments"
              data={sandboxEnvironments}
              columns={sandboxColumns}
              actions={
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Copy className="h-4 w-4" />
                      Clone Selected
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Clone Environment</DialogTitle>
                      <DialogDescription>Create a copy of the selected sandbox environment</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>New Environment Name</Label>
                        <Input placeholder="e.g., Marketing AI Test - Copy" />
                      </div>
                      <div className="space-y-2">
                        <Label>Clone Options</Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Switch id="clone-data" defaultChecked />
                            <Label htmlFor="clone-data">Include test data</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch id="clone-configs" defaultChecked />
                            <Label htmlFor="clone-configs">Include configurations</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch id="clone-results" />
                            <Label htmlFor="clone-results">Include test results</Label>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline">Cancel</Button>
                      <Button>Clone Environment</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              }
            />
          </TabsContent>

          <TabsContent value="simulations" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    What-If Simulation
                  </CardTitle>
                  <CardDescription>
                    Run simulations to predict impact before deployment
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Configuration</Label>
                    <Select value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose environment to simulate" />
                      </SelectTrigger>
                      <SelectContent>
                        {sandboxEnvironments.map((env) => (
                          <SelectItem key={env.id} value={env.id}>{env.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Simulation Duration</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1h">1 Hour</SelectItem>
                        <SelectItem value="1d">1 Day</SelectItem>
                        <SelectItem value="1w">1 Week</SelectItem>
                        <SelectItem value="1m">1 Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={runSimulation} 
                    disabled={isSimulationRunning || !selectedEnvironment}
                    className="w-full gap-2"
                  >
                    {isSimulationRunning ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Running Simulation...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Start Simulation
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Projected Impact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {simulationMetrics.map((metric) => (
                    <div key={metric.metric} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <div>
                        <span className="text-sm font-medium">{metric.metric}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {metric.current} → {metric.projected}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {metric.change}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <DashboardCard
                title="Projected ROI"
                value="340%"
                change="12 month period"
                changeType="positive"
                icon={<DollarSign />}
              />
              <DashboardCard
                title="Risk Reduction"
                value="67%"
                change="Fewer incidents"
                changeType="positive"
                icon={<Shield />}
              />
              <DashboardCard
                title="Accuracy Gain"
                value="+5.5%"
                change="Vs current baseline"
                changeType="positive"
                icon={<Target />}
              />
              <DashboardCard
                title="Time Savings"
                value="52%"
                change="More efficient"
                changeType="positive"
                icon={<Clock />}
              />
            </div>
          </TabsContent>

          <TabsContent value="scenarios" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {testScenarios.map((scenario) => (
                <Card key={scenario.name}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{scenario.name}</CardTitle>
                        <CardDescription>{scenario.description}</CardDescription>
                      </div>
                      <Badge variant={
                        scenario.status === "completed" ? "default" :
                        scenario.status === "running" ? "secondary" :
                        scenario.status === "scheduled" ? "outline" : "outline"
                      }>
                        {scenario.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      {scenario.status === "ready" && (
                        <Button size="sm" className="gap-2">
                          <Play className="w-4 h-4" />
                          Run Test
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="gap-2">
                        <Eye className="w-4 h-4" />
                        View Details
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Settings className="w-4 h-4" />
                        Configure
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="promotion" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Rocket className="w-5 h-5" />
                    Promote to Production
                  </CardTitle>
                  <CardDescription>
                    Deploy tested configurations with confidence
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Ready for Promotion</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select environment" />
                      </SelectTrigger>
                      <SelectContent>
                        {sandboxEnvironments
                          .filter(env => env.status === "completed" && env.readinessScore && env.readinessScore > 80)
                          .map((env) => (
                            <SelectItem key={env.id} value={env.id}>
                              {env.name} (Score: {env.readinessScore})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">Pre-deployment Checklist</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-status-success" />
                        <span className="text-sm">All tests passed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-status-success" />
                        <span className="text-sm">Security validation complete</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-status-success" />
                        <span className="text-sm">Compliance requirements met</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm">Performance impact reviewed</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1 gap-2">
                      <Rocket className="w-4 h-4" />
                      Deploy to Production
                    </Button>
                    <Button variant="outline" className="gap-2">
                      <GitBranch className="w-4 h-4" />
                      Stage First
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Deployment Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium">Production Health</span>
                      <Badge variant="default">Healthy</Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium">Active Deployments</span>
                      <span className="text-sm text-muted-foreground">3 this week</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium">Rollback Available</span>
                      <Badge variant="outline">Ready</Badge>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2">Recent Promotions</h4>
                    <div className="space-y-2">
                      {promotionHistory.slice(0, 3).map((promo, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span>{promo.config}</span>
                          <Badge variant={promo.success ? "default" : "destructive"}>
                            {promo.success ? "Success" : "Failed"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Promotion History</CardTitle>
                <CardDescription>
                  Track all deployments and their outcomes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {promotionHistory.map((promo, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{promo.config}</div>
                        <div className="text-sm text-muted-foreground">
                          By {promo.promotedBy} on {promo.date}
                        </div>
                        <div className="text-sm mt-1">{promo.impact}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={promo.success ? "default" : "destructive"}>
                          {promo.success ? "Success" : "Failed"}
                        </Badge>
                        {promo.rollback && (
                          <Badge variant="outline">Rolled Back</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}