import { useState } from "react"
import { NavLink, useLocation } from "react-router-dom"
import {
  Building2,
  Users,
  Bot,
  Shield,
  Database,
  BarChart3,
  Settings,
  Home,
  Lock,
  FileText,
  TestTube,
  Activity,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navigationItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Users & Identity", url: "/users", icon: Users },
  { title: "AI Teammates", url: "/ai-teammates", icon: Bot },
  { title: "Access Control", url: "/access-control", icon: Shield },
  { title: "Data & Knowledge", url: "/data", icon: Database },
  { title: "Security & Audit", url: "/security", icon: Lock },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Playground", url: "/playground", icon: TestTube },
  { title: "Policies", url: "/policies", icon: FileText },
  { title: "System Health", url: "/health", icon: Activity },
  { title: "Settings", url: "/settings", icon: Settings },
]

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const currentPath = location.pathname

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/"
    return currentPath.startsWith(path)
  }

  const getNavClasses = (path: string) => cn(
    "w-full justify-start transition-all duration-200",
    isActive(path)
      ? "bg-primary text-primary-foreground shadow-enterprise font-medium"
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
  )

  return (
    <Sidebar
      className={cn(
        "border-r bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Otzar</h2>
              <p className="text-xs text-muted-foreground">Admin Console</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 p-0"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Administration
            </SidebarGroupLabel>
          )}
          
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === "/"}
                      className={getNavClasses(item.url)}
                    >
                      <item.icon className={cn("h-5 w-5", collapsed ? "mr-0" : "mr-3")} />
                      {!collapsed && <span className="text-sm">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && (
          <div className="mt-8 px-3">
            <div className="rounded-lg bg-gradient-card p-4 border">
              <h3 className="text-sm font-medium text-foreground mb-1">System Status</h3>
              <p className="text-xs text-muted-foreground mb-3">All systems operational</p>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-status-success rounded-full"></div>
                <span className="text-xs text-status-success font-medium">Healthy</span>
              </div>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  )
}