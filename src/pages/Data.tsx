import { useState } from "react";
import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/DataTable";
import { 
  Database, 
  Upload, 
  Download, 
  Trash2, 
  Shield, 
  RefreshCw, 
  BarChart3, 
  Clock, 
  HardDrive,
  FileText,
  AlertTriangle,
  CheckCircle,
  Settings,
  Copy,
  FileJson,
  FileSpreadsheet,
  Archive,
  History,
  Lock,
  Unlock,
  Plus,
  ExternalLink,
  Zap,
  MapPin,
  Link,
  Server,
  Cloud,
  Plug
} from "lucide-react";
import { DashboardCard } from "@/components/DashboardCard";

// Mock data for demonstration
const mockDatabases = [
  { id: "1", name: "Production", type: "PostgreSQL", size: "2.4 GB", status: "Active", lastBackup: "2 hours ago", connections: 45 },
  { id: "2", name: "Staging", type: "PostgreSQL", size: "1.2 GB", status: "Active", lastBackup: "4 hours ago", connections: 12 },
  { id: "3", name: "Analytics", type: "ClickHouse", size: "15.7 GB", status: "Active", lastBackup: "1 hour ago", connections: 8 },
  { id: "4", name: "Archive", type: "PostgreSQL", size: "45.2 GB", status: "Readonly", lastBackup: "12 hours ago", connections: 2 },
];

const mockDataPipelines = [
  { id: "1", name: "User Events ETL", source: "Production DB", target: "Analytics DB", status: "Running", lastRun: "5 mins ago", records: "1.2M" },
  { id: "2", name: "Daily Backup", source: "Production DB", target: "Archive Storage", status: "Scheduled", lastRun: "2 hours ago", records: "Full" },
  { id: "3", name: "Real-time Sync", source: "API Events", target: "Production DB", status: "Running", lastRun: "1 min ago", records: "15K/min" },
  { id: "4", name: "Compliance Export", source: "Production DB", target: "Compliance Storage", status: "Failed", lastRun: "6 hours ago", records: "0" },
];

const mockRetentionPolicies = [
  { id: "1", name: "User Activity Logs", retention: "90 days", type: "Time-based", status: "Active", dataSize: "2.1 GB" },
  { id: "2", name: "Transaction Records", retention: "7 years", type: "Compliance", status: "Active", dataSize: "890 MB" },
  { id: "3", name: "Session Data", retention: "30 days", type: "Time-based", status: "Active", dataSize: "145 MB" },
  { id: "4", name: "Audit Trails", retention: "Permanent", type: "Legal", status: "Active", dataSize: "5.4 GB" },
];

const mockConnections = [
  { id: "1", name: "Production PostgreSQL", type: "PostgreSQL", status: "Connected", host: "prod-db.company.com", lastSync: "2 mins ago", dataFlow: "Bidirectional" },
  { id: "2", name: "Analytics Warehouse", type: "BigQuery", status: "Connected", host: "analytics.googleapis.com", lastSync: "5 mins ago", dataFlow: "Inbound" },
  { id: "3", name: "CRM Integration", type: "Salesforce", status: "Connected", host: "company.salesforce.com", lastSync: "1 hour ago", dataFlow: "Bidirectional" },
  { id: "4", name: "Archive Storage", type: "S3", status: "Connected", host: "archive.s3.amazonaws.com", lastSync: "3 hours ago", dataFlow: "Outbound" },
  { id: "5", name: "Legacy MySQL", type: "MySQL", status: "Disconnected", host: "legacy-db.company.com", lastSync: "2 days ago", dataFlow: "Inbound" },
];

const mockDataSources = [
  { id: "1", name: "User Registration API", type: "REST API", target: "Production PostgreSQL", status: "Active", records: "1.2K/day" },
  { id: "2", name: "Transaction Events", type: "Webhook", target: "Analytics Warehouse", status: "Active", records: "8.5K/day" },
  { id: "3", name: "Customer Support CSV", type: "File Upload", target: "CRM Integration", status: "Pending", records: "0" },
  { id: "4", name: "Mobile App Analytics", type: "SDK", target: "Analytics Warehouse", status: "Active", records: "45K/day" },
];

const databaseColumns = [
  { key: "name", header: "Database Name", sortable: true },
  { key: "type", header: "Type", sortable: true },
  { key: "size", header: "Size", sortable: true },
  { key: "status", header: "Status", sortable: true, cell: (row: any) => (
    <Badge variant={row.status === "Active" ? "default" : "secondary"}>
      {row.status}
    </Badge>
  )},
  { key: "connections", header: "Connections", sortable: true },
  { key: "lastBackup", header: "Last Backup", sortable: true },
];

const pipelineColumns = [
  { key: "name", header: "Pipeline Name", sortable: true },
  { key: "source", header: "Source", sortable: true },
  { key: "target", header: "Target", sortable: true },
  { key: "status", header: "Status", sortable: true, cell: (row: any) => (
    <Badge variant={
      row.status === "Running" ? "default" : 
      row.status === "Failed" ? "destructive" : 
      "secondary"
    }>
      {row.status}
    </Badge>
  )},
  { key: "lastRun", header: "Last Run", sortable: true },
  { key: "records", header: "Records", sortable: true },
];

const retentionColumns = [
  { key: "name", header: "Policy Name", sortable: true },
  { key: "retention", header: "Retention Period", sortable: true },
  { key: "type", header: "Type", sortable: true },
  { key: "status", header: "Status", sortable: true, cell: (row: any) => (
    <Badge variant="default">{row.status}</Badge>
  )},
  { key: "dataSize", header: "Data Size", sortable: true },
];

const connectionColumns = [
  { key: "name", header: "Connection Name", sortable: true },
  { key: "type", header: "Type", sortable: true, cell: (row: any) => (
    <div className="flex items-center">
      {row.type === "PostgreSQL" && <Database className="h-4 w-4 mr-2" />}
      {row.type === "BigQuery" && <Cloud className="h-4 w-4 mr-2" />}
      {row.type === "Salesforce" && <ExternalLink className="h-4 w-4 mr-2" />}
      {row.type === "S3" && <Archive className="h-4 w-4 mr-2" />}
      {row.type === "MySQL" && <Database className="h-4 w-4 mr-2" />}
      {row.type}
    </div>
  )},
  { key: "status", header: "Status", sortable: true, cell: (row: any) => (
    <Badge variant={row.status === "Connected" ? "default" : "destructive"}>
      {row.status}
    </Badge>
  )},
  { key: "host", header: "Host", sortable: true },
  { key: "dataFlow", header: "Data Flow", sortable: true },
  { key: "lastSync", header: "Last Sync", sortable: true },
];

const dataSourceColumns = [
  { key: "name", header: "Source Name", sortable: true },
  { key: "type", header: "Type", sortable: true },
  { key: "target", header: "Target Database", sortable: true },
  { key: "status", header: "Status", sortable: true, cell: (row: any) => (
    <Badge variant={row.status === "Active" ? "default" : "secondary"}>
      {row.status}
    </Badge>
  )},
  { key: "records", header: "Records/Day", sortable: true },
];

export default function Data() {
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const [compressionEnabled, setCompressionEnabled] = useState(true);

  const handleBackup = () => {
    setBackupInProgress(true);
    setTimeout(() => setBackupInProgress(false), 3000);
  };

  return (
    <Layout>
      <div className="space-y-6 p-4 overflow-x-auto">
        <PageHeader 
          title="Data Management"
          description="Comprehensive data management, backup, and compliance controls"
        >
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import Data
          </Button>
        </PageHeader>

        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Total Storage"
            value="64.5 GB"
            icon={<HardDrive className="h-5 w-5" />}
            change="+2.1% from last month"
            trend="up"
            changeType="positive"
          />
          <DashboardCard
            title="Active Databases"
            value="3"
            icon={<Database className="h-5 w-5" />}
            change="No change"
            trend="flat"
            changeType="neutral"
          />
          <DashboardCard
            title="Data Pipelines"
            value="4"
            icon={<RefreshCw className="h-5 w-5" />}
            change="1 failed pipeline"
            trend="down"
            changeType="negative"
          />
          <DashboardCard
            title="Backup Health"
            value="98.5%"
            icon={<Shield className="h-5 w-5" />}
            change="All systems operational"
            trend="up"
            changeType="positive"
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="governance" className="space-y-4">
          <div className="overflow-x-auto">
            <TabsList className="grid w-full min-w-max grid-cols-9 mb-4">
              <TabsTrigger value="governance" className="text-xs sm:text-sm">Governance</TabsTrigger>
              <TabsTrigger value="knowledge" className="text-xs sm:text-sm">Knowledge Center</TabsTrigger>
              <TabsTrigger value="connections" className="text-xs sm:text-sm">Connections</TabsTrigger>
              <TabsTrigger value="import" className="text-xs sm:text-sm">Data Import</TabsTrigger>
              <TabsTrigger value="databases" className="text-xs sm:text-sm">Databases</TabsTrigger>
              <TabsTrigger value="pipelines" className="text-xs sm:text-sm">Pipelines</TabsTrigger>
              <TabsTrigger value="backup" className="text-xs sm:text-sm">Backup</TabsTrigger>
              <TabsTrigger value="retention" className="text-xs sm:text-sm">Retention</TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs sm:text-sm">Analytics</TabsTrigger>
            </TabsList>
          </div>

          {/* Dataset-level Governance Tab */}
          <TabsContent value="governance" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base">
                    <Shield className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Security Overview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Protected Objects</span>
                    <span className="font-medium text-sm">127</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Field-level Rules</span>
                    <span className="font-medium text-sm">2,439</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Access Violations</span>
                    <span className="font-medium text-sm text-red-600">3</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base">
                    <Lock className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Data Silos</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">HR Silo</span>
                    <Badge variant="default" className="text-xs">12 datasets</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Finance Silo</span>
                    <Badge variant="default" className="text-xs">8 datasets</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Product Silo</span>
                    <Badge variant="default" className="text-xs">15 datasets</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base">
                    <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Data Residency</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">On-premises</span>
                    <span className="font-medium text-sm">45%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Private Cloud</span>
                    <span className="font-medium text-sm">35%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground truncate">Region-specific</span>
                    <span className="font-medium text-sm">20%</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Object-level and Field-level Permissions */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Object-level Permissions</CardTitle>
                  <CardDescription className="text-sm">Control access to entire objects across all integrated systems</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { object: "Salesforce Accounts", read: true, create: true, edit: false, delete: false },
                      { object: "ERP Customer Records", read: true, create: false, edit: false, delete: false },
                      { object: "HR Employee Data", read: false, create: false, edit: false, delete: false },
                      { object: "Financial Transactions", read: true, create: false, edit: true, delete: false },
                    ].map((perm, index) => (
                      <div key={index} className="border rounded-lg p-3 space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <span className="font-medium text-sm truncate min-w-0 flex-1">{perm.object}</span>
                          <Button variant="outline" size="sm" className="text-xs w-full sm:w-auto">Configure</Button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center space-x-1">
                            <Switch checked={perm.read} />
                            <span className="truncate">Read</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Switch checked={perm.create} />
                            <span className="truncate">Create</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Switch checked={perm.edit} />
                            <span className="truncate">Edit</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Switch checked={perm.delete} />
                            <span className="truncate">Delete</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Field-level Security</CardTitle>
                  <CardDescription className="text-sm">Control access to individual fields within objects</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { field: "Account.Credit_Score__c", visible: false, aiAccess: false, masking: "Full" },
                      { field: "Contact.SSN__c", visible: false, aiAccess: false, masking: "Full" },
                      { field: "Transaction.Amount", visible: true, aiAccess: false, masking: "Partial" },
                      { field: "Employee.Salary", visible: false, aiAccess: false, masking: "Full" },
                    ].map((field, index) => (
                      <div key={index} className="border rounded-lg p-3 space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <span className="font-medium text-xs truncate min-w-0 flex-1">{field.field}</span>
                          <Badge variant={field.masking === "Full" ? "destructive" : field.masking === "Partial" ? "secondary" : "default"} className="text-xs">
                            {field.masking}
                          </Badge>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 text-xs">
                          <div className="flex items-center space-x-1">
                            <Switch checked={field.visible} />
                            <span className="truncate">User Visible</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Switch checked={field.aiAccess} />
                            <span className="truncate">AI Access</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Record-level Access and Dataset Permissions */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Record-level Access Rules</CardTitle>
                  <CardDescription>AI-aware sharing rules and restriction rules</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-3">
                      <h4 className="font-medium mb-2">Ownership-based Access</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Record Owner: Full Access</span>
                          <Badge variant="default">Active</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Manager Hierarchy: Read/Edit</span>
                          <Badge variant="default">Active</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Department Team: Read Only</span>
                          <Badge variant="default">Active</Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-3">
                      <h4 className="font-medium mb-2">AI Teammate Restrictions</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>AI can only access public records</span>
                          <Badge variant="default">Enforced</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Confidential data excluded from AI</span>
                          <Badge variant="default">Enforced</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Dataset Permissions</CardTitle>
                  <CardDescription>Assign read/write permissions per dataset</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { dataset: "Salesforce CRM", silo: "Sales", users: 24, aiTeammates: 3, permissions: "Read/Write" },
                      { dataset: "ERP Financial Data", silo: "Finance", users: 8, aiTeammates: 1, permissions: "Read Only" },
                      { dataset: "HR Employee Records", silo: "HR", users: 5, aiTeammates: 0, permissions: "Restricted" },
                      { dataset: "Product Documentation", silo: "Product", users: 15, aiTeammates: 2, permissions: "Read/Write" },
                    ].map((dataset, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-medium">{dataset.dataset}</span>
                            <Badge variant="outline" className="ml-2">{dataset.silo}</Badge>
                          </div>
                          <Badge variant={
                            dataset.permissions === "Read/Write" ? "default" :
                            dataset.permissions === "Read Only" ? "secondary" : "destructive"
                          }>
                            {dataset.permissions}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>{dataset.users} users</span>
                          <span>{dataset.aiTeammates} AI teammates</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Data Residency & Storage Location */}
            <Card>
              <CardHeader>
                <CardTitle>Data Residency & Storage Configuration</CardTitle>
                <CardDescription>Choose where your organization's data and embeddings are stored</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {[
                    { name: "On-premises", description: "Your own infrastructure", icon: Server, selected: true },
                    { name: "Private Cloud", description: "Dedicated cloud instance", icon: Cloud, selected: false },
                    { name: "Region-specific", description: "EU/US/APAC regions", icon: MapPin, selected: false },
                    { name: "Hybrid", description: "Mixed deployment", icon: Plug, selected: false },
                  ].map((option) => (
                    <Card key={option.name} className={`cursor-pointer transition-all ${option.selected ? 'ring-2 ring-primary' : 'hover:shadow-md'}`}>
                      <CardContent className="pt-6">
                        <div className="flex flex-col items-center text-center space-y-2">
                          <option.icon className="h-8 w-8 text-primary" />
                          <h3 className="font-medium">{option.name}</h3>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                          {option.selected && <CheckCircle className="h-4 w-4 text-green-600" />}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="mt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="byok">Bring Your Own Keys (BYOK)</Label>
                    <Switch id="byok" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="hsm">Hardware Security Module (HSM)</Label>
                    <Switch id="hsm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kms">Key Management Service</Label>
                    <Input id="kms" placeholder="Enter KMS endpoint..." />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Knowledge Center Management Tab */}
          <TabsContent value="knowledge" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Knowledge Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Documents</span>
                    <span className="font-medium">1,247</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Pending Approval</span>
                    <span className="font-medium text-orange-600">23</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Redacted Fields</span>
                    <span className="font-medium">156</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Lock className="h-5 w-5 mr-2" />
                    Knowledge Silos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Engineering Wiki</span>
                    <Badge variant="default">234 docs</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Sales Playbooks</span>
                    <Badge variant="default">89 docs</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">HR Policies</span>
                    <Badge variant="secondary">45 docs</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <History className="h-5 w-5 mr-2" />
                    Version Control
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Active Versions</span>
                    <span className="font-medium">1,247</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Archive Versions</span>
                    <span className="font-medium">3,891</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Rollbacks (30d)</span>
                    <span className="font-medium">12</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Knowledge Silos Management */}
            <Card>
              <CardHeader>
                <CardTitle>Knowledge Silos Management</CardTitle>
                <CardDescription>Organize documents into isolated knowledge centers with cross-contamination prevention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[
                    { name: "Engineering", docs: 234, size: "1.2 GB", access: "Engineering Team", aiAccess: true },
                    { name: "Sales", docs: 89, size: "456 MB", access: "Sales Team", aiAccess: true },
                    { name: "HR", docs: 45, size: "234 MB", access: "HR Only", aiAccess: false },
                    { name: "Finance", docs: 67, size: "789 MB", access: "Finance Team", aiAccess: false },
                    { name: "Product", docs: 156, size: "2.1 GB", access: "Product Team", aiAccess: true },
                    { name: "Legal", docs: 23, size: "123 MB", access: "Legal Only", aiAccess: false },
                  ].map((silo) => (
                    <Card key={silo.name} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <h3 className="font-medium">{silo.name}</h3>
                            <Badge variant={silo.aiAccess ? "default" : "secondary"}>
                              {silo.aiAccess ? "AI Enabled" : "AI Restricted"}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex justify-between">
                              <span>Documents:</span>
                              <span>{silo.docs}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Size:</span>
                              <span>{silo.size}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Access:</span>
                              <span>{silo.access}</span>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" className="w-full">
                            Manage Silo
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Versioning and Approvals */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Document Approval Workflow</CardTitle>
                  <CardDescription>New knowledge ingestion requires approval before AI processing</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { doc: "Q4 Sales Training Video", type: "Video", status: "Pending", submitter: "John Smith", date: "2 hours ago" },
                      { doc: "Updated Privacy Policy", type: "PDF", status: "Approved", submitter: "Legal Team", date: "1 day ago" },
                      { doc: "Product Roadmap 2024", type: "Document", status: "Rejected", submitter: "Product Team", date: "3 days ago" },
                      { doc: "Customer Support SOP", type: "Wiki", status: "Pending", submitter: "Support Team", date: "5 hours ago" },
                    ].map((doc, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-medium text-sm">{doc.doc}</span>
                            <Badge variant="outline" className="ml-2">{doc.type}</Badge>
                          </div>
                          <Badge variant={
                            doc.status === "Approved" ? "default" :
                            doc.status === "Pending" ? "secondary" : "destructive"
                          }>
                            {doc.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>By {doc.submitter}</span>
                          <span>{doc.date}</span>
                        </div>
                        {doc.status === "Pending" && (
                          <div className="flex space-x-2 mt-2">
                            <Button variant="outline" size="sm" className="flex-1">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                            <Button variant="destructive" size="sm" className="flex-1">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Version History & Rollback</CardTitle>
                  <CardDescription>Track changes and rollback to previous states</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { version: "v2.1", doc: "Employee Handbook", change: "Added remote work policy", date: "2 days ago", active: true },
                      { version: "v2.0", doc: "Employee Handbook", change: "Updated benefits section", date: "1 week ago", active: false },
                      { version: "v1.9", doc: "Employee Handbook", change: "Compliance updates", date: "2 weeks ago", active: false },
                      { version: "v1.8", doc: "Employee Handbook", change: "Initial version", date: "1 month ago", active: false },
                    ].map((version, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-medium text-sm">{version.version}</span>
                            {version.active && <Badge variant="default" className="ml-2">Active</Badge>}
                          </div>
                          <span className="text-xs text-muted-foreground">{version.date}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{version.change}</p>
                        {!version.active && (
                          <Button variant="outline" size="sm">
                            <History className="h-3 w-3 mr-1" />
                            Rollback
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sensitive Data Redaction */}
            <Card>
              <CardHeader>
                <CardTitle>Sensitive Data Redaction Rules</CardTitle>
                <CardDescription>Automatically mask sensitive information before AI processing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <h4 className="font-medium">Active Redaction Rules</h4>
                    {[
                      { pattern: "SSN Pattern", regex: "\\d{3}-\\d{2}-\\d{4}", matches: 247, status: "Active" },
                      { pattern: "Credit Card", regex: "\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}", matches: 89, status: "Active" },
                      { pattern: "Bank Account", regex: "\\d{8,17}", matches: 156, status: "Active" },
                      { pattern: "Email Address", regex: "[\\w.-]+@[\\w.-]+\\.[a-zA-Z]{2,}", matches: 1247, status: "Active" },
                    ].map((rule, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{rule.pattern}</span>
                          <Badge variant="default">{rule.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2 font-mono">{rule.regex}</p>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">{rule.matches} matches found</span>
                          <Button variant="outline" size="sm">Edit Rule</Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Redaction Preview</h4>
                    <div className="border rounded-lg p-3 bg-muted/30">
                      <p className="text-sm mb-2 font-medium">Original Text:</p>
                      <p className="text-sm mb-4 font-mono">
                        "Customer John Doe (SSN: 123-45-6789) paid $1,250 using card 4532-1234-5678-9012 to account 987654321."
                      </p>
                      <p className="text-sm mb-2 font-medium">AI Sees:</p>
                      <p className="text-sm font-mono">
                        "Customer John Doe (SSN: ***-**-****) paid $1,250 using card ****-****-****-**** to account *********."
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-pattern">Add New Pattern</Label>
                      <Input id="new-pattern" placeholder="Enter regex pattern..." />
                      <Button size="sm" className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Redaction Rule
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Retention Simulation */}
            <Card>
              <CardHeader>
                <CardTitle>Retention Policy Playground</CardTitle>
                <CardDescription>Simulate the effects of retention policies before they go live</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="sim-dataset">Dataset</Label>
                      <Input id="sim-dataset" placeholder="Select dataset..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sim-retention">Retention Period</Label>
                      <Input id="sim-retention" placeholder="e.g., 90 days, 7 years" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sim-action">Action</Label>
                      <Input id="sim-action" placeholder="Anonymize or Purge" />
                    </div>
                  </div>

                  <Button className="w-full">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Run Simulation
                  </Button>

                  <div className="border rounded-lg p-4 bg-muted/30">
                    <h4 className="font-medium mb-3">Simulation Results</h4>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Records to be affected:</span>
                          <span className="font-medium">1,247,892</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Storage reduction:</span>
                          <span className="font-medium text-green-600">-2.4 GB</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Estimated cost savings:</span>
                          <span className="font-medium text-green-600">$340/month</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>AI context freshness:</span>
                          <span className="font-medium text-green-600">+15%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Compliance risk:</span>
                          <span className="font-medium text-green-600">-23%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Query performance:</span>
                          <span className="font-medium text-green-600">+8%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Database Connections Tab */}
          <TabsContent value="connections" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Plug className="h-5 w-5 mr-2" />
                    Connection Health
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Active Connections</span>
                    <span className="font-medium text-green-600">4</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Failed Connections</span>
                    <span className="font-medium text-red-600">1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg Response Time</span>
                    <span className="font-medium">234ms</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="h-5 w-5 mr-2" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Database Connection
                  </Button>
                  <Button className="w-full justify-start" variant="outline" size="sm">
                    <Cloud className="h-4 w-4 mr-2" />
                    Connect Cloud Service
                  </Button>
                  <Button className="w-full justify-start" variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Test All Connections
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Data Routing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Auto-routing Rules</span>
                    <span className="font-medium">12</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Data Transformations</span>
                    <span className="font-medium">8</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Routing Success Rate</span>
                    <span className="font-medium text-green-600">99.2%</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DataTable
              title="Database Connections"
              data={mockConnections}
              columns={connectionColumns}
              actions={
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Test All
                  </Button>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Connection
                  </Button>
                </div>
              }
            />

            {/* Connection Setup Wizard */}
            <Card>
              <CardHeader>
                <CardTitle>Add New Database Connection</CardTitle>
                <CardDescription>Connect Otzar to external databases and services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {[
                    { name: "PostgreSQL", icon: Database, description: "Production-ready relational database" },
                    { name: "MySQL", icon: Database, description: "Popular open-source database" },
                    { name: "MongoDB", icon: Server, description: "Document-based NoSQL database" },
                    { name: "BigQuery", icon: Cloud, description: "Google's data warehouse solution" },
                    { name: "Snowflake", icon: Cloud, description: "Cloud data platform" },
                    { name: "Salesforce", icon: ExternalLink, description: "CRM and sales automation" },
                    { name: "Amazon S3", icon: Archive, description: "Object storage service" },
                    { name: "Custom API", icon: Link, description: "REST/GraphQL API integration" },
                  ].map((service) => (
                    <Card key={service.name} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex flex-col items-center text-center space-y-2">
                          <service.icon className="h-8 w-8 text-primary" />
                          <h3 className="font-medium">{service.name}</h3>
                          <p className="text-xs text-muted-foreground">{service.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Import Tab */}
          <TabsContent value="import" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Manual Data Import</CardTitle>
                  <CardDescription>Upload files and configure data routing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Drag and drop files here, or click to browse
                    </p>
                    <Button variant="outline" size="sm">
                      Choose Files
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                      Supports CSV, JSON, Excel, Parquet files up to 100MB
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="target-db">Target Database</Label>
                    <Input id="target-db" placeholder="Select destination database..." />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="table-name">Table Name</Label>
                    <Input id="table-name" placeholder="Enter table name..." />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="auto-create">Auto-create table if not exists</Label>
                    <Switch id="auto-create" defaultChecked />
                  </div>

                  <Button className="w-full">
                    <Upload className="h-4 w-4 mr-2" />
                    Start Import
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Import History</CardTitle>
                  <CardDescription>Recent data import operations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { file: "customers.csv", status: "Completed", records: "1,234", time: "2 hours ago", target: "Production PostgreSQL" },
                      { file: "transactions.json", status: "In Progress", records: "890/2,100", time: "5 mins ago", target: "Analytics Warehouse" },
                      { file: "products.xlsx", status: "Failed", records: "0", time: "1 day ago", target: "CRM Integration" },
                      { file: "users.csv", status: "Completed", records: "5,678", time: "2 days ago", target: "Production PostgreSQL" },
                    ].map((import_item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center space-x-3">
                          <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">{import_item.file}</div>
                            <div className="text-xs text-muted-foreground">
                              {import_item.target} • {import_item.time}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={
                            import_item.status === "Completed" ? "default" :
                            import_item.status === "Failed" ? "destructive" : "secondary"
                          }>
                            {import_item.status}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            {import_item.records} records
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <DataTable
              title="Active Data Sources"
              data={mockDataSources}
              columns={dataSourceColumns}
              actions={
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <MapPin className="h-4 w-4 mr-2" />
                    Configure Routing
                  </Button>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Data Source
                  </Button>
                </div>
              }
            />

            {/* Data Routing Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Automatic Data Routing Rules</CardTitle>
                <CardDescription>Configure how incoming data is automatically routed to databases</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { source: "User Registration API", condition: "user_type = 'customer'", target: "Production PostgreSQL", action: "Insert into customers table" },
                    { source: "Transaction Events", condition: "amount > 1000", target: "Analytics Warehouse", action: "Store for analysis" },
                    { source: "Support Tickets", condition: "priority = 'high'", target: "CRM Integration", action: "Create case in Salesforce" },
                  ].map((rule, i) => (
                    <div key={i} className="p-4 border rounded space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{rule.source}</span>
                        <Badge variant="outline">Active</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <strong>Condition:</strong> {rule.condition}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <strong>Target:</strong> {rule.target}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <strong>Action:</strong> {rule.action}
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Routing Rule
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Databases Tab */}
          <TabsContent value="databases" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="h-5 w-5 mr-2" />
                    Database Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Connections</span>
                    <span className="font-medium">67</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Query Performance</span>
                    <span className="font-medium text-green-600">Excellent</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Uptime</span>
                    <span className="font-medium">99.9%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>CPU Usage</span>
                      <span>34%</span>
                    </div>
                    <Progress value={34} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Memory Usage</span>
                      <span>67%</span>
                    </div>
                    <Progress value={67} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Disk I/O</span>
                      <span>23%</span>
                    </div>
                    <Progress value={23} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Security Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Encryption at Rest</span>
                    <Switch checked={encryptionEnabled} onCheckedChange={setEncryptionEnabled} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">SSL Connections</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Access Logs</span>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <DataTable
              title="Database Instances"
              data={mockDatabases}
              columns={databaseColumns}
              actions={
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure
                  </Button>
                  <Button size="sm">
                    <Database className="h-4 w-4 mr-2" />
                    New Database
                  </Button>
                </div>
              }
            />
          </TabsContent>

          {/* Data Pipelines Tab */}
          <TabsContent value="pipelines" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Pipeline Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Running</span>
                      <Badge variant="default">2</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Scheduled</span>
                      <Badge variant="secondary">1</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Failed</span>
                      <Badge variant="destructive">1</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data Throughput</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Records/Hour</span>
                      <span className="font-medium">1.2M</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Data Volume/Day</span>
                      <span className="font-medium">450 GB</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Success Rate</span>
                      <span className="font-medium text-green-600">99.2%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <DataTable
              title="Data Pipelines"
              data={mockDataPipelines}
              columns={pipelineColumns}
              actions={
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh All
                  </Button>
                  <Button size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    New Pipeline
                  </Button>
                </div>
              }
            />
          </TabsContent>

          {/* Backup & Recovery Tab */}
          <TabsContent value="backup" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Backup Configuration</CardTitle>
                  <CardDescription>Configure automatic backup settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="backup-frequency">Backup Frequency</Label>
                    <Input id="backup-frequency" value="Every 6 hours" readOnly />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="retention-period">Retention Period</Label>
                    <Input id="retention-period" value="30 days" readOnly />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="compression">Enable Compression</Label>
                    <Switch checked={compressionEnabled} onCheckedChange={setCompressionEnabled} />
                  </div>
                  <Separator />
                  <Button 
                    onClick={handleBackup} 
                    disabled={backupInProgress}
                    className="w-full"
                  >
                    {backupInProgress ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Backup in Progress...
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4 mr-2" />
                        Create Manual Backup
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Backups</CardTitle>
                  <CardDescription>Latest backup operations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { time: "2 hours ago", size: "2.4 GB", status: "Success" },
                      { time: "8 hours ago", size: "2.3 GB", status: "Success" },
                      { time: "14 hours ago", size: "2.3 GB", status: "Success" },
                      { time: "20 hours ago", size: "2.2 GB", status: "Warning" },
                    ].map((backup, i) => (
                      <div key={i} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center space-x-2">
                          <Archive className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">{backup.time}</div>
                            <div className="text-xs text-muted-foreground">{backup.size}</div>
                          </div>
                        </div>
                        <Badge variant={backup.status === "Success" ? "default" : "secondary"}>
                          {backup.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Disaster Recovery</CardTitle>
                <CardDescription>Recovery point and time objectives</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-green-600">&lt; 1 hour</div>
                    <div className="text-sm text-muted-foreground">Recovery Time Objective</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-blue-600">&lt; 15 min</div>
                    <div className="text-sm text-muted-foreground">Recovery Point Objective</div>
                  </div>
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-purple-600">99.9%</div>
                    <div className="text-sm text-muted-foreground">Backup Success Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Retention Tab */}
          <TabsContent value="retention" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Retention Policy Management</CardTitle>
                <CardDescription>Configure data lifecycle and retention policies</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <Label>Default Retention Period</Label>
                      <Input value="90 days" className="mt-1" />
                    </div>
                    <div>
                      <Label>Archive After</Label>
                      <Input value="1 year" className="mt-1" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Auto-archive old data</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Compress archived data</Label>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <DataTable
              title="Retention Policies"
              data={mockRetentionPolicies}
              columns={retentionColumns}
              actions={
                <Button size="sm">
                  <Clock className="h-4 w-4 mr-2" />
                  New Policy
                </Button>
              }
            />
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Compliance Status</CardTitle>
                  <CardDescription>Data protection and regulatory compliance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { name: "GDPR", status: "Compliant", color: "text-green-600" },
                    { name: "CCPA", status: "Compliant", color: "text-green-600" },
                    { name: "SOX", status: "Compliant", color: "text-green-600" },
                    { name: "HIPAA", status: "Under Review", color: "text-yellow-600" },
                  ].map((compliance, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="font-medium">{compliance.name}</span>
                      <span className={`text-sm ${compliance.color}`}>{compliance.status}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Audit Trail</CardTitle>
                  <CardDescription>Data access and modification logs</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { action: "Data Export", user: "admin@company.com", time: "2 hours ago" },
                      { action: "User Data Deletion", user: "dpo@company.com", time: "4 hours ago" },
                      { action: "Access Policy Update", user: "security@company.com", time: "1 day ago" },
                    ].map((audit, i) => (
                      <div key={i} className="p-2 border rounded text-sm">
                        <div className="font-medium">{audit.action}</div>
                        <div className="text-muted-foreground">
                          {audit.user} • {audit.time}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Data Subject Rights</CardTitle>
                <CardDescription>Handle data subject requests and privacy rights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                    <Download className="h-6 w-6" />
                    <span>Data Export</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                    <Trash2 className="h-6 w-6" />
                    <span>Right to Erasure</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                    <Lock className="h-6 w-6" />
                    <span>Data Portability</span>
                  </Button>
                  <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
                    <FileText className="h-6 w-6" />
                    <span>Access Request</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <DashboardCard
                title="Data Growth Rate"
                value="+12.5%"
                icon={<BarChart3 className="h-5 w-5" />}
                change="Monthly growth"
                trend="up"
                changeType="positive"
              />
              <DashboardCard
                title="Query Performance"
                value="45ms"
                icon={<Clock className="h-5 w-5" />}
                change="Average response time"
                trend="flat"
                changeType="neutral"
              />
              <DashboardCard
                title="Storage Efficiency"
                value="78%"
                icon={<HardDrive className="h-5 w-5" />}
                change="Compression ratio"
                trend="up"
                changeType="positive"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Data Usage Analytics</CardTitle>
                <CardDescription>Insights into data access patterns and usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-3">Top Accessed Tables</h4>
                    <div className="space-y-2">
                      {[
                        { name: "users", queries: "1.2K", percentage: 45 },
                        { name: "orders", queries: "890", percentage: 33 },
                        { name: "products", queries: "567", percentage: 21 },
                        { name: "sessions", queries: "234", percentage: 9 },
                      ].map((table, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-sm">{table.name}</span>
                          <div className="flex items-center space-x-2">
                            <Progress value={table.percentage} className="w-16 h-2" />
                            <span className="text-xs text-muted-foreground">{table.queries}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Storage Distribution</h4>
                    <div className="space-y-2">
                      {[
                        { name: "User Data", size: "24.5 GB", percentage: 38 },
                        { name: "Media Files", size: "18.2 GB", percentage: 28 },
                        { name: "Logs", size: "12.8 GB", percentage: 20 },
                        { name: "Backups", size: "9.0 GB", percentage: 14 },
                      ].map((storage, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-sm">{storage.name}</span>
                          <div className="flex items-center space-x-2">
                            <Progress value={storage.percentage} className="w-16 h-2" />
                            <span className="text-xs text-muted-foreground">{storage.size}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}