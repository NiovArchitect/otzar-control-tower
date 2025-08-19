import { useState } from "react"
import { Bell, Check, X, AlertTriangle, Info, Clock, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AIContextDialog } from "@/components/AIContextDialog"

interface Notification {
  id: string
  type: "alert" | "info" | "approval" | "system"
  title: string
  message: string
  timestamp: string
  read: boolean
  priority: "low" | "medium" | "high" | "critical"
  actionRequired?: boolean
  relatedPage?: string
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "alert",
    title: "Security Alert",
    message: "Unusual AI access pattern detected in Finance division",
    timestamp: "2 minutes ago",
    read: false,
    priority: "critical",
    actionRequired: true,
    relatedPage: "/security"
  },
  {
    id: "2", 
    type: "approval",
    title: "Approval Required",
    message: "VP Marketing AI requesting cross-division data access",
    timestamp: "5 minutes ago",
    read: false,
    priority: "high",
    actionRequired: true,
    relatedPage: "/access-control"
  },
  {
    id: "3",
    type: "system",
    title: "System Update",
    message: "Permission matrix updated with new role hierarchy",
    timestamp: "15 minutes ago",
    read: false,
    priority: "medium",
    actionRequired: false,
    relatedPage: "/users"
  },
  {
    id: "4",
    type: "info",
    title: "AI Teammate Created",
    message: "New AI teammate assigned to John Doe (Enterprise Sales)",
    timestamp: "30 minutes ago",
    read: true,
    priority: "low",
    actionRequired: false,
    relatedPage: "/ai-teammates"
  },
  {
    id: "5",
    type: "alert",
    title: "Policy Violation",
    message: "Data retention policy violation detected in Analytics dataset",
    timestamp: "1 hour ago",
    read: true,
    priority: "high",
    actionRequired: true,
    relatedPage: "/policies"
  }
]

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "alert": return <AlertTriangle className="h-4 w-4 text-red-500" />
    case "approval": return <Clock className="h-4 w-4 text-yellow-500" />
    case "system": return <Settings className="h-4 w-4 text-blue-500" />
    default: return <Info className="h-4 w-4 text-blue-500" />
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "critical": return "text-red-600 bg-red-50 border-red-200"
    case "high": return "text-orange-600 bg-orange-50 border-orange-200"
    case "medium": return "text-yellow-600 bg-yellow-50 border-yellow-200"
    default: return "text-blue-600 bg-blue-50 border-blue-200"
  }
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
  const [isOpen, setIsOpen] = useState(false)

  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id)
    if (notification.relatedPage) {
      window.location.href = notification.relatedPage
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Notifications</CardTitle>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={markAllAsRead}
                    className="text-xs"
                  >
                    Mark all read
                  </Button>
                )}
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} new
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-96">
              <div className="space-y-0">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  notifications.map((notification, index) => (
                    <div key={notification.id}>
                      <div 
                        className={`p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                          !notification.read ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className={`text-sm font-medium ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {notification.title}
                              </p>
                              <div className="flex items-center space-x-1">
                                {notification.actionRequired && (
                                  <Badge variant="outline" className="text-xs">
                                    Action Required
                                  </Badge>
                                )}
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${getPriorityColor(notification.priority)}`}
                                >
                                  {notification.priority}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {notification.timestamp}
                              </span>
                              <div className="flex items-center space-x-1">
                                <AIContextDialog 
                                  notificationId={notification.id}
                                  notificationType={notification.type}
                                  notificationTitle={notification.title}
                                  notificationMessage={notification.message}
                                />
                                {!notification.read && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      markAsRead(notification.id)
                                    }}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeNotification(notification.id)
                                  }}
                                  className="h-6 w-6 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {index < notifications.length - 1 && <Separator />}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  )
}