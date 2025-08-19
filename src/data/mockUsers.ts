// Mock user data for cohesive metrics across the admin console
// Total users: 1,247 (matching home page metrics)
// Active users: 1,205
// AI teammates: 387 (about 1 per 3.2 users)

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  title: string;
  profile: string;
  department: string;
  division: string;
  userType: "internal" | "external" | "guest";
  status: "active" | "inactive";
  lastLogin: string;
  aiTeammate: string;
  permissions: string[];
  permissionSets: string[];
  sessionPolicy: string;
  ipRestrictions: string;
  avatar: string;
  delegatedAdmin: boolean;
  hierarchy: string;
  reportingLine: string;
  authorityScope: string;
  crossFunctionalAccess: string;
}

// Generate comprehensive user data to match target metrics
const generateMockUsers = (): User[] => {
  const users: User[] = [];
  
  // Executive level users (6 users)
  const executives = [
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
      userType: "internal" as const,
      status: "active" as const,
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
      name: "David Kumar",
      username: "dkumar",
      email: "david.kumar@company.com",
      role: "CEO",
      title: "Chief Executive Officer",
      profile: "CEO Executive Profile",
      department: "Executive",
      division: "Executive Leadership",
      userType: "internal" as const,
      status: "active" as const,
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
      id: "USR-003",
      name: "Mark Wilson",
      username: "mwilson",
      email: "mark.wilson@company.com",
      role: "Chief Marketing Officer",
      title: "Chief Marketing Officer",
      profile: "CMO Executive Profile",
      department: "Marketing",
      division: "Marketing",
      userType: "internal" as const,
      status: "active" as const,
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
      id: "USR-004",
      name: "Lisa Chen",
      username: "lchen",
      email: "lisa.chen@company.com",
      role: "CFO",
      title: "Chief Financial Officer",
      profile: "CFO Executive Profile",
      department: "Finance",
      division: "Finance",
      userType: "internal" as const,
      status: "active" as const,
      lastLogin: "5 min ago",
      aiTeammate: "CFO AI-04",
      permissions: ["Company-wide Financial", "Budget Authority", "Strategic Planning", "Cross-Division Access"],
      permissionSets: ["C-Level Access", "Financial Leadership", "Strategic Planning", "Executive Reporting"],
      sessionPolicy: "Executive Security",
      ipRestrictions: "Executive + Global",
      avatar: "/placeholder.svg?height=32&width=32",
      delegatedAdmin: true,
      hierarchy: "L5 - C-Level Executives",
      reportingLine: "CEO → System Admin",
      authorityScope: "All financial operations & strategy",
      crossFunctionalAccess: "Full access within domain"
    },
    {
      id: "USR-005",
      name: "Michael Rodriguez",
      username: "mrodriguez",
      email: "michael.rodriguez@company.com",
      role: "CTO",
      title: "Chief Technology Officer",
      profile: "CTO Executive Profile",
      department: "Technology",
      division: "Technology",
      userType: "internal" as const,
      status: "active" as const,
      lastLogin: "3 min ago",
      aiTeammate: "CTO AI-05",
      permissions: ["Company-wide Technology", "Technical Authority", "Strategic Planning", "Cross-Division Access"],
      permissionSets: ["C-Level Access", "Technology Leadership", "Strategic Planning", "Executive Reporting"],
      sessionPolicy: "Executive Security",
      ipRestrictions: "Executive + Global",
      avatar: "/placeholder.svg?height=32&width=32",
      delegatedAdmin: true,
      hierarchy: "L5 - C-Level Executives",
      reportingLine: "CEO → System Admin",
      authorityScope: "All technology operations & strategy",
      crossFunctionalAccess: "Full access within domain"
    },
    {
      id: "USR-006",
      name: "Lisa Park",
      username: "lpark",
      email: "lisa.park@company.com",
      role: "System Administrator",
      title: "Senior System Administrator",
      profile: "System Admin Profile",
      department: "IT Infrastructure",
      division: "Technology",
      userType: "internal" as const,
      status: "active" as const,
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
    }
  ];
  
  users.push(...executives);
  
  // Generate 1189 internal employees (departments: Sales, Marketing, Engineering, Operations, Finance, HR, etc.)
  const departments = [
    { name: "Sales", division: "Sales", count: 247 },
    { name: "Engineering", division: "Technology", count: 198 },
    { name: "Marketing", division: "Marketing", count: 156 },
    { name: "Customer Success", division: "Sales", count: 134 },
    { name: "Operations", division: "Operations", count: 123 },
    { name: "Finance", division: "Finance", count: 98 },
    { name: "HR", division: "People", count: 87 },
    { name: "Product", division: "Technology", count: 76 },
    { name: "Design", division: "Technology", count: 70 }
  ];
  
  let userCounter = 7; // Starting after executives
  
  departments.forEach(dept => {
    for (let i = 0; i < dept.count; i++) {
      const userNum = userCounter.toString().padStart(3, '0');
      const isManager = i < Math.floor(dept.count * 0.1); // 10% managers
      const isTeamLead = i >= Math.floor(dept.count * 0.1) && i < Math.floor(dept.count * 0.2); // 10% team leads
      const isActive = userCounter <= 1205; // First 1205 users are active
      
      users.push({
        id: `USR-${userNum}`,
        name: `User ${userNum}`,
        username: `user${userNum}`,
        email: `user${userNum}@company.com`,
        role: isManager ? `${dept.name} Manager` : isTeamLead ? `${dept.name} Team Lead` : `${dept.name} Specialist`,
        title: isManager ? `Manager, ${dept.name}` : isTeamLead ? `Team Lead, ${dept.name}` : `${dept.name} Specialist`,
        profile: isManager ? "Manager Profile" : isTeamLead ? "Team Lead Profile" : "Standard User Profile",
        department: dept.name,
        division: dept.division,
        userType: "internal" as const,
        status: isActive ? "active" as const : "inactive" as const,
        lastLogin: isActive ? `${Math.floor(Math.random() * 60)} min ago` : "2+ days ago",
        aiTeammate: `${dept.name} AI-${(i % 10) + 1}`,
        permissions: isManager ? ["Department Management", "Team Oversight", "Budget Authority"] : 
                   isTeamLead ? ["Team Coordination", "Task Management"] : 
                   ["Personal Tasks", "Department Access"],
        permissionSets: isManager ? ["Manager Access", "Department Management"] : 
                       isTeamLead ? ["Team Lead Access", "Coordination Tools"] : 
                       ["Standard User", "Department Access"],
        sessionPolicy: isManager ? "Enhanced Security" : "Standard Security",
        ipRestrictions: "Company Network",
        avatar: "/placeholder.svg?height=32&width=32",
        delegatedAdmin: isManager && Math.random() > 0.7, // Some managers are delegated admins
        hierarchy: isManager ? "L2 - Manager Level" : isTeamLead ? "L1 - Team Lead Level" : "L0 - Individual Contributors",
        reportingLine: isManager ? "Director → VP → CEO" : isTeamLead ? "Manager → Director → VP" : "Team Lead → Manager → Director",
        authorityScope: isManager ? "Department operations" : isTeamLead ? "Team coordination" : "Personal tasks",
        crossFunctionalAccess: isManager ? "Director approval required" : "Manager approval required"
      });
      userCounter++;
    }
  });
  
  // Add 47 external users (contractors, partners)
  for (let i = 0; i < 47; i++) {
    const userNum = userCounter.toString().padStart(3, '0');
    users.push({
      id: `EXT-${userNum}`,
      name: `External User ${i + 1}`,
      username: `ext${userNum}`,
      email: `external${userNum}@partner.com`,
      role: "External Contractor",
      title: "External Specialist",
      profile: "External User Profile",
      department: "External",
      division: "External",
      userType: "external" as const,
      status: "active" as const,
      lastLogin: `${Math.floor(Math.random() * 120)} min ago`,
      aiTeammate: `External AI-${(i % 5) + 1}`,
      permissions: ["Limited Access", "Project-specific"],
      permissionSets: ["External Access", "Time-limited"],
      sessionPolicy: "External Security",
      ipRestrictions: "VPN Required",
      avatar: "/placeholder.svg?height=32&width=32",
      delegatedAdmin: false,
      hierarchy: "External Access",
      reportingLine: "N/A (External)",
      authorityScope: "Limited project scope",
      crossFunctionalAccess: "No internal access"
    });
    userCounter++;
  }
  
  // Add 11 guest users
  for (let i = 0; i < 11; i++) {
    const userNum = userCounter.toString().padStart(3, '0');
    users.push({
      id: `GST-${userNum}`,
      name: `Guest User ${i + 1}`,
      username: `guest${userNum}`,
      email: `guest${userNum}@temporary.com`,
      role: "Guest Access",
      title: "Temporary Access",
      profile: "Guest Profile",
      department: "Guest",
      division: "Guest",
      userType: "guest" as const,
      status: "active" as const,
      lastLogin: `${Math.floor(Math.random() * 180)} min ago`,
      aiTeammate: `Guest AI-${(i % 2) + 1}`,
      permissions: ["Read-only", "Temporary"],
      permissionSets: ["Guest Access"],
      sessionPolicy: "Guest Security",
      ipRestrictions: "VPN Required + Time Limited",
      avatar: "/placeholder.svg?height=32&width=32",
      delegatedAdmin: false,
      hierarchy: "Guest Access",
      reportingLine: "N/A (Guest)",
      authorityScope: "Read-only access",
      crossFunctionalAccess: "No access"
    });
    userCounter++;
  }
  
  return users;
};

export const mockUsersData = generateMockUsers();

// Role distribution for analytics
export const roleData = [
  { name: "Admins", count: 43, color: "hsl(var(--chart-1))" },
  { name: "Managers", count: 127, color: "hsl(var(--chart-2))" },
  { name: "Team Leads", count: 134, color: "hsl(var(--chart-3))" },
  { name: "Individual Contributors", count: 943, color: "hsl(var(--chart-4))" },
];

// Sample users for display (first 8 users with detailed info)
export const sampleUsersData = mockUsersData.slice(0, 8);