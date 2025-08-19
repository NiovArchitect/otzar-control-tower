import { ChevronDown, ChevronRight, Building2, Shield, Users, UserCheck, Settings } from "lucide-react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const hierarchyData = {
  "System Administrator": {
    level: "L7",
    count: 1,
    description: "Complete system control & emergency override",
    children: {
      "CEO": {
        level: "L6",
        count: 1,
        description: "Company-wide strategic oversight",
        children: {
          "C-Level Executives": {
            level: "L5",
            count: 5,
            description: "Executive leadership & strategic direction",
            roles: ["CFO", "CTO", "CMO", "CHRO", "COO"],
            children: {
              "VP/Senior Leadership": {
                level: "L4",
                count: 12,
                description: "Division oversight & operations",
                divisions: ["Sales", "Marketing", "Engineering", "People", "Finance"],
                children: {
                  "Director Level": {
                    level: "L3",
                    count: 24,
                    description: "Department management & coordination",
                    children: {
                      "Manager Level": {
                        level: "L2",
                        count: 48,
                        description: "Team leadership & execution",
                        children: {
                          "Team Lead Level": {
                            level: "L1",
                            count: 72,
                            description: "Team coordination & support",
                            children: {
                              "Individual Contributors": {
                                level: "L0",
                                count: 324,
                                description: "Execution & delivery",
                                categories: ["Sales", "Engineering", "Marketing", "Design", "Analytics"]
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

interface HierarchyNodeProps {
  name: string
  data: any
  depth: number
}

function HierarchyNode({ name, data, depth }: HierarchyNodeProps) {
  const [isOpen, setIsOpen] = useState(depth < 3)
  const hasChildren = data.children && Object.keys(data.children).length > 0

  const getColorByLevel = (level: string) => {
    const colors = {
      "L7": "hsl(var(--destructive))",
      "L6": "hsl(var(--primary))",
      "L5": "hsl(var(--chart-1))",
      "L4": "hsl(var(--chart-2))",
      "L3": "hsl(var(--chart-3))",
      "L2": "hsl(var(--chart-4))",
      "L1": "hsl(var(--chart-5))",
      "L0": "hsl(var(--muted-foreground))"
    }
    return colors[level as keyof typeof colors] || "hsl(var(--muted-foreground))"
  }

  const getIcon = (level: string) => {
    if (level === "L7" || level === "L6") return Shield
    if (level === "L5" || level === "L4") return Building2
    if (level === "L3" || level === "L2") return UserCheck
    return Users
  }

  const Icon = getIcon(data.level)

  return (
    <div className={`ml-${depth * 4}`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center space-x-2 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
          {hasChildren && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          )}
          {!hasChildren && <div className="w-6" />}
          
          <Icon 
            className="h-4 w-4" 
            style={{ color: getColorByLevel(data.level) }}
          />
          
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-foreground">{name}</span>
              <Badge 
                variant="outline" 
                className="text-xs"
                style={{ borderColor: getColorByLevel(data.level) }}
              >
                {data.level}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {data.count} {data.count === 1 ? 'user' : 'users'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{data.description}</p>
            
            {data.roles && (
              <div className="flex flex-wrap gap-1 mt-2">
                {data.roles.map((role: string) => (
                  <Badge key={role} variant="outline" className="text-xs">
                    {role}
                  </Badge>
                ))}
              </div>
            )}
            
            {data.divisions && (
              <div className="flex flex-wrap gap-1 mt-2">
                {data.divisions.map((division: string) => (
                  <Badge key={division} variant="secondary" className="text-xs">
                    {division}
                  </Badge>
                ))}
              </div>
            )}
            
            {data.categories && (
              <div className="flex flex-wrap gap-1 mt-2">
                {data.categories.map((category: string) => (
                  <Badge key={category} variant="outline" className="text-xs">
                    {category}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <Settings className="h-3 w-3" />
          </Button>
        </div>
        
        {hasChildren && (
          <CollapsibleContent>
            <div className="ml-4 border-l border-border pl-2">
              {Object.entries(data.children).map(([childName, childData]) => (
                <HierarchyNode
                  key={childName}
                  name={childName}
                  data={childData}
                  depth={depth + 1}
                />
              ))}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  )
}

export function RoleHierarchyTree() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Building2 className="h-5 w-5" />
          <span>Corporate Role Hierarchy</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Object.entries(hierarchyData).map(([name, data]) => (
            <HierarchyNode key={name} name={name} data={data} depth={0} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}