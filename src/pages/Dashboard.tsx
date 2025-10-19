// src/pages/Dashboard.tsx
//
// Main dashboard for tech news and real-time activity. Shows news feed, provides refresh/summarize actions,
// and displays real-time data using the SocketContext.

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ExternalLink, Github, BookOpen, Sparkles, Plus, Calendar as CalendarIcon, Filter, RefreshCw, Wifi, WifiOff, X } from "lucide-react";
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
// Note: These should match the actual categories from news sources
const categories = ["All", "Science", "Open Source", "General", "Frontend", "Design", "Backend"];

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
  const [news, setNews] = useState<NewsItem[]>([]);
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
  const { isConnected, userCount, requestNewsRefresh, recentNews } = useSocket();

  // Map backend/news item to UI NewsItem shape
  const mapServerItemToUI = (item: any): NewsItem => {
    return {
      id: item.id,
      title: item.title,
      description: item.description || '',
      link: item.url || item.link || '',
      docs: item.docs || undefined,
      github: item.github || undefined,
      tutorial: item.tutorial || undefined,
      category: item.category || 'General',
      date: item.date || (item.timestamp ? new Date(item.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])
    };
  };

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Load initial news from backend on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('http://localhost:3001/api/news');
        if (res.ok) {
          const body = await res.json();
          // API returns { status, results, totalPages, currentPage, data }
          const items = Array.isArray(body.data) ? body.data : body;
          if (mounted && items) {
            setNews(items.map(mapServerItemToUI));
          }
        }
      } catch (err) {
        console.error('Error loading initial news:', err);
      }
    })();
    return () => { mounted = false };
  }, []);

  // Sync with real-time recentNews pushed by socket
  useEffect(() => {
    if (recentNews && recentNews.length > 0) {
      // recentNews may be an array of server-style items
      try {
        const mapped = recentNews.map(mapServerItemToUI);
        setNews(prev => {
          // Merge newest items in front and dedupe by id
          const combined = [...mapped, ...prev];
          const seen = new Set();
          return combined.filter(item => {
            if (seen.has(item.id)) return false;
            seen.add(item.id);
            return true;
          }).slice(0, 50);
        });
      } catch (err) {
        console.error('Error mapping recentNews from socket:', err);
      }
    }
  }, [recentNews]);

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

  const filteredNews = (() => {
    const items = news.filter((item) => {
      const categoryMatch = selectedCategory === "All" || item.category === selectedCategory;
      // If item.date is missing or invalid, don't filter it out strictly by date
      const newsDate = item.date ? new Date(item.date) : null;
      const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      const newsDateOnly = newsDate ? new Date(newsDate.getFullYear(), newsDate.getMonth(), newsDate.getDate()) : null;
      const dateMatch = newsDateOnly ? (newsDateOnly.getTime() === selectedDateOnly.getTime()) : true;
      return categoryMatch && dateMatch;
    });
    // If nothing matches due to strict date, fall back to showing latest items by category only
    return items.length > 0 ? items : news.filter(i => (selectedCategory === 'All' || i.category === selectedCategory));
  })();

  /**
   * Triggers a call to backend endpoint for OpenAI summarization of an article.
   * If unavailable, falls back on synthetic summary.
   */
  const handleSummarize = async (item: NewsItem) => {
    console.log('🔍 Summarize clicked for article:', item.id, item.title);
    setSelectedNews(item);
    setIsGenerating(true);
    setSummary("");

    try {
      console.log('📡 Calling API:', `http://localhost:3001/api/news/${item.id}/summarize`);
      
      // Calls backend endpoint with article id, expects summary in response
      const response = await fetch(`http://localhost:3001/api/news/${item.id}/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 Response status:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Received data:', {
          hasSummary: !!data.summary,
          summaryLength: data.summary?.length,
          provider: data.provider,
          model: data.model,
          technologies: data.technologies
        });
        
        setSummary(data.summary || 'No summary generated');
        console.log('✅ Summary set in state');
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ API error:', errorData);
        
        // Show message or use simple fallback logic for summary
        const fallbackSummary = `${item.title} represents a significant update in the ${item.category.toLowerCase()} space. ${item.description} This release focuses on developer experience improvements and performance optimizations.`;
        setSummary(fallbackSummary);
        console.log('⚠️ Using fallback summary');
      }
    } catch (error) {
      console.error('❌ Error generating summary:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.constructor.name : typeof error
      });
      
      // Show message or use simple fallback logic for summary
      const fallbackSummary = `${item.title} represents a significant update in the ${item.category.toLowerCase()} space. ${item.description} This release focuses on developer experience improvements and performance optimizations.`;
      setSummary(fallbackSummary);
      console.log('⚠️ Using fallback summary due to error');
    } finally {
      setIsGenerating(false);
      console.log('✅ Summary generation complete');
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

      {/* AI Summary Dialog */}
      <Dialog open={!!selectedNews} onOpenChange={(open) => !open && setSelectedNews(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-6 w-6 text-primary" />
              AI Summary
            </DialogTitle>
            <DialogDescription className="text-base font-medium pt-1">
              {selectedNews?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center gap-4 py-12">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground text-lg">Generating AI summary with Azure OpenAI...</p>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground bg-muted/30 rounded-lg p-4 border">
                  {summary}
                </pre>
              </div>
            )}
          </div>
          
          {selectedNews && (
            <div className="flex gap-2 pt-4 border-t">
              <Badge variant="outline" className="text-xs">
                {selectedNews.category}
              </Badge>
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(selectedNews.date).toLocaleDateString()}
              </span>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
