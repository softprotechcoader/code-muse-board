import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, BookOpen, ExternalLink, Target, Trash2, Plus, Sparkles, Download, Loader2, FileText, Video, Github, Code2, Newspaper } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { roadmapService, type RoadmapType, type TechRoadmap, type RoadmapStep } from "@/services/roadmapService";

const SkillUp = () => {
  const [roadmaps, setRoadmaps] = useState<TechRoadmap[]>(() => {
    const saved = localStorage.getItem("skillUpRoadmaps");
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [userProgress, setUserProgress] = useState<{ [key: string]: boolean }>(() => {
    const saved = localStorage.getItem("skillUpProgress");
    return saved ? JSON.parse(saved) : {};
  });
  
  // AI Roadmap Generation State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiFormData, setAiFormData] = useState({
    technology: "",
    type: "scratch" as RoadmapType,
    category: "Frontend",
  });
  
  const { toast } = useToast();

  // Open dialog with pre-filled technology
  const openDialogWithTech = (technology: string, category: string, suggestedType: RoadmapType = "upgrade") => {
    setAiFormData({
      technology,
      type: suggestedType,
      category,
    });
    setIsDialogOpen(true);
  };

  // Save roadmaps to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("skillUpRoadmaps", JSON.stringify(roadmaps));
  }, [roadmaps]);

  const selectedRoadmap = roadmaps.find((r) => r.technology === selectedTech);

  const toggleStepCompletion = (stepId: string) => {
    const newProgress = { ...userProgress, [stepId]: !userProgress[stepId] };
    setUserProgress(newProgress);
    localStorage.setItem("skillUpProgress", JSON.stringify(newProgress));
    
    toast({
      title: userProgress[stepId] ? "Step marked incomplete" : "Step completed!",
      description: userProgress[stepId] ? "Keep going!" : "Great progress! 🎉",
    });
  };

  const calculateProgress = (roadmap: TechRoadmap) => {
    const completedSteps = roadmap.steps.filter((step) => userProgress[step.id]).length;
    return (completedSteps / roadmap.steps.length) * 100;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "Intermediate":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "Advanced":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  const getResourceIcon = (type?: string) => {
    switch (type) {
      case "docs":
        return <FileText className="h-3 w-3" />;
      case "tutorial":
        return <Code2 className="h-3 w-3" />;
      case "video":
        return <Video className="h-3 w-3" />;
      case "github":
        return <Github className="h-3 w-3" />;
      case "practice":
        return <Code2 className="h-3 w-3" />;
      case "article":
        return <Newspaper className="h-3 w-3" />;
      default:
        return <ExternalLink className="h-3 w-3" />;
    }
  };

  const getResourceColor = (type?: string) => {
    switch (type) {
      case "docs":
        return "border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-500";
      case "tutorial":
        return "border-green-500/20 hover:bg-green-500/10 hover:text-green-500";
      case "video":
        return "border-red-500/20 hover:bg-red-500/10 hover:text-red-500";
      case "github":
        return "border-purple-500/20 hover:bg-purple-500/10 hover:text-purple-500";
      case "practice":
        return "border-orange-500/20 hover:bg-orange-500/10 hover:text-orange-500";
      case "article":
        return "border-teal-500/20 hover:bg-teal-500/10 hover:text-teal-500";
      default:
        return "hover:bg-primary/10";
    }
  };

  const deleteRoadmap = (technology: string) => {
    setRoadmaps(prev => prev.filter(r => r.technology !== technology));
    if (selectedTech === technology) {
      setSelectedTech(null);
    }
    toast({
      title: "Roadmap deleted",
      description: `${technology} has been removed from your learning path.`,
    });
  };

  const generateAIRoadmap = async () => {
    if (!aiFormData.technology.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a technology to learn",
        variant: "destructive",
      });
      return;
    }

    // Check if roadmap with same technology AND learning path already exists
    const exists = roadmaps.find(r => 
      r.technology.toLowerCase() === aiFormData.technology.toLowerCase() &&
      r.learningPath === aiFormData.type
    );
    
    if (exists) {
      toast({
        title: "Roadmap exists",
        description: `You already have a ${aiFormData.type === 'scratch' ? 'beginner' : 'upgrade'} roadmap for ${aiFormData.technology}`,
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const roadmap = await roadmapService.generateRoadmap(
        aiFormData.technology,
        aiFormData.type,
        aiFormData.category
      );

      setRoadmaps(prev => [...prev, roadmap]);
      
      const totalResources = roadmap.steps.reduce((sum, step) => sum + step.resources.length, 0);
      
      toast({
        title: "Roadmap created! 🎉",
        description: `Your ${aiFormData.type === 'scratch' ? 'beginner' : 'upgrade'} roadmap for ${aiFormData.technology} is ready with ${roadmap.steps.length} steps and ${totalResources} learning resources (docs, videos, tutorials, GitHub)`,
      });

      setIsDialogOpen(false);
      setAiFormData({ technology: "", type: "scratch", category: "Frontend" });
    } catch (error) {
      console.error("Failed to generate roadmap:", error);
      toast({
        title: "Generation failed",
        description: "Could not create roadmap. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadRoadmap = (roadmap: TechRoadmap) => {
    roadmapService.downloadAsMarkdown(roadmap);
    toast({
      title: "Download started",
      description: `${roadmap.technology} roadmap downloaded as Markdown`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Skill Up</h2>
          <p className="text-muted-foreground">
            Create personalized learning roadmaps with AI assistance
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Sparkles className="h-4 w-4" />
              Create AI Roadmap
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Generate AI-Powered Roadmap</DialogTitle>
              <DialogDescription>
                Create a personalized learning path tailored to your skill level
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="technology">Technology / Topic</Label>
                <Input
                  id="technology"
                  placeholder="e.g., React, TypeScript, Docker"
                  value={aiFormData.technology}
                  onChange={(e) => setAiFormData(prev => ({ ...prev, technology: e.target.value }))}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="type">Learning Path Type</Label>
                <Select
                  value={aiFormData.type}
                  onValueChange={(value: RoadmapType) => setAiFormData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scratch">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">🎯 Learning from Scratch</span>
                        <span className="text-xs text-muted-foreground">For beginners starting fresh</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="upgrade">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">🚀 Upgrade Skills</span>
                        <span className="text-xs text-muted-foreground">Learn new features & updates</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={aiFormData.category}
                  onValueChange={(value) => setAiFormData(prev => ({ ...prev, category: value }))}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Frontend">Frontend</SelectItem>
                    <SelectItem value="Backend">Backend</SelectItem>
                    <SelectItem value="Database">Database</SelectItem>
                    <SelectItem value="DevOps">DevOps</SelectItem>
                    <SelectItem value="Cloud">Cloud</SelectItem>
                    <SelectItem value="AI/ML">AI/ML</SelectItem>
                    <SelectItem value="Mobile">Mobile</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium mb-1">
                  {aiFormData.type === "scratch" ? "🎯 Beginner Path" : "🚀 Upgrade Path"}
                </p>
                <p className="text-muted-foreground text-xs">
                  {aiFormData.type === "scratch" 
                    ? "Complete learning path from fundamentals to building projects"
                    : "Focus on latest features, breaking changes, and migration guides"
                  }
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isGenerating}>
                Cancel
              </Button>
              <Button onClick={generateAIRoadmap} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Roadmap
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {roadmaps.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="rounded-full bg-muted p-6">
              <Target className="h-12 w-12 text-muted-foreground" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold">No Learning Paths Yet</h3>
              <p className="text-muted-foreground max-w-md">
                Get started by adding articles from the Dashboard to your Skill Up tab. 
                Click the "Add to Skill Up" button on any article card to begin your learning journey!
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/'}
            >
              <Plus className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {roadmaps.map((roadmap) => {
              const progress = calculateProgress(roadmap);
              return (
                <Card
                  key={roadmap.technology}
                  className={`cursor-pointer transition-all hover:shadow-lg hover:shadow-primary/10 ${
                    selectedTech === roadmap.technology ? "border-primary ring-2 ring-primary/20" : "border-border"
                  }`}
                  onClick={() => setSelectedTech(roadmap.technology)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex gap-2">
                        <Badge variant="secondary">{roadmap.category}</Badge>
                        {roadmap.learningPath && (
                          <Badge variant="outline" className={
                            roadmap.learningPath === "scratch" 
                              ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                              : "bg-purple-500/10 text-purple-500 border-purple-500/20"
                          }>
                            {roadmap.learningPath === "scratch" ? "🎯 Beginner" : "🚀 Upgrade"}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadRoadmap(roadmap);
                          }}
                          title="Download roadmap"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Badge className={getDifficultyColor(roadmap.difficulty)} variant="outline">
                          {roadmap.difficulty}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRoadmap(roadmap.technology);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-xl">{roadmap.technology}</CardTitle>
                    <CardDescription>{roadmap.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                        <span>{roadmap.steps.length} steps</span>
                        <span>•</span>
                        <span>{roadmap.estimatedTime}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>📚 {roadmap.steps.reduce((sum, step) => sum + step.resources.length, 0)} learning resources</span>
                      </div>
                      
                      {/* Create Alternate Path Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          const alternateType = roadmap.learningPath === "scratch" ? "upgrade" : "scratch";
                          openDialogWithTech(roadmap.technology, roadmap.category, alternateType);
                        }}
                      >
                        <Sparkles className="h-3 w-3" />
                        {roadmap.learningPath === "scratch" 
                          ? "Create Upgrade Path" 
                          : "Create Beginner Path"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {selectedRoadmap && (
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-2xl">{selectedRoadmap.technology} Roadmap</CardTitle>
                      {selectedRoadmap.learningPath && (
                        <Badge variant="outline" className={
                          selectedRoadmap.learningPath === "scratch" 
                            ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                            : "bg-purple-500/10 text-purple-500 border-purple-500/20"
                        }>
                          {selectedRoadmap.learningPath === "scratch" ? "🎯 From Scratch" : "🚀 Upgrade Path"}
                        </Badge>
                      )}
                    </div>
                    <CardDescription>{selectedRoadmap.description}</CardDescription>
                    
                    {/* Resource Summary */}
                    <div className="rounded-lg bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 p-3 border border-primary/20">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">📚</div>
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-1">Comprehensive Learning Resources</p>
                          <p className="text-xs text-muted-foreground">
                            This roadmap includes {selectedRoadmap.steps.reduce((sum, step) => sum + step.resources.length, 0)} curated resources 
                            including official documentation, video tutorials, GitHub repositories, interactive practice platforms, and community guides.
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Badge variant="outline" className="text-xs border-blue-500/30 bg-blue-500/10">📄 Docs</Badge>
                            <Badge variant="outline" className="text-xs border-red-500/30 bg-red-500/10">🎥 Videos</Badge>
                            <Badge variant="outline" className="text-xs border-purple-500/30 bg-purple-500/10">🔗 GitHub</Badge>
                            <Badge variant="outline" className="text-xs border-green-500/30 bg-green-500/10">💻 Tutorials</Badge>
                            <Badge variant="outline" className="text-xs border-orange-500/30 bg-orange-500/10">🎯 Practice</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Prerequisites */}
                    {selectedRoadmap.prerequisites && selectedRoadmap.prerequisites.length > 0 && (
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-sm font-medium mb-2">Prerequisites:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {selectedRoadmap.prerequisites.map((prereq, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-primary mt-0.5">•</span>
                              {prereq}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Learning Outcomes */}
                    {selectedRoadmap.outcomes && selectedRoadmap.outcomes.length > 0 && (
                      <div className="rounded-lg bg-primary/5 p-3">
                        <p className="text-sm font-medium mb-2">What you'll learn:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {selectedRoadmap.outcomes.map((outcome, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-primary mt-0.5">✓</span>
                              {outcome}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadRoadmap(selectedRoadmap)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTech(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedRoadmap.steps.map((step, index) => (
                  <Card
                    key={step.id}
                    className={`transition-all ${
                      userProgress[step.id]
                        ? "bg-primary/5 border-primary/20"
                        : "hover:shadow-md"
                    }`}
                  >
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-1 p-0 h-8 w-8"
                          onClick={() => toggleStepCompletion(step.id)}
                        >
                          {userProgress[step.id] ? (
                            <CheckCircle2 className="h-6 w-6 text-primary" />
                          ) : (
                            <Circle className="h-6 w-6 text-muted-foreground" />
                          )}
                        </Button>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-lg">
                              Step {index + 1}: {step.title}
                            </CardTitle>
                            {step.estimatedHours && (
                              <Badge variant="outline" className="shrink-0">
                                ⏱️ {step.estimatedHours}h
                              </Badge>
                            )}
                          </div>
                          <CardDescription>{step.description}</CardDescription>
                          
                          {step.resources.length > 0 && (
                            <div className="space-y-2 pt-2">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-muted-foreground">
                                  📚 Learning Resources:
                                </p>
                                <Badge variant="secondary" className="text-xs">
                                  {step.resources.length} sources
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {step.resources.map((resource, idx) => (
                                  <Button
                                    key={idx}
                                    variant="outline"
                                    size="sm"
                                    asChild
                                    className={`h-8 ${getResourceColor(resource.type)}`}
                                  >
                                    <a
                                      href={resource.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2"
                                    >
                                      {getResourceIcon(resource.type)}
                                      {resource.name}
                                    </a>
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default SkillUp;
