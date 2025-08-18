import { useState } from "react";
import { Layout } from "@/components/Layout";
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
  Unlock
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Data Management</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive data management, backup, and compliance controls
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import Data
            </Button>
          </div>
        </div>

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
        <Tabs defaultValue="databases" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="databases">Databases</TabsTrigger>
            <TabsTrigger value="pipelines">Data Pipelines</TabsTrigger>
            <TabsTrigger value="backup">Backup & Recovery</TabsTrigger>
            <TabsTrigger value="retention">Data Retention</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

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