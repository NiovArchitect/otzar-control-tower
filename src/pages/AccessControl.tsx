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
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, CheckCircle, Eye, EyeOff, Lock, Shield, Users, Database, Globe, MapPin, FileText, Settings, Plus, Search, Filter, Edit, Trash2, Key, User, Network, Layers, Target, Clock } from "lucide-react"

interface OWDRule {
  id: string
  objectType: string
  defaultAccess: "Private" | "Public Read" | "Public Read-Write" | "Controlled by Parent"
  description: string
  recordCount: number
  lastModified: string
}

interface SharingRule {
  id: string
  name: string
  type: "Owner-based" | "Criteria-based" | "Team-based"
  sourceRole: string
  targetRole: string
  accessLevel: "Read" | "Read-Write"
  criteria?: string
  active: boolean
}

interface FieldLevelSecurity {
  id: string
  objectName: string
  fieldName: string
  profile: string
  viewAccess: boolean
  editAccess: boolean
  masked: boolean
  sensitiveClassification: "None" | "PII" | "PHI" | "Trade Secret"
}

interface VectorACL {
  id: string
  datasetName: string
  chunkId: string
  allowedRoles: string[]
  territories: string[]
  lastAccessed: string
  queryCount: number
}

const mockOWDRules: OWDRule[] = [
  {
    id: "owd_001",
    objectType: "Customer Datasets",
    defaultAccess: "Private",
    description: "Customer data requires explicit sharing",
    recordCount: 15420,
    lastModified: "2024-01-15"
  },
  {
    id: "owd_002", 
    objectType: "Knowledge Embeddings",
    defaultAccess: "Controlled by Parent",
    description: "Inherits access from source dataset",
    recordCount: 892310,
    lastModified: "2024-01-14"
  },
  {
    id: "owd_003",
    objectType: "Workflow Templates",
    defaultAccess: "Public Read",
    description: "Templates visible to all users",
    recordCount: 342,
    lastModified: "2024-01-13"
  },
  {
    id: "owd_004",
    objectType: "AI Session Logs",
    defaultAccess: "Private",
    description: "Sessions private to owner only",
    recordCount: 67891,
    lastModified: "2024-01-12"
  }
]

const mockSharingRules: SharingRule[] = [
  {
    id: "sr_001",
    name: "Finance to Executive Sharing",
    type: "Owner-based",
    sourceRole: "Finance Team",
    targetRole: "Executive Team",
    accessLevel: "Read",
    active: true
  },
  {
    id: "sr_002",
    name: "EU Data Sharing",
    type: "Criteria-based", 
    sourceRole: "EU Operations",
    targetRole: "EU Legal",
    accessLevel: "Read-Write",
    criteria: "region = 'EU' AND classification = 'Internal'",
    active: true
  },
  {
    id: "sr_003",
    name: "Design Collaboration",
    type: "Team-based",
    sourceRole: "Design Team",
    targetRole: "Product Team",
    accessLevel: "Read",
    active: false
  }
]

const mockFieldSecurity: FieldLevelSecurity[] = [
  {
    id: "fls_001",
    objectName: "Customer Record",
    fieldName: "Social Security Number",
    profile: "Sales Representative",
    viewAccess: false,
    editAccess: false,
    masked: true,
    sensitiveClassification: "PII"
  },
  {
    id: "fls_002",
    objectName: "Customer Record", 
    fieldName: "Credit Score",
    profile: "Finance Analyst",
    viewAccess: true,
    editAccess: false,
    masked: false,
    sensitiveClassification: "PII"
  },
  {
    id: "fls_003",
    objectName: "Product Design",
    fieldName: "Patent Details",
    profile: "External Contractor",
    viewAccess: false,
    editAccess: false,
    masked: true,
    sensitiveClassification: "Trade Secret"
  }
]

const mockVectorACLs: VectorACL[] = [
  {
    id: "vacl_001",
    datasetName: "Customer Support KB",
    chunkId: "chunk_4521",
    allowedRoles: ["Support Team", "Support Manager"],
    territories: ["US", "CA"],
    lastAccessed: "2 hours ago",
    queryCount: 127
  },
  {
    id: "vacl_002",
    datasetName: "HR Policies",
    chunkId: "chunk_8934",
    allowedRoles: ["HR Team", "Management"],
    territories: ["Global"],
    lastAccessed: "15 minutes ago", 
    queryCount: 45
  }
]

export default function AccessControl() {
  const [selectedOWDType, setSelectedOWDType] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")

  const owdColumns = [
    {
      key: "objectType",
      header: "Object Type",
      cell: (row: OWDRule) => (
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <Database className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="font-medium text-foreground">{row.objectType}</div>
            <div className="text-sm text-muted-foreground">{row.description}</div>
          </div>
        </div>
      )
    },
    {
      key: "defaultAccess",
      header: "Default Access",
      cell: (row: OWDRule) => (
        <Badge variant={
          row.defaultAccess === "Private" ? "destructive" :
          row.defaultAccess === "Public Read" ? "secondary" : 
          row.defaultAccess === "Public Read-Write" ? "default" : "outline"
        }>
          {row.defaultAccess}
        </Badge>
      )
    },
    {
      key: "recordCount", 
      header: "Records",
      cell: (row: OWDRule) => (
        <div className="text-right">
          <div className="font-semibold">{row.recordCount.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">total records</div>
        </div>
      )
    },
    {
      key: "lastModified",
      header: "Last Modified",
      cell: (row: OWDRule) => (
        <div className="text-sm text-muted-foreground">{row.lastModified}</div>
      )
    }
  ]

  const sharingRuleColumns = [
    {
      key: "name",
      header: "Rule Name",
      cell: (row: SharingRule) => (
        <div>
          <div className="font-medium text-foreground">{row.name}</div>
          <Badge variant="outline" className="text-xs mt-1">
            {row.type}
          </Badge>
        </div>
      )
    },
    {
      key: "source",
      header: "Source → Target",
      cell: (row: SharingRule) => (
        <div className="flex items-center space-x-2">
          <span className="text-sm">{row.sourceRole}</span>
          <span className="text-muted-foreground">→</span>
          <span className="text-sm">{row.targetRole}</span>
        </div>
      )
    },
    {
      key: "accessLevel",
      header: "Access Level",
      cell: (row: SharingRule) => (
        <Badge variant={row.accessLevel === "Read-Write" ? "default" : "secondary"}>
          {row.accessLevel}
        </Badge>
      )
    },
    {
      key: "criteria",
      header: "Criteria",
      cell: (row: SharingRule) => (
        <div className="text-sm text-muted-foreground max-w-xs truncate">
          {row.criteria || "N/A"}
        </div>
      )
    },
    {
      key: "active",
      header: "Status",
      cell: (row: SharingRule) => (
        <StatusBadge status={row.active ? "active" : "inactive"}>
          {row.active ? "Active" : "Inactive"}
        </StatusBadge>
      )
    }
  ]

  const fieldSecurityColumns = [
    {
      key: "field",
      header: "Object.Field",
      cell: (row: FieldLevelSecurity) => (
        <div>
          <div className="font-medium text-foreground">{row.objectName}</div>
          <div className="text-sm text-muted-foreground">{row.fieldName}</div>
        </div>
      )
    },
    {
      key: "profile",
      header: "Profile",
      cell: (row: FieldLevelSecurity) => (
        <Badge variant="outline">{row.profile}</Badge>
      )
    },
    {
      key: "permissions",
      header: "Permissions",
      cell: (row: FieldLevelSecurity) => (
        <div className="flex space-x-2">
          <div className="flex items-center space-x-1">
            {row.viewAccess ? <Eye className="h-3 w-3 text-status-success" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
            <span className="text-xs">View</span>
          </div>
          <div className="flex items-center space-x-1">
            <Edit className={`h-3 w-3 ${row.editAccess ? 'text-status-success' : 'text-muted-foreground'}`} />
            <span className="text-xs">Edit</span>
          </div>
        </div>
      )
    },
    {
      key: "classification",
      header: "Classification",
      cell: (row: FieldLevelSecurity) => (
        <div className="flex items-center space-x-2">
          <Badge variant={
            row.sensitiveClassification === "Trade Secret" ? "destructive" :
            row.sensitiveClassification === "PII" || row.sensitiveClassification === "PHI" ? "secondary" : "outline"
          }>
            {row.sensitiveClassification}
          </Badge>
          {row.masked && <Lock className="h-3 w-3 text-status-warning" />}
        </div>
      )
    }
  ]

  const vectorACLColumns = [
    {
      key: "dataset",
      header: "Dataset & Chunk",
      cell: (row: VectorACL) => (
        <div>
          <div className="font-medium text-foreground">{row.datasetName}</div>
          <div className="text-sm text-muted-foreground font-mono">{row.chunkId}</div>
        </div>
      )
    },
    {
      key: "roles",
      header: "Allowed Roles",
      cell: (row: VectorACL) => (
        <div className="flex flex-wrap gap-1">
          {row.allowedRoles.map((role, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {role}
            </Badge>
          ))}
        </div>
      )
    },
    {
      key: "territories",
      header: "Territories",
      cell: (row: VectorACL) => (
        <div className="flex items-center space-x-1">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm">{row.territories.join(", ")}</span>
        </div>
      )
    },
    {
      key: "usage",
      header: "Usage Stats",
      cell: (row: VectorACL) => (
        <div className="text-right">
          <div className="font-semibold">{row.queryCount}</div>
          <div className="text-xs text-muted-foreground">queries</div>
          <div className="text-xs text-muted-foreground">{row.lastAccessed}</div>
        </div>
      )
    }
  ]

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader 
          title="Access Control & Security"
          description="Manage organization-wide defaults, sharing rules, field-level security, and vector ACLs"
        >
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                Security Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Security Report</DialogTitle>
                <DialogDescription>Export comprehensive security analysis</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Report Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select report type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Full Security Analysis</SelectItem>
                      <SelectItem value="compliance">Compliance Summary</SelectItem>
                      <SelectItem value="vulnerabilities">Vulnerability Assessment</SelectItem>
                      <SelectItem value="access">Access Control Review</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select date range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="custom">Custom range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button>Generate Report</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Rule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Security Rule</DialogTitle>
                <DialogDescription>Define new access control or security policy</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Rule Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rule type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owd">Organization-Wide Default</SelectItem>
                      <SelectItem value="sharing">Sharing Rule</SelectItem>
                      <SelectItem value="field">Field-Level Security</SelectItem>
                      <SelectItem value="vector">Vector ACL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rule Name</Label>
                  <Input placeholder="Enter descriptive rule name" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input placeholder="Describe the rule purpose" />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button>Create Rule</Button>
              </div>
            </DialogContent>
          </Dialog>
        </PageHeader>

        {/* Security Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardCard
            title="Protected Objects"
            value="127"
            change="+8 this month"
            trend="up"
            icon={<Shield className="h-4 w-4" />}
          />
          <DashboardCard
            title="Active Sharing Rules"
            value="34"
            change="2 modified today"
            trend="flat"
            icon={<Users className="h-4 w-4" />}
          />
          <DashboardCard
            title="Field Security Policies"
            value="892"
            change="+15% coverage"
            trend="up"
            icon={<Eye className="h-4 w-4" />}
          />
          <DashboardCard
            title="Vector ACL Chunks"
            value="2.4M"
            change="Query-time protected"
            trend="up"
            icon={<Database className="h-4 w-4" />}
          />
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="owd" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="owd" className="gap-2">
              <Globe className="h-4 w-4" />
              OWD Settings
            </TabsTrigger>
            <TabsTrigger value="sharing" className="gap-2">
              <Network className="h-4 w-4" />
              Sharing Rules
            </TabsTrigger>
            <TabsTrigger value="field-security" className="gap-2">
              <Lock className="h-4 w-4" />
              Field Security
            </TabsTrigger>
            <TabsTrigger value="vector-acl" className="gap-2">
              <Layers className="h-4 w-4" />
              Vector ACLs
            </TabsTrigger>
            <TabsTrigger value="territories" className="gap-2">
              <MapPin className="h-4 w-4" />
              Territories
            </TabsTrigger>
          </TabsList>

          {/* Organization-Wide Defaults */}
          <TabsContent value="owd" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Organization-Wide Default Settings
                </CardTitle>
                <CardDescription>
                  Set baseline access levels for object types. More restrictive settings can be applied via sharing rules.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search object types..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedOWDType} onValueChange={setSelectedOWDType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by access level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Access Levels</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="public-read">Public Read</SelectItem>
                      <SelectItem value="public-read-write">Public Read-Write</SelectItem>
                      <SelectItem value="controlled">Controlled by Parent</SelectItem>
                    </SelectContent>
                  </Select>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Filter className="h-4 w-4" />
                        Advanced Filters
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Advanced Security Filters</DialogTitle>
                        <DialogDescription>Filter security settings by specific criteria</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Record Count Range</Label>
                          <div className="flex gap-2">
                            <Input placeholder="Min" type="number" />
                            <Input placeholder="Max" type="number" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Last Modified</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="Select time range" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1d">Last 24 hours</SelectItem>
                              <SelectItem value="7d">Last 7 days</SelectItem>
                              <SelectItem value="30d">Last 30 days</SelectItem>
                              <SelectItem value="90d">Last 90 days</SelectItem>
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

            <DataTable
              title="Object-Level Default Access"
              data={mockOWDRules}
              columns={owdColumns}
            />

            {/* OWD Configuration Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Access Level Hierarchy</CardTitle>
                  <CardDescription>Understanding the security model</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border border-status-danger/20 bg-status-danger/5 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Lock className="h-4 w-4 text-status-danger" />
                        <span className="font-medium">Private</span>
                      </div>
                      <span className="text-sm text-muted-foreground">Owner only</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border border-status-warning/20 bg-status-warning/5 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Eye className="h-4 w-4 text-status-warning" />
                        <span className="font-medium">Public Read</span>
                      </div>
                      <span className="text-sm text-muted-foreground">All can view</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border border-status-success/20 bg-status-success/5 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Edit className="h-4 w-4 text-status-success" />
                        <span className="font-medium">Public Read-Write</span>
                      </div>
                      <span className="text-sm text-muted-foreground">All can edit</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border border-border bg-muted/5 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Layers className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Controlled by Parent</span>
                      </div>
                      <span className="text-sm text-muted-foreground">Inherits access</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security Impact Analysis</CardTitle>
                  <CardDescription>Real-time access control metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Records with Private access</span>
                      <span className="font-semibold">78%</span>
                    </div>
                    <Progress value={78} className="h-2" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Query-time ACL enforcement</span>
                      <span className="font-semibold">94%</span>
                    </div>
                    <Progress value={94} className="h-2" />
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Cross-territory isolation</span>
                      <span className="font-semibold">100%</span>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Sharing Rules */}
          <TabsContent value="sharing" className="space-y-6">
            <DataTable
              title="Active Sharing Rules"
              data={mockSharingRules}
              columns={sharingRuleColumns}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Create Sharing Rule</CardTitle>
                  <CardDescription>Grant access exceptions to the OWD settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Rule Name</Label>
                    <Input placeholder="e.g., Finance to Executive Sharing" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Rule Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select rule type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Owner-based Sharing</SelectItem>
                        <SelectItem value="criteria">Criteria-based Sharing</SelectItem>
                        <SelectItem value="team">Team-based Sharing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Source Role</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="From role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="finance">Finance Team</SelectItem>
                          <SelectItem value="sales">Sales Team</SelectItem>
                          <SelectItem value="design">Design Team</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Target Role</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="To role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="executive">Executive Team</SelectItem>
                          <SelectItem value="management">Management</SelectItem>
                          <SelectItem value="legal">Legal Team</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Button className="w-full">Create Sharing Rule</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Rule Performance</CardTitle>
                  <CardDescription>Sharing rule effectiveness metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Rules processed/day</span>
                      <span className="font-semibold">12,847</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Average evaluation time</span>
                      <span className="font-semibold">2.3ms</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Cache hit rate</span>
                      <span className="font-semibold">96.7%</span>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-4 w-4 text-status-warning" />
                      <span className="text-sm">3 conflicting rules detected</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Field-Level Security */}
          <TabsContent value="field-security" className="space-y-6">
            <DataTable
              title="Field-Level Security Policies"
              data={mockFieldSecurity}
              columns={fieldSecurityColumns}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sensitive Data Classification</CardTitle>
                  <CardDescription>Automated classification and protection</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border border-status-danger/20 bg-status-danger/5 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-status-danger" />
                        <span className="font-medium">Trade Secrets</span>
                      </div>
                      <Badge variant="destructive">47 fields</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border border-status-warning/20 bg-status-warning/5 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-status-warning" />
                        <span className="font-medium">PII/PHI Data</span>
                      </div>
                      <Badge variant="secondary">234 fields</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border border-border bg-muted/5 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Internal Data</span>
                      </div>
                      <Badge variant="outline">1,245 fields</Badge>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Auto-classification accuracy</span>
                      <span className="font-semibold">97.3%</span>
                    </div>
                    <Progress value={97.3} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Screen Context Redaction</CardTitle>
                  <CardDescription>Real-time on-screen data protection</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Apps under monitoring</span>
                      <span className="font-semibold">47</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">No-see zones active</span>
                      <span className="font-semibold">156</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">PII patterns blocked today</span>
                      <span className="font-semibold">2,847</span>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <Label>Redaction Settings</Label>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">SSN Pattern Detection</span>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Credit Card Masking</span>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Email Address Filtering</span>
                          <Switch />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Vector ACLs */}
          <TabsContent value="vector-acl" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Vector ACL & Query-Time Security
                </CardTitle>
                <CardDescription>
                  Chunk-level access control for RAG queries with real-time permission enforcement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border border-border rounded-lg">
                    <div className="text-2xl font-bold text-foreground">2.4M</div>
                    <div className="text-sm text-muted-foreground">Protected Chunks</div>
                  </div>
                  <div className="text-center p-4 border border-border rounded-lg">
                    <div className="text-2xl font-bold text-foreground">847K</div>
                    <div className="text-sm text-muted-foreground">Queries/Day</div>
                  </div>
                  <div className="text-center p-4 border border-border rounded-lg">
                    <div className="text-2xl font-bold text-foreground">99.8%</div>
                    <div className="text-sm text-muted-foreground">ACL Hit Rate</div>
                  </div>
                  <div className="text-center p-4 border border-border rounded-lg">
                    <div className="text-2xl font-bold text-foreground">1.2ms</div>
                    <div className="text-sm text-muted-foreground">Avg Lookup</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <DataTable
              title="Vector Chunk Access Controls"
              data={mockVectorACLs}
              columns={vectorACLColumns}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Query-Time Processing</CardTitle>
                  <CardDescription>Real-time ACL enforcement pipeline</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 bg-status-success rounded-full"></div>
                        <span className="text-sm">1. User Query Received</span>
                      </div>
                      <span className="text-xs text-muted-foreground">0.1ms</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 bg-status-success rounded-full"></div>
                        <span className="text-sm">2. Role/Territory Lookup</span>
                      </div>
                      <span className="text-xs text-muted-foreground">0.3ms</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 bg-status-success rounded-full"></div>
                        <span className="text-sm">3. Vector Search + ACL Filter</span>
                      </div>
                      <span className="text-xs text-muted-foreground">0.8ms</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 bg-status-success rounded-full"></div>
                        <span className="text-sm">4. Result Redaction</span>
                      </div>
                      <span className="text-xs text-muted-foreground">0.2ms</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Index Rebuild Status</CardTitle>
                  <CardDescription>Policy change propagation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Customer Support KB</span>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-status-success" />
                        <span className="text-xs text-muted-foreground">Complete</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">HR Policies</span>
                      <div className="flex items-center space-x-2">
                        <div className="h-4 w-4 border-2 border-status-warning border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs text-muted-foreground">Rebuilding</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Product Documentation</span>
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Queued</span>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Overall Progress</span>
                        <span className="text-sm font-semibold">67%</span>
                      </div>
                      <Progress value={67} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Territories */}
          <TabsContent value="territories" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Territory Management
                  </CardTitle>
                  <CardDescription>Geographic and business territory overlays</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4 text-chart-1" />
                        <span className="font-medium">North America</span>
                      </div>
                      <Badge variant="outline">847 users</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4 text-chart-2" />
                        <span className="font-medium">Europe (GDPR)</span>
                      </div>
                      <Badge variant="outline">523 users</Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4 text-chart-3" />
                        <span className="font-medium">Asia Pacific</span>
                      </div>
                      <Badge variant="outline">291 users</Badge>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <Label>Territory Settings</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Cross-territory data access</span>
                        <Switch />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Strict data residency</span>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Auto-territory assignment</span>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data Residency Compliance</CardTitle>
                  <CardDescription>Regional data processing and storage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">EU data in EU regions</span>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-status-success" />
                        <span className="text-sm font-semibold">100%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">BYOK encryption active</span>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-status-success" />
                        <span className="text-sm font-semibold">Yes</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Cross-border egress alerts</span>
                      <div className="flex items-center space-x-2">
                        <Target className="h-4 w-4 text-status-warning" />
                        <span className="text-sm font-semibold">3 this week</span>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="p-3 bg-status-success/5 border border-status-success/20 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-status-success" />
                        <span className="text-sm font-medium">GDPR Compliant</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        All EU user data processed within EU boundaries
                      </p>
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