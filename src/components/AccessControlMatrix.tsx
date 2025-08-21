import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
  Database, 
  FolderOpen, 
  FileText, 
  Users, 
  GitBranch, 
  Network, 
  Target, 
  Brain, 
  Crown, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Star, 
  Briefcase,
  Clock,
  Globe,
  Lock,
  Eye,
  Edit,
  TrendingUp
} from "lucide-react"

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
    grantsAccess: ["Sales Representatives", "SDRs"],
    accessLevel: 85
  },
  abac: {
    knowledgeAccess: {
      level: "Department + Cross-Division",
      score: 92,
      attributes: [
        { name: "Sales Methodologies", access: "Full", source: "Department", level: 100 },
        { name: "Customer Data", access: "Account-Based", source: "Role", level: 85 },
        { name: "Pricing Models", access: "Read-Only", source: "Project", level: 65 },
        { name: "Competitive Intel", access: "Full", source: "Clearance", level: 95 }
      ]
    },
    projectAccess: {
      level: "Lead + Assigned",
      score: 78,
      projects: [
        { name: "Enterprise Q4 Expansion", role: "Project Lead", access: "Full", status: "active" },
        { name: "Customer Success Integration", role: "Stakeholder", access: "Read-Only", status: "review" },
        { name: "Sales Process Automation", role: "Contributor", access: "Limited", status: "planning" }
      ]
    },
    documentAccess: {
      level: "Team + Strategic",
      score: 88,
      categories: [
        { name: "Customer Contracts", access: "Read/Write", scope: "Assigned Accounts", risk: "medium" },
        { name: "Sales Playbooks", access: "Full", scope: "Department", risk: "low" },
        { name: "Financial Reports", access: "Summary", scope: "Team Performance", risk: "medium" },
        { name: "Legal Documents", access: "Approved Templates", scope: "Standard Contracts", risk: "high" }
      ]
    },
    contextualAccess: {
      temporal: { value: "Business Hours Extended", score: 90 },
      geographical: { value: "North America + Europe", score: 85 },
      device: { value: "Corporate + Personal (Approved)", score: 75 },
      network: { value: "VPN Required for External", score: 95 }
    }
  },
  aiTeammatePermissions: {
    autonomyLevel: "Supervised Execution",
    overallScore: 82,
    capabilities: [
      { skill: "CRM Data Entry", level: "Autonomous", restriction: "Account Updates Only", score: 95 },
      { skill: "Email Drafting", level: "Supervised", restriction: "Requires Approval", score: 70 },
      { skill: "Meeting Scheduling", level: "Autonomous", restriction: "Internal Meetings", score: 90 },
      { skill: "Proposal Generation", level: "Draft-Only", restriction: "Human Review Required", score: 60 },
      { skill: "Customer Analysis", level: "Autonomous", restriction: "Assigned Accounts", score: 85 }
    ],
    dataAccess: "User-Scoped + Team Visibility",
    escalationRules: [
      "Financial commitments > $50K → Manager approval",
      "Legal terms modification → Legal team",
      "New customer onboarding → Customer Success handoff"
    ]
  },
  collaborationMatrix: {
    withinTeam: { access: "Full Access", score: 100 },
    crossDepartment: { access: "Request-Based", score: 65 },
    withAI: { access: "Peer-Level Collaboration", score: 85 },
    external: { access: "Approved Contacts Only", score: 70 }
  }
}

const getScoreColor = (score: number) => {
  if (score >= 90) return "text-green-600"
  if (score >= 70) return "text-blue-600"
  if (score >= 50) return "text-amber-600"
  return "text-red-600"
}

const getScoreBg = (score: number) => {
  if (score >= 90) return "bg-green-50 dark:bg-green-950/20"
  if (score >= 70) return "bg-blue-50 dark:bg-blue-950/20"
  if (score >= 50) return "bg-amber-50 dark:bg-amber-950/20"
  return "bg-red-50 dark:bg-red-950/20"
}

export function AccessControlMatrix({ userId, userName = "Sarah Martinez" }: AccessControlProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            {userName} - Access Control Matrix
          </h3>
          <p className="text-sm text-muted-foreground">Comprehensive RBAC/ABAC permissions with AI teammate integration</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default" className="text-xs">
            <Crown className="w-3 h-3 mr-1" />
            Manager Authority
          </Badge>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${getScoreBg(accessControlData.rbac.accessLevel)} ${getScoreColor(accessControlData.rbac.accessLevel)}`}>
            Access Score: {accessControlData.rbac.accessLevel}%
          </div>
        </div>
      </div>

      <Tabs defaultValue="rbac" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5 bg-muted">
          <TabsTrigger value="rbac" className="text-xs data-[state=active]:bg-background">RBAC</TabsTrigger>
          <TabsTrigger value="abac" className="text-xs data-[state=active]:bg-background">ABAC</TabsTrigger>
          <TabsTrigger value="ai" className="text-xs data-[state=active]:bg-background">AI Teammate</TabsTrigger>
          <TabsTrigger value="collaboration" className="text-xs data-[state=active]:bg-background">Collaboration</TabsTrigger>
          <TabsTrigger value="audit" className="text-xs data-[state=active]:bg-background">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="rbac" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Briefcase className="w-4 h-4 text-primary" />
                  Role Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Primary Role</label>
                    <div className="text-sm font-semibold">{accessControlData.rbac.role}</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hierarchy Level</label>
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-chart-1" />
                      <span className="text-sm font-semibold">{accessControlData.rbac.hierarchy}</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Division</label>
                    <div className="text-sm font-semibold">{accessControlData.rbac.division}</div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Department</label>
                    <div className="text-sm font-semibold">{accessControlData.rbac.department}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-chart-1">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <GitBranch className="w-4 h-4 text-chart-1" />
                  Access Hierarchy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Inherits From</label>
                    <div className="flex flex-wrap gap-2">
                      {accessControlData.rbac.inheritsFrom.map((role, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">Grants Access To</label>
                    <div className="flex flex-wrap gap-2">
                      {accessControlData.rbac.grantsAccess.map((role, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          <Users className="w-3 h-3 mr-1" />
                          {role}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="abac" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-chart-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-chart-2" />
                    Knowledge Access
                  </div>
                  <div className={`text-sm font-bold ${getScoreColor(accessControlData.abac.knowledgeAccess.score)}`}>
                    {accessControlData.abac.knowledgeAccess.score}%
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {accessControlData.abac.knowledgeAccess.attributes.map((attr, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{attr.name}</div>
                      <Badge 
                        variant={attr.access === "Full" ? "default" : attr.access === "Read-Only" ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {attr.access}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Source: {attr.source}</span>
                      <span className={`font-medium ${getScoreColor(attr.level)}`}>{attr.level}%</span>
                    </div>
                    <Progress value={attr.level} className="h-1" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-chart-3">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-chart-3" />
                    Project Access
                  </div>
                  <div className={`text-sm font-bold ${getScoreColor(accessControlData.abac.projectAccess.score)}`}>
                    {accessControlData.abac.projectAccess.score}%
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {accessControlData.abac.projectAccess.projects.map((project, index) => (
                  <div key={index} className={`p-3 rounded-lg border ${project.status === 'active' ? 'bg-green-50 dark:bg-green-950/20' : 'bg-muted/50'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-medium">{project.name}</div>
                      <Badge 
                        variant={project.access === "Full" ? "default" : project.access === "Read-Only" ? "secondary" : "outline"}
                        className="text-xs"
                      >
                        {project.access}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Role: {project.role}</span>
                      <span className={`px-2 py-1 rounded ${project.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-muted text-muted-foreground'}`}>
                        {project.status}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-chart-4">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-chart-4" />
                    Document Access
                  </div>
                  <div className={`text-sm font-bold ${getScoreColor(accessControlData.abac.documentAccess.score)}`}>
                    {accessControlData.abac.documentAccess.score}%
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {accessControlData.abac.documentAccess.categories.map((category, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-medium">{category.name}</div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          category.risk === 'high' ? 'bg-red-500' : 
                          category.risk === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                        }`} />
                        <Badge 
                          variant={category.access.includes("Read/Write") ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {category.access}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{category.scope}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="w-4 h-4" />
                Contextual Access Controls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(accessControlData.abac.contextualAccess).map(([key, data]) => (
                  <div key={key} className="text-center">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                      {key}
                    </div>
                    <div className="text-sm mb-2">{data.value}</div>
                    <div className={`text-lg font-bold ${getScoreColor(data.score)}`}>
                      {data.score}%
                    </div>
                    <Progress value={data.score} className="h-2 mt-1" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  AI Teammate Permissions & Capabilities
                </div>
                <div className={`text-sm font-bold ${getScoreColor(accessControlData.aiTeammatePermissions.overallScore)}`}>
                  Overall: {accessControlData.aiTeammatePermissions.overallScore}%
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-chart-1/10 rounded-lg border">
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
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium">{capability.skill}</div>
                      <div className="flex items-center gap-2">
                        <div className={`text-xs font-medium ${getScoreColor(capability.score)}`}>
                          {capability.score}%
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
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">{capability.restriction}</div>
                    <Progress value={capability.score} className="h-2" />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Escalation Rules</label>
                <div className="space-y-2">
                  {accessControlData.aiTeammatePermissions.escalationRules.map((rule, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs">
                      <AlertCircle className="w-3 h-3 text-amber-500" />
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
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Network className="w-4 h-4" />
                Collaboration & Cross-Functional Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(accessControlData.collaborationMatrix).map(([key, data]) => (
                  <div key={key} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                      <div className={`text-sm font-bold ${getScoreColor(data.score)}`}>
                        {data.score}%
                      </div>
                    </div>
                    <Badge 
                      variant={data.access.includes("Full") ? "default" : data.access.includes("Request") ? "secondary" : "outline"}
                      className="text-xs mb-2"
                    >
                      {data.access}
                    </Badge>
                    <Progress value={data.score} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="w-4 h-4" />
                Access Audit Trail & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">SOC 2 Compliance</span>
                  </div>
                  <Badge className="text-xs bg-green-600 hover:bg-green-700">Active</Badge>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">GDPR Protection</span>
                  </div>
                  <Badge className="text-xs bg-blue-600 hover:bg-blue-700">Compliant</Badge>
                </div>

                <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-medium">Last Review</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">14 days ago</Badge>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Recent Activity</label>
                <div className="space-y-2">
                  {[
                    { action: "Permission escalation approved", time: "2 hours ago", type: "success" },
                    { action: "AI teammate capability updated", time: "1 day ago", type: "info" },
                    { action: "Cross-department access granted", time: "3 days ago", type: "warning" },
                    { action: "Failed login attempt detected", time: "5 days ago", type: "error" }
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        {activity.type === 'success' && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {activity.type === 'info' && <Eye className="w-4 h-4 text-blue-500" />}
                        {activity.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-500" />}
                        {activity.type === 'error' && <XCircle className="w-4 h-4 text-red-500" />}
                        <span className="text-sm">{activity.action}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{activity.time}</span>
                    </div>
                  ))}
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
        <Button variant="default" size="sm">
          <Edit className="w-4 h-4 mr-2" />
          Modify Permissions
        </Button>
      </div>
    </div>
  )
}