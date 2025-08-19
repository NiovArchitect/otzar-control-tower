import { useState } from "react"
import { Layout } from "@/components/Layout"
import { PageHeader } from "@/components/PageHeader"
import { DashboardCard } from "@/components/DashboardCard"
import { DataTable } from "@/components/DataTable"
import { StatusBadge } from "@/components/StatusBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { 
  Workflow, 
  Bot, 
  Users, 
  Monitor, 
  Settings, 
  Search, 
  Filter, 
  Download,
  Play,
  Pause,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  Cog,
  RefreshCw,
  Activity,
  BarChart3,
  Shield,
  Zap,
  Brain,
  Target,
  TrendingUp,
  ArrowRight,
  ExternalLink,
  FileText,
  Calendar,
  MousePointer,
  Layers,
  Command
} from "lucide-react"

// Mock data for workflow automations
const workflowData = [
  {
    id: "wf_001",
    name: "CRM Data Entry Assistant",
    description: "Auto-fills Salesforce fields from internal databases",
    user: "John Doe (Enterprise Sales)",
    status: "active",
    executions: 247,
    successRate: 94.2,
    timeSaved: "12.4 hours",
    applications: ["Salesforce", "Internal Customer DB"],
    triggers: ["Field focus", "New record creation"],
    lastExecution: "2024-01-15 14:23:45",
    department: "Sales",
    automationLevel: "Autonomous"
  },
  {
    id: "wf_002",
    name: "Brand Compliance Checker",
    description: "Validates design assets against brand guidelines",
    user: "Sarah Chen (Marketing)",
    status: "active",
    executions: 89,
    successRate: 98.1,
    timeSaved: "8.7 hours", 
    applications: ["Adobe Photoshop", "Figma", "Brand Guidelines DB"],
    triggers: ["File save", "Export action"],
    lastExecution: "2024-01-15 13:45:20",
    department: "Marketing",
    automationLevel: "Approval Required"
  },
  {
    id: "wf_003",
    name: "Financial Data Cross-Check",
    description: "Validates figures across Excel and ERP systems",
    user: "Angela Chen (Finance)",
    status: "paused",
    executions: 156,
    successRate: 91.7,
    timeSaved: "15.2 hours",
    applications: ["Excel", "SAP ERP", "PowerBI"],
    triggers: ["Formula change", "Data import"],
    lastExecution: "2024-01-14 16:22:10",
    department: "Finance",
    automationLevel: "Approval Required"
  }
]

// Mock data for cross-tool bridges
const bridgeData = [
  {
    id: "bridge_001",
    name: "Jira-to-Design Bridge",
    description: "Connects Jira tickets with Figma design specs",
    connectedApps: ["Jira", "Figma", "Slack"],
    activeUsers: 23,
    dailyActions: 156,
    status: "active",
    department: "Product Design",
    complexity: "medium",
    lastSync: "2024-01-15 14:30:00"
  },
  {
    id: "bridge_002", 
    name: "CRM-to-ERP Bridge",
    description: "Syncs customer data between Salesforce and SAP",
    connectedApps: ["Salesforce", "SAP ERP", "Power BI"],
    activeUsers: 45,
    dailyActions: 324,
    status: "active",
    department: "Sales Operations",
    complexity: "high",
    lastSync: "2024-01-15 14:25:00"
  }
]

// Mock data for proactive suggestions
const suggestionData = [
  {
    id: "sug_001",
    user: "John Doe",
    application: "Salesforce",
    suggestion: "This deal stage doesn't match your last meeting notes. Update to 'Proposal Sent'?",
    type: "Data Consistency",
    confidence: 92,
    status: "accepted",
    timestamp: "2024-01-15 14:20:00",
    timeSaved: "5 minutes"
  },
  {
    id: "sug_002",
    user: "Sarah Chen",
    application: "Adobe Photoshop", 
    suggestion: "The creative brief says 1200x628px; your file is 1080x1080px",
    type: "Specification Check",
    confidence: 98,
    status: "accepted",
    timestamp: "2024-01-15 13:55:00",
    timeSaved: "15 minutes"
  },
  {
    id: "sug_003",
    user: "Angela Chen",
    application: "Excel",
    suggestion: "You've selected Q3 instead of Q4 data range - are you sure?",
    type: "Error Prevention",
    confidence: 85,
    status: "dismissed",
    timestamp: "2024-01-15 12:30:00",
    timeSaved: "0 minutes"
  }
]

const workflowColumns = [
  {
    key: "workflow",
    header: "Workflow",
    cell: (row: any) => (
      <div className="flex items-center space-x-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
          <Workflow className="h-4 w-4 text-white" />
        </div>
        <div>
          <div className="font-medium text-foreground">{row.name}</div>
          <div className="text-sm text-muted-foreground">{row.description}</div>
          <div className="text-xs text-muted-foreground">by {row.user}</div>
        </div>
      </div>
    ),
  },
  {
    key: "performance",
    header: "Performance",
    cell: (row: any) => (
      <div className="space-y-1">
        <div className="text-sm font-medium">{row.executions} executions</div>
        <div className="text-xs text-muted-foreground">{row.successRate}% success rate</div>
        <div className="text-xs text-green-600">{row.timeSaved} saved</div>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (row: any) => (
      <div className="space-y-1">
        <StatusBadge status={row.status as any}>
          {row.status}
        </StatusBadge>
        <Badge variant="outline" className="text-xs">
          {row.automationLevel}
        </Badge>
      </div>
    ),
  },
  {
    key: "applications",
    header: "Connected Apps",
    cell: (row: any) => (
      <div className="space-y-1">
        {row.applications.slice(0, 2).map((app: string, index: number) => (
          <Badge key={index} variant="secondary" className="text-xs mr-1">
            {app}
          </Badge>
        ))}
        {row.applications.length > 2 && (
          <Badge variant="outline" className="text-xs">
            +{row.applications.length - 2} more
          </Badge>
        )}
      </div>
    ),
  }
]

export default function WorkflowAutomation() {
  const [isCreateWorkflowOpen, setIsCreateWorkflowOpen] = useState(false)
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false)
  const [isBridgeConfigOpen, setIsBridgeConfigOpen] = useState(false)

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader 
          title="Workflow Automation & AI Learning"
          description="Manage cross-tool AI bridges, workflow learning, and proactive assistance"
        >
          <Dialog open={isAnalyticsOpen} onOpenChange={setIsAnalyticsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Workflow Analytics</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Time Saved</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">247.3 hrs</div>
                    <div className="text-xs text-muted-foreground">This month</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Active Workflows</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">89</div>
                    <div className="text-xs text-muted-foreground">Across all departments</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Success Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">94.6%</div>
                    <div className="text-xs text-muted-foreground">Average automation success</div>
                  </CardContent>
                </Card>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isCreateWorkflowOpen} onOpenChange={setIsCreateWorkflowOpen}>
            <DialogTrigger asChild>
              <Button variant="enterprise">
                <Workflow className="h-4 w-4 mr-2" />
                Create Workflow
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Workflow Automation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="workflowName">Workflow Name</Label>
                  <Input id="workflowName" placeholder="Enter workflow name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" placeholder="Describe what this workflow does" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="triggerApp">Trigger Application</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select app" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="salesforce">Salesforce</SelectItem>
                        <SelectItem value="excel">Microsoft Excel</SelectItem>
                        <SelectItem value="figma">Figma</SelectItem>
                        <SelectItem value="photoshop">Adobe Photoshop</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="automationLevel">Automation Level</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft Only</SelectItem>
                        <SelectItem value="approval">Approval Required</SelectItem>
                        <SelectItem value="autonomous">Autonomous</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateWorkflowOpen(false)}>Cancel</Button>
                  <Button variant="enterprise">Create Workflow</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </PageHeader>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Workflows</p>
                  <p className="text-2xl font-bold">89</p>
                </div>
                <Workflow className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">+12 this week</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Time Saved Today</p>
                  <p className="text-2xl font-bold">34.2h</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">+15% vs yesterday</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">App Bridges</p>
                  <p className="text-2xl font-bold">23</p>
                </div>
                <Layers className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">+3 new bridges</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold">94.6%</p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">+2.1% this month</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="workflows" className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="workflows">Learned Workflows</TabsTrigger>
            <TabsTrigger value="bridges">Cross-Tool Bridges</TabsTrigger>
            <TabsTrigger value="suggestions">Proactive Suggestions</TabsTrigger>
            <TabsTrigger value="learning">AI Learning Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="workflows">
            <DataTable 
              title="Learned Workflow Automations" 
              data={workflowData} 
              columns={workflowColumns}
              actions={[
                <Button key="learn" variant="outline" size="sm">
                  <Brain className="h-4 w-4 mr-2" />
                  Learning Queue
                </Button>
              ]}
            />
          </TabsContent>

          <TabsContent value="bridges">
            <Card>
              <CardHeader>
                <CardTitle>Cross-Tool Cognitive Bridges</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {bridgeData.map((bridge) => (
                    <div key={bridge.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{bridge.name}</h3>
                          <p className="text-sm text-muted-foreground">{bridge.description}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <StatusBadge status={bridge.status as any}>
                            {bridge.status}
                          </StatusBadge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {bridge.complexity} complexity
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div>
                          <span className="text-muted-foreground">Connected Apps:</span>
                          <div className="font-medium">{bridge.connectedApps.length}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Active Users:</span>
                          <div className="font-medium">{bridge.activeUsers}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Daily Actions:</span>
                          <div className="font-medium">{bridge.dailyActions}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Last Sync:</span>
                          <div className="font-medium">{new Date(bridge.lastSync).toLocaleTimeString()}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {bridge.connectedApps.map((app, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {app}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Dialog open={isBridgeConfigOpen} onOpenChange={setIsBridgeConfigOpen}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Settings className="h-4 w-4 mr-1" />
                                Configure
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Configure Bridge: {bridge.name}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium">Auto-sync</div>
                                    <div className="text-sm text-muted-foreground">Automatically sync data between apps</div>
                                  </div>
                                  <Switch defaultChecked />
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="font-medium">Real-time notifications</div>
                                    <div className="text-sm text-muted-foreground">Notify users of data changes</div>
                                  </div>
                                  <Switch defaultChecked />
                                </div>
                                <div className="flex justify-end space-x-2">
                                  <Button variant="outline" onClick={() => setIsBridgeConfigOpen(false)}>Cancel</Button>
                                  <Button variant="enterprise">Save Changes</Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button variant="ghost" size="sm">
                            <Activity className="h-4 w-4 mr-1" />
                            Monitor
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suggestions">
            <Card>
              <CardHeader>
                <CardTitle>Proactive AI Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {suggestionData.map((suggestion) => (
                    <div key={suggestion.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              {suggestion.type}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {suggestion.confidence}% confidence
                            </Badge>
                          </div>
                          <p className="text-sm font-medium mb-1">{suggestion.suggestion}</p>
                          <div className="text-xs text-muted-foreground">
                            {suggestion.user} • {suggestion.application} • {new Date(suggestion.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <StatusBadge status={suggestion.status as any}>
                            {suggestion.status}
                          </StatusBadge>
                          {suggestion.status === "accepted" && suggestion.timeSaved !== "0 minutes" && (
                            <Badge variant="outline" className="text-xs text-green-600">
                              ⏱️ {suggestion.timeSaved}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="learning">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>AI Learning Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Workflow Recording</div>
                      <div className="text-sm text-muted-foreground">Record user actions for AI learning</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Pattern Recognition</div>
                      <div className="text-sm text-muted-foreground">Identify repetitive user actions</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Auto-Suggestion</div>
                      <div className="text-sm text-muted-foreground">Automatically suggest workflow automations</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Learning Threshold</Label>
                    <Select defaultValue="3">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">After 2 repetitions</SelectItem>
                        <SelectItem value="3">After 3 repetitions</SelectItem>
                        <SelectItem value="5">After 5 repetitions</SelectItem>
                        <SelectItem value="10">After 10 repetitions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Proactive Assistance Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Error Prevention</div>
                      <div className="text-sm text-muted-foreground">Warn before potential mistakes</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Spec Validation</div>
                      <div className="text-sm text-muted-foreground">Check against requirements/guidelines</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Data Consistency Checks</div>
                      <div className="text-sm text-muted-foreground">Flag mismatched information</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Suggestion Frequency</Label>
                    <Select defaultValue="balanced">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minimal">Minimal - Only critical issues</SelectItem>
                        <SelectItem value="balanced">Balanced - Important suggestions</SelectItem>
                        <SelectItem value="proactive">Proactive - All helpful suggestions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}