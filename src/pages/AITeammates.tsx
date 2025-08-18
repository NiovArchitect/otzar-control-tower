import { useState } from "react"
import { Layout } from "@/components/Layout"
import { PageHeader } from "@/components/PageHeader"
import { DashboardCard } from "@/components/DashboardCard"
import { StatusBadge } from "@/components/StatusBadge"
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
import { Separator } from "@/components/ui/separator"
import { 
  Bot, 
  Search, 
  Filter, 
  Plus, 
  Users, 
  Zap, 
  Shield, 
  Network, 
  Settings,
  Brain,
  Target,
  Clock,
  AlertTriangle,
  CheckCircle,
  UserCheck,
  Activity,
  Database,
  Link
} from "lucide-react"

interface AITeammate {
  id: string
  name: string
  type: "Personal" | "Departmental" | "Service"
  owner: string
  department: string
  status: "active" | "inactive" | "pending" | "error"
  skillPackages: string[]
  permissions: string[]
  lastActive: string
  tasksCompleted: number
  autonomyLevel: "Draft Only" | "Approval Required" | "Autonomous"
  swarmEnabled: boolean
}

const mockTeammates: AITeammate[] = [
  {
    id: "ai_001",
    name: "Sarah Chen Assistant",
    type: "Personal",
    owner: "Sarah Chen",
    department: "Design",
    status: "active",
    skillPackages: ["Adobe Creative Suite", "Figma Automation", "Design Review"],
    permissions: ["Design Assets Read/Write", "Client Communication", "Project Management"],
    lastActive: "2 minutes ago",
    tasksCompleted: 147,
    autonomyLevel: "Approval Required",
    swarmEnabled: true
  },
  {
    id: "ai_002", 
    name: "Finance Analytics Bot",
    type: "Departmental",
    owner: "Finance Team",
    department: "Finance",
    status: "active",
    skillPackages: ["ERP Integration", "Financial Analytics", "Report Generation"],
    permissions: ["Financial Data Read", "Report Creation", "Dashboard Management"],
    lastActive: "5 minutes ago",
    tasksCompleted: 203,
    autonomyLevel: "Autonomous",
    swarmEnabled: false
  },
  {
    id: "ai_003",
    name: "Customer Support Agent",
    type: "Service",
    owner: "System",
    department: "Customer Support",
    status: "pending",
    skillPackages: ["Customer Support AI", "Help Desk Automation", "Knowledge Base"],
    permissions: ["Customer Data Read", "Ticket Updates", "Email Templates", "Escalation Rules"],
    lastActive: "1 hour ago",
    tasksCompleted: 89,
    autonomyLevel: "Draft Only",
    swarmEnabled: true
  },
  {
    id: "ai_004",
    name: "Marcus Johnson Assistant", 
    type: "Personal",
    owner: "Marcus Johnson",
    department: "Sales",
    status: "active",
    skillPackages: ["Salesforce Integration", "Lead Qualification", "Proposal Generation"],
    permissions: ["CRM Read/Write", "Email Automation", "Calendar Management"],
    lastActive: "10 minutes ago",
    tasksCompleted: 178,
    autonomyLevel: "Approval Required",
    swarmEnabled: true
  },
  {
    id: "ai_005",
    name: "Security Monitor",
    type: "Service",
    owner: "System",
    department: "IT Security",
    status: "error",
    skillPackages: ["Security Monitoring", "Threat Detection", "Incident Response"],
    permissions: ["Security Logs Read", "Alert Generation", "Policy Enforcement"],
    lastActive: "30 minutes ago",
    tasksCompleted: 234,
    autonomyLevel: "Autonomous",
    swarmEnabled: false
  }
]

const skillPackageLibrary = [
  { name: "Salesforce Integration", category: "CRM", description: "Full Salesforce CRUD operations, report generation, workflow automation" },
  { name: "Adobe Creative Suite", category: "Design", description: "Photoshop, Illustrator, InDesign automation and review capabilities" },
  { name: "ERP Integration", category: "Finance", description: "SAP, Oracle integration for financial data processing and reporting" },
  { name: "Security Monitoring", category: "IT", description: "Real-time threat detection, log analysis, incident response" },
  { name: "HR Management", category: "Human Resources", description: "Employee data management, onboarding workflows, compliance tracking" },
  { name: "Marketing Automation", category: "Marketing", description: "Campaign management, analytics, content optimization" },
  { name: "Customer Support AI", category: "Support", description: "Intelligent ticket routing, automated responses, escalation management with Perplexity AI integration" },
  { name: "Help Desk Automation", category: "IT Support", description: "Ticket classification, knowledge base search, SLA monitoring, first-level resolution" }
]

export default function AITeammates() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const filteredTeammates = mockTeammates.filter(teammate => {
    const matchesSearch = teammate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         teammate.owner.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesDepartment = selectedDepartment === "all" || teammate.department === selectedDepartment
    const matchesStatus = selectedStatus === "all" || teammate.status === selectedStatus
    
    return matchesSearch && matchesDepartment && matchesStatus
  })

  const columns = [
    {
      key: "name",
      header: "AI Teammate",
      cell: (teammate: AITeammate) => (
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-full bg-gradient-primary flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="font-medium text-foreground">{teammate.name}</div>
            <div className="text-sm text-muted-foreground">{teammate.type}</div>
          </div>
        </div>
      )
    },
    {
      key: "owner",
      header: "Owner/Department",
      cell: (teammate: AITeammate) => (
        <div>
          <div className="font-medium text-foreground">{teammate.owner}</div>
          <div className="text-sm text-muted-foreground">{teammate.department}</div>
        </div>
      )
    },
    {
      key: "status",
      header: "Status",
      cell: (teammate: AITeammate) => (
        <StatusBadge status={teammate.status}>
          {teammate.status === "active" ? "Active" : 
           teammate.status === "inactive" ? "Inactive" :
           teammate.status === "pending" ? "Training" : "Error"}
        </StatusBadge>
      )
    },
    {
      key: "autonomy",
      header: "Autonomy Level",
      cell: (teammate: AITeammate) => (
        <Badge variant={
          teammate.autonomyLevel === "Autonomous" ? "default" :
          teammate.autonomyLevel === "Approval Required" ? "secondary" : "outline"
        }>
          {teammate.autonomyLevel}
        </Badge>
      )
    },
    {
      key: "skills",
      header: "Skill Packages",
      cell: (teammate: AITeammate) => (
        <div className="flex flex-wrap gap-1">
          {teammate.skillPackages.slice(0, 2).map((skill, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {skill}
            </Badge>
          ))}
          {teammate.skillPackages.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{teammate.skillPackages.length - 2}
            </Badge>
          )}
        </div>
      )
    },
    {
      key: "tasks",
      header: "Tasks Completed",
      cell: (teammate: AITeammate) => (
        <div className="text-center">
          <div className="font-semibold text-foreground">{teammate.tasksCompleted}</div>
          <div className="text-xs text-muted-foreground">total</div>
        </div>
      )
    },
    {
      key: "lastActive",
      header: "Last Active",
      cell: (teammate: AITeammate) => (
        <div className="text-sm text-muted-foreground">{teammate.lastActive}</div>
      )
    }
  ]

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader 
          title="AI Teammates"
          description="Manage AI teammates, skill packages, and collaboration settings"
        >
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create AI Teammate
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New AI Teammate</DialogTitle>
                <DialogDescription>
                  Configure a new AI teammate with specific skills and permissions
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="teammate-name">Teammate Name</Label>
                    <Input id="teammate-name" placeholder="e.g., John's Assistant" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teammate-type">Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">Personal</SelectItem>
                        <SelectItem value="departmental">Departmental</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="owner">Owner</Label>
                    <Input id="owner" placeholder="Assign to user or team" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="design">Design</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="hr">Human Resources</SelectItem>
                        <SelectItem value="it">IT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Autonomy Level</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select autonomy level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft Only</SelectItem>
                      <SelectItem value="approval">Approval Required</SelectItem>
                      <SelectItem value="autonomous">Autonomous</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea placeholder="Describe the AI teammate's role and responsibilities..." />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch id="swarm-enabled" />
                  <Label htmlFor="swarm-enabled">Enable Swarm Collaboration</Label>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button>Create Teammate</Button>
              </div>
            </DialogContent>
          </Dialog>
        </PageHeader>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardCard
            title="Total AI Teammates"
            value="24"
            change="+3 this month"
            trend="up"
            icon={<Bot className="h-4 w-4" />}
          />
          <DashboardCard
            title="Active Teammates"
            value="19"
            change="79% utilization"
            trend="up"
            icon={<Activity className="h-4 w-4" />}
          />
          <DashboardCard
            title="Tasks Completed Today"
            value="1,247"
            change="+18% vs yesterday"
            trend="up"
            icon={<CheckCircle className="h-4 w-4" />}
          />
          <DashboardCard
            title="Swarms Active"
            value="3"
            change="2 cross-departmental"
            trend="flat"
            icon={<Network className="h-4 w-4" />}
          />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="teammates" className="space-y-6">
          <TabsList>
            <TabsTrigger value="teammates" className="gap-2">
              <Bot className="h-4 w-4" />
              AI Teammates
            </TabsTrigger>
            <TabsTrigger value="skills" className="gap-2">
              <Brain className="h-4 w-4" />
              Skill Packages
            </TabsTrigger>
            <TabsTrigger value="swarms" className="gap-2">
              <Network className="h-4 w-4" />
              Swarm Management
            </TabsTrigger>
            <TabsTrigger value="policies" className="gap-2">
              <Shield className="h-4 w-4" />
              Behavior Policies
            </TabsTrigger>
          </TabsList>

          <TabsContent value="teammates" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filters & Search
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search teammates..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="Design">Design</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="Customer Support">Customer Support</SelectItem>
                      <SelectItem value="IT Security">IT Security</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="pending">Training</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" className="gap-2">
                    <Settings className="h-4 w-4" />
                    Advanced Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Teammates Table */}
            <DataTable
              title="AI Teammates"
              data={filteredTeammates}
              columns={columns}
            />
          </TabsContent>

          <TabsContent value="skills" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Skill Package Library
                </CardTitle>
                <CardDescription>
                  Manage available skill packages and capabilities for AI teammates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {skillPackageLibrary.map((skill, idx) => (
                    <Card key={idx} className="border border-border">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{skill.name}</CardTitle>
                          <Badge variant="outline">{skill.category}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {skill.description}
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">Configure</Button>
                          <Button size="sm" variant="outline">Assign</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="swarms" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-5 w-5" />
                    Active Swarms
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <h4 className="font-medium">Q4 Marketing Campaign</h4>
                        <p className="text-sm text-muted-foreground">3 AI teammates collaborating</p>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div>
                        <h4 className="font-medium">Customer Onboarding Optimization</h4>
                        <p className="text-sm text-muted-foreground">2 AI teammates collaborating</p>
                      </div>
                      <Badge variant="secondary">Planning</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Swarm Goals & KPIs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Task Completion Rate</span>
                      <span className="font-semibold">94%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Average Cycle Time</span>
                      <span className="font-semibold">2.3 hours</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Cross-Collaboration Events</span>
                      <span className="font-semibold">47</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="policies" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Behavior Rules
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Default Timeout for User Response</Label>
                    <Select defaultValue="5">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 minute</SelectItem>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Auto-approve low-risk tasks</Label>
                        <p className="text-sm text-muted-foreground">Enable autonomous action for routine tasks</p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Cross-department collaboration</Label>
                        <p className="text-sm text-muted-foreground">Allow AI teammates to share context across departments</p>
                      </div>
                      <Switch />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Swarm formation</Label>
                        <p className="text-sm text-muted-foreground">Enable automatic swarm creation for complex tasks</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Security & Compliance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Data isolation by department</Label>
                        <p className="text-sm text-muted-foreground">Prevent cross-department data access</p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Audit all AI actions</Label>
                        <p className="text-sm text-muted-foreground">Log every action for compliance</p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Require human approval for sensitive actions</Label>
                        <p className="text-sm text-muted-foreground">Financial, HR, and legal actions need approval</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
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