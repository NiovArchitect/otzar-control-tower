import { ReactNode } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/AdminSidebar"
import { NotificationCenter } from "@/components/NotificationCenter"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings, User, LogOut, Shield, HelpCircle } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const handleSettingsClick = () => {
    window.location.href = '/settings'
  }

  const handleProfileClick = () => {
    window.location.href = '/users'
  }

  const handleSecurityClick = () => {
    window.location.href = '/security'
  }

  const handleLogout = () => {
    // In a real app, this would handle logout logic
    console.log('Logout clicked')
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Enhanced Top Navigation */}
          <header className="h-16 border-b bg-card px-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-xl font-semibold text-foreground">Otzar Admin Console</h2>
              <Badge variant="outline" className="text-xs">
                Enterprise
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Notification Center */}
              <NotificationCenter />
              
              {/* Help/Support */}
              <Button variant="ghost" size="sm">
                <HelpCircle className="h-4 w-4" />
              </Button>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/placeholder-user.jpg" alt="Admin" />
                      <AvatarFallback className="bg-gradient-primary text-white">
                        SA
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64 bg-background border border-border shadow-lg" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">System Administrator</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        admin@otzar.com
                      </p>
                      <Badge variant="destructive" className="text-xs w-fit mt-1">
                        L7 - System Administrator
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile & Users</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSettingsClick} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>System Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSecurityClick} className="cursor-pointer">
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Security Center</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}