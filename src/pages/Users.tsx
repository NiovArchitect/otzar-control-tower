import { Users as UsersIcon, UserPlus, Shield, Settings, Search, MoreHorizontal, Edit, Trash2, Lock, Eye, Mail, Phone, Key, Globe, Clock, UserCheck, AlertTriangle, Plus, Filter, Building2, Zap } from "lucide-react"
import { DashboardCard } from "@/components/DashboardCard"
import { DataTable } from "@/components/DataTable"
import { StatusBadge } from "@/components/StatusBadge"
import { PageHeader } from "@/components/PageHeader"
import { Layout } from "@/components/Layout"
import { RoleHierarchyTree } from "@/components/RoleHierarchyTree"
import { PermissionMatrix } from "@/components/PermissionMatrix"
import { ApprovalWorkflow } from "@/components/ApprovalWorkflow"
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { useState } from "react"

// Enhanced user data with sophisticated corporate hierarchy
const usersData = [
  {
    id: "USR-001",
    name: "Sarah Martinez",
    username: "smartinez",
    email: "sarah.martinez@company.com",
    role: "VP Engineering",
    title: "Vice President of Engineering",
    profile: "VP Engineering Profile", 
    department: "Engineering",
    division: "Technology",
    userType: "internal",
    status: "active",
    lastLogin: "2 min ago",
    aiTeammate: "Engineering VP AI-01",
    permissions: ["Division Engineering", "Technical Leadership", "Budget Authority", "Cross-Department Coordination"],
    permissionSets: ["VP Engineering Access", "Technical Leadership", "Division Management", "Strategic Planning"],
    sessionPolicy: "Executive MFA",
    ipRestrictions: "Executive Network",
    avatar: "/placeholder.svg?height=32&width=32",
    delegatedAdmin: true,
    hierarchy: "L4 - VP/Senior Leadership",
    reportingLine: "CTO → CEO → System Admin",
    authorityScope: "Division-wide technical operations",
    crossFunctionalAccess: "C-Level approval required"
  },
  {
    id: "USR-002", 
    name: "John Doe",
    username: "jdoe",
    email: "john.doe@company.com",
    role: "Enterprise Account Executive",
    title: "Senior Enterprise Account Executive",
    profile: "Enterprise Sales Profile",
    department: "Enterprise Sales",
    division: "Sales",
    userType: "internal",
    status: "active",
    lastLogin: "5 min ago",
    aiTeammate: "Enterprise Sales AI-12",
    permissions: ["Enterprise CRM", "Large Deal Management", "Executive Engagement"],
    permissionSets: ["Enterprise Salesforce Access", "Executive Reporting", "Territory Management"],
    sessionPolicy: "Standard MFA",
    ipRestrictions: "Global Access",
    avatar: "/placeholder.svg?height=32&width=32",
    delegatedAdmin: false,
    hierarchy: "L0 - Individual Contributors",
    reportingLine: "Sales Manager → Sales Director → VP Sales → CEO",
    authorityScope: "Personal enterprise accounts",
    crossFunctionalAccess: "Team Lead approval required"
  },
  {
    id: "USR-003",
    name: "Angela Chen",
    username: "achen",
    email: "angela.chen@company.com", 
    role: "Director of Data Analytics",
    title: "Director, Data Analytics & Business Intelligence",
    profile: "Director Analytics Profile",
    department: "Data Analytics",
    division: "Technology",
    userType: "internal",
    status: "active",
    lastLogin: "30 min ago",
    aiTeammate: "Analytics Director AI-03",
    permissions: ["Department Analytics", "Data Governance", "Cross-Department Reporting", "Budget Authority"],
    permissionSets: ["Director Analytics Access", "Data Governance", "BI Platform Administration", "Department Management"],
    sessionPolicy: "Director Security",
    ipRestrictions: "Secure Network",
    avatar: "/placeholder.svg?height=32&width=32",
    delegatedAdmin: true,
    hierarchy: "L3 - Director Level",
    reportingLine: "VP Engineering → CTO → CEO",
    authorityScope: "Department analytics operations",
    crossFunctionalAccess: "VP approval required"
  },
  {
    id: "USR-004",
    name: "Mark Wilson",
    username: "mwilson",
    email: "mark.wilson@company.com",
    role: "Chief Marketing Officer",
    title: "Chief Marketing Officer",
    profile: "CMO Executive Profile",
    department: "Marketing",
    division: "Marketing",
    userType: "internal",
    status: "active",
    lastLogin: "1 min ago",
    aiTeammate: "CMO AI-07",
    permissions: ["Company-wide Marketing", "Brand Authority", "Strategic Planning", "Cross-Division Access"],
    permissionSets: ["C-Level Access", "Marketing Leadership", "Strategic Planning", "Executive Reporting"],
    sessionPolicy: "Executive Security",
    ipRestrictions: "Executive + Global",
    avatar: "/placeholder.svg?height=32&width=32",
    delegatedAdmin: true,
    hierarchy: "L5 - C-Level Executives",
    reportingLine: "CEO → System Admin",
    authorityScope: "All marketing operations & strategy",
    crossFunctionalAccess: "Full access within domain"
  },
  {
    id: "USR-005",
    name: "Lisa Park",
    username: "lpark",
    email: "lisa.park@company.com",
    role: "System Administrator",
    title: "Senior System Administrator",
    profile: "System Admin Profile",
    department: "IT Infrastructure",
    division: "Technology",
    userType: "internal",
    status: "active", 
    lastLogin: "5 min ago",
    aiTeammate: "System Admin AI-05",
    permissions: ["Complete System Control", "Emergency Override", "User Management", "Security Administration"],
    permissionSets: ["System Administration", "Emergency Protocols", "Infrastructure Management", "Security Oversight"],
    sessionPolicy: "Maximum Security",
    ipRestrictions: "Secure Network + MFA + Biometric",
    avatar: "/placeholder.svg?height=32&width=32",
    delegatedAdmin: true,
    hierarchy: "L7 - System Administrator",
    reportingLine: "Direct system authority",
    authorityScope: "Complete system control & emergency override",
    crossFunctionalAccess: "Universal override authority"
  },
  {
    id: "USR-006",
    name: "David Kumar",
    username: "dkumar",
    email: "david.kumar@company.com",
    role: "CEO",
    title: "Chief Executive Officer",
    profile: "CEO Executive Profile",
    department: "Executive",
    division: "Executive Leadership",
    userType: "internal",
    status: "active",
    lastLogin: "10 min ago",
    aiTeammate: "CEO AI-09",
    permissions: ["Company-wide Strategic Oversight", "All Data Access", "Final Escalation Authority", "Override Authority"],
    permissionSets: ["CEO Access", "Strategic Leadership", "Company-wide Authority", "Override Permissions"],
    sessionPolicy: "CEO Security",
    ipRestrictions: "Executive + Global + Emergency",
    avatar: "/placeholder.svg?height=32&width=32",
    delegatedAdmin: true,
    hierarchy: "L6 - CEO",
    reportingLine: "System Admin (technical escalation only)",
    authorityScope: "Complete business authority",
    crossFunctionalAccess: "Universal business authority"
  },
  {
    id: "USR-007",
    name: "Emily Rodriguez",
    username: "erodriguez",
    email: "emily.rodriguez@partner.com",
    role: "Sales Team Lead",
    title: "Senior Sales Team Lead",
    profile: "Team Lead Profile",
    department: "Regional Sales",
    division: "Sales",
    userType: "internal",
    status: "active",
    lastLogin: "15 min ago",
    aiTeammate: "Sales Team Lead AI-11",
    permissions: ["Team Coordination", "Regional Sales Data", "Team Performance"],
    permissionSets: ["Team Leadership", "Regional Access", "Performance Management"],
    sessionPolicy: "Standard Security",
    ipRestrictions: "Regional + VPN",
    avatar: "/placeholder.svg?height=32&width=32",
    delegatedAdmin: false,
    hierarchy: "L1 - Team Lead Level",
    reportingLine: "Sales Manager → Sales Director → VP Sales",
    authorityScope: "Team coordination & support",
    crossFunctionalAccess: "Manager approval required"
  },
  {
    id: "USR-008",
    name: "Michael Foster",
    username: "mfoster",
    email: "michael.foster@company.com",
    role: "External Security Consultant",
    title: "Senior Security Consultant",
    profile: "External Consultant Profile",
    department: "External Consulting",
    division: "External",
    userType: "guest",
    status: "active",
    lastLogin: "1 hour ago",
    aiTeammate: "External Security AI-08",
    permissions: ["Limited Security Review", "Consultation Access", "Temporary Audit"],
    permissionSets: ["Guest Security Access", "Audit Review"],
    sessionPolicy: "Guest Security Policy",
    ipRestrictions: "VPN Required + Time Limited",
    avatar: "/placeholder.svg?height=32&width=32",
    delegatedAdmin: false,
    hierarchy: "Guest Access",
    reportingLine: "N/A (External)",
    authorityScope: "Limited consultation scope",
    crossFunctionalAccess: "No access to internal systems"
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
    header: "Role & Hierarchy", 
    cell: (row: any) => (
      <div>
        <div className="font-medium text-foreground">{row.role}</div>
        <div className="text-xs text-muted-foreground">{row.title}</div>
        <Badge variant="outline" className="text-xs mt-1">
          {row.hierarchy}
        </Badge>
        <div className="text-xs text-muted-foreground mt-1">
          Division: {row.division}
        </div>
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
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false)
  const [isAssignPermissionsOpen, setIsAssignPermissionsOpen] = useState(false)
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false)
  const [isBulkActionsOpen, setIsBulkActionsOpen] = useState(false)
  const [isProfilesOpen, setIsProfilesOpen] = useState(false)
  const [isPermissionSetsOpen, setIsPermissionSetsOpen] = useState(false)
  const [isPoliciesOpen, setIsPoliciesOpen] = useState(false)
  const [isHierarchyOpen, setIsHierarchyOpen] = useState(false)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  return (
    <Layout>
      <div className="space-y-6">
        <PageHeader 
          title="Users & Identity Management"
          description="Manage user accounts, roles, and AI teammate assignments"
        >
          <Dialog open={isBulkActionsOpen} onOpenChange={setIsBulkActionsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Bulk Actions
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Actions</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button variant="outline" size="sm">
                    <UserCheck className="h-4 w-4 mr-2" />
                    Activate Users
                  </Button>
                  <Button variant="outline" size="sm">
                    <Lock className="h-4 w-4 mr-2" />
                    Deactivate Users
                  </Button>
                  <Button variant="outline" size="sm">
                    <Shield className="h-4 w-4 mr-2" />
                    Assign Permissions
                  </Button>
                  <Button variant="outline" size="sm">
                    <Key className="h-4 w-4 mr-2" />
                    Reset Passwords
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
            <DialogTrigger asChild>
              <Button variant="enterprise">
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" placeholder="Enter first name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" placeholder="Enter last name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" placeholder="Enter username" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="Enter email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="userType">User Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal Employee</SelectItem>
                      <SelectItem value="external">External User</SelectItem>
                      <SelectItem value="guest">Guest Access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="analytics">Analytics</SelectItem>
                      <SelectItem value="security">IT Security</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Input id="role" placeholder="Enter job role/title" />
                </div>
                <div className="col-span-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="adminRights" />
                    <Label htmlFor="adminRights">Grant delegated admin privileges</Label>
                  </div>
                </div>
                <div className="col-span-2 flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateUserOpen(false)}>Cancel</Button>
                  <Button variant="enterprise">Create User</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </PageHeader>

        {/* Enhanced Hierarchy Management */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>Corporate Hierarchy Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">1</div>
                  <div className="text-xs text-muted-foreground">System Admin</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-chart-1">6</div>
                  <div className="text-xs text-muted-foreground">C-Level + CEO</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-chart-2">36</div>
                  <div className="text-xs text-muted-foreground">VPs + Directors</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-chart-3">396</div>
                  <div className="text-xs text-muted-foreground">Managers + Teams</div>
                </div>
              </div>
              <Dialog open={isHierarchyOpen} onOpenChange={setIsHierarchyOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <Building2 className="h-4 w-4 mr-2" />
                    View Full Hierarchy
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Corporate Role Hierarchy</DialogTitle>
                  </DialogHeader>
                  <RoleHierarchyTree />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Authority Matrix</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">System Override</span>
                  <Badge variant="destructive" className="text-xs">1 user</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Executive Authority</span>
                  <Badge variant="default" className="text-xs">6 users</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Division Authority</span>
                  <Badge variant="secondary" className="text-xs">12 users</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Department Authority</span>
                  <Badge variant="outline" className="text-xs">24 users</Badge>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="w-full mt-4" onClick={() => setIsPermissionSetsOpen(true)}>
                <Shield className="h-4 w-4 mr-2" />
                View Permission Matrix
              </Button>
            </CardContent>
          </Card>
        </div>

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
            <Dialog open={isProfilesOpen} onOpenChange={setIsProfilesOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto">
                  <Settings className="h-3 w-3 mr-1" />
                  Manage Profiles
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Profile</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="profileName">Profile Name</Label>
                    <Input id="profileName" placeholder="Enter profile name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" placeholder="Profile description" />
                  </div>
                  <div className="space-y-2">
                    <Label>Base Permissions</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="readAccess" />
                        <Label htmlFor="readAccess">Read Access</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="writeAccess" />
                        <Label htmlFor="writeAccess">Write Access</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="deleteAccess" />
                        <Label htmlFor="deleteAccess">Delete Access</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="adminAccess" />
                        <Label htmlFor="adminAccess">Admin Access</Label>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsProfilesOpen(false)}>Cancel</Button>
                    <Button variant="enterprise">Create Profile</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
            <Dialog open={isPermissionSetsOpen} onOpenChange={setIsPermissionSetsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto">
                  <UserCheck className="h-3 w-3 mr-1" />
                  Manage Permission Sets
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Manage Permission Sets</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="setName">Permission Set Name</Label>
                    <Input id="setName" placeholder="Enter permission set name" />
                  </div>
                  <div className="space-y-2">
                    <Label>Applications</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="salesforce" />
                        <Label htmlFor="salesforce">Salesforce Access</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="adobe" />
                        <Label htmlFor="adobe">Adobe Creative Suite</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="erp" />
                        <Label htmlFor="erp">ERP System</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="analytics" />
                        <Label htmlFor="analytics">Analytics Tools</Label>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsPermissionSetsOpen(false)}>Cancel</Button>
                    <Button variant="enterprise">Save Permission Set</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
            <Dialog open={isPoliciesOpen} onOpenChange={setIsPoliciesOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto">
                  <Lock className="h-3 w-3 mr-1" />
                  Configure Policies
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configure Session Policies</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="policyName">Policy Name</Label>
                    <Input id="policyName" placeholder="Enter policy name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input id="sessionTimeout" type="number" placeholder="60" />
                  </div>
                  <div className="space-y-2">
                    <Label>Security Settings</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="mfa" />
                        <Label htmlFor="mfa">Require Multi-Factor Authentication</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="ipRestriction" />
                        <Label htmlFor="ipRestriction">IP Address Restrictions</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="deviceTrust" />
                        <Label htmlFor="deviceTrust">Device Trust Requirements</Label>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsPoliciesOpen(false)}>Cancel</Button>
                    <Button variant="enterprise">Save Policy</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
            <Dialog open={isHierarchyOpen} onOpenChange={setIsHierarchyOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto">
                  <Settings className="h-3 w-3 mr-1" />
                  Manage Hierarchy
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Manage Role Hierarchy</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Current Hierarchy Levels</Label>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span>L4 - Director</span>
                        <Button variant="outline" size="sm">Edit</Button>
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span>L3 - Manager</span>
                        <Button variant="outline" size="sm">Edit</Button>
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span>L2 - Individual Contributor</span>
                        <Button variant="outline" size="sm">Edit</Button>
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span>L1 - Guest</span>
                        <Button variant="outline" size="sm">Edit</Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsHierarchyOpen(false)}>Close</Button>
                    <Button variant="enterprise">Add Level</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => setIsCreateUserOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Create New User
            </Button>
            <Dialog open={isAssignPermissionsOpen} onOpenChange={setIsAssignPermissionsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Shield className="h-4 w-4 mr-2" />
                  Assign Permissions
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Permissions</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="selectUser">Select User</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose user to modify" />
                      </SelectTrigger>
                      <SelectContent>
                        {usersData.map(user => (
                          <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Permission Sets</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="crm" />
                        <Label htmlFor="crm">CRM Access</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="design" />
                        <Label htmlFor="design">Design Tools</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="analytics" />
                        <Label htmlFor="analytics">Analytics</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="admin" />
                        <Label htmlFor="admin">Admin Privileges</Label>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsAssignPermissionsOpen(false)}>Cancel</Button>
                    <Button variant="enterprise">Assign Permissions</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Key className="h-4 w-4 mr-2" />
                  Reset Password
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reset User Password</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resetUser">Select User</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose user for password reset" />
                      </SelectTrigger>
                      <SelectContent>
                        {usersData.map(user => (
                          <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Reset Options</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="sendEmail" defaultChecked />
                        <Label htmlFor="sendEmail">Send reset email to user</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="forceChange" defaultChecked />
                        <Label htmlFor="forceChange">Require password change on next login</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="revokeSession" />
                        <Label htmlFor="revokeSession">Revoke all active sessions</Label>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsResetPasswordOpen(false)}>Cancel</Button>
                    <Button variant="enterprise">Reset Password</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
              <Dialog open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Advanced Filters
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Advanced User Filters</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="filterDept">Department</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="All departments" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="design">Design</SelectItem>
                            <SelectItem value="sales">Sales</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="analytics">Analytics</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="filterStatus">Status</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="All statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="filterType">User Type</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="All types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="internal">Internal</SelectItem>
                            <SelectItem value="external">External</SelectItem>
                            <SelectItem value="guest">Guest</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="filterHierarchy">Hierarchy Level</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="All levels" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="l4">L4 - Director</SelectItem>
                            <SelectItem value="l3">L3 - Manager</SelectItem>
                            <SelectItem value="l2">L2 - Individual Contributor</SelectItem>
                            <SelectItem value="l1">L1 - Guest</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsFiltersOpen(false)}>Clear Filters</Button>
                      <Button variant="enterprise">Apply Filters</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" size="sm" onClick={() => setIsBulkActionsOpen(true)}>
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