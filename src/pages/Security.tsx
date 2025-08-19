import { useState } from "react";
import { Layout } from "@/components/Layout";
import { RoleHierarchyTree } from "@/components/RoleHierarchyTree";
import { PermissionMatrix } from "@/components/PermissionMatrix";
import { ApprovalWorkflow } from "@/components/ApprovalWorkflow";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/DataTable";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Shield, 
  AlertTriangle, 
  Lock, 
  Eye, 
  Download, 
  Upload, 
  Gavel,
  Search,
  Clock,
  FileText,
  Users,
  Bot,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  Activity,
  Globe,
  Database,
  UserX,
  Power,
  Ban,
  Pause,
  Play,
  RotateCcw,
  Calendar,
  Filter,
  ExternalLink,
  Bell,
  Archive,
  Key,
  Fingerprint,
  ShieldCheck,
  ShieldAlert,
  Target,
  TrendingUp,
  BarChart3,
  Building2,
  UserCheck
} from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";

// Enhanced audit logs with hierarchy information
const mockAuditLogs = [
  { 
    id: "1", 
    timestamp: "2024-01-15 14:23:45", 
    actor: "VP Engineering AI (Sarah Martinez)", 
    actorType: "AI", 
    hierarchyLevel: "L4 - VP/Senior Leadership",
    action: "Division Data Access", 
    resource: "Engineering Database", 
    context: "Strategic planning analysis for Q4", 
    result: "Success",
    riskLevel: "Medium",
    authorityScope: "Division-wide operations"
  },
  { 
    id: "2", 
    timestamp: "2024-01-15 14:20:12", 
    actor: "john.smith@company.com", 
    actorType: "User", 
    action: "Permission Change", 
    resource: "HR Dataset", 
    context: "Granted read access to Marketing team", 
    result: "Success",
    riskLevel: "Medium"
  },
  { 
    id: "3", 
    timestamp: "2024-01-15 14:15:33", 
    actor: "AI-Analytics-03", 
    actorType: "AI", 
    action: "Unusual Access", 
    resource: "Financial Records", 
    context: "Accessed outside normal patterns", 
    result: "Blocked",
    riskLevel: "High"
  },
  { 
    id: "4", 
    timestamp: "2024-01-15 14:10:08", 
    actor: "admin@company.com", 
    actorType: "User", 
    action: "Compliance Config", 
    resource: "GDPR Settings", 
    context: "Updated data retention period", 
    result: "Success",
    riskLevel: "Low"
  },
];

const mockCompliances = [
  { 
    id: "1", 
    standard: "GDPR", 
    status: "Active", 
    lastAudit: "2024-01-10", 
    nextAudit: "2024-04-10", 
    compliance: 97,
    policies: 24,
    violations: 0
  },
  { 
    id: "2", 
    standard: "HIPAA", 
    status: "Active", 
    lastAudit: "2024-01-05", 
    nextAudit: "2024-04-05", 
    compliance: 99,
    policies: 18,
    violations: 0
  },
  { 
    id: "3", 
    standard: "SOC 2", 
    status: "Active", 
    lastAudit: "2023-12-15", 
    nextAudit: "2024-03-15", 
    compliance: 94,
    policies: 32,
    violations: 2
  },
  { 
    id: "4", 
    standard: "ISO 27001", 
    status: "Pending", 
    lastAudit: "2023-11-20", 
    nextAudit: "2024-02-20", 
    compliance: 87,
    policies: 28,
    violations: 1
  },
];

const mockLegalHolds = [
  { 
    id: "1", 
    case: "Case-2024-001", 
    description: "Employment dispute - John Doe", 
    startDate: "2024-01-01", 
    status: "Active", 
    dataTypes: ["Email", "Documents", "Access Logs"],
    retainedData: "2.3 GB"
  },
  { 
    id: "2", 
    case: "Case-2023-045", 
    description: "Contract dispute - ABC Corp", 
    startDate: "2023-12-15", 
    status: "Active", 
    dataTypes: ["Contracts", "Communications", "Financial Records"],
    retainedData: "5.7 GB"
  },
  { 
    id: "3", 
    case: "Case-2023-032", 
    description: "Regulatory investigation", 
    startDate: "2023-11-01", 
    status: "Released", 
    dataTypes: ["Transaction Records", "Audit Logs"],
    retainedData: "1.2 GB"
  },
];

const mockAnomalies = [
  { 
    id: "1", 
    type: "Unusual Data Access", 
    severity: "High", 
    actor: "AI-Assistant-12", 
    detection: "2024-01-15 14:30:00", 
    description: "AI accessed financial data outside normal business hours",
    status: "Under Review",
    riskScore: 85
  },
  { 
    id: "2", 
    type: "Permission Escalation", 
    severity: "Medium", 
    actor: "jane.doe@company.com", 
    detection: "2024-01-15 13:45:00", 
    description: "User attempted to access restricted HR data",
    status: "Resolved",
    riskScore: 65
  },
  { 
    id: "3", 
    type: "Bulk Data Export", 
    severity: "High", 
    actor: "contractor@external.com", 
    detection: "2024-01-15 12:15:00", 
    description: "Large dataset export by external user",
    status: "Investigating",
    riskScore: 92
  },
];

const mockActiveSessions = [
  { 
    id: "1", 
    user: "john.smith@company.com", 
    type: "User", 
    location: "New York, US", 
    device: "Chrome Browser", 
    lastActivity: "2 mins ago",
    aiInteraction: true,
    riskLevel: "Low"
  },
  { 
    id: "2", 
    user: "AI-Assistant-07", 
    type: "AI", 
    location: "Cloud Instance", 
    device: "AI Engine", 
    lastActivity: "1 min ago",
    aiInteraction: true,
    riskLevel: "Low"
  },
  { 
    id: "3", 
    user: "contractor@external.com", 
    type: "User", 
    location: "London, UK", 
    device: "Mobile App", 
    lastActivity: "15 mins ago",
    aiInteraction: false,
    riskLevel: "Medium"
  },
];

// Table column definitions
const auditLogColumns = [
  { key: "timestamp", header: "Timestamp", sortable: true },
  { key: "actor", header: "Actor", sortable: true },
  { key: "actorType", header: "Type", sortable: true, cell: (row: any) => (
    <Badge variant={row.actorType === "AI" ? "secondary" : "default"}>
      {row.actorType}
    </Badge>
  )},
  { key: "action", header: "Action", sortable: true },
  { key: "resource", header: "Resource", sortable: true },
  { key: "result", header: "Result", sortable: true, cell: (row: any) => (
    <Badge variant={row.result === "Success" ? "default" : "destructive"}>
      {row.result}
    </Badge>
  )},
  { key: "riskLevel", header: "Risk", sortable: true, cell: (row: any) => (
    <Badge variant={
      row.riskLevel === "High" ? "destructive" : 
      row.riskLevel === "Medium" ? "secondary" : "default"
    }>
      {row.riskLevel}
    </Badge>
  )},
];

const complianceColumns = [
  { key: "standard", header: "Standard", sortable: true },
  { key: "status", header: "Status", sortable: true, cell: (row: any) => (
    <Badge variant={row.status === "Active" ? "default" : "secondary"}>
      {row.status}
    </Badge>
  )},
  { key: "compliance", header: "Compliance %", sortable: true, cell: (row: any) => (
    <div className="flex items-center space-x-2">
      <span>{row.compliance}%</span>
      <div className="w-16 h-2 bg-muted rounded-full">
        <div 
          className={`h-full rounded-full ${
            row.compliance >= 95 ? 'bg-green-500' : 
            row.compliance >= 90 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${row.compliance}%` }}
        />
      </div>
    </div>
  )},
  { key: "policies", header: "Policies", sortable: true },
  { key: "violations", header: "Violations", sortable: true, cell: (row: any) => (
    <span className={row.violations > 0 ? "text-red-600 font-medium" : "text-green-600"}>
      {row.violations}
    </span>
  )},
  { key: "nextAudit", header: "Next Audit", sortable: true },
];

const legalHoldColumns = [
  { key: "case", header: "Case ID", sortable: true },
  { key: "description", header: "Description", sortable: true },
  { key: "startDate", header: "Start Date", sortable: true },
  { key: "status", header: "Status", sortable: true, cell: (row: any) => (
    <Badge variant={row.status === "Active" ? "default" : "secondary"}>
      {row.status}
    </Badge>
  )},
  { key: "dataTypes", header: "Data Types", sortable: false, cell: (row: any) => (
    <div className="flex flex-wrap gap-1">
      {row.dataTypes.map((type: string, index: number) => (
        <Badge key={index} variant="outline" className="text-xs">{type}</Badge>
      ))}
    </div>
  )},
  { key: "retainedData", header: "Size", sortable: true },
];

const anomalyColumns = [
  { key: "type", header: "Type", sortable: true },
  { key: "severity", header: "Severity", sortable: true, cell: (row: any) => (
    <Badge variant={
      row.severity === "High" ? "destructive" : 
      row.severity === "Medium" ? "secondary" : "default"
    }>
      {row.severity}
    </Badge>
  )},
  { key: "actor", header: "Actor", sortable: true },
  { key: "detection", header: "Detected", sortable: true },
  { key: "status", header: "Status", sortable: true },
  { key: "riskScore", header: "Risk Score", sortable: true, cell: (row: any) => (
    <div className="flex items-center space-x-2">
      <span className={
        row.riskScore >= 80 ? "text-red-600 font-medium" : 
        row.riskScore >= 60 ? "text-yellow-600 font-medium" : "text-green-600"
      }>
        {row.riskScore}
      </span>
    </div>
  )},
];

const sessionColumns = [
  { key: "user", header: "User/AI", sortable: true },
  { key: "type", header: "Type", sortable: true, cell: (row: any) => (
    <Badge variant={row.type === "AI" ? "secondary" : "default"}>
      {row.type}
    </Badge>
  )},
  { key: "location", header: "Location", sortable: true },
  { key: "device", header: "Device", sortable: true },
  { key: "lastActivity", header: "Last Activity", sortable: true },
  { key: "aiInteraction", header: "AI Active", sortable: true, cell: (row: any) => (
    <div className="flex items-center">
      {row.aiInteraction ? (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm">Active</span>
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">Inactive</span>
      )}
    </div>
  )},
  { key: "riskLevel", header: "Risk", sortable: true, cell: (row: any) => (
    <Badge variant={
      row.riskLevel === "High" ? "destructive" : 
      row.riskLevel === "Medium" ? "secondary" : "default"
    }>
      {row.riskLevel}
    </Badge>
  )},
];

export default function Security() {
  const [selectedCompliance, setSelectedCompliance] = useState<string>("GDPR");
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [aiSystemsActive, setAiSystemsActive] = useState(true);

  const handleEmergencyLockdown = () => {
    setEmergencyMode(true);
    setAiSystemsActive(false);
    // In real implementation, this would trigger emergency procedures
  };

  const handleTerminateSession = (sessionId: string) => {
    console.log(`Terminating session ${sessionId}`);
    // In real implementation, this would terminate the session
  };

  return (
    <Layout>
      <div className="space-y-6 p-4 overflow-x-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold truncate">Security & Compliance</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Comprehensive security monitoring, compliance management, and audit controls
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  <span className="truncate">Export Audit Report</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Export Audit Report</DialogTitle>
                  <DialogDescription>Generate security audit and compliance report</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Report Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select report type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Full Audit Report</SelectItem>
                        <SelectItem value="security">Security Events Only</SelectItem>
                        <SelectItem value="compliance">Compliance Summary</SelectItem>
                        <SelectItem value="anomalies">Anomaly Detection Report</SelectItem>
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
                        <SelectItem value="24h">Last 24 hours</SelectItem>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                        <SelectItem value="90d">Last 90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Format</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pdf">PDF Report</SelectItem>
                        <SelectItem value="csv">CSV Export</SelectItem>
                        <SelectItem value="json">JSON Format</SelectItem>
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
            <Button 
              variant={emergencyMode ? "destructive" : "default"} 
              size="sm" 
              className="w-full sm:w-auto"
              onClick={handleEmergencyLockdown}
            >
              <Shield className="h-4 w-4 mr-2" />
              <span className="truncate">{emergencyMode ? "Emergency Active" : "Emergency Mode"}</span>
            </Button>
          </div>
        </div>

        {/* Emergency Banner */}
        {emergencyMode && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="font-medium text-destructive">Emergency Mode Active</span>
            </div>
            <p className="text-sm text-destructive/80 mt-1">
              All AI systems have been suspended. User access is restricted to essential functions.
            </p>
          </div>
        )}

        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Security Score"
            value="94%"
            icon={<ShieldCheck className="h-5 w-5" />}
            change="+2% from last week"
            trend="up"
            changeType="positive"
          />
          <DashboardCard
            title="Active Anomalies"
            value="3"
            icon={<AlertTriangle className="h-5 w-5" />}
            change="2 resolved today"
            trend="down"
            changeType="positive"
          />
          <DashboardCard
            title="Compliance Status"
            value="97%"
            icon={<CheckCircle className="h-5 w-5" />}
            change="All standards passing"
            trend="up"
            changeType="positive"
          />
          <DashboardCard
            title="Active Sessions"
            value="24"
            icon={<Activity className="h-5 w-5" />}
            change="8 AI sessions active"
            trend="flat"
            changeType="neutral"
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="audit-logs" className="space-y-4">
          <div className="overflow-x-auto">
            <TabsList className="grid w-full min-w-max grid-cols-6 mb-4">
              <TabsTrigger value="audit-logs" className="text-xs sm:text-sm">Audit Logs</TabsTrigger>
              <TabsTrigger value="compliance" className="text-xs sm:text-sm">Compliance</TabsTrigger>
              <TabsTrigger value="legal-hold" className="text-xs sm:text-sm">Legal Hold</TabsTrigger>
              <TabsTrigger value="anomalies" className="text-xs sm:text-sm">Anomaly Detection</TabsTrigger>
              <TabsTrigger value="sessions" className="text-xs sm:text-sm">Session Control</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs sm:text-sm">Settings</TabsTrigger>
            </TabsList>
          </div>

          {/* Immutable Audit Logs */}
          <TabsContent value="audit-logs" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base">
                    <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Log Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Total Events (24h)</span>
                    <span className="font-medium text-sm">15,247</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">AI Actions</span>
                    <span className="font-medium text-sm">8,921</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">User Actions</span>
                    <span className="font-medium text-sm">6,326</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base">
                    <Shield className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Tamper Protection</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Integrity Checks</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Cryptographic Hash</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Blockchain Anchoring</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base">
                    <ExternalLink className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">SIEM Integration</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Splunk</span>
                    <Badge variant="default" className="text-xs">Connected</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">QRadar</span>
                    <Badge variant="default" className="text-xs">Connected</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Sentinel</span>
                    <Badge variant="secondary" className="text-xs">Pending</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Log Filters */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Filter Audit Logs</CardTitle>
                <CardDescription className="text-sm">Search and filter tamper-proof audit events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="actor-filter">Actor</Label>
                    <Input id="actor-filter" placeholder="User or AI ID..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="action-filter">Action Type</Label>
                    <Input id="action-filter" placeholder="Data Access, Permission Change..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resource-filter">Resource</Label>
                    <Input id="resource-filter" placeholder="Database, Dataset..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time-range">Time Range</Label>
                    <Input id="time-range" type="datetime-local" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Apply Filters
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export Filtered Logs
                  </Button>
                </div>
              </CardContent>
            </Card>

            <DataTable
              title="Immutable Audit Log"
              data={mockAuditLogs}
              columns={auditLogColumns}
              actions={
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export to SIEM
                  </Button>
                </div>
              }
            />
          </TabsContent>

          {/* Compliance Modes */}
          <TabsContent value="compliance" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {["GDPR", "HIPAA", "SOC 2", "ISO 27001"].map((standard) => (
                <Card key={standard} className={`cursor-pointer transition-all ${selectedCompliance === standard ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}>
                  <CardContent className="pt-6" onClick={() => setSelectedCompliance(standard)}>
                    <div className="flex flex-col items-center text-center space-y-2">
                      <ShieldCheck className="h-8 w-8 text-primary" />
                      <h3 className="font-medium">{standard}</h3>
                      <p className="text-xs text-muted-foreground">
                        {standard === "GDPR" && "EU Data Protection"}
                        {standard === "HIPAA" && "Healthcare Privacy"}
                        {standard === "SOC 2" && "Security Controls"}
                        {standard === "ISO 27001" && "Information Security"}
                      </p>
                      {selectedCompliance === standard && <CheckCircle className="h-4 w-4 text-green-600" />}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <DataTable
              title="Compliance Standards"
              data={mockCompliances}
              columns={complianceColumns}
              actions={
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                  <Button variant="outline" size="sm">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Compliance Report
                  </Button>
                </div>
              }
            />

            {/* Compliance Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Compliance Configuration - {selectedCompliance}</CardTitle>
                <CardDescription>Automatic policy configuration for {selectedCompliance} compliance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Data Retention Period</Label>
                      <div className="text-sm">
                        {selectedCompliance === "GDPR" && "Personal data: 2 years, Consent records: 3 years"}
                        {selectedCompliance === "HIPAA" && "PHI: 6 years, Audit logs: 7 years"}
                        {selectedCompliance === "SOC 2" && "Security logs: 1 year, Incident records: 3 years"}
                        {selectedCompliance === "ISO 27001" && "Risk assessments: 3 years, Security events: 2 years"}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Access Restrictions</Label>
                      <div className="text-sm">
                        {selectedCompliance === "GDPR" && "Right to deletion, Data portability, Consent management"}
                        {selectedCompliance === "HIPAA" && "Minimum necessary access, Role-based permissions"}
                        {selectedCompliance === "SOC 2" && "Multi-factor authentication, Access reviews"}
                        {selectedCompliance === "ISO 27001" && "Asset classification, Access control policy"}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Incident Response Procedures</Label>
                    <div className="text-sm">
                      {selectedCompliance === "GDPR" && "72-hour breach notification, Data protection impact assessments"}
                      {selectedCompliance === "HIPAA" && "Covered entity notification, Risk assessment procedures"}
                      {selectedCompliance === "SOC 2" && "Security incident classification, Response team activation"}
                      {selectedCompliance === "ISO 27001" && "Incident management process, Forensic procedures"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Legal Hold & E-Discovery */}
          <TabsContent value="legal-hold" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base">
                    <Gavel className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Legal Holds</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Active Holds</span>
                    <span className="font-medium text-sm">2</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Total Data Preserved</span>
                    <span className="font-medium text-sm">8.0 GB</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Oldest Hold</span>
                    <span className="font-medium text-sm">68 days</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base">
                    <Search className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">E-Discovery</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Searchable Documents</span>
                    <span className="font-medium text-sm">1.2M</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">AI-Assisted Reviews</span>
                    <span className="font-medium text-sm">4</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Export Formats</span>
                    <span className="font-medium text-sm">PST, PDF, CSV</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base">
                    <Archive className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Retention Policy</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Auto-deletion</span>
                    <Badge variant="default" className="text-xs">Suspended</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Backup Protection</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Chain of Custody</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <DataTable
              title="Legal Holds & E-Discovery"
              data={mockLegalHolds}
              columns={legalHoldColumns}
              actions={
                <div className="flex space-x-2">
                  <Button size="sm">
                    <Gavel className="h-4 w-4 mr-2" />
                    New Legal Hold
                  </Button>
                  <Button variant="outline" size="sm">
                    <Search className="h-4 w-4 mr-2" />
                    E-Discovery Search
                  </Button>
                </div>
              }
            />

            {/* Legal Hold Creation */}
            <Card>
              <CardHeader>
                <CardTitle>Create New Legal Hold</CardTitle>
                <CardDescription>Preserve data and communications for litigation or audits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="case-id">Case ID</Label>
                    <Input id="case-id" placeholder="Case-2024-XXX" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="case-description">Description</Label>
                    <Input id="case-description" placeholder="Brief case description..." />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="custodians">Custodians</Label>
                    <Input id="custodians" placeholder="user1@company.com, user2@company.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date-range">Date Range</Label>
                    <Input id="date-range" type="date" />
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <Label>Data Types to Preserve</Label>
                  <div className="flex flex-wrap gap-2">
                    {["Email", "Documents", "Chat Messages", "Database Records", "Audit Logs", "Voice Recordings"].map((type) => (
                      <label key={type} className="flex items-center space-x-2">
                        <input type="checkbox" className="rounded" />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Button className="w-full mt-4">
                  <Gavel className="h-4 w-4 mr-2" />
                  Create Legal Hold
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Anomaly Detection */}
          <TabsContent value="anomalies" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base">
                    <Target className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Detection Models</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">AI Behavior Analysis</span>
                    <Badge variant="default" className="text-xs">Active</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Access Pattern Detection</span>
                    <Badge variant="default" className="text-xs">Active</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Data Exfiltration</span>
                    <Badge variant="default" className="text-xs">Active</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base">
                    <TrendingUp className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Detection Stats</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Alerts Today</span>
                    <span className="font-medium text-sm">7</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">False Positives</span>
                    <span className="font-medium text-sm">2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Avg Response Time</span>
                    <span className="font-medium text-sm">4.2 mins</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base">
                    <Bell className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Alert Channels</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Email Alerts</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Slack Integration</span>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">SIEM Forward</span>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </div>

            <DataTable
              title="Anomaly Detection"
              data={mockAnomalies}
              columns={anomalyColumns}
              actions={
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Models
                  </Button>
                  <Button variant="outline" size="sm">
                    <Bell className="h-4 w-4 mr-2" />
                    Alert Settings
                  </Button>
                </div>
              }
            />

            {/* Anomaly Rules Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Detection Rules Configuration</CardTitle>
                <CardDescription>Configure AI models to detect unusual behavior patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { rule: "Unusual Data Access Hours", description: "AI accessing data outside business hours", threshold: "After 8 PM or before 6 AM", enabled: true },
                    { rule: "Cross-Dataset Access Pattern", description: "AI accessing unrelated datasets in sequence", threshold: "3+ unrelated datasets within 1 hour", enabled: true },
                    { rule: "Bulk Data Export", description: "Large volume data exports by users or AI", threshold: "> 1 GB exported within 1 hour", enabled: true },
                    { rule: "Permission Escalation", description: "Attempts to access restricted resources", threshold: "Any denied access attempt", enabled: true },
                  ].map((rule, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{rule.rule}</h4>
                          <p className="text-sm text-muted-foreground">{rule.description}</p>
                        </div>
                        <Switch checked={rule.enabled} />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Threshold: {rule.threshold}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Session Controls */}
          <TabsContent value="sessions" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base">
                    <Activity className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Active Sessions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">User Sessions</span>
                    <span className="font-medium text-sm">16</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">AI Sessions</span>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="font-medium text-sm">8</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Avg Session Time</span>
                    <span className="font-medium text-sm">2h 15m</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base">
                    <Power className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">AI System Status</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">AI Systems</span>
                    <div className="flex items-center space-x-2">
                      <Switch 
                        checked={aiSystemsActive} 
                        onCheckedChange={setAiSystemsActive}
                      />
                      <span className="text-sm">{aiSystemsActive ? "Active" : "Suspended"}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Ambient Border</span>
                    <div className="flex items-center space-x-1">
                      <div className={`w-2 h-2 rounded-full ${aiSystemsActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                      <span className="text-sm">{aiSystemsActive ? "Visible" : "Inactive"}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Emergency Mode</span>
                    <Badge variant={emergencyMode ? "destructive" : "default"} className="text-xs">
                      {emergencyMode ? "Active" : "Standby"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base">
                    <Shield className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Emergency Controls</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="w-full"
                    onClick={handleEmergencyLockdown}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Emergency Lockdown
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    <UserX className="h-4 w-4 mr-2" />
                    Terminate All Sessions
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    <Pause className="h-4 w-4 mr-2" />
                    Suspend AI Activity
                  </Button>
                </CardContent>
              </Card>
            </div>

            <DataTable
              title="Session Management"
              data={mockActiveSessions}
              columns={sessionColumns}
              actions={
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                  <Button variant="destructive" size="sm">
                    <Ban className="h-4 w-4 mr-2" />
                    Terminate Selected
                  </Button>
                </div>
              }
            />

            {/* Tenant Isolation */}
            <Card>
              <CardHeader>
                <CardTitle>Tenant Isolation Controls</CardTitle>
                <CardDescription>Isolate tenants in case of security breach or investigation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="tenant-id">Tenant ID</Label>
                      <Input id="tenant-id" placeholder="Enter tenant identifier..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="isolation-reason">Isolation Reason</Label>
                      <Input id="isolation-reason" placeholder="Security incident, investigation..." />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Isolation Level</Label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input type="radio" name="isolation" value="read-only" className="rounded" />
                        <span className="text-sm">Read-only Access (prevent data modifications)</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="radio" name="isolation" value="no-ai" className="rounded" />
                        <span className="text-sm">Disable AI Access (users only)</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input type="radio" name="isolation" value="full" className="rounded" />
                        <span className="text-sm">Full Isolation (block all access)</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="destructive" className="flex-1">
                      <Ban className="h-4 w-4 mr-2" />
                      Activate Isolation
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Remove Isolation
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="settings" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Audit Log Settings</CardTitle>
                  <CardDescription>Configure tamper-proof logging and retention</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="log-all-actions">Log All AI Actions</Label>
                    <Switch id="log-all-actions" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="log-user-actions">Log User Actions</Label>
                    <Switch id="log-user-actions" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="blockchain-anchor">Blockchain Anchoring</Label>
                    <Switch id="blockchain-anchor" defaultChecked />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="retention-period">Log Retention Period</Label>
                    <Input id="retention-period" value="7 years" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Anomaly Detection Settings</CardTitle>
                  <CardDescription>Configure AI behavior monitoring and alerts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="ai-behavior-monitoring">AI Behavior Monitoring</Label>
                    <Switch id="ai-behavior-monitoring" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="access-pattern-detection">Access Pattern Detection</Label>
                    <Switch id="access-pattern-detection" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="real-time-alerts">Real-time Alerts</Label>
                    <Switch id="real-time-alerts" defaultChecked />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="alert-threshold">Alert Sensitivity</Label>
                    <Input id="alert-threshold" value="Medium" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Session Control Settings</CardTitle>
                  <CardDescription>Configure session timeouts and security policies</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="session-timeout">Auto Session Timeout</Label>
                    <Switch id="session-timeout" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="ambient-border">AI Ambient Border</Label>
                    <Switch id="ambient-border" defaultChecked />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeout-duration">Timeout Duration (minutes)</Label>
                    <Input id="timeout-duration" value="30" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max-concurrent">Max Concurrent Sessions</Label>
                    <Input id="max-concurrent" value="5" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Integration Settings</CardTitle>
                  <CardDescription>Configure SIEM and external security tool integrations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="siem-endpoint">SIEM Endpoint</Label>
                    <Input id="siem-endpoint" placeholder="https://siem.company.com/api" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key</Label>
                    <Input id="api-key" type="password" placeholder="Enter SIEM API key..." />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-export">Auto Export to SIEM</Label>
                    <Switch id="auto-export" defaultChecked />
                  </div>
                  <Button className="w-full">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Test SIEM Connection
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}