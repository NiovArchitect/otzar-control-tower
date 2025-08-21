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
  ExternalLink,
  Mail,
  Phone,
  VideoIcon,
  Hash,
  Tag,
  Headphones,
  Camera,
  Archive,
  Lock,
  TrendingDown,
  PieChart,
  Globe,
  Building2
} from "lucide-react"

// Mock data for emails
const emailData = [
  {
    id: "email_001",
    from: "john.doe@company.com",
    to: ["sales@company.com", "AI Assistant"],
    subject: "Q4 Sales Pipeline Review",
    aiInvolvement: "Response draft generated",
    category: "Business",
    sentiment: "neutral",
    status: "ai-assisted",
    timestamp: "2024-01-15 14:30:00",
    department: "Sales",
    hasAttachments: true,
    priority: "high",
    threadLength: 5
  },
  {
    id: "email_002", 
    from: "AI Assistant",
    to: ["customer@external.com"],
    subject: "Re: Support Ticket #12845",
    aiInvolvement: "Fully automated response",
    category: "Support",
    sentiment: "positive",
    status: "ai-generated",
    timestamp: "2024-01-15 13:45:00",
    department: "Support",
    hasAttachments: false,
    priority: "medium",
    threadLength: 3
  },
  {
    id: "email_003",
    from: "sarah.martinez@company.com",
    to: ["team@company.com"],
    subject: "Weekly Team Sync - AI Summary",
    aiInvolvement: "Meeting summary generated",
    category: "Internal",
    sentiment: "positive",
    status: "ai-summarized",
    timestamp: "2024-01-15 12:00:00",
    department: "Engineering",
    hasAttachments: true,
    priority: "low",
    threadLength: 1
  }
]

// Mock data for audio calls
const audioCallData = [
  {
    id: "call_001",
    participants: ["John Doe", "Sarah Martinez"],
    type: "Internal",
    duration: "15m 30s",
    aiInvolvement: "Real-time transcription + sentiment analysis",
    transcript: "Available",
    sentiment: "positive",
    actionItems: 3,
    keyTopics: ["Budget approval", "Timeline review"],
    status: "completed",
    timestamp: "2024-01-15 14:00:00",
    department: "Sales",
    callQuality: "excellent",
    aiConfidence: 0.94
  },
  {
    id: "call_002",
    participants: ["Customer Service", "External Client"],
    type: "External",
    duration: "8m 45s",
    aiInvolvement: "Live assistance + escalation prevention",
    transcript: "Available",
    sentiment: "frustrated->satisfied",
    actionItems: 2,
    keyTopics: ["Billing inquiry", "Account setup"],
    status: "completed",
    timestamp: "2024-01-15 13:30:00",
    department: "Support",
    callQuality: "good",
    aiConfidence: 0.87
  }
]

// Mock data for video conferences
const videoCallData = [
  {
    id: "video_001",
    title: "All-Hands Meeting",
    organizer: "CEO",
    participants: 45,
    duration: "60m 00s",
    aiInvolvement: "Meeting summary + action item extraction",
    recording: true,
    aiSummary: "Generated",
    actionItems: 12,
    keyDecisions: ["Q2 hiring plan", "Budget reallocation"],
    attendanceRate: "96%",
    status: "completed",
    timestamp: "2024-01-15 10:00:00",
    department: "Company-wide",
    platform: "Zoom"
  },
  {
    id: "video_002",
    title: "Client Presentation",
    organizer: "Sales Team",
    participants: 8,
    duration: "45m 20s",
    aiInvolvement: "Presentation coaching + follow-up draft",
    recording: true,
    aiSummary: "Generated",
    actionItems: 5,
    keyDecisions: ["Contract terms", "Timeline"],
    attendanceRate: "100%",
    status: "completed",
    timestamp: "2024-01-15 15:30:00",
    department: "Sales",
    platform: "Teams"
  }
]

// Mock data for chat logs
const chatData = [
  {
    id: "chat_001",
    channel: "#engineering-general",
    platform: "Slack",
    participants: 23,
    messages: 156,
    aiMessages: 12,
    aiInvolvement: "Code review assistance + documentation",
    duration: "Active 2h 30m",
    keyTopics: ["Sprint planning", "Bug fixes", "Code review"],
    sentiment: "collaborative",
    status: "active",
    timestamp: "2024-01-15 09:00:00",
    department: "Engineering"
  },
  {
    id: "chat_002",
    channel: "Customer Support DM",
    platform: "Internal Chat",
    participants: 2,
    messages: 24,
    aiMessages: 8,
    aiInvolvement: "Customer query resolution",
    duration: "25m 15s",
    keyTopics: ["Account access", "Password reset"],
    sentiment: "helpful",
    status: "resolved",
    timestamp: "2024-01-15 14:15:00",
    department: "Support"
  }
]

// Enhanced conversation data
const conversationData = [
  {
    id: "conv_001",
    participants: ["Anna Chen", "Engineering AI Assistant"],
    type: "Human-AI",
    channel: "Direct Message",
    context: "Technical Documentation Request",
    status: "active",
    duration: "5m 23s",
    messages: 8,
    aiResponses: 4,
    escalated: false,
    timestamp: "2024-01-15 14:23:45",
    department: "Engineering",
    priority: "medium",
    confidenceScore: 0.92,
    actionItems: 2,
    classification: "internal"
  },
  {
    id: "conv_002", 
    participants: ["Sarah Martinez", "John Doe", "Marketing AI"],
    type: "Multi-party",
    channel: "Teams Chat",
    context: "Campaign Planning Meeting",
    status: "completed",
    duration: "12m 45s",
    messages: 24,
    aiResponses: 8,
    escalated: false,
    timestamp: "2024-01-15 13:15:20",
    department: "Marketing",
    priority: "high",
    confidenceScore: 0.88,
    actionItems: 5,
    classification: "internal"
  },
  {
    id: "conv_003",
    participants: ["Customer Support", "System AI", "External Client"],
    type: "Customer Support",
    channel: "Support Portal",
    context: "Billing Inquiry Resolution",
    status: "completed",
    duration: "8m 12s",
    messages: 15,
    aiResponses: 7,
    escalated: false,
    timestamp: "2024-01-15 14:01:33",
    department: "Support",
    priority: "medium",
    confidenceScore: 0.89,
    actionItems: 1,
    classification: "external"
  },
  {
    id: "conv_004",
    participants: ["Security Team", "Incident Response AI"],
    type: "Emergency Response",
    channel: "Security Alert",
    context: "System Security Incident",
    status: "escalated",
    duration: "25m 18s",
    messages: 42,
    aiResponses: 18,
    escalated: true,
    timestamp: "2024-01-15 11:45:00",
    department: "Security",
    priority: "critical",
    confidenceScore: 0.76,
    actionItems: 8,
    classification: "internal"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Communications</p>
                  <p className="text-2xl font-bold">3,247</p>
                </div>
                <Globe className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">All channels today</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">AI Involvement</p>
                  <p className="text-2xl font-bold">89.4%</p>
                </div>
                <Bot className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">387 AI teammates active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Time Saved</p>
                  <p className="text-2xl font-bold">892h</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">This week</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Response Quality</p>
                  <p className="text-2xl font-bold">96.7%</p>
                </div>
                <CheckCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Confidence score</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Escalations</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">0.37% rate</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Action Items</p>
                  <p className="text-2xl font-bold">247</p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Auto-generated today</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-7 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="emails">📧 Emails</TabsTrigger>
            <TabsTrigger value="audio">📞 Audio Calls</TabsTrigger>
            <TabsTrigger value="video">🎥 Video Calls</TabsTrigger>
            <TabsTrigger value="chat">💬 Chat Logs</TabsTrigger>
            <TabsTrigger value="meetings">📅 Meetings</TabsTrigger>
            <TabsTrigger value="policies">⚙️ Policies</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Communication Channels
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-blue-500" />
                        <span>Emails</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">1,847</div>
                        <div className="text-xs text-muted-foreground">87% AI-assisted</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-green-500" />
                        <span>Chat Messages</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">892</div>
                        <div className="text-xs text-muted-foreground">73% AI-involved</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-orange-500" />
                        <span>Audio Calls</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">324</div>
                        <div className="text-xs text-muted-foreground">95% transcribed</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-purple-500" />
                        <span>Video Meetings</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">184</div>
                        <div className="text-xs text-muted-foreground">100% summarized</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Response Accuracy</span>
                        <span className="text-sm font-medium">96.7%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-gradient-primary h-2 rounded-full" style={{width: '96.7%'}}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Auto-Resolution Rate</span>
                        <span className="text-sm font-medium">89.4%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-gradient-primary h-2 rounded-full" style={{width: '89.4%'}}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm">Customer Satisfaction</span>
                        <span className="text-sm font-medium">94.2%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-gradient-primary h-2 rounded-full" style={{width: '94.2%'}}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DataTable 
              title="Recent Conversations" 
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
                      <DialogTitle>Live Communication Monitoring</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-4 gap-4">
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold text-green-500">47</div>
                            <div className="text-xs text-muted-foreground">Active Now</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold text-blue-500">23</div>
                            <div className="text-xs text-muted-foreground">AI Processing</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold text-yellow-500">8</div>
                            <div className="text-xs text-muted-foreground">Pending Review</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-2xl font-bold text-red-500">2</div>
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

          <TabsContent value="emails">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Communications
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {emailData.map((email) => (
                    <div key={email.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{email.subject}</span>
                            <Badge variant={email.status === 'ai-generated' ? 'default' : 'secondary'} className="text-xs">
                              {email.aiInvolvement}
                            </Badge>
                            {email.hasAttachments && <Badge variant="outline" className="text-xs">📎</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            From: {email.from} → To: {email.to.join(', ')}
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div>{new Date(email.timestamp).toLocaleString()}</div>
                          <div className="mt-1">
                            <Badge variant="outline" className="text-xs">{email.department}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={email.sentiment === 'positive' ? 'default' : email.sentiment === 'negative' ? 'destructive' : 'secondary'} className="text-xs">
                            {email.sentiment}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{email.category}</Badge>
                          <span className="text-xs text-muted-foreground">Thread: {email.threadLength}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Brain className="h-4 w-4 mr-1" />
                            AI Summary
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audio">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Audio Call Logs
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Headphones className="h-4 w-4 mr-2" />
                      Listen
                    </Button>
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      Transcripts
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {audioCallData.map((call) => (
                    <div key={call.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{call.participants.join(' ↔ ')}</span>
                            <Badge variant="outline" className="text-xs">{call.type}</Badge>
                            <Badge variant={call.callQuality === 'excellent' ? 'default' : 'secondary'} className="text-xs">
                              {call.callQuality}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">{call.aiInvolvement}</div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div>{call.duration}</div>
                          <div>{new Date(call.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">Sentiment:</span>
                          <div className="font-medium">{call.sentiment}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Action Items:</span>
                          <div className="font-medium">{call.actionItems}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">AI Confidence:</span>
                          <div className="font-medium">{(call.aiConfidence * 100).toFixed(0)}%</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Topics:</span>
                          <div className="font-medium">{call.keyTopics.length}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {call.keyTopics.map((topic, index) => (
                            <Badge key={index} variant="outline" className="text-xs">{topic}</Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Play className="h-4 w-4 mr-1" />
                            Playback
                          </Button>
                          <Button variant="ghost" size="sm">
                            <FileText className="h-4 w-4 mr-1" />
                            Transcript
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="video">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    Video Conference Logs
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Camera className="h-4 w-4 mr-2" />
                      Recordings
                    </Button>
                    <Button variant="outline" size="sm">
                      <Brain className="h-4 w-4 mr-2" />
                      AI Summaries
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {videoCallData.map((video) => (
                    <div key={video.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{video.title}</span>
                            <Badge variant="outline" className="text-xs">{video.platform}</Badge>
                            {video.recording && <Badge variant="default" className="text-xs">🎬 Recorded</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Organized by {video.organizer} • {video.participants} participants
                          </div>
                          <div className="text-sm text-muted-foreground">{video.aiInvolvement}</div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div>{video.duration}</div>
                          <div>{new Date(video.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">Attendance:</span>
                          <div className="font-medium">{video.attendanceRate}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Action Items:</span>
                          <div className="font-medium">{video.actionItems}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Key Decisions:</span>
                          <div className="font-medium">{video.keyDecisions.length}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Department:</span>
                          <div className="font-medium">{video.department}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {video.keyDecisions.map((decision, index) => (
                            <Badge key={index} variant="outline" className="text-xs">{decision}</Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Play className="h-4 w-4 mr-1" />
                            Recording
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Brain className="h-4 w-4 mr-1" />
                            AI Summary
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chat">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Chat Conversation Logs
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Hash className="h-4 w-4 mr-2" />
                      Channels
                    </Button>
                    <Button variant="outline" size="sm">
                      <Bot className="h-4 w-4 mr-2" />
                      AI Activity
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {chatData.map((chat) => (
                    <div key={chat.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{chat.channel}</span>
                            <Badge variant="outline" className="text-xs">{chat.platform}</Badge>
                            <Badge variant={chat.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                              {chat.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {chat.participants} participants • {chat.messages} messages • {chat.aiMessages} AI responses
                          </div>
                          <div className="text-sm text-muted-foreground">{chat.aiInvolvement}</div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <div>{chat.duration}</div>
                          <div>{new Date(chat.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={chat.sentiment === 'collaborative' ? 'default' : 'secondary'} className="text-xs">
                            {chat.sentiment}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{chat.department}</Badge>
                          {chat.keyTopics.map((topic, index) => (
                            <Badge key={index} variant="outline" className="text-xs">{topic}</Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            View Chat
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Brain className="h-4 w-4 mr-1" />
                            AI Analysis
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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