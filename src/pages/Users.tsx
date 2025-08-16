import { Users as UsersIcon, UserPlus, Shield, Settings, Search, MoreHorizontal, Edit, Trash2, Lock, Eye, Mail, Phone } from "lucide-react"
import { DashboardCard } from "@/components/DashboardCard"
import { DataTable } from "@/components/DataTable"
import { StatusBadge } from "@/components/StatusBadge"
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

// Mock user data
const usersData = [
  {
    id: "1",
    name: "Sarah Martinez",
    email: "sarah.martinez@company.com",
    role: "Design Manager",
    department: "Design",
    status: "active",
    lastLogin: "2 min ago",
    aiTeammate: "Creative AI-01",
    permissions: ["Design Tools", "File Management", "Team Lead"],
    avatar: "/placeholder.svg?height=32&width=32"
  },
  {
    id: "2", 
    name: "John Doe",
    email: "john.doe@company.com",
    role: "Sales Representative",
    department: "Sales",
    status: "active",
    lastLogin: "5 min ago",
    aiTeammate: "Sales AI-12",
    permissions: ["CRM Access", "Lead Management"],
    avatar: "/placeholder.svg?height=32&width=32"
  },
  {
    id: "3",
    name: "Angela Chen",
    email: "angela.chen@company.com", 
    role: "Data Analyst",
    department: "Analytics",
    status: "inactive",
    lastLogin: "2 hours ago",
    aiTeammate: "Analytics AI-03",
    permissions: ["Data Access", "Reporting"],
    avatar: "/placeholder.svg?height=32&width=32"
  },
  {
    id: "4",
    name: "Mark Wilson",
    email: "mark.wilson@company.com",
    role: "Marketing Lead", 
    department: "Marketing",
    status: "active",
    lastLogin: "1 min ago",
    aiTeammate: "Marketing AI-07",
    permissions: ["Marketing Tools", "Campaign Management", "Team Lead"],
    avatar: "/placeholder.svg?height=32&width=32"
  },
  {
    id: "5",
    name: "Lisa Park",
    email: "lisa.park@company.com",
    role: "Security Admin",
    department: "IT Security",
    status: "active", 
    lastLogin: "15 min ago",
    aiTeammate: "Security AI-05",
    permissions: ["Security Admin", "System Access", "Audit Logs"],
    avatar: "/placeholder.svg?height=32&width=32"
  },
  {
    id: "6",
    name: "David Kumar",
    email: "david.kumar@company.com",
    role: "Product Manager",
    department: "Product",
    status: "pending",
    lastLogin: "Never",
    aiTeammate: "Product AI-09",
    permissions: ["Product Planning", "Roadmap Access"],
    avatar: "/placeholder.svg?height=32&width=32"
  }
]

const userColumns = [
  {
    key: "user",
    header: "User",
    cell: (value: any, row: any) => (
      <div className="flex items-center space-x-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={row.avatar} alt={row.name} />
          <AvatarFallback className="text-xs">
            {row.name.split(' ').map((n: string) => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium text-foreground">{row.name}</div>
          <div className="text-xs text-muted-foreground">{row.email}</div>
        </div>
      </div>
    ),
  },
  {
    key: "role",
    header: "Role & Department",
    cell: (value: any, row: any) => (
      <div>
        <div className="font-medium text-foreground">{row.role}</div>
        <div className="text-xs text-muted-foreground">{row.department}</div>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (value: string) => (
      <StatusBadge status={value as any}>
        {value.charAt(0).toUpperCase() + value.slice(1)}
      </StatusBadge>
    ),
  },
  {
    key: "lastLogin",
    header: "Last Login",
  },
  {
    key: "aiTeammate",
    header: "AI Teammate",
    cell: (value: string) => (
      <Badge variant="secondary" className="text-xs">
        {value}
      </Badge>
    ),
  },
  {
    key: "permissions",
    header: "Permissions",
    cell: (value: string[]) => (
      <div className="flex flex-wrap gap-1">
        {value.slice(0, 2).map((permission, index) => (
          <Badge key={index} variant="outline" className="text-xs">
            {permission}
          </Badge>
        ))}
        {value.length > 2 && (
          <Badge variant="outline" className="text-xs">
            +{value.length - 2}
          </Badge>
        )}
      </div>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Users & Identity Management</h1>
          <p className="text-muted-foreground">Manage user accounts, roles, and AI teammate assignments</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Bulk Actions
          </Button>
          <Button variant="enterprise">
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="Total Users"
          value="1,247"
          change="+23 new this month"
          changeType="positive"
          trend="up"
          icon={<UsersIcon />}
        />
        <DashboardCard
          title="Active Sessions"
          value="892"
          change="71% online"
          changeType="positive"
          trend="up"
          icon={<Shield />}
        />
        <DashboardCard
          title="Pending Invites"
          value="12"
          change="Awaiting response"
          changeType="neutral"
          trend="flat"
          icon={<Mail />}
        />
        <DashboardCard
          title="Failed Logins"
          value="3"
          change="Last 24 hours"
          changeType="positive"
          trend="down"
          icon={<Lock />}
        />
      </div>

      {/* Search and Filters */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">User Management</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search users..." 
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                Filters
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Users Table */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Users</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
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

        <TabsContent value="active">
          <DataTable
            title=""
            data={usersData.filter(user => user.status === "active")}
            columns={userColumns}
            actions={
              <Button variant="default" size="sm">
                Manage Active Users
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

        <TabsContent value="pending">
          <DataTable
            title=""
            data={usersData.filter(user => user.status === "pending")}
            columns={userColumns}
            actions={
              <Button variant="default" size="sm">
                Send Invitations
              </Button>
            }
          />
        </TabsContent>
      </Tabs>

      {/* Role Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Recent User Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {usersData.slice(0, 5).map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback className="text-xs">
                        {user.name.split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-foreground">{user.name}</div>
                      <div className="text-xs text-muted-foreground">Last login: {user.lastLogin}</div>
                    </div>
                  </div>
                  <StatusBadge status={user.status as any}>
                    {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                  </StatusBadge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Role Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {roleData.map((role, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: role.color }}
                    />
                    <span className="text-sm font-medium text-foreground">{role.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{role.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}