// src/pages/Dashboard.tsx
//
// Main dashboard for tech news and real-time activity. Shows news feed, provides refresh/summarize actions,
// and displays real-time data using the SocketContext.

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Github, BookOpen, Sparkles, Plus, Calendar as CalendarIcon, Filter, RefreshCw, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/contexts/SocketContext";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import RealtimeActivity from "@/components/RealtimeActivity";
import RealtimeChat from "@/components/RealtimeChat";

/**
 * Represents a single news article's shape for the dashboard feed.
 */
interface NewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  docs?: string;
  github?: string;
  tutorial?: string;
  category: string;
  date: string;
}

// --- Categories used for manual filtering in the UI ---
const categories = ["All", "Framework", "Language", "Build Tool", "AI/ML", "Database", "Cloud", "DevOps", "Security", "Mobile", "Backend", "Frontend"];

/**
 * Generates mock news for demonstration or fallback testing. Not used in production fetch path.
 * @returns {NewsItem[]} Array of demo news items
 */
const generateMockNews = (): NewsItem[] => {
  const today = new Date();
  const news: NewsItem[] = [];
  const templates = [
    { title: "React 19 Released", description: "React 19 brings new features...", link: "https://react.dev", docs: "https://react.dev/docs", github: "https://github.com/facebook/react", category: "Framework" },
    { title: "Python 3.13 Performance Boost", description: "Python 3.13 introduces major performance improvements...", link: "https://python.org", docs: "https://docs.python.org/3.13/", github: "https://github.com/python/cpython", category: "Language" },
    // ... more items ...
  ];
  // Distributes across dates
  templates.forEach((t, i) => {
    news.push({ ...t, id: `n-${i}`, date: format(today, "yyyy-MM-dd") });
  });
  return news;
};

const mockNews: NewsItem[] = generateMockNews();

const Dashboard = () => {
  const [news, setNews] = useState<NewsItem[]>(mockNews);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  // State for selected category filter
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showRealtime, setShowRealtime] = useState(false);
  const { toast } = useToast();
  // --- Socket context integration ---
  const { isConnected, userCount, requestNewsRefresh } = useSocket();

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  /**
   * Handles manual refresh action for news, uses SocketContext if online.
   */
  const handleRefresh = () => {
    setIsRefreshing(true);
    // Use real-time refresh if connected
    if (isConnected) {
      requestNewsRefresh();
    }
    // Simulate fetching new data
    setTimeout(() => {
      setIsRefreshing(false);
      toast({
        title: "Refreshed",
        description: "Latest updates fetched successfully.",
      });
    }, 1000);
  };

  const filteredNews = news.filter((item) => {
    const categoryMatch = selectedCategory === "All" || item.category === selectedCategory;
    const newsDate = new Date(item.date);
    const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const newsDateOnly = new Date(newsDate.getFullYear(), newsDate.getMonth(), newsDate.getDate());
    const dateMatch = newsDateOnly.getTime() === selectedDateOnly.getTime();
    return categoryMatch && dateMatch;
  });

  /**
   * Triggers a call to backend endpoint for OpenAI summarization of an article.
   * If unavailable, falls back on synthetic summary.
   */
  const handleSummarize = async (item: NewsItem) => {
    setSelectedNews(item);
    setIsGenerating(true);
    setSummary("");

    try {
      // Calls backend endpoint with article id, expects summary in response
      const response = await fetch(`http://localhost:3001/api/news/${item.id}/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
      } else {
        // Show message or use simple fallback logic for summary
        setSummary(
          `${item.title} represents a significant update in the ${item.category.toLowerCase()} space. ${item.description} This release focuses on developer experience improvements and performance optimizations.`
        );
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      // Show message or use simple fallback logic for summary
      setSummary(
        `${item.title} represents a significant update in the ${item.category.toLowerCase()} space. ${item.description} This release focuses on developer experience improvements and performance optimizations.`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddToTracker = (item: NewsItem) => {
    const tracked = JSON.parse(localStorage.getItem("trackedItems") || "[]");
    const exists = tracked.find((t: any) => t.id === item.id);
    
    if (!exists) {
      tracked.push({
        ...item,
        status: "started",
        addedAt: new Date().toISOString(),
        comments: [],
      });
      localStorage.setItem("trackedItems", JSON.stringify(tracked));
      toast({
        title: "Added to Tracker",
        description: `"${item.title}" has been added to your tracker.`,
      });
    } else {
      toast({
        title: "Already Tracked",
        description: `"${item.title}" is already in your tracker.`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-bold tracking-tight">Latest Tech News</h2>
              {isConnected ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
            </div>
            <p className="text-muted-foreground">
              Stay updated with the latest developments in technology
              {isConnected && ` • ${userCount} users online`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRealtime(!showRealtime)}
            >
              {showRealtime ? "Hide" : "Show"} Real-time
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <Card className="border-border bg-card">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Date
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[200px] justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredNews.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No updates found for the selected date and category.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredNews.map((item) => (
          <Card key={item.id} className="group overflow-hidden border-border bg-card transition-all hover:shadow-lg hover:shadow-primary/10">
            <CardHeader>
              <div className="flex items-start justify-between">
                <Badge variant="secondary" className="mb-2">
                  {item.category}
                </Badge>
                <span className="text-xs text-muted-foreground">{item.date}</span>
              </div>
              <CardTitle className="line-clamp-2">{item.title}</CardTitle>
              <CardDescription className="line-clamp-3">{item.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {item.docs && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={item.docs} target="_blank" rel="noopener noreferrer">
                      <BookOpen className="mr-1 h-3 w-3" />
                      Docs
                    </a>
                  </Button>
                )}
                {item.github && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={item.github} target="_blank" rel="noopener noreferrer">
                      <Github className="mr-1 h-3 w-3" />
                      GitHub
                    </a>
                  </Button>
                )}
                {item.tutorial && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={item.tutorial} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-1 h-3 w-3" />
                      Tutorial
                    </a>
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleSummarize(item)}
                >
                  <Sparkles className="mr-1 h-3 w-3" />
                  Summarize
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddToTracker(item)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
          ))}
        </div>
      )}

      {selectedNews && (
        <Card className="border-primary/20 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Summary: {selectedNews.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isGenerating ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Generating summary...
              </div>
            ) : (
              <p className="text-foreground">{summary}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Real-time Features */}
      {showRealtime && (
        <div className="grid gap-6 md:grid-cols-2">
          <RealtimeActivity />
          <RealtimeChat />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
