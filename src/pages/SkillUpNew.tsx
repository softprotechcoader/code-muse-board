import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle2, Circle, BookOpen, ExternalLink, Target, Trash2, Plus, 
  Sparkles, Loader2, FileText, Video, Github, Code2, Newspaper, 
  MessageSquare, TrendingUp, Brain, Rocket, Trophy, Star, Send,
  ChevronDown, ChevronUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { roadmapService, type RoadmapType, type TechRoadmap } from "@/services/roadmapService";
import { skillUpAIService, type ChatMessage } from "@/services/skillUpAIService";

const SkillUp = () => {
  const [roadmaps, setRoadmaps] = useState<TechRoadmap[]>(() => {
    const saved = localStorage.getItem("skillUpRoadmaps");
    return saved ? JSON.parse(saved) : [];
  });
  
  const [userProgress, setUserProgress] = useState<{ [key: string]: boolean }>(() => {
    const saved = localStorage.getItem("skillUpProgress");
    return saved ? JSON.parse(saved) : {};
  });

  // Group roadmaps by technology
  const groupedRoadmaps = roadmaps.reduce((acc, roadmap) => {
    if (!acc[roadmap.technology]) {
      acc[roadmap.technology] = [];
    }
    acc[roadmap.technology].push(roadmap);
    return acc;
  }, {} as Record<string, TechRoadmap[]>);

  // Analytics state  
  type SkillProgressAnalytics = Awaited<ReturnType<typeof skillUpAIService.getProgressAnalytics>>;
  const [analytics, setAnalytics] = useState<SkillProgressAnalytics | null>(null);
  
  // AI Roadmap Generation State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiFormData, setAiFormData] = useState({
    technology: "",
    type: "scratch" as RoadmapType,
    category: "Frontend",
  });

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<Map<string, ChatMessage[]>>(new Map());
  const [activeChatRoadmap, setActiveChatRoadmap] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<Map<string, string[]>>(new Map());
  
  const { toast } = useToast();

  // Load analytics on mount and when roadmaps change
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const analyticsData = await skillUpAIService.getProgressAnalytics(roadmaps, userProgress);
        setAnalytics(analyticsData);
      } catch (error) {
        console.error("Failed to load analytics:", error);
      }
    };

    if (roadmaps.length > 0) {
      loadAnalytics();
    }
  }, [roadmaps, userProgress]);

  // Save roadmaps to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("skillUpRoadmaps", JSON.stringify(roadmaps));
  }, [roadmaps]);

  // Save progress to localStorage
  useEffect(() => {
    localStorage.setItem("skillUpProgress", JSON.stringify(userProgress));
  }, [userProgress]);

  const loadAnalytics = async () => {
    try {
      const analyticsData = await skillUpAIService.getProgressAnalytics(roadmaps, userProgress);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    }
  };

  const loadSuggestedQuestions = async (technology: string) => {
    if (suggestedQuestions.has(technology)) return;
    
    const roadmapForTech = roadmaps.filter(r => r.technology === technology);
    const progress = calculateOverallProgress(technology);
    
    try {
      const questions = await skillUpAIService.generateSuggestedQuestions(
        technology,
        progress
      );
      setSuggestedQuestions(prev => new Map(prev).set(technology, questions));
    } catch (error) {
      console.error("Failed to load questions:", error);
    }
  };

  const handleGenerateRoadmap = async () => {
    if (!aiFormData.technology.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a technology to learn",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const exists = roadmaps.find(
        (r) => r.technology.toLowerCase() === aiFormData.technology.toLowerCase() &&
        r.learningPath === aiFormData.type
      );

      if (exists) {
        toast({
          title: "Roadmap Exists",
          description: `A ${aiFormData.type} roadmap for ${aiFormData.technology} already exists. Try creating an alternate path!`,
          variant: "destructive",
        });
        setIsGenerating(false);
        return;
      }

      const roadmap = await roadmapService.generateRoadmap(
        aiFormData.technology,
        aiFormData.type,
        aiFormData.category
      );

      setRoadmaps([...roadmaps, roadmap]);
      
      toast({
        title: "Roadmap Created!",
        description: `Your ${aiFormData.type} roadmap for ${aiFormData.technology} is ready to explore.`,
      });
      
      setIsDialogOpen(false);
      setAiFormData({ technology: "", type: "scratch", category: "Frontend" });
    } catch (error) {
      console.error("Error generating roadmap:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Could not generate roadmap. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleChatMessage = async (technology: string, roadmapKeys: string[]) => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: chatInput,
      timestamp: new Date().toISOString(),
    };

    // Add user message
    setChatMessages(prev => {
      const messages = prev.get(technology) || [];
      return new Map(prev).set(technology, [...messages, userMessage]);
    });

    setChatInput("");
    setIsChatting(true);

    try {
      // Get current steps from all roadmaps for this technology
      const techRoadmaps = roadmaps.filter(r => r.technology === technology);
      const allSteps = techRoadmaps.flatMap(r => r.steps);

      const conversationHistory = chatMessages.get(technology) || [];
      
      const response = await skillUpAIService.chatWithAI(
        roadmapKeys[0] || technology, // Primary roadmap key
        technology,
        allSteps,
        chatInput,
        conversationHistory
      );

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.message,
        timestamp: new Date().toISOString(),
        suggestions: response.suggestions,
      };

      setChatMessages(prev => {
        const messages = prev.get(technology) || [];
        return new Map(prev).set(technology, [...messages, userMessage, assistantMessage]);
      });

      // Show toast if there are suggested changes
      if (response.suggestedChanges) {
        toast({
          title: "AI Suggestions Ready",
          description: "I've suggested some changes. Review them below!",
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Chat Failed",
        description: "Could not process your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsChatting(false);
    }
  };

  const handleSuggestedQuestion = (technology: string, roadmapKeys: string[], question: string) => {
    setChatInput(question);
    handleChatMessage(technology, roadmapKeys);
  };

  const toggleStepCompletion = (stepId: string) => {
    const newProgress = { ...userProgress, [stepId]: !userProgress[stepId] };
    setUserProgress(newProgress);
    
    toast({
      title: userProgress[stepId] ? "Step marked incomplete" : "Step completed!",
      description: userProgress[stepId] ? "Keep going!" : "Great progress! 🎉",
    });
  };

  const calculateProgress = (roadmap: TechRoadmap) => {
    const completedSteps = roadmap.steps.filter((step) => userProgress[step.id]).length;
    return (completedSteps / roadmap.steps.length) * 100;
  };

  const calculateOverallProgress = (technology: string) => {
    const techRoadmaps = roadmaps.filter(r => r.technology === technology);
    const totalSteps = techRoadmaps.reduce((sum, r) => sum + r.steps.length, 0);
    const completedSteps = techRoadmaps.reduce((sum, r) => {
      return sum + r.steps.filter(s => userProgress[s.id]).length;
    }, 0);
    return totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  };

  const getResourceIcon = (type?: string) => {
    switch (type) {
      case "docs": return <FileText className="h-3 w-3" />;
      case "tutorial": return <Code2 className="h-3 w-3" />;
      case "video": return <Video className="h-3 w-3" />;
      case "github": return <Github className="h-3 w-3" />;
      case "practice": return <Target className="h-3 w-3" />;
      case "article": return <Newspaper className="h-3 w-3" />;
      default: return <ExternalLink className="h-3 w-3" />;
    }
  };

  const getResourceColor = (type?: string) => {
    switch (type) {
      case "docs": return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20";
      case "tutorial": return "bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20";
      case "video": return "bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border-purple-500/20";
      case "github": return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20 border-gray-500/20";
      case "practice": return "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20";
      case "article": return "bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 border-indigo-500/20";
      default: return "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20";
    }
  };

  const getMasteryBadge = (progress: number) => {
    const level = skillUpAIService.calculateMasteryLevel(progress, 0);
    return (
      <Badge className={`${level.color} border`}>
        {level.icon} {level.level}
      </Badge>
    );
  };

  const deleteRoadmap = async (technology: string, learningPath?: "scratch" | "upgrade") => {
    // Normalize learningPath - default to "scratch" if not provided
    const normalizedPath = learningPath || "scratch";
    
    // Find the roadmap to delete - match by technology and learningPath (or undefined)
    const roadmapToDelete = roadmaps.find(
      (r) => r.technology === technology && (r.learningPath || "scratch") === normalizedPath
    );

    if (!roadmapToDelete) {
      console.error("Delete failed - roadmap not found:", {
        technology,
        learningPath: normalizedPath,
        availableRoadmaps: roadmaps.map(r => ({
          tech: r.technology,
          path: r.learningPath
        }))
      });
      
      toast({
        title: "Error",
        description: `Roadmap not found: ${technology} (${normalizedPath})`,
        variant: "destructive",
      });
      return;
    }

    // Calculate progress before deletion
    const completedSteps = roadmapToDelete.steps.filter((s) => userProgress[s.id]).length;
    const totalSteps = roadmapToDelete.steps.length;
    const progress = ((completedSteps / totalSteps) * 100).toFixed(1);

    // Remove roadmap from state - use same matching logic
    const updatedRoadmaps = roadmaps.filter(
      (r) => !(r.technology === technology && (r.learningPath || "scratch") === normalizedPath)
    );
    setRoadmaps(updatedRoadmaps);

    // Remove progress data for deleted roadmap steps
    const updatedProgress = { ...userProgress };
    roadmapToDelete.steps.forEach((step) => {
      delete updatedProgress[step.id];
    });
    setUserProgress(updatedProgress);

    // Add to history
    try {
      const historyEntry = {
        id: `deleted-${Date.now()}`,
        title: `Deleted: ${technology} (${normalizedPath === "scratch" ? "Beginner" : "Upgrade"} Path)`,
        description: `${roadmapToDelete.description} - Progress: ${progress}% (${completedSteps}/${totalSteps} steps completed)`,
        status: "deleted",
        completedAt: new Date().toISOString(),
        comments: [
          {
            text: `Roadmap deleted. ${completedSteps} out of ${totalSteps} steps were completed before deletion.`,
            date: new Date().toISOString(),
          },
        ],
      };

      // Get existing history
      const existingHistory = JSON.parse(localStorage.getItem("history") || "[]");
      existingHistory.push(historyEntry);
      localStorage.setItem("history", JSON.stringify(existingHistory));

      // Log activity to backend if available
      fetch("http://localhost:3001/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ROADMAP_DELETED",
          details: `Deleted ${technology} ${normalizedPath} roadmap with ${progress}% completion`,
          category: "LEARNING",
          importance: "MEDIUM",
        }),
      }).catch((err) => console.warn("Failed to log activity:", err));
    } catch (error) {
      console.error("Error logging to history:", error);
    }

    toast({
      title: "Roadmap Deleted",
      description: `${technology} roadmap removed and logged to history.`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              SkillUp AI
            </h1>
            <p className="text-muted-foreground mt-2">
              AI-powered learning paths tailored to your goals
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <Button onClick={() => setIsDialogOpen(true)} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Create Roadmap
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create AI-Powered Roadmap</DialogTitle>
                <DialogDescription>
                  Let AI generate a personalized learning path for any technology
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="technology">Technology</Label>
                  <Input
                    id="technology"
                    placeholder="e.g., React, Python, Docker..."
                    value={aiFormData.technology}
                    onChange={(e) => setAiFormData({ ...aiFormData, technology: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Learning Path Type</Label>
                  <Select
                    value={aiFormData.type}
                    onValueChange={(value) => setAiFormData({ ...aiFormData, type: value as RoadmapType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scratch">From Scratch (Beginner)</SelectItem>
                      <SelectItem value="upgrade">Skill Upgrade (Intermediate)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={aiFormData.category}
                    onValueChange={(value) => setAiFormData({ ...aiFormData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Frontend">Frontend</SelectItem>
                      <SelectItem value="Backend">Backend</SelectItem>
                      <SelectItem value="DevOps">DevOps</SelectItem>
                      <SelectItem value="Mobile">Mobile</SelectItem>
                      <SelectItem value="Data Science">Data Science</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleGenerateRoadmap} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Analytics Dashboard */}
        {analytics && roadmaps.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Skills</CardTitle>
                <Rocket className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalSkills}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.inProgressSkills} in progress
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.averageCompletionRate.toFixed(1)}%</div>
                <Progress value={analytics.averageCompletionRate} className="mt-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hours Invested</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalHoursSpent}h</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.remainingHours}h remaining
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Skills</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.completedSkills}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics.notStartedSkills} not started
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Skills Grid - One Card Per Technology */}
        {roadmaps.length === 0 ? (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">No Skills Yet</h3>
                <p className="text-muted-foreground mt-2">
                  Create your first AI-powered learning roadmap to get started!
                </p>
              </div>
              <Button onClick={() => setIsDialogOpen(true)} size="lg">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Roadmap
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(groupedRoadmaps).map(([technology, techRoadmaps]) => {
              const overallProgress = calculateOverallProgress(technology);
              const roadmapKeys = techRoadmaps.map(r => `${r.technology}-${r.learningPath}`);
              const isChatOpen = activeChatRoadmap === technology;
              const messages = chatMessages.get(technology) || [];
              const questions = suggestedQuestions.get(technology) || [];

              return (
                <Card key={technology} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary/10 to-purple-500/10">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-2xl">{technology}</CardTitle>
                          {getMasteryBadge(overallProgress)}
                        </div>
                        <CardDescription>
                          {techRoadmaps.length} learning {techRoadmaps.length === 1 ? 'path' : 'paths'} • {overallProgress.toFixed(0)}% complete
                        </CardDescription>
                        <div className="space-y-2">
                          <Progress value={overallProgress} className="h-2" />
                          <div className="text-xs text-muted-foreground">
                            {skillUpAIService.generateProgressPattern(overallProgress)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-6 space-y-6">
                    {/* Learning Paths */}
                    <div className="space-y-4">
                      {techRoadmaps.map((roadmap) => {
                        const progress = calculateProgress(roadmap);
                        const completedSteps = roadmap.steps.filter(s => userProgress[s.id]).length;

                        return (
                          <Collapsible key={`${roadmap.technology}-${roadmap.learningPath}`}>
                            <CollapsibleTrigger className="w-full">
                              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline">
                                    {roadmap.learningPath === "scratch" ? "Beginner" : "Upgrade"}
                                  </Badge>
                                  <span className="font-medium">
                                    {completedSteps}/{roadmap.steps.length} steps
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {progress.toFixed(0)}%
                                  </span>
                                </div>
                                <ChevronDown className="h-4 w-4" />
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="mt-2 space-y-2 pl-4">
                                {roadmap.steps.map((step) => (
                                  <div
                                    key={step.id}
                                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                                  >
                                    <button
                                      onClick={() => toggleStepCompletion(step.id)}
                                      className="mt-1"
                                    >
                                      {userProgress[step.id] ? (
                                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                                      ) : (
                                        <Circle className="h-5 w-5 text-muted-foreground" />
                                      )}
                                    </button>
                                    <div className="flex-1 space-y-2">
                                      <div>
                                        <h4 className="font-medium">{step.title}</h4>
                                        <p className="text-sm text-muted-foreground">{step.description}</p>
                                      </div>
                                      {step.resources && step.resources.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                          {step.resources.map((resource, idx) => (
                                            <a
                                              key={idx}
                                              href={resource.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border ${getResourceColor(resource.type)}`}
                                            >
                                              {getResourceIcon(resource.type)}
                                              {resource.name}
                                            </a>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                <div className="flex justify-end pt-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteRoadmap(roadmap.technology, roadmap.learningPath)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Path
                                  </Button>
                                </div>
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>

                    {/* AI Chat Interface */}
                    <div className="border-t pt-6">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setActiveChatRoadmap(isChatOpen ? null : technology);
                          if (!isChatOpen) loadSuggestedQuestions(technology);
                        }}
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        {isChatOpen ? "Close AI Chat" : "Chat with AI Coach"}
                      </Button>

                      {isChatOpen && (
                        <div className="mt-4 space-y-4">
                          {/* Chat Messages */}
                          {messages.length > 0 && (
                            <div className="max-h-64 overflow-y-auto space-y-2 p-4 bg-muted/30 rounded-lg">
                              {messages.map((msg) => (
                                <div
                                  key={msg.id}
                                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                >
                                  <div
                                    className={`max-w-[80%] p-3 rounded-lg ${
                                      msg.role === "user"
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-card border"
                                    }`}
                                  >
                                    <p className="text-sm">{msg.content}</p>
                                    {msg.suggestions && msg.suggestions.length > 0 && (
                                      <div className="mt-2 space-y-1">
                                        {msg.suggestions.map((suggestion, idx) => (
                                          <p key={idx} className="text-xs opacity-80">• {suggestion}</p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Suggested Questions */}
                          {questions.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Suggested Questions:</p>
                              <div className="flex flex-wrap gap-2">
                                {questions.slice(0, 4).map((question, idx) => (
                                  <Button
                                    key={idx}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSuggestedQuestion(technology, roadmapKeys, question)}
                                    disabled={isChatting}
                                  >
                                    {question}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Chat Input */}
                          <div className="flex gap-2">
                            <Textarea
                              placeholder="Ask AI to add topics, explain steps, or customize your path..."
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleChatMessage(technology, roadmapKeys);
                                }
                              }}
                              className="flex-1"
                              rows={2}
                            />
                            <Button
                              onClick={() => handleChatMessage(technology, roadmapKeys)}
                              disabled={isChatting || !chatInput.trim()}
                              size="icon"
                              className="h-full"
                            >
                              {isChatting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SkillUp;
