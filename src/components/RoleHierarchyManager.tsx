import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Users, Crown, Shield, GitBranch, Target, Layers, Network, Plus, Edit, Trash2, CheckCircle, AlertTriangle, Brain, Star, Briefcase, Globe, Lock, Eye, Settings, FileText } from "lucide-react"
import { AccessControlMatrix } from "./AccessControlMatrix"
import { useState } from "react"

interface Role {
  id: string
  name: string
  level: string
  department: string
  division: string
  userCount: number
  permissions: string[]
  aiCapabilities: string[]
  parentRole?: string
  childRoles?: string[]
  description: string
}

const hierarchyRoles: Role[] = [
  {
    id: "sys-admin",
    name: "System Administrator",
    level: "L7",
    department: "IT Infrastructure",
    division: "Technology", 
    userCount: 1,
    permissions: ["system_override", "user_management", "security_admin", "audit_control", "emergency_response"],
    aiCapabilities: ["system_monitoring", "automated_security", "incident_response", "compliance_checking"],
    description: "Complete system control and emergency override authority"
  },
  {
    id: "ceo",
    name: "Chief Executive Officer", 
    level: "L6",
    department: "Executive",
    division: "Executive Leadership",
    userCount: 1,
    permissions: ["executive_override", "strategic_planning", "board_reporting", "m&a_decisions"],
    aiCapabilities: ["strategic_analytics", "market_intelligence", "executive_reporting", "board_preparation"],
    description: "Company-wide strategic oversight and final escalation authority"
  },
  {
    id: "cto",
    name: "Chief Technology Officer",
    level: "L5", 
    department: "Executive",
    division: "Technology",
    userCount: 1,
    permissions: ["tech_strategy", "architecture_decisions", "vendor_management", "security_policy"],
    aiCapabilities: ["technology_roadmap", "architecture_analysis", "vendor_evaluation", "security_monitoring"],
    parentRole: "ceo",
    description: "Technology strategy and system oversight across organization"
  },
  {
    id: "vp-sales",
    name: "VP Sales",
    level: "L4",
    department: "Sales Leadership", 
    division: "Sales",
    userCount: 2,
    permissions: ["revenue_oversight", "sales_strategy", "team_management", "client_relationships"],
    aiCapabilities: ["sales_forecasting", "pipeline_analysis", "customer_insights", "territory_optimization"],
    parentRole: "ceo",
    childRoles: ["sales-director"],
    description: "Revenue operations and sales strategy leadership"
  },
  {
    id: "sales-director",
    name: "Sales Director",
    level: "L3",
    department: "Enterprise Sales",
    division: "Sales", 
    userCount: 3,
    permissions: ["dept_sales_mgmt", "quota_setting", "performance_review", "customer_escalation"],
    aiCapabilities: ["team_performance", "deal_coaching", "customer_analysis", "competitive_intelligence"],
    parentRole: "vp-sales",
    childRoles: ["sales-manager"],
    description: "Department sales management and customer relationships"
  },
  {
    id: "sales-manager",
    name: "Sales Manager", 
    level: "L2",
    department: "Enterprise Sales",
    division: "Sales",
    userCount: 8,
    permissions: ["team_management", "deal_approval", "territory_mgmt", "customer_access"],
    aiCapabilities: ["deal_management", "customer_communication", "proposal_generation", "meeting_coordination"],
    parentRole: "sales-director", 
    childRoles: ["account-exec"],
    description: "Team leadership and deal management oversight"
  },
  {
    id: "account-exec",
    name: "Account Executive",
    level: "L1",
    department: "Enterprise Sales", 
    division: "Sales",
    userCount: 24,
    permissions: ["account_management", "opportunity_creation", "customer_communication", "proposal_submission"],
    aiCapabilities: ["crm_automation", "email_drafting", "meeting_prep", "followup_management"],
    parentRole: "sales-manager",
    description: "Direct customer relationship management and sales execution"
  }
]

export function RoleHierarchyManager() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [isAccessMatrixOpen, setIsAccessMatrixOpen] = useState(false)
  const [isCreateRoleOpen, setIsCreateRoleOpen] = useState(false)

  const getRoleIcon = (level: string) => {
    switch (level) {
      case "L7": return <Crown className="w-4 h-4 text-purple-600" />
      case "L6": return <Star className="w-4 h-4 text-yellow-600" />
      case "L5": return <Shield className="w-4 h-4 text-blue-600" />
      case "L4": return <Target className="w-4 h-4 text-green-600" />
      case "L3": return <Briefcase className="w-4 h-4 text-orange-600" />
      case "L2": return <Users className="w-4 h-4 text-purple-600" />
      case "L1": return <Globe className="w-4 h-4 text-gray-600" />
      default: return <Users className="w-4 h-4 text-gray-600" />
    }
  }

  const getPermissionColor = (permission: string) => {
    if (permission.includes("override") || permission.includes("system")) return "destructive"
    if (permission.includes("strategy") || permission.includes("executive")) return "default"
    if (permission.includes("management") || permission.includes("oversight")) return "secondary"
    return "outline"
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="hierarchy" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="hierarchy">Role Hierarchy</TabsTrigger>
          <TabsTrigger value="permissions">Permission Matrix</TabsTrigger>
          <TabsTrigger value="ai-integration">AI Integration</TabsTrigger>
          <TabsTrigger value="governance">Governance</TabsTrigger>
        </TabsList>

        <TabsContent value="hierarchy" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Corporate Role Hierarchy</h3>
              <p className="text-sm text-muted-foreground">Manage organizational structure and role relationships</p>
            </div>
            <Dialog open={isCreateRoleOpen} onOpenChange={setIsCreateRoleOpen}>
              <DialogTrigger asChild>
                <Button variant="enterprise" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Role
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Role</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="roleName">Role Name</Label>
                    <Input id="roleName" placeholder="e.g., Senior Sales Manager" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="level">Hierarchy Level</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="l1">L1 - Individual Contributor</SelectItem>
                        <SelectItem value="l2">L2 - Team Lead</SelectItem>
                        <SelectItem value="l3">L3 - Manager</SelectItem>
                        <SelectItem value="l4">L4 - Director</SelectItem>
                        <SelectItem value="l5">L5 - VP</SelectItem>
                        <SelectItem value="l6">L6 - C-Level</SelectItem>
                        <SelectItem value="l7">L7 - System Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="division">Division</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select division" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technology">Technology</SelectItem>
                        <SelectItem value="sales">Sales</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="people">People</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parentRole">Reports To</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select parent role" />
                      </SelectTrigger>
                      <SelectContent>
                        {hierarchyRoles.map(role => (
                          <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="description">Role Description</Label>
                    <Input id="description" placeholder="Brief description of role responsibilities" />
                  </div>
                  <div className="col-span-2 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreateRoleOpen(false)}>Cancel</Button>
                    <Button variant="enterprise">Create Role</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {hierarchyRoles.map((role) => (
              <Card key={role.id} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getRoleIcon(role.level)}
                      <div>
                        <div className="font-medium text-foreground">{role.name}</div>
                        <div className="text-sm text-muted-foreground">{role.description}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{role.level}</Badge>
                          <Badge variant="secondary" className="text-xs">{role.division}</Badge>
                          <span className="text-xs text-muted-foreground">{role.userCount} users</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Dialog open={isAccessMatrixOpen && selectedRole?.id === role.id} onOpenChange={(open) => {
                        setIsAccessMatrixOpen(open)
                        if (open) setSelectedRole(role)
                      }}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-2" />
                            View Access Matrix
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{role.name} - Access Control Matrix</DialogTitle>
                          </DialogHeader>
                          <AccessControlMatrix userId={role.id} userName={role.name} />
                        </DialogContent>
                      </Dialog>
                      
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Core Permissions</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {role.permissions.slice(0, 3).map((permission, index) => (
                          <Badge key={index} variant={getPermissionColor(permission) as any} className="text-xs">
                            {permission.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                        {role.permissions.length > 3 && (
                          <Badge variant="outline" className="text-xs">+{role.permissions.length - 3} more</Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground">AI Capabilities</label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {role.aiCapabilities.slice(0, 3).map((capability, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            <Brain className="w-3 h-3 mr-1" />
                            {capability.replace(/_/g, ' ')}
                          </Badge>
                        ))}
                        {role.aiCapabilities.length > 3 && (
                          <Badge variant="outline" className="text-xs">+{role.aiCapabilities.length - 3} more</Badge>
                        )}
                      </div>
                    </div>

                    {role.parentRole && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <GitBranch className="w-3 h-3" />
                        Reports to: {hierarchyRoles.find(r => r.id === role.parentRole)?.name}
                      </div>
                    )}

                    {role.childRoles && role.childRoles.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Network className="w-3 h-3" />
                        Manages: {role.childRoles.map(childId => 
                          hierarchyRoles.find(r => r.id === childId)?.name
                        ).join(', ')}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Permission Matrix Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Role</th>
                      <th className="text-center p-2">System Access</th>
                      <th className="text-center p-2">Data Management</th>
                      <th className="text-center p-2">User Management</th>
                      <th className="text-center p-2">AI Oversight</th>
                      <th className="text-center p-2">External Integrations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hierarchyRoles.map((role) => (
                      <tr key={role.id} className="border-b">
                        <td className="p-2 font-medium">{role.name}</td>
                        <td className="p-2 text-center">
                          {role.level === "L7" ? <CheckCircle className="w-4 h-4 text-green-600 mx-auto" /> : 
                           role.level === "L6" ? <AlertTriangle className="w-4 h-4 text-yellow-600 mx-auto" /> :
                           <div className="w-2 h-2 bg-gray-300 rounded-full mx-auto" />}
                        </td>
                        <td className="p-2 text-center">
                          {["L7", "L6", "L5"].includes(role.level) ? <CheckCircle className="w-4 h-4 text-green-600 mx-auto" /> :
                           ["L4", "L3"].includes(role.level) ? <AlertTriangle className="w-4 h-4 text-yellow-600 mx-auto" /> :
                           <div className="w-2 h-2 bg-gray-300 rounded-full mx-auto" />}
                        </td>
                        <td className="p-2 text-center">
                          {["L7", "L6"].includes(role.level) ? <CheckCircle className="w-4 h-4 text-green-600 mx-auto" /> :
                           ["L5", "L4", "L3"].includes(role.level) ? <AlertTriangle className="w-4 h-4 text-yellow-600 mx-auto" /> :
                           <div className="w-2 h-2 bg-gray-300 rounded-full mx-auto" />}
                        </td>
                        <td className="p-2 text-center">
                          {["L7", "L6", "L5", "L4"].includes(role.level) ? <CheckCircle className="w-4 h-4 text-green-600 mx-auto" /> :
                           ["L3", "L2"].includes(role.level) ? <AlertTriangle className="w-4 h-4 text-yellow-600 mx-auto" /> :
                           <div className="w-2 h-2 bg-gray-300 rounded-full mx-auto" />}
                        </td>
                        <td className="p-2 text-center">
                          {["L7", "L6", "L5"].includes(role.level) ? <CheckCircle className="w-4 h-4 text-green-600 mx-auto" /> :
                           <div className="w-2 h-2 bg-gray-300 rounded-full mx-auto" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-integration" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {hierarchyRoles.map((role) => (
              <Card key={role.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {getRoleIcon(role.level)}
                    {role.name} AI Integration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">AI Capabilities</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {role.aiCapabilities.map((capability, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          <Brain className="w-3 h-3 mr-1" />
                          {capability.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Autonomy Level:</span>
                      <span>{role.level === "L7" || role.level === "L6" ? "Executive" : 
                            ["L5", "L4"].includes(role.level) ? "Supervised" : "Guided"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data Access:</span>
                      <span>{["L7", "L6"].includes(role.level) ? "Organization-wide" :
                            ["L5", "L4"].includes(role.level) ? "Division-level" : "Team-level"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">AI Teammates:</span>
                      <span>{role.userCount} Active</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="governance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Compliance Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>SOC 2 Type II</span>
                    <Badge variant="default" className="text-xs">Compliant</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>GDPR</span>
                    <Badge variant="default" className="text-xs">Compliant</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>ISO 27001</span>
                    <Badge variant="secondary" className="text-xs">In Progress</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lock className="w-4 h-4" />
                  Security Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Failed Login Attempts</span>
                    <span className="text-green-600">0</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Privilege Escalations</span>
                    <span className="text-green-600">2</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Access Violations</span>
                    <span className="text-green-600">0</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings className="w-4 h-4" />
                  Governance Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  <FileText className="w-3 h-3 mr-2" />
                  Generate Access Report
                </Button>
                <Button variant="outline" size="sm" className="w-full text-xs">
                  <Shield className="w-3 h-3 mr-2" />
                  Review Permissions
                </Button>
                <Button variant="outline" size="sm" className="w-full text-xs">
                  <AlertTriangle className="w-3 h-3 mr-2" />
                  Audit Trail
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}