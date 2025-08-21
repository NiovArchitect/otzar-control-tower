import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Database, FolderOpen, FileText, Users, GitBranch, Network, Target, Brain, Crown, Shield, CheckCircle, XCircle, AlertCircle, Star, Briefcase } from "lucide-react"

interface AccessControlProps {
  userId?: string
  userName?: string
}

// Mock comprehensive access control data
const accessControlData = {
  rbac: {
    role: "Senior Sales Manager",
    hierarchy: "L2 - Manager Level",
    division: "Sales",
    department: "Enterprise Sales",
    inheritsFrom: ["Sales Manager", "Team Lead", "Individual Contributor"],
    grantsAccess: ["Sales Representatives", "SDRs"]
  },
  abac: {
    knowledgeAccess: {
      level: "Department + Cross-Division",
      attributes: [
        { name: "Sales Methodologies", access: "Full", source: "Department" },
        { name: "Customer Data", access: "Account-Based", source: "Role" },
        { name: "Pricing Models", access: "Read-Only", source: "Project" },
        { name: "Competitive Intel", access: "Full", source: "Clearance" }
      ]
    },
    projectAccess: {
      level: "Lead + Assigned",
      projects: [
        { name: "Enterprise Q4 Expansion", role: "Project Lead", access: "Full" },
        { name: "Customer Success Integration", role: "Stakeholder", access: "Read-Only" },
        { name: "Sales Process Automation", role: "Contributor", access: "Limited" }
      ]
    },
    documentAccess: {
      level: "Team + Strategic",
      categories: [
        { name: "Customer Contracts", access: "Read/Write", scope: "Assigned Accounts" },
        { name: "Sales Playbooks", access: "Full", scope: "Department" },
        { name: "Financial Reports", access: "Summary", scope: "Team Performance" },
        { name: "Legal Documents", access: "Approved Templates", scope: "Standard Contracts" }
      ]
    },
    contextualAccess: {
      temporal: "Business Hours Extended",
      geographical: "North America + Europe",
      device: "Corporate + Personal (Approved)",
      network: "VPN Required for External"
    }
  },
  aiTeammatePermissions: {
    autonomyLevel: "Supervised Execution",
    capabilities: [
      { skill: "CRM Data Entry", level: "Autonomous", restriction: "Account Updates Only" },
      { skill: "Email Drafting", level: "Supervised", restriction: "Requires Approval" },
      { skill: "Meeting Scheduling", level: "Autonomous", restriction: "Internal Meetings" },
      { skill: "Proposal Generation", level: "Draft-Only", restriction: "Human Review Required" },
      { skill: "Customer Analysis", level: "Autonomous", restriction: "Assigned Accounts" }
    ],
    dataAccess: "User-Scoped + Team Visibility",
    escalationRules: [
      "Financial commitments > $50K → Manager approval",
      "Legal terms modification → Legal team",
      "New customer onboarding → Customer Success handoff"
    ]
  },
  collaborationMatrix: {
    withinTeam: "Full Access",
    crossDepartment: "Request-Based",
    withAI: "Peer-Level Collaboration",
    external: "Approved Contacts Only"
  }
}

export function AccessControlMatrix({ userId, userName = "Sarah Martinez" }: AccessControlProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{userName} - Access Control Matrix</h3>
          <p className="text-sm text-muted-foreground">Comprehensive RBAC/ABAC permissions and AI teammate integration</p>
        </div>
        <Badge variant="default" className="text-xs">
          <Crown className="w-3 h-3 mr-1" />
          Manager Authority
        </Badge>
      </div>

      <Tabs defaultValue="rbac" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="rbac" className="text-xs">RBAC</TabsTrigger>
          <TabsTrigger value="abac" className="text-xs">ABAC</TabsTrigger>
          <TabsTrigger value="ai" className="text-xs">AI Teammate</TabsTrigger>
          <TabsTrigger value="collaboration" className="text-xs">Collaboration</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="rbac" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="w-4 h-4" />
                Role-Based Access Control (RBAC)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Primary Role</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Briefcase className="w-4 h-4 text-primary" />
                    <span className="text-sm">{accessControlData.rbac.role}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Hierarchy Level</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Target className="w-4 h-4 text-chart-1" />
                    <span className="text-sm">{accessControlData.rbac.hierarchy}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Inheritance Chain</label>
                <div className="flex flex-wrap gap-2">
                  {accessControlData.rbac.inheritsFrom.map((role, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      <GitBranch className="w-3 h-3 mr-1" />
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Grants Access To</label>
                <div className="flex flex-wrap gap-2">
                  {accessControlData.rbac.grantsAccess.map((role, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      <Users className="w-3 h-3 mr-1" />
                      {role}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="abac" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="w-4 h-4" />
                  Knowledge Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {accessControlData.abac.knowledgeAccess.attributes.map((attr, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{attr.name}</div>
                      <div className="text-xs text-muted-foreground">Source: {attr.source}</div>
                    </div>
                    <Badge 
                      variant={attr.access === "Full" ? "default" : attr.access === "Read-Only" ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {attr.access}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FolderOpen className="w-4 h-4" />
                  Project Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {accessControlData.abac.projectAccess.projects.map((project, index) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{project.name}</div>
                      <Badge 
                        variant={project.access === "Full" ? "default" : project.access === "Read-Only" ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {project.access}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">Role: {project.role}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-4 h-4" />
                Document & Data Access Matrix
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {accessControlData.abac.documentAccess.categories.map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="text-sm font-medium">{category.name}</div>
                      <div className="text-xs text-muted-foreground">{category.scope}</div>
                    </div>
                    <Badge 
                      variant={category.access.includes("Read/Write") ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {category.access}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="w-4 h-4" />
                AI Teammate Permissions & Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <div className="text-sm font-medium">Autonomy Level</div>
                  <div className="text-xs text-muted-foreground">Current operational mode</div>
                </div>
                <Badge variant="default" className="text-xs">
                  {accessControlData.aiTeammatePermissions.autonomyLevel}
                </Badge>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Capability Matrix</label>
                {accessControlData.aiTeammatePermissions.capabilities.map((capability, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="text-sm font-medium">{capability.skill}</div>
                      <div className="text-xs text-muted-foreground">{capability.restriction}</div>
                    </div>
                    <Badge 
                      variant={
                        capability.level === "Autonomous" ? "default" : 
                        capability.level === "Supervised" ? "secondary" : "outline"
                      }
                      className="text-xs"
                    >
                      {capability.level}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Escalation Rules</label>
                <div className="space-y-1">
                  {accessControlData.aiTeammatePermissions.escalationRules.map((rule, index) => (
                    <div key={index} className="text-xs text-muted-foreground flex items-center gap-2">
                      <AlertCircle className="w-3 h-3" />
                      {rule}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collaboration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Network className="w-4 h-4" />
                Collaboration & Cross-Functional Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(accessControlData.collaborationMatrix).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                    <Badge 
                      variant={value.includes("Full") ? "default" : value.includes("Request") ? "secondary" : "outline"}
                      className="text-xs"
                    >
                      {value}
                    </Badge>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Contextual Access Controls</label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(accessControlData.abac.contextualAccess).map(([key, value]) => (
                    <div key={key} className="text-xs">
                      <span className="font-medium capitalize">{key}: </span>
                      <span className="text-muted-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-4 h-4" />
                Access Audit Trail & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">SOC 2 Compliance</span>
                  </div>
                  <Badge variant="default" className="text-xs bg-green-600">Active</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">GDPR Data Protection</span>
                  </div>
                  <Badge variant="default" className="text-xs bg-blue-600">Compliant</Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium">Last Access Review</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">14 days ago</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Recent Activity</label>
                <div className="text-xs space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Permission escalation approved</span>
                    <span className="text-muted-foreground">2 hours ago</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>AI teammate capability updated</span>
                    <span className="text-muted-foreground">1 day ago</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Cross-department access granted</span>
                    <span className="text-muted-foreground">3 days ago</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm">
          <FileText className="w-4 h-4 mr-2" />
          Export Access Report
        </Button>
        <Button variant="enterprise" size="sm">
          <Shield className="w-4 h-4 mr-2" />
          Modify Permissions
        </Button>
      </div>
    </div>
  )
}