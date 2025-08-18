import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Layout } from "@/components/Layout";
import { 
  Users, 
  Bot, 
  Shield, 
  Database,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Play,
  Book,
  Video,
  Award
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

const Onboarding = () => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  
  const totalSteps = 5;
  const progress = ((currentStep - 1) / totalSteps) * 100;

  const completeStep = (step: number) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps([...completedSteps, step]);
      toast({
        title: "Step completed",
        description: `Step ${step} has been completed successfully.`,
      });
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      completeStep(currentStep);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Play className="h-8 w-8" />
            Otzar Admin Onboarding
          </h1>
          <p className="text-muted-foreground mt-2">
            Welcome to Otzar! Let's get your AI management platform configured.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Setup Progress</CardTitle>
              <Badge variant="outline">{currentStep} of {totalSteps}</Badge>
            </div>
            <Progress value={progress} className="w-full" />
          </CardHeader>
        </Card>

        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Step 1: Organization Setup
              </CardTitle>
              <CardDescription>
                Configure your organization's basic information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input id="org-name" placeholder="Enter your organization name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Primary Domain</Label>
                  <Input id="domain" placeholder="yourcompany.com" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-email">Admin Email</Label>
                <Input id="admin-email" type="email" placeholder="admin@yourcompany.com" />
              </div>
              <div className="flex justify-between">
                <Button variant="outline" disabled>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button onClick={nextStep}>
                  Next: User Setup
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Step 2: Initial Users
              </CardTitle>
              <CardDescription>
                Add your first team members and configure user roles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Add Team Members</h4>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <Input placeholder="Email address" />
                    <Input placeholder="Full name" />
                  </div>
                  <Button size="sm" variant="outline">Add User</Button>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Quick Actions</h4>
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Users className="h-4 w-4 mr-2" />
                      Import from CSV
                    </Button>
                    <Button variant="outline" size="sm" className="w-full justify-start">
                      <Shield className="h-4 w-4 mr-2" />
                      Configure SSO
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button onClick={nextStep}>
                  Next: AI Configuration
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Step 3: AI Teammates Setup
              </CardTitle>
              <CardDescription>
                Configure your AI teammates and their capabilities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Marketing Assistant</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Helps with content creation and campaign management
                  </p>
                  <Button size="sm" variant="outline" className="w-full">
                    Configure
                  </Button>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Code Reviewer</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Assists with code reviews and documentation
                  </p>
                  <Button size="sm" variant="outline" className="w-full">
                    Configure
                  </Button>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Data Analyst</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Provides insights and data analysis
                  </p>
                  <Button size="sm" variant="outline" className="w-full">
                    Configure
                  </Button>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Custom Assistant</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Create your own specialized AI teammate
                  </p>
                  <Button size="sm" variant="outline" className="w-full">
                    Create
                  </Button>
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button onClick={nextStep}>
                  Next: Security Policies
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Step 4: Security & Policies
              </CardTitle>
              <CardDescription>
                Set up security policies and data governance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Data Privacy Policy</h4>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Configure how sensitive data is handled by AI teammates
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Access Control</h4>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Define who can access which AI capabilities
                  </p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Content Filtering</h4>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Set up content moderation and filtering rules
                  </p>
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button onClick={nextStep}>
                  Next: Final Review
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 5 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Step 5: Setup Complete!
              </CardTitle>
              <CardDescription>
                Your Otzar platform is ready to use
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                <h3 className="text-xl font-semibold">Congratulations!</h3>
                <p className="text-muted-foreground">
                  Your AI management platform has been successfully configured.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="text-center">
                    <Book className="h-8 w-8 mx-auto mb-2" />
                    <CardTitle className="text-base">Documentation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" size="sm" className="w-full">
                      Read Docs
                    </Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="text-center">
                    <Video className="h-8 w-8 mx-auto mb-2" />
                    <CardTitle className="text-base">Video Tutorials</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" size="sm" className="w-full">
                      Watch Videos
                    </Button>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="text-center">
                    <Award className="h-8 w-8 mx-auto mb-2" />
                    <CardTitle className="text-base">Admin Certification</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline" size="sm" className="w-full">
                      Start Training
                    </Button>
                  </CardContent>
                </Card>
              </div>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button onClick={() => {
                  completeStep(currentStep);
                  toast({
                    title: "Setup Complete",
                    description: "Welcome to Otzar! Your platform is ready to use.",
                  });
                }}>
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress indicators */}
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i + 1}
              className={`h-2 rounded-full ${
                completedSteps.includes(i + 1)
                  ? "bg-green-500"
                  : i + 1 === currentStep
                  ? "bg-primary"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Onboarding;