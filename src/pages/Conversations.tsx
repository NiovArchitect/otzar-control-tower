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
import { 
  MessageSquare, 
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
  Mic,
  Video,
  Share2,
  FileText,
  Activity,
  BarChart3,
  Shield,
  Zap,
  Brain,
  Target,
  TrendingUp,
  MessageCircle,
  Calendar,
  User,
  ArrowRight,
  ExternalLink
} from "lucide-react"

// Mock data for AI conversations
const conversationData = [
  {
    id: "conv_001",
    participants: ["Anna Chen", "Alan's AI Assistant"],
    type: "Human-AI",
    context: "Technical Documentation Request",
    status: "active",
    duration: "5m 23s",
    messages: 8,
    aiResponses: 4,
    escalated: false,
    timestamp: "2024-01-15 14:23:45",
    department: "Engineering",
    priority: "medium",
    confidenceScore: 0.92
  },
  {
    id: "conv_002", 
    participants: ["Sarah Martinez", "John Doe", "Marketing AI"],
    type: "Human-Human-AI",
    context: "Campaign Planning Meeting",
    status: "completed",
    duration: "12m 45s",
    messages: 24,
    aiResponses: 8,
    escalated: false,
    timestamp: "2024-01-15 13:15:20",
    department: "Marketing",
    priority: "high",
    confidenceScore: 0.88
  },
  {
    id: "conv_003",
    participants: ["Lisa Park", "System AI"],
    type: "Human-AI",
    context: "Security Incident Response",
    status: "escalated",
    duration: "8m 12s",
    messages: 15,
    aiResponses: 7,
    escalated: true,
    timestamp: "2024-01-15 14:01:33",
    department: "Security",
    priority: "critical",
    confidenceScore: 0.76
  }
]

// Mock data for meeting delegations
const meetingData = [
  {
    id: "meet_001",
    title: "Q4 Planning Review",
    organizer: "David Kumar (CEO)",
    aiAttendee: "CEO Strategic AI",
    participants: ["Sarah Martinez", "Mark Wilson", "Angela Chen"],
    status: "ai-attending",
    duration: "45 minutes",
    recording: true,
    transcription: true,
    summary: "Generated",
    actionItems: 5,
    timestamp: "2024-01-15 15:00:00",
    department: "Executive",
    meetingType: "Strategic Planning"
  },
  {
    id: "meet_002",
    title: "Daily Engineering Standup",
    organizer: "Sarah Martinez (VP Engineering)",
    aiAttendee: "Engineering VP AI",
    participants: ["John Smith", "Alice Johnson", "Bob Wilson"],
    status: "scheduled",
    duration: "15 minutes",
    recording: false,
    transcription: true,
    summary: "Pending",
    actionItems: 0,
    timestamp: "2024-01-16 09:00:00",
    department: "Engineering",
    meetingType: "Status Update"
  }
]

// Mock data for screen context sessions
const screenContextData = [
  {
    id: "screen_001",
    user: "John Doe",
    application: "Salesforce",
    aiContext: "CRM Data Entry Assistance",
    duration: "23m 15s",
    interventions: 12,
    errorsPreivented: 3,
    status: "active",
    timestamp: "2024-01-15 14:30:00",
    department: "Sales",
    ambientBorder: "blue",
    dataAccessed: ["Customer Records", "Opportunity Data"]
  },
  {
    id: "screen_002",
    user: "Angela Chen",
    application: "Excel + PowerBI",
    aiContext: "Financial Analysis Support",
    duration: "45m 08s",
    interventions: 8,
    errorsPreivented: 2,
    status: "completed",
    timestamp: "2024-01-15 13:45:00",
    department: "Finance",
    ambientBorder: "green",
    dataAccessed: ["Financial Reports", "Budget Data"]
  }
]

const conversationColumns = [
  {
    key: "participants",
    header: "Conversation",
    cell: (row: any) => (
      <div className="flex items-center space-x-3">
        <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
          <MessageCircle className="h-4 w-4 text-white" />
        </div>
        <div>
          <div className="font-medium text-foreground">{row.participants.join(", ")}</div>
          <div className="text-sm text-muted-foreground">{row.context}</div>
          <Badge variant="outline" className="text-xs mt-1">
            {row.type}
          </Badge>
        </div>
      </div>
    ),
  },
  {
    key: "metrics",
    header: "Metrics",
    cell: (row: any) => (
      <div className="space-y-1">
        <div className="text-sm font-medium">{row.duration}</div>
        <div className="text-xs text-muted-foreground">{row.messages} messages • {row.aiResponses} AI</div>
        <div className="text-xs text-muted-foreground">Confidence: {(row.confidenceScore * 100).toFixed(0)}%</div>
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
        {row.escalated && (
          <Badge variant="destructive" className="text-xs">
            Escalated
          </Badge>
        )}
      </div>
    ),
  },
  {
    key: "department",
    header: "Department",
  },
  {
    key: "timestamp",
    header: "Started",
    cell: (row: any) => (
      <div className="text-sm text-muted-foreground">
        {new Date(row.timestamp).toLocaleString()}
      </div>
    ),
  }
]

export default function Conversations() {
  const [isCreatePolicyOpen, setIsCreatePolicyOpen] = useState(false)
  const [isMonitoringOpen, setIsMonitoringOpen] = useState(false)
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false)

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader 
          title="Conversations & Interactions"
          description="Monitor and manage AI-human interactions, chat policies, and conversation quality"
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
                <DialogTitle>Conversation Analytics</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Daily Conversations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">1,247</div>
                    <div className="text-xs text-muted-foreground">+12% from yesterday</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">AI Response Accuracy</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">94.2%</div>
                    <div className="text-xs text-muted-foreground">Average confidence score</div>
                  </CardContent>
                </Card>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isCreatePolicyOpen} onOpenChange={setIsCreatePolicyOpen}>
            <DialogTrigger asChild>
              <Button variant="enterprise">
                <Settings className="h-4 w-4 mr-2" />
                Conversation Policies
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Conversation Policy</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="policyName">Policy Name</Label>
                  <Input id="policyName" placeholder="Enter policy name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scope">Scope</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Company-wide</SelectItem>
                      <SelectItem value="division">Division-specific</SelectItem>
                      <SelectItem value="department">Department-specific</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreatePolicyOpen(false)}>Cancel</Button>
                  <Button variant="enterprise">Create Policy</Button>
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
                  <p className="text-sm font-medium text-muted-foreground">Active Conversations</p>
                  <p className="text-2xl font-bold">156</p>
                </div>
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">+23 from yesterday</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">AI Response Rate</p>
                  <p className="text-2xl font-bold">94.2%</p>
                </div>
                <Bot className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">+2.3% this week</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Escalations</p>
                  <p className="text-2xl font-bold">8</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">-5 from yesterday</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Resolution</p>
                  <p className="text-2xl font-bold">4.5m</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">-30s improvement</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="conversations" className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="conversations">Conversations</TabsTrigger>
            <TabsTrigger value="meetings">Meeting Delegations</TabsTrigger>
            <TabsTrigger value="screen-context">Screen Context</TabsTrigger>
            <TabsTrigger value="policies">Policies & Controls</TabsTrigger>
          </TabsList>

          <TabsContent value="conversations">
            <DataTable 
              title="AI-Human Conversations" 
              data={conversationData} 
              columns={conversationColumns}
              actions={[
                <Dialog key="monitoring" open={isMonitoringOpen} onOpenChange={setIsMonitoringOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Live Monitor
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Live Conversation Monitoring</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold text-green-500">12</div>
                            <div className="text-xs text-muted-foreground">Active Now</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold text-yellow-500">3</div>
                            <div className="text-xs text-muted-foreground">Pending Review</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold text-red-500">1</div>
                            <div className="text-xs text-muted-foreground">Escalated</div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ]}
            />
          </TabsContent>

          <TabsContent value="meetings">
            <Card>
              <CardHeader>
                <CardTitle>Meeting Delegations & AI Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {meetingData.map((meeting) => (
                    <div key={meeting.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{meeting.title}</h3>
                          <p className="text-sm text-muted-foreground">Organized by {meeting.organizer}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <StatusBadge status={meeting.status as any}>
                            {meeting.status}
                          </StatusBadge>
                          <Badge variant="outline" className="text-xs">
                            {meeting.meetingType}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">AI Attendee:</span>
                          <div className="font-medium">{meeting.aiAttendee}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Duration:</span>
                          <div className="font-medium">{meeting.duration}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Recording:</span>
                          <div className="font-medium">{meeting.recording ? "Enabled" : "Disabled"}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Action Items:</span>
                          <div className="font-medium">{meeting.actionItems}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className="text-xs text-muted-foreground">
                          {new Date(meeting.timestamp).toLocaleString()}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <FileText className="h-4 w-4 mr-1" />
                            Summary
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Play className="h-4 w-4 mr-1" />
                            Recording
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="screen-context">
            <Card>
              <CardHeader>
                <CardTitle>Screen Context & Ambient AI Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {screenContextData.map((session) => (
                    <div key={session.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`h-3 w-3 rounded-full bg-${session.ambientBorder}-500`}></div>
                          <div>
                            <h3 className="font-semibold">{session.user} • {session.application}</h3>
                            <p className="text-sm text-muted-foreground">{session.aiContext}</p>
                          </div>
                        </div>
                        <StatusBadge status={session.status as any}>
                          {session.status}
                        </StatusBadge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Duration:</span>
                          <div className="font-medium">{session.duration}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">AI Interventions:</span>
                          <div className="font-medium">{session.interventions}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Errors Prevented:</span>
                          <div className="font-medium text-green-600">{session.errorsPreivented}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Border Color:</span>
                          <div className="flex items-center space-x-1">
                            <div className={`h-2 w-2 rounded-full bg-${session.ambientBorder}-500`}></div>
                            <span className="font-medium capitalize">{session.ambientBorder}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <span className="text-muted-foreground text-sm">Data Accessed:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {session.dataAccessed.map((data, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {data}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="policies">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Conversation Policies</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Social Context Detection</div>
                      <div className="text-sm text-muted-foreground">AI stays dormant during social conversations</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Confidence Threshold</div>
                      <div className="text-sm text-muted-foreground">Minimum confidence for AI responses</div>
                    </div>
                    <Select defaultValue="85">
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="70">70%</SelectItem>
                        <SelectItem value="80">80%</SelectItem>
                        <SelectItem value="85">85%</SelectItem>
                        <SelectItem value="90">90%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Escalation Timeout</div>
                      <div className="text-sm text-muted-foreground">Auto-escalate after inactivity</div>
                    </div>
                    <Select defaultValue="15">
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 min</SelectItem>
                        <SelectItem value="10">10 min</SelectItem>
                        <SelectItem value="15">15 min</SelectItem>
                        <SelectItem value="30">30 min</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Screen Context Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Ambient Border Indicator</div>
                      <div className="text-sm text-muted-foreground">Visual AI activity indicator</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Proactive Suggestions</div>
                      <div className="text-sm text-muted-foreground">AI offers unsolicited help</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Cross-App Context</div>
                      <div className="text-sm text-muted-foreground">AI connects information between apps</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Screen Recording for Training</div>
                      <div className="text-sm text-muted-foreground">Capture workflows for AI learning</div>
                    </div>
                    <Switch />
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