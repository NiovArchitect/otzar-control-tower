import { Users as UsersIcon, UserPlus, Shield, Settings, Search, MoreHorizontal, Edit, Trash2, Lock, Eye, Mail, Phone, Key, Globe, Clock, UserCheck, AlertTriangle, Plus, Filter } from "lucide-react"
import { DashboardCard } from "@/components/DashboardCard"
import { DataTable } from "@/components/DataTable"
import { StatusBadge } from "@/components/StatusBadge"
import { PageHeader } from "@/components/PageHeader"
import { Layout } from "@/components/Layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Mock user data with enhanced fields
const usersData = [
  {
    id: "USR-001",
    name: "Sarah Martinez",
    username: "smartinez",
    email: "sarah.martinez@company.com",
    role: "Design Manager",
    profile: "Design Lead Profile", 
    department: "Design",
    userType: "internal",
    status: "active",
    lastLogin: "2 min ago",
    aiTeammate: "Creative AI-01",
    permissions: ["Design Tools", "File Management", "Team Lead"],
    permissionSets: ["Creative Suite Access", "Team Management"],
    sessionPolicy: "Standard MFA",
    ipRestrictions: "Office Network",
    avatar: "/placeholder.svg?height=32&width=32",
    delegatedAdmin: false,
    hierarchy: "L3 - Manager"
  },
  {
    id: "USR-002", 
    name: "John Doe",
    username: "jdoe",
    email: "john.doe@company.com",
    role: "Sales Representative",
    profile: "Sales Rep Profile",
    department: "Sales",
    userType: "internal",
    status: "active",
    lastLogin: "5 min ago",
    aiTeammate: "Sales AI-12",
    permissions: ["CRM Access", "Lead Management"],
    permissionSets: ["Salesforce Access", "Lead Qualification"],
    sessionPolicy: "Enhanced Security",
    ipRestrictions: "Global Access",
    avatar: "/placeholder.svg?height=32&width=32",
    delegatedAdmin: false,
    hierarchy: "L2 - Individual Contributor"
  },
  {
    id: "USR-003",
    name: "Angela Chen",
    username: "achen",
    email: "angela.chen@company.com", 
    role: "Data Analyst",
    profile: "Analytics Profile",
    department: "Analytics",
    userType: "internal",
    status: "inactive",
    lastLogin: "2 hours ago",
    aiTeammate: "Analytics AI-03",
    permissions: ["Data Access", "Reporting"],
    permissionSets: ["BI Tools Access", "Data Export"],
    sessionPolicy: "Standard",
    ipRestrictions: "Office Network",
    avatar: "/placeholder.svg?height=32&width=32",
    delegatedAdmin: false,
    hierarchy: "L2 - Individual Contributor"
  },
  {
    id: "USR-004",
    name: "Mark Wilson",
    username: "mwilson",
    email: "mark.wilson@company.com",
    role: "Marketing Lead", 
    profile: "Marketing Lead Profile",
    department: "Marketing",
    userType: "internal",
    status: "active",
    lastLogin: "1 min ago",
    aiTeammate: "Marketing AI-07",
    permissions: ["Marketing Tools", "Campaign Management", "Team Lead"],
    permissionSets: ["Marketing Automation", "Team Management", "Budget Access"],
    sessionPolicy: "Standard MFA",
    ipRestrictions: "Office + VPN",
    avatar: "/placeholder.svg?height=32&width=32",
    delegatedAdmin: true,
    hierarchy: "L3 - Manager"
  },
  {
    id: "USR-005",
    name: "Lisa Park",
    username: "lpark",
    email: "lisa.park@company.com",
    role: "Security Admin",
    profile: "Security Admin Profile",
    department: "IT Security",
    userType: "internal",
    status: "active", 
    lastLogin: "15 min ago",
    aiTeammate: "Security AI-05",
    permissions: ["Security Admin", "System Access", "Audit Logs"],
    permissionSets: ["Full System Access", "Security Management", "Audit Trail"],
    sessionPolicy: "High Security",
    ipRestrictions: "Secure Network Only",
    avatar: "/placeholder.svg?height=32&width=32",
    delegatedAdmin: true,
    hierarchy: "L4 - Director"
  },
  {
    id: "USR-006",
    name: "David Kumar",
    username: "dkumar",
    email: "david.kumar@company.com",
    role: "Product Manager",
    profile: "Product Manager Profile",
    department: "Product",
    userType: "external",
    status: "pending",
    lastLogin: "Never",
    aiTeammate: "Product AI-09",
    permissions: ["Product Planning", "Roadmap Access"],
    permissionSets: ["Product Suite Access"],
    sessionPolicy: "Guest Policy",
    ipRestrictions: "Restricted Access",
    avatar: "/placeholder.svg?height=32&width=32",
    delegatedAdmin: false,
    hierarchy: "L3 - Manager"
  },
  {
    id: "USR-007",
    name: "Emily Rodriguez",
    username: "erodriguez",
    email: "emily.rodriguez@partner.com",
    role: "External Consultant",
    profile: "External User Profile",
    department: "Consulting",
    userType: "guest",
    status: "active",
    lastLogin: "30 min ago",
    aiTeammate: "Consultant AI-11",
    permissions: ["Limited Access", "Consultation Tools"],
    permissionSets: ["Guest Access"],
    sessionPolicy: "Guest Policy",
    ipRestrictions: "VPN Required",
    avatar: "/placeholder.svg?height=32&width=32",
    delegatedAdmin: false,
    hierarchy: "L1 - Guest"
  }
]

const userColumns = [
  {
    key: "user",
    header: "User Information",
    cell: (row: any) => (
      <div className="flex items-center space-x-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={row.avatar} alt={row.name} />
          <AvatarFallback className="text-xs">
            {row.name.split(' ').map((n: string) => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium text-foreground">{row.name}</div>
          <div className="text-xs text-muted-foreground">{row.username} • {row.email}</div>
          <div className="text-xs text-muted-foreground">ID: {row.id}</div>
        </div>
      </div>
    ),
  },
  {
    key: "role",
    header: "Role & Profile", 
    cell: (row: any) => (
      <div>
        <div className="font-medium text-foreground">{row.role}</div>
        <div className="text-xs text-muted-foreground">{row.profile}</div>
        <div className="text-xs text-muted-foreground">Hierarchy: {row.hierarchy}</div>
      </div>
    ),
  },
  {
    key: "userType",
    header: "User Type",
    cell: (row: any) => (
      <Badge 
        variant={row.userType === "internal" ? "default" : row.userType === "external" ? "secondary" : "outline"}
        className="text-xs"
      >
        {row.userType ? row.userType.charAt(0).toUpperCase() + row.userType.slice(1) : 'Unknown'}
      </Badge>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (row: any) => (
      <StatusBadge status={row.status as any}>
        {row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1) : 'Unknown'}
      </StatusBadge>
    ),
  },
  {
    key: "lastLogin", 
    header: "Last Login",
  },
  {
    key: "delegatedAdmin",
    header: "Admin Rights",
    cell: (row: any) => (
      row.delegatedAdmin ? (
        <Badge variant="default" className="text-xs">
          <UserCheck className="w-3 h-3 mr-1" />
          Delegated Admin
        </Badge>
      ) : (
        <span className="text-xs text-muted-foreground">Standard User</span>
      )
    ),
  },
]

const roleData = [
  { name: "Admins", count: 5, color: "hsl(var(--chart-1))" },
  { name: "Team Leads", count: 12, color: "hsl(var(--chart-2))" },
  { name: "Members", count: 89, color: "hsl(var(--chart-3))" },
  { name: "Guests", count: 23, color: "hsl(var(--chart-4))" },
]

export default function Users() {
  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader 
          title="Users & Identity Management"
          description="Manage user accounts, roles, and AI teammate assignments"
        >
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Bulk Actions
          </Button>
          <Button variant="enterprise">
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </PageHeader>

        {/* Advanced Management Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="shadow-card border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-sm font-medium">Profiles & Permission Sets</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">47</div>
            <p className="text-xs text-muted-foreground">Active permission profiles</p>
            <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto">
              <Settings className="h-3 w-3 mr-1" />
              Manage Profiles
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-card border-l-4 border-l-chart-2">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Key className="h-5 w-5 text-chart-2" />
              <CardTitle className="text-sm font-medium">Delegated Admins</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">12</div>
            <p className="text-xs text-muted-foreground">Department administrators</p>
            <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto">
              <UserCheck className="h-3 w-3 mr-1" />
              View Admins
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-card border-l-4 border-l-chart-3">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-chart-3" />
              <CardTitle className="text-sm font-medium">Session Policies</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">8</div>
            <p className="text-xs text-muted-foreground">Active security policies</p>
            <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto">
              <Lock className="h-3 w-3 mr-1" />
              Configure
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-card border-l-4 border-l-chart-4">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-chart-4" />
              <CardTitle className="text-sm font-medium">Role Hierarchy</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">5</div>
            <p className="text-xs text-muted-foreground">Organizational levels</p>
            <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto">
              <Settings className="h-3 w-3 mr-1" />
              View Hierarchy
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full justify-start">
              <UserPlus className="h-4 w-4 mr-2" />
              Create New User
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Shield className="h-4 w-4 mr-2" />
              Assign Permissions
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Key className="h-4 w-4 mr-2" />
              Reset Password
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Security Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Failed logins</span>
                <Badge variant="outline" className="text-xs">3</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Expired sessions</span>
                <Badge variant="outline" className="text-xs">7</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Policy violations</span>
                <Badge variant="outline" className="text-xs">0</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center">
              <Globe className="h-4 w-4 mr-2" />
              IP & Access Control
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Office network</span>
                <Badge variant="default" className="text-xs">124 users</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">VPN access</span>
                <Badge variant="secondary" className="text-xs">45 users</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Restricted</span>
                <Badge variant="outline" className="text-xs">8 users</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Search and Filters */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">User Management Console</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name, username, email, or ID..." 
                  className="pl-10 w-80"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Advanced Filters
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Bulk Actions
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Enhanced Users Table with Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All Users ({usersData.length})</TabsTrigger>
          <TabsTrigger value="internal">Internal ({usersData.filter(u => u.userType === "internal").length})</TabsTrigger>
          <TabsTrigger value="external">External ({usersData.filter(u => u.userType === "external").length})</TabsTrigger>
          <TabsTrigger value="guest">Guest ({usersData.filter(u => u.userType === "guest").length})</TabsTrigger>
          <TabsTrigger value="admins">Admins ({usersData.filter(u => u.delegatedAdmin).length})</TabsTrigger>
          <TabsTrigger value="inactive">Inactive ({usersData.filter(u => u.status === "inactive").length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <DataTable
            title=""
            data={usersData}
            columns={userColumns}
            actions={
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit User
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Manage Permissions
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-status-warning">
                    <Lock className="mr-2 h-4 w-4" />
                    Suspend User
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-status-danger">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete User
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            }
          />
        </TabsContent>

        <TabsContent value="internal">
          <DataTable
            title=""
            data={usersData.filter(user => user.userType === "internal")}
            columns={userColumns}
            actions={
              <Button variant="default" size="sm">
                Manage Internal Users
              </Button>
            }
          />
        </TabsContent>

        <TabsContent value="external">
          <DataTable
            title=""
            data={usersData.filter(user => user.userType === "external")}
            columns={userColumns}
            actions={
              <Button variant="default" size="sm">
                Manage External Users
              </Button>
            }
          />
        </TabsContent>

        <TabsContent value="guest">
          <DataTable
            title=""
            data={usersData.filter(user => user.userType === "guest")}
            columns={userColumns}
            actions={
              <Button variant="default" size="sm">
                Manage Guest Access
              </Button>
            }
          />
        </TabsContent>

        <TabsContent value="admins">
          <DataTable
            title=""
            data={usersData.filter(user => user.delegatedAdmin)}
            columns={userColumns}
            actions={
              <Button variant="default" size="sm">
                Admin Privileges
              </Button>
            }
          />
        </TabsContent>

        <TabsContent value="inactive">
          <DataTable
            title=""
            data={usersData.filter(user => user.status === "inactive")}
            columns={userColumns}
            actions={
              <Button variant="default" size="sm">
                Activate Users
              </Button>
            }
          />
        </TabsContent>
      </Tabs>

      {/* Advanced Management Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Permission Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg border bg-card">
                  <div className="text-sm font-medium text-foreground">Active Profiles</div>
                  <div className="text-2xl font-bold text-foreground mt-1">24</div>
                  <div className="text-xs text-muted-foreground">Standard permission profiles</div>
                </div>
                <div className="p-3 rounded-lg border bg-card">
                  <div className="text-sm font-medium text-foreground">Permission Sets</div>
                  <div className="text-2xl font-bold text-foreground mt-1">67</div>
                  <div className="text-xs text-muted-foreground">Granular access controls</div>
                </div>
              </div>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Profile
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Permission Sets
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              Session & Security Policies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-2 rounded border">
                  <div>
                    <div className="text-sm font-medium text-foreground">Standard Policy</div>
                    <div className="text-xs text-muted-foreground">8hr timeout, office IP</div>
                  </div>
                  <Badge variant="default" className="text-xs">89 users</Badge>
                </div>
                <div className="flex justify-between items-center p-2 rounded border">
                  <div>
                    <div className="text-sm font-medium text-foreground">Enhanced Security</div>
                    <div className="text-xs text-muted-foreground">4hr timeout, MFA required</div>
                  </div>
                  <Badge variant="secondary" className="text-xs">45 users</Badge>
                </div>
                <div className="flex justify-between items-center p-2 rounded border">
                  <div>
                    <div className="text-sm font-medium text-foreground">Guest Policy</div>
                    <div className="text-xs text-muted-foreground">2hr timeout, restricted access</div>
                  </div>
                  <Badge variant="outline" className="text-xs">12 users</Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Lock className="h-4 w-4 mr-2" />
                Configure Policies
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center">
              <UserCheck className="h-5 w-5 mr-2" />
              Delegated Administration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {usersData.filter(user => user.delegatedAdmin).map((admin) => (
                <div key={admin.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={admin.avatar} alt={admin.name} />
                      <AvatarFallback className="text-xs">
                        {admin.name.split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-foreground text-sm">{admin.name}</div>
                      <div className="text-xs text-muted-foreground">{admin.department} Admin</div>
                    </div>
                  </div>
                  <Badge variant="default" className="text-xs">
                    {admin.hierarchy}
                  </Badge>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Plus className="h-4 w-4 mr-2" />
                Grant Admin Rights
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center">
              <Key className="h-5 w-5 mr-2" />
              Role Hierarchy Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 rounded border">
                  <span className="text-sm font-medium text-foreground">L4 - Director</span>
                  <Badge variant="default" className="text-xs">2 users</Badge>
                </div>
                <div className="flex justify-between items-center p-2 rounded border ml-4">
                  <span className="text-sm font-medium text-foreground">L3 - Manager</span>
                  <Badge variant="secondary" className="text-xs">8 users</Badge>
                </div>
                <div className="flex justify-between items-center p-2 rounded border ml-8">
                  <span className="text-sm font-medium text-foreground">L2 - Individual Contributor</span>
                  <Badge variant="outline" className="text-xs">134 users</Badge>
                </div>
                <div className="flex justify-between items-center p-2 rounded border ml-2">
                  <span className="text-sm font-medium text-foreground">L1 - Guest</span>
                  <Badge variant="outline" className="text-xs">12 users</Badge>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Settings className="h-4 w-4 mr-2" />
                Manage Hierarchy
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </Layout>
  )
}