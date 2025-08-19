import { useState } from "react"
import { Layout } from "@/components/Layout"
import { PageHeader } from "@/components/PageHeader"
import { DashboardCard } from "@/components/DashboardCard"
import { StatusBadge } from "@/components/StatusBadge"
import { DataTable } from "@/components/DataTable"
import { RoleHierarchyTree } from "@/components/RoleHierarchyTree"
import { PermissionMatrix } from "@/components/PermissionMatrix"
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
  Link,
  Building2
} from "lucide-react"

interface AITeammate {
  id: string
  name: string
  type: "Personal" | "Departmental" | "Service" | "Executive" | "System"
  owner: string
  department: string
  division: string
  hierarchyLevel: string
  reportingChain: string
  status: "active" | "inactive" | "pending" | "error"
  skillPackages: string[]
  permissions: string[]
  authorityScope: string
  crossFunctionalAccess: string
  lastActive: string
  tasksCompleted: number
  autonomyLevel: "Draft Only" | "Approval Required" | "Autonomous" | "Executive Override"
  swarmEnabled: boolean
  securityClearance: "Basic" | "Standard" | "Enhanced" | "Executive" | "System"
}

const mockTeammates: AITeammate[] = [
  {
    id: "ai_001",
    name: "VP Engineering AI",
    type: "Executive",
    owner: "Sarah Martinez (VP Engineering)",
    department: "Engineering",
    division: "Technology",
    hierarchyLevel: "L4 - VP/Senior Leadership",
    reportingChain: "CTO → CEO → System Admin",
    status: "active",
    skillPackages: ["Division Engineering Management", "Strategic Planning", "Budget Authority", "Cross-Department Coordination"],
    permissions: ["Division-wide technical operations", "Budget approval", "Strategic planning", "Cross-department access"],
    authorityScope: "Division-wide technical operations & strategy",
    crossFunctionalAccess: "C-Level approval required for external divisions",
    lastActive: "2 minutes ago",
    tasksCompleted: 347,
    autonomyLevel: "Executive Override",
    swarmEnabled: true,
    securityClearance: "Executive"
  },
  {
    id: "ai_002", 
    name: "CMO Strategic AI",
    type: "Executive",
    owner: "Mark Wilson (CMO)",
    department: "Marketing",
    division: "Marketing",
    hierarchyLevel: "L5 - C-Level Executives",
    reportingChain: "CEO → System Admin",
    status: "active",
    skillPackages: ["Company-wide Marketing", "Brand Authority", "Strategic Planning", "Cross-Division Coordination"],
    permissions: ["All marketing operations", "Brand management", "Strategic initiatives", "Cross-division marketing"],
    authorityScope: "All marketing operations & strategy",
    crossFunctionalAccess: "Full access within marketing domain",
    lastActive: "1 minute ago",
    tasksCompleted: 503,
    autonomyLevel: "Executive Override",
    swarmEnabled: true,
    securityClearance: "Executive"
  },
  {
    id: "ai_003",
    name: "Director Analytics AI",
    type: "Departmental",
    owner: "Angela Chen (Director of Data Analytics)",
    department: "Data Analytics",
    division: "Technology",
    hierarchyLevel: "L3 - Director Level",
    reportingChain: "VP Engineering → CTO → CEO",
    status: "active",
    skillPackages: ["Department Analytics", "Data Governance", "Cross-Department Reporting", "Budget Authority"],
    permissions: ["Department analytics operations", "Data governance", "Cross-department reporting", "Budget management"],
    authorityScope: "Department analytics operations",
    crossFunctionalAccess: "VP approval required",
    lastActive: "30 minutes ago",
    tasksCompleted: 289,
    autonomyLevel: "Autonomous",
    swarmEnabled: true,
    securityClearance: "Enhanced"
  },
  {
    id: "ai_004",
    name: "Enterprise Sales AI", 
    type: "Personal",
    owner: "John Doe (Enterprise Account Executive)",
    department: "Enterprise Sales",
    division: "Sales",
    hierarchyLevel: "L0 - Individual Contributors",
    reportingChain: "Sales Manager → Sales Director → VP Sales → CEO",
    status: "active",
    skillPackages: ["Enterprise CRM", "Large Deal Management", "Executive Engagement"],
    permissions: ["Personal enterprise accounts", "Deal management", "Customer communication"],
    authorityScope: "Personal enterprise accounts",
    crossFunctionalAccess: "Team Lead approval required",
    lastActive: "5 minutes ago",
    tasksCompleted: 156,
    autonomyLevel: "Approval Required",
    swarmEnabled: false,
    securityClearance: "Standard"
  },
  {
    id: "ai_005",
    name: "System Admin AI",
    type: "System",
    owner: "Lisa Park (System Administrator)",
    department: "IT Infrastructure",
    division: "Technology",
    hierarchyLevel: "L7 - System Administrator",
    reportingChain: "Direct system authority",
    status: "active",
    skillPackages: ["Complete System Control", "Emergency Override", "Infrastructure Management", "Security Administration"],
    permissions: ["Complete system control", "Emergency override", "User management", "Security administration"],
    authorityScope: "Complete system control & emergency override",
    crossFunctionalAccess: "Universal override authority",
    lastActive: "5 minutes ago",
    tasksCompleted: 891,
    autonomyLevel: "Executive Override",
    swarmEnabled: true,
    securityClearance: "System"
  },
  {
    id: "ai_006",
    name: "CEO Strategic AI",
    type: "Executive",
    owner: "David Kumar (CEO)",
    department: "Executive",
    division: "Executive Leadership",
    hierarchyLevel: "L6 - CEO",
    reportingChain: "System Admin (technical escalation only)",
    status: "active",
    skillPackages: ["Company-wide Strategic Oversight", "Executive Decision Support", "Cross-Division Coordination", "Crisis Management"],
    permissions: ["Complete business authority", "Strategic oversight", "All data access", "Final escalation authority"],
    authorityScope: "Complete business authority",
    crossFunctionalAccess: "Universal business authority",
    lastActive: "10 minutes ago",
    tasksCompleted: 1247,
    autonomyLevel: "Executive Override",
    swarmEnabled: true,
    securityClearance: "Executive"
  },
  {
    id: "ai_007",
    name: "Sales Team Lead AI",
    type: "Personal",
    owner: "Emily Rodriguez (Sales Team Lead)",
    department: "Regional Sales",
    division: "Sales",
    hierarchyLevel: "L1 - Team Lead Level",
    reportingChain: "Sales Manager → Sales Director → VP Sales",
    status: "active",
    skillPackages: ["Team Coordination", "Regional Sales Management", "Performance Tracking"],
    permissions: ["Team coordination", "Regional sales data", "Team performance management"],
    authorityScope: "Team coordination & support",
    crossFunctionalAccess: "Manager approval required",
    lastActive: "15 minutes ago",
    tasksCompleted: 134,
    autonomyLevel: "Approval Required",
    swarmEnabled: false,
    securityClearance: "Standard"
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
            <Badge variant="outline" className="text-xs mt-1">
              {teammate.hierarchyLevel}
            </Badge>
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
          <div className="text-sm text-muted-foreground">{teammate.department} • {teammate.division}</div>
          <div className="text-xs text-muted-foreground">{teammate.securityClearance} clearance</div>
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

        {/* AI Hierarchy Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>AI Teammate Hierarchy</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-destructive">1</div>
                  <div className="text-xs text-muted-foreground">System AI</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">1</div>
                  <div className="text-xs text-muted-foreground">CEO AI</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-chart-1">5</div>
                  <div className="text-xs text-muted-foreground">Executive AIs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-chart-2">12</div>
                  <div className="text-xs text-muted-foreground">Department AIs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-chart-3">396</div>
                  <div className="text-xs text-muted-foreground">Personal AIs</div>
                </div>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <Building2 className="h-4 w-4 mr-2" />
                    View AI Hierarchy
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>AI Teammate Hierarchy & Tethering</DialogTitle>
                  </DialogHeader>
                  <RoleHierarchyTree />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>AI Permissions</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Executive Override</span>
                  <Badge variant="destructive" className="text-xs">2 AIs</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Autonomous</span>
                  <Badge variant="default" className="text-xs">18 AIs</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Approval Required</span>
                  <Badge variant="secondary" className="text-xs">156 AIs</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Draft Only</span>
                  <Badge variant="outline" className="text-xs">48 AIs</Badge>
                </div>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full mt-4">
                    <Shield className="h-4 w-4 mr-2" />
                    View Permission Matrix
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>AI Tool Permission Matrix</DialogTitle>
                  </DialogHeader>
                  <PermissionMatrix />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>

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

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Settings className="h-4 w-4" />
                        Advanced Filters
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Advanced Filters</DialogTitle>
                        <DialogDescription>Filter AI teammates by additional criteria</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Autonomy Level</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select autonomy level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Levels</SelectItem>
                              <SelectItem value="draft">Draft Only</SelectItem>
                              <SelectItem value="approval">Approval Required</SelectItem>
                              <SelectItem value="autonomous">Autonomous</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Swarm Enabled</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Filter by swarm capability" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All</SelectItem>
                              <SelectItem value="enabled">Swarm Enabled</SelectItem>
                              <SelectItem value="disabled">Swarm Disabled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Last Active</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select time range" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1h">Last hour</SelectItem>
                              <SelectItem value="24h">Last 24 hours</SelectItem>
                              <SelectItem value="7d">Last 7 days</SelectItem>
                              <SelectItem value="30d">Last 30 days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline">Reset</Button>
                        <Button>Apply Filters</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
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