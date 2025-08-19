import { ArrowRight, Clock, CheckCircle, XCircle, AlertTriangle, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

const workflowData = [
  {
    type: "Ultra-High Risk",
    description: "System Changes",
    flow: [
      { role: "System Admin", action: "Immediate (with logging)", status: "approved" },
      { role: "All Others", action: "System Admin Required", status: "blocked" }
    ],
    riskLevel: "critical",
    examples: ["System configuration", "Emergency overrides", "Security protocols"]
  },
  {
    type: "High Risk",
    description: "CRM Updates, Python Scripts, External Communications",
    flow: [
      { role: "Individual", action: "Initiate Request", status: "pending" },
      { role: "Team Lead", action: "Review & Approve", status: "pending" },
      { role: "Manager", action: "Validate Scope", status: "pending" },
      { role: "Director", action: "Resource Approval", status: "pending" },
      { role: "VP", action: "Division Approval", status: "current" },
      { role: "C-Level", action: "Strategic Review", status: "waiting" },
      { role: "CEO", action: "Final Override", status: "waiting" }
    ],
    riskLevel: "high",
    examples: ["Major CRM changes", "External integrations", "Python automations"]
  },
  {
    type: "Medium Risk",
    description: "Email Access, External Calendaring",
    flow: [
      { role: "Individual", action: "Submit Request", status: "approved" },
      { role: "Team Lead", action: "Initial Review", status: "approved" },
      { role: "Manager", action: "Scope Validation", status: "approved" },
      { role: "Director", action: "Department Approval", status: "current" }
    ],
    riskLevel: "medium",
    examples: ["Email permissions", "Calendar integrations", "Cross-team access"]
  },
  {
    type: "Low Risk",
    description: "Web Search, Basic Reports",
    flow: [
      { role: "All Levels", action: "Direct Access", status: "approved" }
    ],
    riskLevel: "low",
    examples: ["Web searches", "Personal reports", "Basic analytics"]
  }
]

const getStatusIcon = (status: string) => {
  switch (status) {
    case "approved": return <CheckCircle className="h-4 w-4 text-green-500" />
    case "current": return <Clock className="h-4 w-4 text-blue-500" />
    case "pending": return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    case "blocked": return <XCircle className="h-4 w-4 text-red-500" />
    case "waiting": return <Clock className="h-4 w-4 text-muted-foreground" />
    default: return <AlertTriangle className="h-4 w-4 text-muted-foreground" />
  }
}

const getRiskBadge = (level: string) => {
  switch (level) {
    case "critical": return <Badge variant="destructive" className="text-xs">Critical</Badge>
    case "high": return <Badge variant="destructive" className="text-xs bg-orange-500">High</Badge>
    case "medium": return <Badge variant="secondary" className="text-xs bg-yellow-500">Medium</Badge>
    case "low": return <Badge variant="outline" className="text-xs">Low</Badge>
    default: return <Badge variant="outline" className="text-xs">Unknown</Badge>
  }
}

const calculateProgress = (flow: any[]) => {
  const approvedSteps = flow.filter(step => step.status === "approved").length
  return (approvedSteps / flow.length) * 100
}

export function ApprovalWorkflow() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Approval Workflow Hierarchy</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {workflowData.map((workflow, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-semibold text-foreground">{workflow.type}</h3>
                      {getRiskBadge(workflow.riskLevel)}
                    </div>
                    <p className="text-sm text-muted-foreground">{workflow.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground mb-1">Progress</div>
                    <Progress value={calculateProgress(workflow.flow)} className="w-20" />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 mb-4 overflow-x-auto">
                  {workflow.flow.map((step, stepIndex) => (
                    <div key={stepIndex} className="flex items-center space-x-2 flex-shrink-0">
                      <div className="flex flex-col items-center space-y-1 min-w-0">
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(step.status)}
                          <span className="text-xs font-medium text-foreground truncate">{step.role}</span>
                        </div>
                        <div className="text-xs text-muted-foreground text-center max-w-20 truncate">
                          {step.action}
                        </div>
                      </div>
                      {stepIndex < workflow.flow.length - 1 && (
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="border-t pt-3">
                  <div className="text-xs text-muted-foreground mb-2">Examples:</div>
                  <div className="flex flex-wrap gap-1">
                    {workflow.examples.map((example, exampleIndex) => (
                      <Badge key={exampleIndex} variant="outline" className="text-xs">
                        {example}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Escalation Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              <div>• VP can approve within division</div>
              <div>• C-Level can approve within domain</div>
              <div>• CEO can override all approvals</div>
              <div>• System Admin has technical override</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Cross-Division Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              <div>• Same Division: Full access</div>
              <div>• Cross-Division: VP approval required</div>
              <div>• Cross-Company: C-Level approval</div>
              <div>• System-wide: CEO/System Admin only</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Emergency Protocols</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs">
              <div>• System Admin: Immediate override</div>
              <div>• CEO: Business emergency override</div>
              <div>• Auto-escalation on timeout</div>
              <div>• Dual-control for critical changes</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}