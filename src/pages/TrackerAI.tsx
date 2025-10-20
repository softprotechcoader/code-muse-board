// src/pages/TrackerAI.tsx
// AI-Powered Reading Tracker with intelligent insights and roadmap generation

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, Trash2, Wifi, WifiOff, BookOpen, Github, 
  Sparkles, TrendingUp, Target, Lightbulb, Rocket, Brain,
  Clock, CheckCircle2, Circle, ExternalLink, Download, 
  FileText, Video, Code2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/contexts/SocketContext";
import { trackerAIService, type TrackedItem, type AIInsights, type LearningAnalysis } from "@/services/trackerAIService";
import { useNavigate } from "react-router-dom";

const TrackerAI = () => {
  const [items, setItems] = useState<TrackedItem[]>([]);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [selectedItem, setSelectedItem] = useState<TrackedItem | null>(null);
  const [insights, setInsights] = useState<Map<string, AIInsights>>(new Map());
  const [learningAnalysis, setLearningAnalysis] = useState<LearningAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingRoadmap, setIsGeneratingRoadmap] = useState(false);
  const { toast } = useToast();
  const { isConnected, userCount, updateReadingProgress } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (items.length > 0) {
      analyzeLearningProgress();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const loadItems = () => {
    const tracked = JSON.parse(localStorage.getItem("trackedItems") || "[]");
    setItems(tracked);
  };

  const analyzeLearningProgress = async () => {
    if (items.length === 0) return;
    
    try {
      const analysis = await trackerAIService.analyzeLearningProgress(items);
      setLearningAnalysis(analysis);
    } catch (error) {
      console.error("Failed to analyze progress:", error);
    }
  };

  const analyzeItem = async (item: TrackedItem) => {
    setIsAnalyzing(true);
    try {
      const itemInsights = await trackerAIService.analyzeTrackedItem(item);
      
      // Update insights map
      setInsights(prev => new Map(prev).set(item.id, itemInsights));
      
      // Update item with insights
      const updated = items.map(i => 
        i.id === item.id ? { ...i, aiInsights: itemInsights } : i
      );
      setItems(updated);
      localStorage.setItem("trackedItems", JSON.stringify(updated));
      
      toast({
        title: "AI Analysis Complete ✨",
        description: `Extracted ${itemInsights.keyTechnologies.length} technologies and ${itemInsights.keyTakeaways.length} key takeaways`,
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Could not analyze this item",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateRoadmapFromItem = async (item: TrackedItem, type: "scratch" | "upgrade") => {
    setIsGeneratingRoadmap(true);
    try {
      const roadmap = await trackerAIService.generateRoadmapFromTrackedItem(item, type);
      
      // Save to SkillUp roadmaps
      const existingRoadmaps = JSON.parse(localStorage.getItem("skillUpRoadmaps") || "[]");
      existingRoadmaps.push(roadmap);
      localStorage.setItem("skillUpRoadmaps", JSON.stringify(existingRoadmaps));
      
      toast({
        title: "Roadmap Created! 🚀",
        description: `Your ${type === 'scratch' ? 'beginner' : 'upgrade'} roadmap has been added to SkillUp`,
        action: (
          <Button variant="outline" size="sm" onClick={() => navigate('/skillup')}>
            View Roadmap
          </Button>
        ),
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Could not generate roadmap from this article",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingRoadmap(false);
    }
  };

  const updateStatus = (id: string, status: "started" | "inProgress" | "completed") => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, status } : item
    );
    setItems(updated);
    localStorage.setItem("trackedItems", JSON.stringify(updated));
    
    if (isConnected) {
      const item = updated.find(item => item.id === id);
      if (item) {
        updateReadingProgress({
          itemId: id,
          title: item.title,
          status: status,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    if (status === "completed") {
      const history = JSON.parse(localStorage.getItem("history") || "[]");
      const completedItem = updated.find(item => item.id === id);
      if (completedItem) {
        history.push({ ...completedItem, completedAt: new Date().toISOString() });
        localStorage.setItem("history", JSON.stringify(history));
      }
    }
    
    toast({ title: "Status Updated", description: `Item marked as ${status}` });
  };

  const addComment = (id: string) => {
    const updated = items.map((item) =>
      item.id === id
        ? {
            ...item,
            comments: [
              ...(item.comments || []),
              { text: commentText[id] || '', date: new Date().toISOString() },
            ],
          }
        : item
    );
    setItems(updated);
    localStorage.setItem('trackedItems', JSON.stringify(updated));
    setCommentText((prev) => ({ ...prev, [id]: '' }));
  };

  const removeItem = (id: string) => {
    const filtered = items.filter((item) => item.id !== id);
    setItems(filtered);
    localStorage.setItem('trackedItems', JSON.stringify(filtered));
    toast({ title: "Item Removed", description: "Removed from tracker" });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "started":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "inProgress":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "completed":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      default:
        return "";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "started":
        return <Circle className="h-4 w-4" />;
      case "inProgress":
        return <Clock className="h-4 w-4" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Circle className="h-4 w-4" />;
    }
  };

  const completionRate = items.length > 0 
    ? Math.round((items.filter(i => i.status === "completed").length / items.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight">AI-Powered Tracker</h2>
            {isConnected ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
          </div>
        </div>
        <p className="text-muted-foreground">
          Track your learning journey with AI-powered insights and personalized roadmaps
          {isConnected && ` • ${userCount} users online`}
        </p>
      </div>

      {/* Learning Dashboard */}
      {learningAnalysis && items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Tracked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{learningAnalysis.totalItemsTracked}</div>
              <p className="text-xs text-muted-foreground">Articles in tracker</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completionRate}%</div>
              <Progress value={completionRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Learning Streak</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{learningAnalysis.learningStreak}</div>
              <p className="text-xs text-muted-foreground">Days in a row</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Top Technology</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {learningAnalysis.topTechnologies[0]?.name || "N/A"}
              </div>
              <p className="text-xs text-muted-foreground">
                {learningAnalysis.topTechnologies[0]?.count || 0} articles
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Insights Panel */}
      {learningAnalysis && learningAnalysis.recommendedRoadmaps.length > 0 && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <CardTitle>AI Recommendations</CardTitle>
            </div>
            <CardDescription>Personalized suggestions based on your learning patterns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Suggested Next Steps */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Suggested Next Steps
              </h4>
              <ul className="space-y-1">
                {learningAnalysis.suggestedNextSteps.map((step, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommended Roadmaps */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Rocket className="h-4 w-4" />
                Recommended Roadmaps
              </h4>
              <div className="grid gap-2">
                {learningAnalysis.recommendedRoadmaps.slice(0, 3).map((rec, idx) => (
                  <Card key={idx} className="bg-muted/30">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{rec.technology}</span>
                            <Badge 
                              variant="outline" 
                              className={
                                rec.priority === "high" 
                                  ? "bg-red-500/10 text-red-400 border-red-500/20"
                                  : rec.priority === "medium"
                                  ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                  : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              }
                            >
                              {rec.priority} priority
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{rec.reason}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => navigate(`/skillup?tech=${rec.technology}&type=${rec.type}`)}
                        >
                          <Sparkles className="h-3 w-3 mr-1" />
                          Create
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tracked Items */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All ({items.length})
          </TabsTrigger>
          <TabsTrigger value="inProgress">
            In Progress ({items.filter(i => i.status === "inProgress").length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({items.filter(i => i.status === "completed").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {items.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No items tracked yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add articles from the Dashboard to start tracking your learning
                </p>
              </CardContent>
            </Card>
          ) : (
            items.map((item) => <TrackedItemCard 
              key={item.id} 
              item={item}
              insights={insights.get(item.id)}
              onAnalyze={() => analyzeItem(item)}
              onGenerateRoadmap={(type) => generateRoadmapFromItem(item, type)}
              onStatusUpdate={updateStatus}
              onAddComment={addComment}
              onRemove={removeItem}
              commentText={commentText[item.id] || ''}
              onCommentChange={(text) => setCommentText(prev => ({ ...prev, [item.id]: text }))}
              getStatusColor={getStatusColor}
              getStatusIcon={getStatusIcon}
              isAnalyzing={isAnalyzing}
              isGeneratingRoadmap={isGeneratingRoadmap}
            />)
          )}
        </TabsContent>

        <TabsContent value="inProgress" className="space-y-4">
          {items.filter(i => i.status === "inProgress").map((item) => (
            <TrackedItemCard 
              key={item.id} 
              item={item}
              insights={insights.get(item.id)}
              onAnalyze={() => analyzeItem(item)}
              onGenerateRoadmap={(type) => generateRoadmapFromItem(item, type)}
              onStatusUpdate={updateStatus}
              onAddComment={addComment}
              onRemove={removeItem}
              commentText={commentText[item.id] || ''}
              onCommentChange={(text) => setCommentText(prev => ({ ...prev, [item.id]: text }))}
              getStatusColor={getStatusColor}
              getStatusIcon={getStatusIcon}
              isAnalyzing={isAnalyzing}
              isGeneratingRoadmap={isGeneratingRoadmap}
            />
          ))}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {items.filter(i => i.status === "completed").map((item) => (
            <TrackedItemCard 
              key={item.id} 
              item={item}
              insights={insights.get(item.id)}
              onAnalyze={() => analyzeItem(item)}
              onGenerateRoadmap={(type) => generateRoadmapFromItem(item, type)}
              onStatusUpdate={updateStatus}
              onAddComment={addComment}
              onRemove={removeItem}
              commentText={commentText[item.id] || ''}
              onCommentChange={(text) => setCommentText(prev => ({ ...prev, [item.id]: text }))}
              getStatusColor={getStatusColor}
              getStatusIcon={getStatusIcon}
              isAnalyzing={isAnalyzing}
              isGeneratingRoadmap={isGeneratingRoadmap}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Tracked Item Card Component
interface TrackedItemCardProps {
  item: TrackedItem;
  insights?: AIInsights;
  onAnalyze: () => void;
  onGenerateRoadmap: (type: "scratch" | "upgrade") => void;
  onStatusUpdate: (id: string, status: "started" | "inProgress" | "completed") => void;
  onAddComment: (id: string) => void;
  onRemove: (id: string) => void;
  commentText: string;
  onCommentChange: (text: string) => void;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => JSX.Element;
  isAnalyzing: boolean;
  isGeneratingRoadmap: boolean;
}

const TrackedItemCard: React.FC<TrackedItemCardProps> = ({
  item,
  insights,
  onAnalyze,
  onGenerateRoadmap,
  onStatusUpdate,
  onAddComment,
  onRemove,
  commentText,
  onCommentChange,
  getStatusColor,
  getStatusIcon,
  isAnalyzing,
  isGeneratingRoadmap,
}) => {
  const [showComments, setShowComments] = useState(false);
  const currentInsights = insights || item.aiInsights;

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-start gap-2 mb-2">
              {getStatusIcon(item.status)}
              <div className="flex-1">
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription className="mt-1">{item.description}</CardDescription>
              </div>
            </div>

            {/* Technologies */}
            {currentInsights && currentInsights.keyTechnologies.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {currentInsights.keyTechnologies.map((tech, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">
                    {tech}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Badge className={getStatusColor(item.status)}>
              {item.status}
            </Badge>
            {currentInsights && (
              <Badge variant="outline" className="bg-primary/10">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Analyzed
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* AI Insights */}
        {currentInsights && (
          <div className="space-y-3 p-3 rounded-lg bg-muted/50 border border-primary/10">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AI Insights</span>
              <Badge variant="outline" className="text-xs ml-auto">
                {currentInsights.difficultyLevel}
              </Badge>
            </div>

            {/* Key Takeaways */}
            <div>
              <p className="text-xs font-medium mb-1">Key Takeaways:</p>
              <ul className="space-y-1">
                {currentInsights.keyTakeaways.slice(0, 3).map((takeaway, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {takeaway}
                  </li>
                ))}
              </ul>
            </div>

            {/* Practice Ideas */}
            {currentInsights.practiceIdeas.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1">Practice Ideas:</p>
                <div className="flex flex-wrap gap-1">
                  {currentInsights.practiceIdeas.slice(0, 2).map((idea, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      <Code2 className="h-3 w-3 mr-1" />
                      {idea}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Roadmaps */}
            {currentInsights.suggestedRoadmaps.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2">Suggested Learning Paths:</p>
                <div className="flex flex-wrap gap-2">
                  {currentInsights.suggestedRoadmaps.map((roadmap, idx) => (
                    <Button
                      key={idx}
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => onGenerateRoadmap(roadmap.type)}
                      disabled={isGeneratingRoadmap}
                    >
                      <Rocket className="h-3 w-3 mr-1" />
                      {roadmap.technology} ({roadmap.type === "scratch" ? "Beginner" : "Upgrade"})
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status Update */}
        <div className="flex items-center gap-2">
          <Select value={item.status} onValueChange={(value) => onStatusUpdate(item.id, value as "started" | "inProgress" | "completed")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="started">Started</SelectItem>
              <SelectItem value="inProgress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          {!currentInsights && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onAnalyze}
              disabled={isAnalyzing}
            >
              <Sparkles className="h-3 w-3 mr-2" />
              {isAnalyzing ? "Analyzing..." : "AI Analyze"}
            </Button>
          )}
        </div>

        {/* Resources */}
        {(item.docs || item.github || item.link) && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Resources</p>
            <div className="flex flex-wrap items-center gap-2">
              {item.link && (
                <Button variant="outline" size="sm" asChild className="h-8">
                  <a href={item.link} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-2" />
                    Article
                  </a>
                </Button>
              )}
              {item.github && (
                <Button variant="outline" size="sm" asChild className="h-8">
                  <a href={item.github} target="_blank" rel="noopener noreferrer">
                    <Github className="h-3 w-3 mr-2" />
                    GitHub
                  </a>
                </Button>
              )}
              {item.docs && (
                <Button variant="outline" size="sm" asChild className="h-8">
                  <a href={item.docs} target="_blank" rel="noopener noreferrer">
                    <BookOpen className="h-3 w-3 mr-2" />
                    Documentation
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="space-y-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowComments(!showComments)}
            className="h-8"
          >
            <MessageSquare className="h-3 w-3 mr-2" />
            {item.comments?.length || 0} Comments
          </Button>

          {showComments && (
            <div className="space-y-2 pl-4 border-l-2 border-muted">
              {item.comments?.map((comment, idx) => (
                <div key={idx} className="text-sm">
                  <p className="text-muted-foreground">{comment.text}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {new Date(comment.date).toLocaleDateString()}
                  </p>
                </div>
              ))}
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => onCommentChange(e.target.value)}
                  className="min-h-[60px]"
                />
                <Button size="sm" onClick={() => onAddComment(item.id)}>
                  Add
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onRemove(item.id)}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3 w-3 mr-2" />
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrackerAI;
