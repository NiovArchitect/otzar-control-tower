import { useState } from "react"
import { Bot, Brain, Lightbulb, TrendingUp, Shield, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AIContextData {
  summary: string
  riskLevel: "low" | "medium" | "high" | "critical"
  suggestedActions: string[]
  relatedContext: string[]
  impactAssessment: string
  recommendedDecision: string
  timeline: string
}

interface AIContextDialogProps {
  notificationId: string
  notificationType: string
  notificationTitle: string
  notificationMessage: string
}

const getAIContext = (notificationId: string, type: string, title: string, message: string): AIContextData => {
  // Mock AI analysis based on notification content
  switch (notificationId) {
    case "1": // Security Alert
      return {
        summary: "Unusual access pattern detected: Finance AI teammate accessed 347% more customer data than normal baseline, including cross-division records typically restricted to Sales/Marketing teams.",
        riskLevel: "critical",
        suggestedActions: [
          "Immediately revoke Finance AI's cross-division data access",
          "Audit all data accessed in the last 4 hours",
          "Run security scan on Finance division user accounts",
          "Enable additional monitoring for Finance AI activities"
        ],
        relatedContext: [
          "Similar pattern occurred 3 months ago with HR division (resolved)",
          "Finance team recently onboarded 2 new AI teammates",
          "Q4 financial close period may require expanded data access",
          "No external data exfiltration detected"
        ],
        impactAssessment: "High risk of data exposure. Potential compliance violation if customer PII was accessed inappropriately. No immediate business disruption.",
        recommendedDecision: "IMMEDIATE ACTION REQUIRED: Implement temporary access restriction while investigating root cause.",
        timeline: "Address within 30 minutes to prevent escalation"
      }
    
    case "2": // Approval Required
      return {
        summary: "VP Marketing AI requesting access to Sales pipeline data and Customer Success metrics to optimize Q1 campaign targeting and customer journey analysis.",
        riskLevel: "medium",
        suggestedActions: [
          "Review specific data fields being requested",
          "Set time-limited access (30-day approval)",
          "Require data anonymization for campaign use",
          "Enable audit logging for cross-division access"
        ],
        relatedContext: [
          "Q1 campaign planning is currently underway",
          "Marketing has legitimate need for customer journey data",
          "Sales team expressed concerns about data sharing last quarter",
          "Previous cross-division access was successful with proper controls"
        ],
        impactAssessment: "Medium business impact. Could improve campaign ROI by 15-20% with proper data access. Risk of inter-team friction if not handled diplomatically.",
        recommendedDecision: "APPROVE with restrictions: Grant 30-day access with anonymization requirements and sales team notification.",
        timeline: "Decision needed within 2 hours to maintain campaign timeline"
      }
    
    default:
      return {
        summary: "AI analysis indicates this is a routine administrative update with standard business impact.",
        riskLevel: "low",
        suggestedActions: [
          "Review changes for accuracy",
          "Notify affected teams",
          "Update documentation"
        ],
        relatedContext: [
          "Part of regular system maintenance",
          "No security implications detected"
        ],
        impactAssessment: "Low impact. Standard operational update.",
        recommendedDecision: "ACKNOWLEDGE: No immediate action required.",
        timeline: "Can be addressed during normal business hours"
      }
  }
}

const getRiskIcon = (level: string) => {
  switch (level) {
    case "critical": return <AlertTriangle className="h-4 w-4 text-red-500" />
    case "high": return <Shield className="h-4 w-4 text-orange-500" />
    case "medium": return <TrendingUp className="h-4 w-4 text-yellow-500" />
    default: return <Lightbulb className="h-4 w-4 text-blue-500" />
  }
}

const getRiskColor = (level: string) => {
  switch (level) {
    case "critical": return "text-red-600 bg-red-50 border-red-200"
    case "high": return "text-orange-600 bg-orange-50 border-orange-200"
    case "medium": return "text-yellow-600 bg-yellow-50 border-yellow-200"
    default: return "text-blue-600 bg-blue-50 border-blue-200"
  }
}

export function AIContextDialog({ notificationId, notificationType, notificationTitle, notificationMessage }: AIContextDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const aiContext = getAIContext(notificationId, notificationType, notificationTitle, notificationMessage)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0 hover:bg-primary/10"
          onClick={(e) => e.stopPropagation()}
        >
          <Brain className="h-3 w-3 text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-primary" />
            <span>AI Context Analysis</span>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Brain className="h-4 w-4" />
                  <span>AI Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {aiContext.summary}
                </p>
              </CardContent>
            </Card>

            {/* Risk Assessment */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getRiskIcon(aiContext.riskLevel)}
                    <span>Risk Assessment</span>
                  </div>
                  <Badge className={`text-xs ${getRiskColor(aiContext.riskLevel)}`}>
                    {aiContext.riskLevel.toUpperCase()}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {aiContext.impactAssessment}
                </p>
                <div className="bg-muted/50 p-3 rounded-md">
                  <p className="text-sm font-medium text-foreground">
                    {aiContext.recommendedDecision}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Timeline: {aiContext.timeline}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Suggested Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <Lightbulb className="h-4 w-4" />
                  <span>AI-Suggested Actions</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {aiContext.suggestedActions.map((action, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-primary">{index + 1}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{action}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Related Context */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>Related Context</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {aiContext.relatedContext.map((context, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 flex-shrink-0 mt-2" />
                      <p className="text-sm text-muted-foreground">{context}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}