import { Layout } from "@/components/Layout"
import { DashboardCard } from "@/components/DashboardCard"
import { AnalyticsChart } from "@/components/AnalyticsChart"
import { DataTable } from "@/components/DataTable"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { 
  TrendingUp, 
  Users, 
  Bot, 
  Clock, 
  Activity, 
  Download,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  Target,
  Shield,
  DollarSign,
  Zap,
  AlertTriangle,
  CheckCircle,
  Star
} from "lucide-react"

// Mock data for analytics
const performanceMetrics = [
  { name: "Jan", aiRequests: 4000, userSessions: 2400, efficiency: 85, hoursSaved: 340, errorsPrevented: 23 },
  { name: "Feb", aiRequests: 3000, userSessions: 1398, efficiency: 78, hoursSaved: 280, errorsPrevented: 18 },
  { name: "Mar", aiRequests: 2000, userSessions: 9800, efficiency: 92, hoursSaved: 420, errorsPrevented: 31 },
  { name: "Apr", aiRequests: 2780, userSessions: 3908, efficiency: 88, hoursSaved: 385, errorsPrevented: 27 },
  { name: "May", aiRequests: 1890, userSessions: 4800, efficiency: 95, hoursSaved: 450, errorsPrevented: 34 },
  { name: "Jun", aiRequests: 2390, userSessions: 3800, efficiency: 90, hoursSaved: 398, errorsPrevented: 29 }
]

const departmentUsage = [
  { name: "Engineering", value: 35, hours: 420, adoption: 89, productivity: 156 },
  { name: "Sales", value: 25, hours: 300, adoption: 76, productivity: 142 },
  { name: "Marketing", value: 20, hours: 240, adoption: 82, productivity: 128 },
  { name: "Support", value: 15, hours: 180, adoption: 91, productivity: 167 },
  { name: "HR", value: 5, hours: 60, adoption: 67, productivity: 98 }
]

const aiTeammatePerformance = [
  { name: "Sarah AI", assignedTo: "Sarah Chen", tasksCompleted: 156, accuracy: 94, responseTime: "1.2s", status: "active", satisfaction: 4.7, errorsPrevented: 12 },
  { name: "DataBot Pro", assignedTo: "Finance Team", tasksCompleted: 142, accuracy: 89, responseTime: "0.8s", status: "active", satisfaction: 4.5, errorsPrevented: 8 },
  { name: "SalesAssist", assignedTo: "Marcus Johnson", tasksCompleted: 98, accuracy: 96, responseTime: "2.1s", status: "training", satisfaction: 4.8, errorsPrevented: 15 },
  { name: "CodeHelper", assignedTo: "Dev Team", tasksCompleted: 87, accuracy: 92, responseTime: "1.5s", status: "active", satisfaction: 4.6, errorsPrevented: 9 },
  { name: "ContentGen", assignedTo: "Marketing Team", tasksCompleted: 76, accuracy: 88, responseTime: "3.2s", status: "active", satisfaction: 4.3, errorsPrevented: 6 }
]

const adoptionHeatmap = [
  { department: "Engineering", week1: 45, week2: 52, week3: 67, week4: 78 },
  { department: "Sales", week1: 32, week2: 38, week3: 45, week4: 51 },
  { department: "Marketing", week1: 28, week2: 35, week3: 42, week4: 48 },
  { department: "Support", week1: 55, week2: 61, week3: 69, week4: 75 },
  { department: "HR", week1: 15, week2: 22, week3: 28, week4: 34 }
]

const productivityMetrics = [
  { metric: "Hours Saved", value: 2273, change: "+18%", period: "This month" },
  { metric: "Tasks Automated", value: 1847, change: "+24%", period: "This month" },
  { metric: "Workflow Efficiency", value: "92%", change: "+8%", period: "vs baseline" },
  { metric: "Time to Complete", value: "3.2h", change: "-35%", period: "Average reduction" }
]

const errorPrevention = [
  { type: "Data Entry Errors", prevented: 127, severity: "High", trend: "+15%" },
  { type: "Compliance Violations", prevented: 43, severity: "Critical", trend: "+8%" },
  { type: "Missed Deadlines", prevented: 89, severity: "Medium", trend: "+22%" },
  { type: "Security Incidents", prevented: 12, severity: "Critical", trend: "+5%" }
]

const roiMetrics = [
  { metric: "Cost Savings", value: "$847,230", period: "YTD", growth: "+32%" },
  { metric: "Revenue Impact", value: "$1.2M", period: "Projected annual", growth: "+28%" },
  { metric: "ROI Percentage", value: "340%", period: "12 months", growth: "+45%" },
  { metric: "Payback Period", value: "3.2 months", period: "Initial investment", growth: "-15%" }
]

const userEngagement = [
  { user: "john.smith@company.com", sessions: 45, aiInteractions: 234, lastActive: "2 hours ago" },
  { user: "mary.johnson@company.com", sessions: 38, aiInteractions: 189, lastActive: "30 min ago" },
  { user: "david.wilson@company.com", sessions: 32, aiInteractions: 156, lastActive: "1 hour ago" },
  { user: "sarah.brown@company.com", sessions: 28, aiInteractions: 143, lastActive: "45 min ago" },
  { user: "mike.davis@company.com", sessions: 24, aiInteractions: 98, lastActive: "3 hours ago" }
]

const aiTeammateColumns = [
  { key: "name", header: "AI Teammate" },
  { key: "assignedTo", header: "Assigned To" },
  { key: "tasksCompleted", header: "Tasks Completed" },
  { key: "accuracy", header: "Accuracy", cell: (row: any) => `${row.accuracy}%` },
  { key: "satisfaction", header: "Satisfaction", cell: (row: any) => (
    <div className="flex items-center gap-1">
      <Star className="w-4 h-4 fill-current text-yellow-500" />
      <span>{row.satisfaction}</span>
    </div>
  )},
  { key: "errorsPrevented", header: "Errors Prevented" },
  { 
    key: "status", 
    header: "Status",
    cell: (row: any) => (
      <Badge variant={row.status === "active" ? "default" : "secondary"}>
        {row.status}
      </Badge>
    )
  }
]

const userEngagementColumns = [
  { key: "user", header: "User" },
  { key: "sessions", header: "Sessions" },
  { key: "aiInteractions", header: "AI Interactions" },
  { key: "lastActive", header: "Last Active" }
]

export default function Analytics() {
  return (
    <Layout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive insights into AI performance, user engagement, and system metrics
            </p>
          </div>
          <div className="flex gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Calendar className="w-4 h-4 mr-2" />
                  Date Range
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Select Date Range</DialogTitle>
                  <DialogDescription>Choose the time period for analytics data</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Quick Ranges</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm">Last 7 days</Button>
                      <Button variant="outline" size="sm">Last 30 days</Button>
                      <Button variant="outline" size="sm">Last 90 days</Button>
                      <Button variant="outline" size="sm">Last 12 months</Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Custom Range</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Start Date</Label>
                        <Input type="date" />
                      </div>
                      <div>
                        <Label>End Date</Label>
                        <Input type="date" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline">Cancel</Button>
                  <Button>Apply Range</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Export Analytics Report</DialogTitle>
                  <DialogDescription>Generate comprehensive analytics report</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Report Sections</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="adoption" defaultChecked />
                        <Label htmlFor="adoption">Adoption Metrics</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="productivity" defaultChecked />
                        <Label htmlFor="productivity">Productivity Analysis</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="errors" defaultChecked />
                        <Label htmlFor="errors">Error Prevention</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="roi" defaultChecked />
                        <Label htmlFor="roi">ROI Analysis</Label>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Export Format</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF Report</SelectItem>
                        <SelectItem value="excel">Excel Workbook</SelectItem>
                        <SelectItem value="powerpoint">PowerPoint Presentation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline">Cancel</Button>
                  <Button>Export Report</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <DashboardCard
            title="Total AI Requests"
            value="24,567"
            change="+12.5% from last month"
            changeType="positive"
            trend="up"
            icon={<Bot />}
          />
          <DashboardCard
            title="Active Users"
            value="1,847"
            change="+8.2% from last month"
            changeType="positive"
            trend="up"
            icon={<Users />}
          />
          <DashboardCard
            title="Avg Response Time"
            value="1.4s"
            change="-15% from last month"
            changeType="positive"
            trend="down"
            icon={<Clock />}
          />
          <DashboardCard
            title="System Uptime"
            value="99.97%"
            change="Above SLA target"
            changeType="positive"
            trend="up"
            icon={<Activity />}
          />
        </div>

        <Tabs defaultValue="adoption" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="adoption">Adoption</TabsTrigger>
            <TabsTrigger value="productivity">Productivity</TabsTrigger>
            <TabsTrigger value="errors">Error Prevention</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="roi">ROI</TabsTrigger>
            <TabsTrigger value="teams">AI Teams</TabsTrigger>
          </TabsList>

          <TabsContent value="adoption" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Adoption Heatmap
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {adoptionHeatmap.map((dept) => (
                      <div key={dept.department} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{dept.department}</span>
                          <span className="text-sm text-muted-foreground">{dept.week4}% adoption</span>
                        </div>
                        <div className="flex gap-1">
                          {[dept.week1, dept.week2, dept.week3, dept.week4].map((value, i) => (
                            <div
                              key={i}
                              className="h-2 flex-1 rounded"
                              style={{
                                backgroundColor: `hsl(var(--primary) / ${value / 100})`
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <AnalyticsChart
                title="Department Adoption Trends"
                data={departmentUsage}
                type="bar"
                dataKey="adoption"
                xAxisKey="name"
                height={350}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <DashboardCard
                title="Most Active Department"
                value="Support"
                change="91% adoption rate"
                changeType="positive"
                icon={<Users />}
              />
              <DashboardCard
                title="Top AI Workflow"
                value="Data Processing"
                change="67% of all tasks"
                changeType="positive"
                icon={<Bot />}
              />
              <DashboardCard
                title="Peak Usage Time"
                value="10:30 AM"
                change="Daily average"
                changeType="neutral"
                icon={<Clock />}
              />
              <DashboardCard
                title="User Growth"
                value="+142"
                change="New users this month"
                changeType="positive"
                icon={<TrendingUp />}
              />
            </div>
          </TabsContent>

          <TabsContent value="productivity" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalyticsChart
                title="Hours Saved Over Time"
                data={performanceMetrics}
                type="line"
                dataKey="hoursSaved"
                xAxisKey="name"
                height={350}
              />
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    Productivity Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {productivityMetrics.map((metric) => (
                    <div key={metric.metric} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <div>
                        <span className="text-sm font-medium">{metric.metric}</span>
                        <p className="text-xs text-muted-foreground">{metric.period}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold">{metric.value}</span>
                        <p className="text-xs text-status-success">{metric.change}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Total Hours Saved
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">2,273h</div>
                  <p className="text-sm text-muted-foreground">+18% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Tasks Automated
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">1,847</div>
                  <p className="text-sm text-muted-foreground">+24% from last month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Efficiency Gain
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">92%</div>
                  <p className="text-sm text-muted-foreground">vs baseline workflows</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="errors" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalyticsChart
                title="Errors Prevented Monthly"
                data={performanceMetrics}
                type="bar"
                dataKey="errorsPrevented"
                xAxisKey="name"
                height={350}
              />
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Error Prevention Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {errorPrevention.map((error) => (
                    <div key={error.type} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <div>
                        <span className="text-sm font-medium">{error.type}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={error.severity === "Critical" ? "destructive" : error.severity === "High" ? "default" : "secondary"}>
                            {error.severity}
                          </Badge>
                          <span className="text-xs text-status-success">{error.trend}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold">{error.prevented}</span>
                        <p className="text-xs text-muted-foreground">prevented</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <DashboardCard
                title="Total Errors Prevented"
                value="271"
                change="+15% from last month"
                changeType="positive"
                icon={<Shield />}
              />
              <DashboardCard
                title="Critical Incidents Avoided"
                value="55"
                change="High severity prevented"
                changeType="positive"
                icon={<AlertTriangle />}
              />
              <DashboardCard
                title="Compliance Violations"
                value="0"
                change="100% prevention rate"
                changeType="positive"
                icon={<CheckCircle />}
              />
              <DashboardCard
                title="Cost of Errors Avoided"
                value="$89,450"
                change="Estimated savings"
                changeType="positive"
                icon={<DollarSign />}
              />
            </div>
          </TabsContent>

          <TabsContent value="roi" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    ROI Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {roiMetrics.map((metric) => (
                    <div key={metric.metric} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <div>
                        <span className="text-sm font-medium">{metric.metric}</span>
                        <p className="text-xs text-muted-foreground">{metric.period}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold">{metric.value}</span>
                        <p className="text-xs text-status-success">{metric.growth}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>AI vs Baseline Workflows</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Time to Complete</span>
                      <span className="text-status-success">-65% faster</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-status-success h-2 rounded-full" style={{width: '65%'}}></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Error Rate</span>
                      <span className="text-status-success">-87% reduction</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-status-success h-2 rounded-full" style={{width: '87%'}}></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Cost Efficiency</span>
                      <span className="text-status-success">+340% improvement</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-status-success h-2 rounded-full" style={{width: '90%'}}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <DashboardCard
                title="Total ROI"
                value="340%"
                change="+45% YoY growth"
                changeType="positive"
                icon={<TrendingUp />}
              />
              <DashboardCard
                title="Cost Savings"
                value="$847K"
                change="Year to date"
                changeType="positive"
                icon={<DollarSign />}
              />
              <DashboardCard
                title="Revenue Impact"
                value="$1.2M"
                change="Projected annual"
                changeType="positive"
                icon={<BarChart3 />}
              />
              <DashboardCard
                title="Payback Period"
                value="3.2 mo"
                change="Initial investment"
                changeType="positive"
                icon={<Clock />}
              />
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AnalyticsChart
                title="System Performance Trends"
                data={performanceMetrics}
                type="bar"
                dataKey="efficiency"
                xAxisKey="name"
                height={400}
              />
              <Card>
                <CardHeader>
                  <CardTitle>Performance Insights</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Peak Usage Hours</span>
                    <span className="text-sm text-muted-foreground">9 AM - 11 AM</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Fastest Response</span>
                    <span className="text-sm text-muted-foreground">0.3s</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Error Rate</span>
                    <span className="text-sm text-muted-foreground">0.12%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium">Cache Hit Rate</span>
                    <span className="text-sm text-muted-foreground">94.5%</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>


          <TabsContent value="teams" className="space-y-6">
            <DataTable
              title="AI Teammate Performance"
              data={aiTeammatePerformance}
              columns={aiTeammateColumns}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Total AI Teammates</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">12</div>
                  <p className="text-sm text-muted-foreground">5 active, 2 training</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Avg Accuracy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">91.8%</div>
                  <p className="text-sm text-muted-foreground">Across all teammates</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tasks Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">2,847</div>
                  <p className="text-sm text-muted-foreground">This week</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  )
}