import { Layout } from "@/components/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Shield, 
  FileText, 
  Users, 
  Database, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Eye,
  Lock,
  Scale,
  Bot,
  UserCheck,
  Settings,
  Download,
  Edit
} from "lucide-react";

export default function Policies() {
  const policies = [
    {
      id: "ai-governance",
      title: "AI Governance Framework",
      category: "AI Governance",
      status: "Active",
      lastUpdated: "2024-01-15",
      version: "2.1",
      description: "Comprehensive framework for AI development, deployment, and oversight within the organization.",
      sections: [
        "AI Ethics Guidelines",
        "Model Development Standards",
        "Deployment Approval Process",
        "Performance Monitoring Requirements"
      ]
    },
    {
      id: "data-management",
      title: "Enterprise Data Management Policy",
      category: "Data Governance",
      status: "Active",
      lastUpdated: "2024-01-10",
      version: "3.0",
      description: "Guidelines for data collection, processing, storage, and sharing across AI systems.",
      sections: [
        "Data Classification Standards",
        "Privacy Protection Measures",
        "Data Retention Policies",
        "Cross-border Data Transfer Rules"
      ]
    },
    {
      id: "ai-safety",
      title: "AI Safety & Risk Management",
      category: "Risk Management",
      status: "Active",
      lastUpdated: "2024-01-12",
      version: "1.8",
      description: "Framework for identifying, assessing, and mitigating AI-related risks.",
      sections: [
        "Risk Assessment Methodology",
        "Bias Detection & Mitigation",
        "Safety Testing Requirements",
        "Incident Response Procedures"
      ]
    },
    {
      id: "compliance",
      title: "Regulatory Compliance Standards",
      category: "Compliance",
      status: "Under Review",
      lastUpdated: "2024-01-08",
      version: "2.3",
      description: "Ensuring AI systems comply with applicable regulations and industry standards.",
      sections: [
        "GDPR Compliance Guidelines",
        "Industry-Specific Regulations",
        "Audit Requirements",
        "Documentation Standards"
      ]
    },
    {
      id: "access-control",
      title: "AI System Access & Authorization",
      category: "Security",
      status: "Active",
      lastUpdated: "2024-01-14",
      version: "1.5",
      description: "Policies governing access to AI systems, models, and sensitive data.",
      sections: [
        "Role-Based Access Control",
        "Authentication Requirements",
        "Privileged Access Management",
        "Access Review Procedures"
      ]
    },
    {
      id: "model-lifecycle",
      title: "AI Model Lifecycle Management",
      category: "Operations",
      status: "Active",
      lastUpdated: "2024-01-11",
      version: "2.0",
      description: "End-to-end governance for AI model development, testing, deployment, and retirement.",
      sections: [
        "Development Methodologies",
        "Testing & Validation Requirements",
        "Deployment Approvals",
        "Model Retirement Procedures"
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-success text-success-foreground";
      case "Under Review": return "bg-warning text-warning-foreground";
      case "Draft": return "bg-muted text-muted-foreground";
      default: return "bg-secondary text-secondary-foreground";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "AI Governance": return <Bot className="h-4 w-4" />;
      case "Data Governance": return <Database className="h-4 w-4" />;
      case "Risk Management": return <AlertTriangle className="h-4 w-4" />;
      case "Compliance": return <Scale className="h-4 w-4" />;
      case "Security": return <Lock className="h-4 w-4" />;
      case "Operations": return <Settings className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Enterprise AI Policies</h1>
            <p className="text-muted-foreground mt-2">
              Comprehensive governance framework for AI systems and organizational compliance
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export All
            </Button>
            <Button size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Create Policy
            </Button>
          </div>
        </div>

        {/* Policy Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Policies</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{policies.length}</div>
              <p className="text-xs text-muted-foreground">
                Across 6 categories
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Policies</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{policies.filter(p => p.status === "Active").length}</div>
              <p className="text-xs text-muted-foreground">
                Currently enforced
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Under Review</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{policies.filter(p => p.status === "Under Review").length}</div>
              <p className="text-xs text-muted-foreground">
                Pending approval
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Policy Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Policy Overview</TabsTrigger>
            <TabsTrigger value="governance">AI Governance</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                All policies are regularly reviewed and updated to ensure compliance with evolving regulations and best practices.
                Last organization-wide policy review: January 2024
              </AlertDescription>
            </Alert>

            <div className="grid gap-6">
              {policies.map((policy) => (
                <Card key={policy.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getCategoryIcon(policy.category)}
                        <div>
                          <CardTitle className="text-lg">{policy.title}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {policy.category}
                            </Badge>
                            <Badge className={`text-xs ${getStatusColor(policy.status)}`}>
                              {policy.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              v{policy.version}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div>Updated: {policy.lastUpdated}</div>
                        <Button variant="ghost" size="sm" className="mt-1">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      {policy.description}
                    </p>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Key Sections:</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {policy.sections.map((section, index) => (
                          <div key={index} className="text-xs text-muted-foreground flex items-center">
                            <div className="w-1 h-1 bg-primary rounded-full mr-2"></div>
                            {section}
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="governance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  AI Governance Framework
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Core Principles</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="text-sm font-medium">Transparency & Explainability</span>
                      </div>
                      <p className="text-xs text-muted-foreground ml-6">
                        AI decisions must be interpretable and auditable
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="text-sm font-medium">Fairness & Non-discrimination</span>
                      </div>
                      <p className="text-xs text-muted-foreground ml-6">
                        Prevent bias and ensure equitable outcomes
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="text-sm font-medium">Human Oversight</span>
                      </div>
                      <p className="text-xs text-muted-foreground ml-6">
                        Maintain human control over critical decisions
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="text-sm font-medium">Privacy Protection</span>
                      </div>
                      <p className="text-xs text-muted-foreground ml-6">
                        Safeguard personal and sensitive data
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">AI Development Lifecycle</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">1</span>
                        </div>
                        <div>
                          <span className="font-medium">Requirements & Ethics Review</span>
                          <p className="text-xs text-muted-foreground">Define use case and conduct ethical assessment</p>
                        </div>
                      </div>
                      <Badge variant="outline">Required</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">2</span>
                        </div>
                        <div>
                          <span className="font-medium">Data Governance & Bias Testing</span>
                          <p className="text-xs text-muted-foreground">Ensure data quality and test for algorithmic bias</p>
                        </div>
                      </div>
                      <Badge variant="outline">Required</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">3</span>
                        </div>
                        <div>
                          <span className="font-medium">Model Validation & Risk Assessment</span>
                          <p className="text-xs text-muted-foreground">Validate performance and assess deployment risks</p>
                        </div>
                      </div>
                      <Badge variant="outline">Required</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">4</span>
                        </div>
                        <div>
                          <span className="font-medium">Deployment Approval & Monitoring</span>
                          <p className="text-xs text-muted-foreground">Obtain approval and implement continuous monitoring</p>
                        </div>
                      </div>
                      <Badge variant="outline">Required</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compliance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  Regulatory Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Data Protection Regulations</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">GDPR (EU)</span>
                        <Badge className="bg-success text-success-foreground">Compliant</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">CCPA (California)</span>
                        <Badge className="bg-success text-success-foreground">Compliant</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">PIPEDA (Canada)</span>
                        <Badge className="bg-success text-success-foreground">Compliant</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-3">Industry Standards</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">ISO 27001</span>
                        <Badge className="bg-success text-success-foreground">Certified</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">SOC 2 Type II</span>
                        <Badge className="bg-success text-success-foreground">Certified</Badge>
                      </div>
                      <div className="flex items-center justify-between p-2 border rounded">
                        <span className="text-sm">NIST AI Framework</span>
                        <Badge className="bg-warning text-warning-foreground">In Progress</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">Audit & Documentation Requirements</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Model Documentation</h4>
                      <p className="text-xs text-muted-foreground">
                        Complete model cards, data sheets, and performance metrics for all AI systems
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Decision Logs</h4>
                      <p className="text-xs text-muted-foreground">
                        Maintain detailed logs of AI decisions for high-risk applications
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Regular Audits</h4>
                      <p className="text-xs text-muted-foreground">
                        Quarterly internal audits and annual third-party assessments
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  AI Security Policies
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Access Control</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-success" />
                        <span className="text-sm">Role-based access control (RBAC)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-success" />
                        <span className="text-sm">Multi-factor authentication required</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-success" />
                        <span className="text-sm">Principle of least privilege</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-success" />
                        <span className="text-sm">Regular access reviews</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-3">Data Protection</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-success" />
                        <span className="text-sm">Encryption at rest and in transit</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-success" />
                        <span className="text-sm">Data anonymization techniques</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-success" />
                        <span className="text-sm">Secure model storage</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-success" />
                        <span className="text-sm">API security protocols</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-3">Threat Protection</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Adversarial Attack Prevention</h4>
                      <p className="text-xs text-muted-foreground">
                        Input validation, anomaly detection, and robust model architectures
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Model Poisoning Protection</h4>
                      <p className="text-xs text-muted-foreground">
                        Data validation, secure training pipelines, and model integrity checks
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-medium mb-2">Privacy Attacks Defense</h4>
                      <p className="text-xs text-muted-foreground">
                        Differential privacy, federated learning, and membership inference protection
                      </p>
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