import { Check, X, AlertTriangle, Shield, Zap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const permissionMatrix = [
  {
    level: "System Admin",
    webSearch: "all",
    readCRM: "all-admin",
    updateCRM: "all-user-mgmt",
    readEmail: "all-logs",
    sendEmail: "all-admin",
    runPython: "full",
    scheduleCalendar: "all-maintenance",
    generateReport: "all-audit"
  },
  {
    level: "CEO",
    webSearch: "all",
    readCRM: "all-data",
    updateCRM: "override-approval",
    readEmail: "all-inboxes",
    sendEmail: "all-external",
    runPython: "with-approval",
    scheduleCalendar: "all-external",
    generateReport: "all-types"
  },
  {
    level: "C-Level",
    webSearch: "domain-focus",
    readCRM: "domain-cross",
    updateCRM: "domain-authority",
    readEmail: "domain-strategic",
    sendEmail: "domain-external",
    runPython: "domain-analytics",
    scheduleCalendar: "strategic-meetings",
    generateReport: "strategic-reports"
  },
  {
    level: "VP Level",
    webSearch: "division-focus",
    readCRM: "division-data",
    updateCRM: "division-authority",
    readEmail: "division-emails",
    sendEmail: "division-external",
    runPython: "division-analytics",
    scheduleCalendar: "division-meetings",
    generateReport: "division-reports"
  },
  {
    level: "Director Level",
    webSearch: "department-focus",
    readCRM: "department-data",
    updateCRM: "with-approval",
    readEmail: "department-emails",
    sendEmail: "department-external",
    runPython: "department-scripts",
    scheduleCalendar: "department-meetings",
    generateReport: "department-reports"
  },
  {
    level: "Manager Level",
    webSearch: "team-focus",
    readCRM: "team-data",
    updateCRM: "with-approval",
    readEmail: "team-emails",
    sendEmail: "team-external",
    runPython: "none",
    scheduleCalendar: "team-meetings",
    generateReport: "team-reports"
  },
  {
    level: "Team Lead Level",
    webSearch: "task-focus",
    readCRM: "task-data",
    updateCRM: "limited-updates",
    readEmail: "task-coordination",
    sendEmail: "templates-only",
    runPython: "none",
    scheduleCalendar: "team-coordination",
    generateReport: "task-reports"
  },
  {
    level: "Individual Level",
    webSearch: "personal-focus",
    readCRM: "personal-data",
    updateCRM: "personal-updates",
    readEmail: "personal-emails",
    sendEmail: "templates-only",
    runPython: "none",
    scheduleCalendar: "personal-meetings",
    generateReport: "personal-reports"
  }
]

const getPermissionIcon = (permission: string) => {
  if (permission.includes("all") || permission.includes("full")) return <Check className="h-4 w-4 text-green-500" />
  if (permission.includes("approval") || permission.includes("limited")) return <AlertTriangle className="h-4 w-4 text-yellow-500" />
  if (permission === "none") return <X className="h-4 w-4 text-red-500" />
  return <Shield className="h-4 w-4 text-blue-500" />
}

const getPermissionBadge = (permission: string) => {
  if (permission.includes("all") || permission.includes("full")) return "success"
  if (permission.includes("approval") || permission.includes("limited")) return "warning"
  if (permission === "none") return "destructive"
  return "secondary"
}

export function PermissionMatrix() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Tool Permission Matrix by Hierarchy</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Hierarchy Level</TableHead>
                <TableHead>Web Search</TableHead>
                <TableHead>Read CRM</TableHead>
                <TableHead>Update CRM</TableHead>
                <TableHead>Read Email</TableHead>
                <TableHead>Send Email</TableHead>
                <TableHead>Run Python</TableHead>
                <TableHead>Schedule Calendar</TableHead>
                <TableHead>Generate Report</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {permissionMatrix.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    <Badge variant="outline" className="text-xs">
                      {row.level}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getPermissionIcon(row.webSearch)}
                      <Badge variant={getPermissionBadge(row.webSearch) as any} className="text-xs">
                        {row.webSearch}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getPermissionIcon(row.readCRM)}
                      <Badge variant={getPermissionBadge(row.readCRM) as any} className="text-xs">
                        {row.readCRM}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getPermissionIcon(row.updateCRM)}
                      <Badge variant={getPermissionBadge(row.updateCRM) as any} className="text-xs">
                        {row.updateCRM}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getPermissionIcon(row.readEmail)}
                      <Badge variant={getPermissionBadge(row.readEmail) as any} className="text-xs">
                        {row.readEmail}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getPermissionIcon(row.sendEmail)}
                      <Badge variant={getPermissionBadge(row.sendEmail) as any} className="text-xs">
                        {row.sendEmail}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getPermissionIcon(row.runPython)}
                      <Badge variant={getPermissionBadge(row.runPython) as any} className="text-xs">
                        {row.runPython}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getPermissionIcon(row.scheduleCalendar)}
                      <Badge variant={getPermissionBadge(row.scheduleCalendar) as any} className="text-xs">
                        {row.scheduleCalendar}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getPermissionIcon(row.generateReport)}
                      <Badge variant={getPermissionBadge(row.generateReport) as any} className="text-xs">
                        {row.generateReport}
                      </Badge>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Check className="h-3 w-3 text-green-500" />
            <span>Full Access</span>
          </div>
          <div className="flex items-center space-x-1">
            <AlertTriangle className="h-3 w-3 text-yellow-500" />
            <span>Restricted/Approval Required</span>
          </div>
          <div className="flex items-center space-x-1">
            <X className="h-3 w-3 text-red-500" />
            <span>No Access</span>
          </div>
          <div className="flex items-center space-x-1">
            <Shield className="h-3 w-3 text-blue-500" />
            <span>Scoped Access</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}