import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/Layout";
import { 
  Book, 
  Search, 
  Video, 
  FileText, 
  Award, 
  ExternalLink,
  Clock,
  User,
  Star,
  Play,
  Download,
  Bookmark
} from "lucide-react";

const Documentation = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const articles = [
    {
      id: 1,
      title: "Getting Started with Otzar",
      description: "Complete guide to setting up your AI management platform",
      category: "Getting Started",
      readTime: "10 min",
      author: "Otzar Team",
      rating: 4.9,
      isPopular: true
    },
    {
      id: 2,
      title: "AI Teammate Configuration",
      description: "How to create and customize AI teammates for your organization",
      category: "AI Management",
      readTime: "15 min",
      author: "Sarah Chen",
      rating: 4.8,
      isPopular: true
    },
    {
      id: 3,
      title: "Security Best Practices",
      description: "Implementing robust security policies and access controls",
      category: "Security",
      readTime: "12 min",
      author: "Mike Rodriguez",
      rating: 4.7,
      isPopular: false
    },
    {
      id: 4,
      title: "Data Privacy & Compliance",
      description: "Ensuring GDPR, HIPAA, and other compliance requirements",
      category: "Compliance",
      readTime: "20 min",
      author: "Legal Team",
      rating: 4.9,
      isPopular: true
    },
    {
      id: 5,
      title: "API Integration Guide",
      description: "Connecting external systems and services to Otzar",
      category: "Development",
      readTime: "25 min",
      author: "Dev Team",
      rating: 4.6,
      isPopular: false
    },
    {
      id: 6,
      title: "Performance Optimization",
      description: "Tips for optimizing AI performance and reducing costs",
      category: "Optimization",
      readTime: "18 min",
      author: "Performance Team",
      rating: 4.8,
      isPopular: true
    }
  ];

  const videos = [
    {
      id: 1,
      title: "Otzar Platform Overview",
      duration: "8:30",
      thumbnail: "video-1",
      category: "Overview"
    },
    {
      id: 2,
      title: "Setting Up Your First AI Teammate",
      duration: "12:45",
      thumbnail: "video-2",
      category: "Tutorial"
    },
    {
      id: 3,
      title: "Advanced Security Configuration",
      duration: "15:20",
      thumbnail: "video-3",
      category: "Security"
    },
    {
      id: 4,
      title: "Dashboard Deep Dive",
      duration: "10:15",
      thumbnail: "video-4",
      category: "Dashboard"
    }
  ];

  const certifications = [
    {
      id: 1,
      title: "Otzar Administrator Certification",
      description: "Comprehensive certification for platform administrators",
      level: "Intermediate",
      duration: "4 hours",
      modules: 8,
      completed: false
    },
    {
      id: 2,
      title: "AI Governance Specialist",
      description: "Advanced certification for AI governance and compliance",
      level: "Advanced",
      duration: "6 hours",
      modules: 12,
      completed: false
    },
    {
      id: 3,
      title: "Security Manager Certification",
      description: "Specialized certification for security administrators",
      level: "Advanced",
      duration: "5 hours",
      modules: 10,
      completed: false
    }
  ];

  const filteredArticles = articles.filter(article =>
    article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    article.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Book className="h-8 w-8" />
            Documentation & Training
          </h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive guides, tutorials, and training resources for Otzar administrators
          </p>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documentation, tutorials, and guides..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 text-center">
              <Play className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold">Quick Start Guide</h3>
              <p className="text-sm text-muted-foreground">Get up and running in 5 minutes</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 text-center">
              <Video className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold">Video Library</h3>
              <p className="text-sm text-muted-foreground">Step-by-step video tutorials</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 text-center">
              <Award className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold">Certifications</h3>
              <p className="text-sm text-muted-foreground">Earn administrator credentials</p>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="pt-6 text-center">
              <ExternalLink className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h3 className="font-semibold">API Reference</h3>
              <p className="text-sm text-muted-foreground">Technical documentation</p>
            </CardContent>
          </Card>
        </div>

        {/* Documentation Articles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documentation Articles
            </CardTitle>
            <CardDescription>
              Comprehensive guides and best practices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredArticles.map((article) => (
                <Card key={article.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base mb-1">
                          {article.title}
                          {article.isPopular && <Badge variant="secondary" className="ml-2">Popular</Badge>}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {article.category}
                        </Badge>
                      </div>
                      <Bookmark className="h-4 w-4 text-muted-foreground hover:text-primary cursor-pointer" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground mb-3">
                      {article.description}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {article.readTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {article.author}
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-current text-yellow-500" />
                          {article.rating}
                        </span>
                      </div>
                      <Button variant="ghost" size="sm">
                        Read
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Video Tutorials */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Video Tutorials
            </CardTitle>
            <CardDescription>
              Visual step-by-step guides
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {videos.map((video) => (
                <Card key={video.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-0">
                    <div className="aspect-video bg-muted rounded-t-lg flex items-center justify-center">
                      <Play className="h-12 w-12 text-primary" />
                    </div>
                    <div className="p-4">
                      <Badge variant="outline" className="text-xs mb-2">
                        {video.category}
                      </Badge>
                      <h3 className="font-semibold text-sm mb-1">{video.title}</h3>
                      <p className="text-xs text-muted-foreground">{video.duration}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Certifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Administrator Certifications
            </CardTitle>
            <CardDescription>
              Validate your expertise with official certifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {certifications.map((cert) => (
                <Card key={cert.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{cert.title}</h3>
                          <Badge variant="outline">{cert.level}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {cert.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{cert.duration}</span>
                          <span>{cert.modules} modules</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Syllabus
                        </Button>
                        <Button size="sm">
                          Start Training
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Documentation;