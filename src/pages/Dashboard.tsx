// src/pages/Dashboard.tsx
//
// Main dashboard for tech news and real-time activity. Shows news feed, provides refresh/summarize actions,
// and displays real-time data using the SocketContext.

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { ExternalLink, Github, BookOpen, Sparkles, Plus, Calendar as CalendarIcon, Filter, RefreshCw, Wifi, WifiOff, X, Search, ChevronDown, ChevronRight, TrendingUp, Activity, Users, MessageSquare, Newspaper, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/contexts/SocketContext";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import RealtimeActivity from "@/components/RealtimeActivity";
import RealtimeChat from "@/components/RealtimeChat";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import "../styles/markdown.css";

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
  source?: string;
}

// --- Hierarchical Tech Categories with Subcategories ---
const categoryHierarchy = {
  "All": [],
  "Trending": [], // Special category for trending tech and tools
  "Frontend": ["React", "Vue", "Angular", "Next.js", "Svelte", "UI/UX", "CSS", "Tailwind", "JavaScript", "TypeScript", "HTML"],
  "Backend": ["Node.js", "Python", "Java", "Go", "Rust", "PHP", "Ruby", ".NET", "C++", "Spring Boot", "Django", "FastAPI"],
  "Database": ["SQL", "NoSQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Cassandra", "DynamoDB", "Oracle", "SQLite"],
  "AI & ML": ["Machine Learning", "Deep Learning", "NLP", "Computer Vision", "LLM", "ChatGPT", "TensorFlow", "PyTorch", "Data Science"],
  "Security": ["Cybersecurity", "Hacking", "Penetration Testing", "Ethical Hacking", "Encryption", "Privacy", "Bug Bounty", "Zero Trust"],
  "DevOps": ["Docker", "Kubernetes", "CI/CD", "Jenkins", "GitHub Actions", "GitLab CI", "Terraform", "Ansible", "Monitoring"],
  "Cloud": ["AWS", "Azure", "GCP", "Serverless", "Lambda", "Cloud Functions", "Cloud Native", "Multi-Cloud"],
  "Mobile": ["iOS", "Android", "React Native", "Flutter", "Swift", "Kotlin", "SwiftUI", "Jetpack Compose"],
  "Web3": ["Blockchain", "Cryptocurrency", "Ethereum", "Bitcoin", "NFT", "Smart Contracts", "Solidity", "DeFi"],
  "Data": ["Big Data", "Analytics", "Data Engineering", "Apache Spark", "Hadoop", "Data Warehouse", "ETL", "Kafka"],
  "Architecture": ["Microservices", "Monolith", "Serverless", "Event-Driven", "CQRS", "Domain-Driven Design", "API Gateway"],
  "Testing": ["Unit Testing", "Integration Testing", "E2E Testing", "Jest", "Pytest", "Selenium", "Cypress", "Test Automation"],
  "Design": ["UI Design", "UX Design", "Figma", "Design Systems", "Accessibility", "Responsive Design", "Animation"],
  "Tools": ["Git", "GitHub", "VS Code", "Docker", "Postman", "Linux", "Terminal", "Package Managers"],
  "Emerging Tech": ["IoT", "Gaming", "AR/VR", "Quantum Computing", "Edge Computing", "5G", "Metaverse"],
  "General": ["Open Source", "News", "Tutorials", "Career", "Productivity", "Best Practices"]
};

// Flatten all categories for search/filter
const allCategories = Object.entries(categoryHierarchy).flatMap(([parent, children]) => 
  parent === "All" ? [] : [parent, ...children]
);

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
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  // State for selected category filter
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [categorySearch, setCategorySearch] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined); // undefined = no date filter
  const [showOnlyOfficial, setShowOnlyOfficial] = useState<boolean>(false); // Filter for official sources only
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Load showRealtime from localStorage, default to false
  const [showRealtime, setShowRealtime] = useState(() => {
    const saved = localStorage.getItem('showRealtime');
    return saved ? JSON.parse(saved) : false;
  });
  const [error, setError] = useState<string | null>(null);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const itemsPerPage = 12; // Show 12 items per page
  const { toast } = useToast();
  // --- Socket context integration ---
  const { isConnected, userCount, requestNewsRefresh, recentNews, globalComments } = useSocket();

  // Global error handler
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('🚨 Global error caught:', event.error);
      setError(event.error?.message || 'An unknown error occurred');
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  // Persist showRealtime to localStorage
  useEffect(() => {
    localStorage.setItem('showRealtime', JSON.stringify(showRealtime));
  }, [showRealtime]);

  // Keyboard shortcuts for real-time toggle
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl/Cmd + R for toggling real-time
      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();
        setShowRealtime(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Map backend/news item to UI NewsItem shape
  const mapServerItemToUI = (item: any): NewsItem => {
    const url = item.url || item.link || '';
    const source = item.source || '';
    
    // If source is "GitHub Trending" and github field is empty, use url as github
    const githubUrl = item.github || 
      (source === "GitHub Trending" && url.includes('github.com') ? url : undefined);
    
    return {
      id: item.id,
      title: item.title,
      description: item.description || '',
      link: url,
      docs: item.docs || undefined,
      github: githubUrl,
      tutorial: item.tutorial || undefined,
      category: item.category || 'General',
      date: item.date || (item.timestamp ? new Date(item.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
      source: source
    };
  };

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Load initial news from backend on mount and when filters change
  useEffect(() => {
    console.log('🚀 useEffect triggered - Starting news fetch');
    console.log('🚀 Current state:', { selectedCategory, selectedSubcategory, selectedDate, currentPage });
    
    let mounted = true;
    (async () => {
      setIsLoadingNews(true);
      try {
        // Build query parameters for filtering
        const params = new URLSearchParams();
        
        // Use subcategory if selected, otherwise use main category
        const categoryToFilter = selectedSubcategory || selectedCategory;
        
        console.log('🔧 Filter state:', {
          selectedCategory,
          selectedSubcategory,
          categoryToFilter,
          selectedDate: selectedDate ? selectedDate.toISOString().split('T')[0] : 'none',
          page: currentPage
        });
        
        if (categoryToFilter && categoryToFilter !== 'All') {
          params.append('category', categoryToFilter);
        }
        if (selectedDate) {
          params.append('date', selectedDate.toISOString().split('T')[0]);
        }
        // Add pagination parameters
        params.append('page', currentPage.toString());
        params.append('limit', itemsPerPage.toString());
        
        const url = `http://localhost:3001/api/news${params.toString() ? '?' + params.toString() : ''}`;
        console.log('🔍 Fetching news with URL:', url);
        
        const res = await fetch(url);
        console.log('📡 Response received:', res.status, res.statusText);
        
        if (res.ok) {
          const body = await res.json();
          console.log('✅ API Response raw body:', body);
          console.log('✅ API Response summary:', {
            status: body.status,
            results: body.results,
            dataLength: body.data?.length,
            filters: body.filters,
            hasData: !!body.data,
            isArray: Array.isArray(body.data),
            totalPages: body.totalPages,
            currentPage: body.currentPage
          });
          
          // API returns { status, results, totalPages, currentPage, data }
          const items = Array.isArray(body.data) ? body.data : (body.data ? [body.data] : []);
          console.log('📋 Items to process:', items.length);
          
          if (mounted) {
            // Update pagination info
            setTotalPages(body.totalPages || 1);
            setTotalResults(body.results || 0);
            
            if (items && items.length > 0) {
              console.log('🔍 Raw items from backend:', items.slice(0, 2)); // Log first 2 raw items
              const mappedItems = items
                .map(mapServerItemToUI)
                .filter(item => item.title && item.title.trim() !== ''); // Filter out items without valid titles
              
              console.log('📦 Setting news state with', mappedItems.length, 'items (filtered from', items.length, 'raw items)');
              
              if (mappedItems.length > 0) {
                console.log('📰 First mapped item:', mappedItems[0]);
                console.log('📰 First item details:', {
                  hasTitle: !!mappedItems[0]?.title,
                  hasDescription: !!mappedItems[0]?.description,
                  descriptionLength: mappedItems[0]?.description?.length || 0,
                  description: mappedItems[0]?.description
                });
                setNews(mappedItems);
              } else {
                console.log('⚠️ All items filtered out (no valid titles), setting empty array');
                setNews([]);
              }
            } else {
              console.log('⚠️ No items to display, setting empty array');
              console.log('⚠️ This will trigger empty state UI');
              setNews([]);
            }
          }
        } else {
          console.error('❌ Failed to fetch news:', res.status, res.statusText);
          const errorText = await res.text();
          console.error('❌ Error response:', errorText);
          
          if (mounted) {
            // Handle specific error codes
            if (res.status === 404) {
              setError('News endpoint not found. Please check if the backend server is running.');
            } else if (res.status === 500) {
              setError('Backend server error. The server encountered an issue while fetching news.');
            } else if (res.status === 503) {
              setError('Backend service unavailable. Please try again in a moment.');
            } else {
              setError(`Failed to fetch news (Error ${res.status}). Please try refreshing the page.`);
            }
            setNews([]); // Set empty array on error
          }
        }
      } catch (err) {
        console.error('❌ Error loading initial news:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        
        if (mounted) {
          // Handle specific error types
          if (errorMessage.includes('fetch')) {
            setError('Cannot connect to backend server. Please ensure the server is running on port 3001.');
          } else if (errorMessage.includes('JSON')) {
            setError('Invalid response from server. The backend may be experiencing issues.');
          } else {
            setError(`Failed to load news: ${errorMessage}`);
          }
          setNews([]);  // Set empty array on error
        }
      } finally {
        if (mounted) {
          setIsLoadingNews(false);
        }
      }
    })();
    return () => { mounted = false };
  }, [selectedCategory, selectedSubcategory, selectedDate, currentPage]);

  // Sync with real-time recentNews pushed by socket
  useEffect(() => {
    if (recentNews && recentNews.length > 0) {
      // recentNews may be an array of server-style items
      try {
        const mapped = recentNews.map(mapServerItemToUI);
        
        // Get current filter criteria
        const categoryToFilter = selectedSubcategory || selectedCategory;
        const hasActiveFilters = (categoryToFilter && categoryToFilter !== 'All') || selectedDate;
        
        console.log('📡 Socket received news:', mapped.length, 'items. Active filters:', hasActiveFilters);
        
        // If we have active filters, only add items that match
        const filtered = hasActiveFilters ? mapped.filter(item => {
          // Check category match
          const categoryMatch = !categoryToFilter || categoryToFilter === 'All' || 
            item.category.toLowerCase() === categoryToFilter.toLowerCase();
          
          // Check date match
          const dateMatch = !selectedDate || 
            item.date === selectedDate.toISOString().split('T')[0];
          
          const matches = categoryMatch && dateMatch;
          if (!matches) {
            console.log('🚫 Filtering out socket item:', item.title, 'category:', item.category);
          }
          return matches;
        }) : mapped;
        
        console.log('✅ Adding', filtered.length, 'filtered items from socket');
        
        if (filtered.length > 0) {
          setNews(prev => {
            // Merge newest items in front and dedupe by id
            const combined = [...filtered, ...prev];
            const seen = new Set();
            return combined.filter(item => {
              if (seen.has(item.id)) return false;
              seen.add(item.id);
              return true;
            }).slice(0, 50);
          });
        }
      } catch (err) {
        console.error('Error mapping recentNews from socket:', err);
      }
    }
  }, [recentNews, selectedCategory, selectedSubcategory, selectedDate]);

  /**
   * Handles manual refresh action for news, uses SocketContext if online.
   * Also re-fetches from backend with current filters.
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      // Reset to page 1 when refreshing
      setCurrentPage(1);
      
      // Build query parameters for filtering
      const params = new URLSearchParams();
      
      // Use subcategory if selected, otherwise use main category
      const categoryToFilter = selectedSubcategory || selectedCategory;
      
      if (categoryToFilter && categoryToFilter !== 'All') {
        params.append('category', categoryToFilter);
      }
      if (selectedDate) {
        params.append('date', selectedDate.toISOString().split('T')[0]);
      }
      
      // Add pagination (page 1 for refresh)
      params.append('page', '1');
      params.append('limit', itemsPerPage.toString());
      
      const url = `http://localhost:3001/api/news${params.toString() ? '?' + params.toString() : ''}`;
      console.log('🔄 Refreshing news with filters:', url);
      
      const res = await fetch(url);
      let resultCount = 0;
      
      if (res.ok) {
        const body = await res.json();
        console.log('✅ Refreshed news:', body.results, 'items');
        resultCount = body.results || 0;
        
        // Update pagination info
        setTotalPages(body.totalPages || 1);
        setTotalResults(body.results || 0);
        
        const items = Array.isArray(body.data) ? body.data : body;
        if (items) {
          const mappedItems = items
            .map(mapServerItemToUI)
            .filter(item => item.title && item.title.trim() !== ''); // Filter out items without valid titles
          
          console.log('📦 Refresh: Setting', mappedItems.length, 'items (filtered from', items.length, 'raw items)');
          setNews(mappedItems);
        }
      }
      
      // Also use real-time refresh if connected
      if (isConnected) {
        requestNewsRefresh();
      }
      
      toast({
        title: "Refreshed",
        description: `Latest updates fetched successfully. ${resultCount} articles found.`,
      });
    } catch (err) {
      console.error('❌ Error refreshing news:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      
      // Show user-friendly error toast
      toast({
        title: "Refresh Failed",
        description: errorMessage.includes('fetch') 
          ? "Cannot connect to server. Please check if the backend is running."
          : "Could not fetch latest updates. Please try again.",
        variant: "destructive",
      });
      
      // Set error state if persistent
      if (errorMessage.includes('fetch')) {
        setError('Backend server is not reachable. Please ensure it is running on port 3001.');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Since filtering is now done server-side, we just display the news from state
  // Client-side filtering is minimal - only if socket adds new items that need local filtering
  // Backend already filters by category/date, we filter for official sources on frontend
  const filteredNews = showOnlyOfficial 
    ? news.filter(item => item.source?.toLowerCase().includes('official'))
    : news;
  
  // Debug logging
  console.log('🎨 Render - filteredNews count:', filteredNews.length);
  console.log('🎨 Render - isLoadingNews:', isLoadingNews);
  console.log('🎨 Render - selectedCategory:', selectedCategory, 'selectedSubcategory:', selectedSubcategory);
  console.log('🎨 Render - showOnlyOfficial:', showOnlyOfficial);

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

  const handleAddToSkillUp = (item: NewsItem) => {
    const roadmaps = JSON.parse(localStorage.getItem("skillUpRoadmaps") || "[]");
    
    // Extract technology/topic from title or category
    const technology = item.title.split(/[:-]/)[0].trim() || item.category;
    
    // Check if roadmap already exists for this technology
    const existingRoadmap = roadmaps.find((r: any) => r.technology === technology);
    
    if (existingRoadmap) {
      toast({
        title: "Already in Skill Up",
        description: `A learning path for "${technology}" already exists.`,
        variant: "destructive",
      });
      return;
    }
    
    // Create a new roadmap with the article as the first step
    const newRoadmap = {
      technology: technology,
      category: item.category,
      description: item.description.substring(0, 150) + (item.description.length > 150 ? '...' : ''),
      difficulty: "Intermediate" as const,
      estimatedTime: "2-4 weeks",
      steps: [
        {
          id: `${technology.toLowerCase().replace(/\s+/g, '-')}-1`,
          title: item.title,
          description: item.description,
          resources: [
            { name: "Article", url: item.link },
            ...(item.docs ? [{ name: "Documentation", url: item.docs }] : []),
            ...(item.github ? [{ name: "GitHub", url: item.github }] : []),
            ...(item.tutorial ? [{ name: "Tutorial", url: item.tutorial }] : []),
          ].filter(r => r.url), // Only include resources with valid URLs
          completed: false,
        },
      ],
    };
    
    roadmaps.push(newRoadmap);
    localStorage.setItem("skillUpRoadmaps", JSON.stringify(roadmaps));
    
    toast({
      title: "Added to Skill Up! 🎓",
      description: `"${technology}" learning path created. Visit the Skill Up tab to continue learning.`,
    });
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
              {selectedCategory === 'Trending' ? (
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                  <span className="text-orange-500 font-semibold">Showing trending tools and technology news</span>
                </span>
              ) : (
                <>
                  Stay updated with the latest developments in technology
                  {isConnected && ` • ${userCount} users online`}
                </>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={showRealtime ? "default" : "outline"}
              size="sm"
              onClick={() => setShowRealtime(!showRealtime)}
              className={cn(
                "transition-all duration-300",
                showRealtime && "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              )}
            >
              {showRealtime ? (
                <>
                  <Activity className="h-4 w-4 mr-2 animate-pulse" />
                  Hide Real-time
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4 mr-2" />
                  Show Real-time
                </>
              )}
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

      {/* Connection Status Banner */}
      {!isConnected && (
        <Card className="border-yellow-500/50 bg-yellow-950/20">
          <CardContent className="py-3">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></div>
              <p className="text-sm text-yellow-500">
                Real-time updates disconnected. You can still view articles, but won't receive live updates.
              </p>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleRefresh}
                className="ml-auto text-yellow-500 hover:text-yellow-400"
              >
                Retry Connection
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-500 bg-red-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-red-500">⚠️</div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-500 mb-2">Error Occurred</h3>
                <p className="text-sm text-red-300 mb-3">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setError(null);
                    setSelectedCategory('All');
                    setSelectedSubcategory("");
                    setSelectedDate(undefined);
                  }}
                >
                  Reset and Clear Error
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border bg-card">
        <CardContent className="pt-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search categories... (e.g., React, Python, Docker, Security)"
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="pl-10 pr-4"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Main Category Dropdown */}
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Main Category
              </label>
              <Select value={selectedCategory} onValueChange={(value) => {
                console.log('📂 Main Category dropdown changed to:', value);
                setSelectedCategory(value);
                setSelectedSubcategory(""); // Reset subcategory when main changes
                setCurrentPage(1); // Reset to first page
              }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {Object.keys(categoryHierarchy).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      <div className="flex items-center gap-2">
                        {cat === 'Trending' && <TrendingUp className="h-4 w-4 text-orange-500" />}
                        <span className={cat === 'Trending' ? 'font-semibold text-orange-500' : ''}>
                          {cat}
                        </span>
                        {categoryHierarchy[cat].length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {categoryHierarchy[cat].length}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subcategory Dropdown (only if main category has children) */}
            {selectedCategory !== 'All' && categoryHierarchy[selectedCategory]?.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <ChevronDown className="h-4 w-4" />
                  Subcategory
                </label>
                <Select 
                  value={selectedSubcategory || "__all__"} 
                  onValueChange={(value) => {
                    // Handle the special "__all__" value
                    setSelectedSubcategory(value === "__all__" ? "" : value);
                    setCurrentPage(1); // Reset to first page
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={`All ${selectedCategory}`} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="__all__">All {selectedCategory}</SelectItem>
                    {categoryHierarchy[selectedCategory]
                      .filter(subcat => 
                        categorySearch === "" || 
                        subcat.toLowerCase().includes(categorySearch.toLowerCase())
                      )
                      .map((subcat) => (
                        <SelectItem key={subcat} value={subcat}>
                          {subcat}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date Filter */}
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Date Filter (Optional)
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate && selectedDate instanceof Date && !isNaN(selectedDate.getTime())
                      ? format(selectedDate, "PPP") 
                      : <span>All dates</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date);
                      setCurrentPage(1); // Reset to first page
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                  {selectedDate && (
                    <div className="p-3 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => setSelectedDate(undefined)}
                      >
                        Clear date filter
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Official Sources Filter Toggle */}
          <div className="flex items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <label className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  Official Sources Only
                </label>
                <p className="text-xs text-muted-foreground">
                  Show only verified articles from official tech blogs
                </p>
              </div>
            </div>
            <Button
              variant={showOnlyOfficial ? "default" : "outline"}
              size="sm"
              className={cn(
                "transition-all",
                showOnlyOfficial && "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600"
              )}
              onClick={() => {
                setShowOnlyOfficial(!showOnlyOfficial);
                console.log('✨ Official filter toggled:', !showOnlyOfficial);
              }}
            >
              {showOnlyOfficial ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          {/* Quick Category Chips */}
          {categorySearch === "" && selectedCategory === 'All' && (
            <div>
              <label className="text-sm font-medium mb-2 block">Quick Select:</label>
              <div className="flex flex-wrap gap-2">
                {/* Trending gets special treatment - always first */}
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-orange-500 hover:text-white transition-colors border-orange-500 text-orange-500 font-semibold"
                  onClick={() => {
                    try {
                      console.log('🎯 Quick Select: Trending clicked');
                      setSelectedCategory('Trending');
                      setSelectedSubcategory("");
                    } catch (error) {
                      console.error('❌ Error in Trending click:', error);
                    }
                  }}
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Trending
                </Badge>
                {Object.keys(categoryHierarchy)
                  .filter(cat => cat !== 'All' && cat !== 'Trending')
                  .slice(0, 7)
                  .map((cat) => (
                    <Badge
                      key={cat}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => {
                        try {
                          console.log('🎯 Quick Select:', cat, 'clicked');
                          setSelectedCategory(cat);
                          setSelectedSubcategory("");
                        } catch (error) {
                          console.error('❌ Error in category click:', error);
                        }
                      }}
                    >
                      {cat}
                    </Badge>
                  ))}
              </div>
            </div>
          )}

          {/* Search Results */}
          {categorySearch !== "" && (
            <div>
              <label className="text-sm font-medium mb-2 block">Search Results:</label>
              <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto">
                {allCategories
                  .filter(cat => cat.toLowerCase().includes(categorySearch.toLowerCase()))
                  .map((cat) => (
                    <Badge
                      key={cat}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => {
                        console.log('🔎 Search result clicked:', cat);
                        // Find parent category
                        const parent = Object.keys(categoryHierarchy).find(p => 
                          p === cat || categoryHierarchy[p].includes(cat)
                        );
                        console.log('🔎 Found parent:', parent, 'for category:', cat);
                        if (parent === cat) {
                          console.log('🔎 Setting main category:', cat);
                          setSelectedCategory(cat);
                          setSelectedSubcategory("");
                        } else if (parent) {
                          console.log('🔎 Setting parent:', parent, 'subcategory:', cat);
                          setSelectedCategory(parent);
                          setSelectedSubcategory(cat);
                        }
                        setCategorySearch("");
                      }}
                    >
                      {cat}
                    </Badge>
                  ))}
              </div>
            </div>
          )}
          
          {/* Active Filters Display */}
          {(selectedCategory !== 'All' || selectedSubcategory || selectedDate) && (
            <div className="flex items-center gap-2 pt-2 border-t flex-wrap">
              <span className="text-sm font-medium">Active Filters:</span>
              {selectedCategory !== 'All' && (
                <Badge variant="secondary" className="gap-1">
                  {selectedCategory}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => {
                      setSelectedCategory('All');
                      setSelectedSubcategory("");
                    }}
                  />
                </Badge>
              )}
              {selectedSubcategory && (
                <Badge variant="secondary" className="gap-1">
                  {selectedSubcategory}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => setSelectedSubcategory("")}
                  />
                </Badge>
              )}
              {selectedDate && (
                <Badge variant="secondary" className="gap-1">
                  {selectedDate instanceof Date && !isNaN(selectedDate.getTime()) 
                    ? format(selectedDate, "MMM dd, yyyy")
                    : 'Invalid date'}
                  <X 
                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                    onClick={() => setSelectedDate(undefined)}
                  />
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCategory('All');
                  setSelectedSubcategory("");
                  setSelectedDate(undefined);
                  setCategorySearch("");
                }}
                className="ml-auto"
              >
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conditional Rendering: Show Real-time OR News Cards */}
      {showRealtime ? (
        /* Real-time Features with Enhanced Animation */
        <div className="space-y-4 animate-in slide-in-from-top-4 fade-in duration-500">
          {/* Real-time Header */}
          <Card className="border-green-500/30 bg-gradient-to-r from-green-500/5 to-emerald-500/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Activity className="h-6 w-6 text-green-500" />
                    <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 animate-ping" />
                    <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Real-time Updates</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      {isConnected ? (
                        <>
                          <Wifi className="h-3 w-3 text-green-500" />
                          <span className="text-green-500 font-medium">Live • {userCount} users online</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="h-3 w-3 text-red-500" />
                          <span className="text-red-500">Disconnected</span>
                        </>
                      )}
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRealtime(false)}
                  className="hover:bg-red-500/10"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Real-time Content Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="animate-in slide-in-from-left-4 fade-in duration-500 delay-100">
              <RealtimeActivity />
            </div>
            <div className="animate-in slide-in-from-right-4 fade-in duration-500 delay-200">
              <RealtimeChat />
            </div>
          </div>

          {/* Quick Stats Bar */}
          <Card className="border-border/50">
            <CardContent className="py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Newspaper className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{recentNews.length}</p>
                    <p className="text-xs text-muted-foreground">Recent Articles</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <MessageSquare className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{globalComments.length}</p>
                    <p className="text-xs text-muted-foreground">Comments</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Users className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{userCount}</p>
                    <p className="text-xs text-muted-foreground">Online Users</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Activity className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{isConnected ? 'Live' : 'Offline'}</p>
                    <p className="text-xs text-muted-foreground">Connection</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : isLoadingNews ? (
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-center text-muted-foreground">Loading news articles...</p>
            </div>
          </CardContent>
        </Card>
      ) : filteredNews.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="text-center py-12 space-y-6">
              {/* Empty State Icon */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <svg 
                      className="h-10 w-10 text-primary" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                      />
                    </svg>
                  </div>
                  <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <span className="text-yellow-600 text-xs">0</span>
                  </div>
                </div>
              </div>

              {/* Empty State Message */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">No Articles Found</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {selectedCategory !== 'All' 
                    ? `There are currently no articles in the "${selectedSubcategory || selectedCategory}" category`
                    : 'No articles match your current filters'
                  }
                  {selectedDate && selectedDate instanceof Date && !isNaN(selectedDate.getTime()) && 
                    ` for ${format(selectedDate, "MMMM dd, yyyy")}`}.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <Button
                  variant="default"
                  onClick={() => {
                    console.log('🔄 Clearing all filters');
                    setSelectedCategory('All');
                    setSelectedSubcategory("");
                    setSelectedDate(undefined);
                    setCategorySearch("");
                  }}
                  className="min-w-[200px]"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear All Filters
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    console.log('🔄 Refreshing news feed');
                    handleRefresh();
                  }}
                  className="min-w-[200px]"
                >
                  <svg 
                    className="h-4 w-4 mr-2" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                    />
                  </svg>
                  Refresh Feed
                </Button>
              </div>

              {/* Suggestions */}
              {selectedCategory !== 'All' && (
                <div className="pt-4 border-t border-border mt-6">
                  <p className="text-sm text-muted-foreground mb-3">Try exploring these categories:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {['All', 'Frontend', 'AI & ML', 'Tools', 'Trending']
                      .filter((cat) => cat !== selectedCategory)
                      .map((cat) => (
                        <Button
                          key={cat}
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            console.log(`📂 Switching to ${cat} category`);
                            setSelectedCategory(cat);
                            setSelectedSubcategory("");
                          }}
                          className="text-xs"
                        >
                          {cat}
                        </Button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* News Count and Official Source Stats */}
          <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Newspaper className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Showing <span className="text-primary font-bold">{filteredNews.length}</span> articles
                </span>
              </div>
              {showOnlyOfficial && (
                <Badge 
                  variant="default"
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Official Sources Only
                </Badge>
              )}
            </div>
            {!showOnlyOfficial && (
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  <span>
                    {news.filter(item => item.source?.toLowerCase().includes('official')).length} Official
                  </span>
                </div>
                <span>•</span>
                <span>{news.length - news.filter(item => item.source?.toLowerCase().includes('official')).length} Community</span>
              </div>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredNews.map((item, index) => {
            // Debug: Check if GitHub/Docs links exist (first 3 items only)
            if (index < 3) {
              const safeTitle = (item && typeof item.title === 'string') ? item.title : 'Untitled';
              const titlePreview = safeTitle.length > 50 ? safeTitle.substring(0, 50) + '...' : safeTitle;
              console.log(`📰 Item ${index + 1} - "${titlePreview}":`, {
                hasGithub: !!item?.github,
                github: item?.github,
                hasDocs: !!item?.docs,
                docs: item?.docs,
                hasTutorial: !!item?.tutorial,
                tutorial: item?.tutorial
              });
            }
            
            // Truncate title and description for better card display
            // Add null/undefined checks to prevent errors
            const title = item.title || 'Untitled';
            const description = item.description || 'No description available';
            
            const shortTitle = title.length > 70 
              ? title.substring(0, 70) + '...' 
              : title;
            // Allow 3-4 lines of description (~200-250 characters)
            const shortDescription = description.length > 250 
              ? description.substring(0, 250) + '...' 
              : description;
            
            // Check if this is an official source
            const isOfficial = item.source?.toLowerCase().includes('official');
            
            return (
          <Card 
            key={item.id} 
            className={cn(
              "group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] flex flex-col cursor-pointer",
              isOfficial 
                ? "border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-500/5 via-card to-card hover:shadow-emerald-500/30 hover:border-emerald-500" 
                : "border-border bg-card hover:shadow-primary/20"
            )}
          >
            {/* Official Badge - Floating Top Left (if official) */}
            {isOfficial && (
              <div className="absolute top-3 left-3 z-10">
                <Badge 
                  variant="default"
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 border-0"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Official
                </Badge>
              </div>
            )}

            {/* Category Badge - Floating Top Right */}
            <div className="absolute top-3 right-3 z-10">
              <Badge 
                variant={item.category === 'Trending' ? 'default' : 'secondary'} 
                className={cn(
                  "shadow-md",
                  item.category === 'Trending' && "bg-gradient-to-r from-orange-500 to-red-500 text-white animate-pulse"
                )}
              >
                {item.category === 'Trending' && <TrendingUp className="h-3 w-3 mr-1" />}
                {item.category}
              </Badge>
            </div>

            <CardHeader className="pb-4 space-y-3">
              {/* Date and Source */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  <span>{item.date}</span>
                </div>
                {item.source && (
                  <>
                    <span className="text-muted-foreground/50">•</span>
                    <span className={cn(
                      "font-medium",
                      isOfficial && "text-emerald-600 dark:text-emerald-400"
                    )}>
                      {item.source}
                    </span>
                  </>
                )}
              </div>
              
              {/* Title - Clickable to article */}
              <a 
                href={item.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block"
              >
                <CardTitle className="text-xl font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2 cursor-pointer">
                  {shortTitle}
                </CardTitle>
              </a>
              
              {/* Description */}
              <CardDescription className="text-sm leading-relaxed line-clamp-4 text-muted-foreground/90">
                {shortDescription}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4 mt-auto pt-0">
              {/* AI Summarizer - Most Prominent */}
              <Button
                variant="default"
                size="default"
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all group/btn"
                onClick={() => handleSummarize(item)}
              >
                <Sparkles className="mr-2 h-4 w-4 group-hover/btn:animate-spin" />
                Generate AI Summary
                <ChevronRight className="ml-auto h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Official Links</span>
                </div>
              </div>
              
              {/* GitHub and Official Documentation Links */}
              <div className="grid grid-cols-2 gap-2">
                <React.Fragment key="github-section">
                  {item.github ? (
                    <Button 
                      variant="outline" 
                      size="default"
                      asChild
                      className="border-2 border-purple-500/30 hover:border-purple-500 hover:bg-purple-500/10 transition-all group/gh"
                    >
                      <a href={item.github} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                        <Github className="h-4 w-4 group-hover/gh:scale-110 transition-transform" />
                        <span className="font-medium">GitHub</span>
                      </a>
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="default"
                      disabled
                      className="opacity-50 cursor-not-allowed"
                    >
                      <Github className="h-4 w-4 mr-2" />
                      <span className="font-medium">GitHub</span>
                    </Button>
                  )}
                </React.Fragment>

                <React.Fragment key="docs-section">
                  {item.docs ? (
                    <Button 
                      variant="outline" 
                      size="default"
                      asChild
                      className="border-2 border-blue-500/30 hover:border-blue-500 hover:bg-blue-500/10 transition-all group/docs"
                    >
                      <a href={item.docs} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                        <BookOpen className="h-4 w-4 group-hover/docs:scale-110 transition-transform" />
                        <span className="font-medium">Docs</span>
                      </a>
                    </Button>
                  ) : (!item.github && item.link) ? (
                    <Button 
                      variant="outline" 
                      size="default"
                      asChild
                      className="border-2 border-border/30 hover:border-border hover:bg-muted/10 transition-all opacity-75"
                    >
                      <a href={item.link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        <span className="font-medium">Docs</span>
                      </a>
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="default"
                      disabled
                      className="opacity-50 cursor-not-allowed"
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      <span className="font-medium">Docs</span>
                    </Button>
                  )}
                </React.Fragment>
              </div>

              {/* Tutorial Link (if available) - Full Width */}
              {item.tutorial && (
                <Button 
                  variant="outline" 
                  size="default"
                  asChild
                  className="w-full border-2 border-green-500/30 hover:border-green-500 hover:bg-green-500/10 transition-all group/tut"
                >
                  <a href={item.tutorial} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2">
                    <ExternalLink className="h-4 w-4 group-hover/tut:scale-110 transition-transform" />
                    <span className="font-medium">View Tutorial</span>
                  </a>
                </Button>
              )}

              {/* Bottom Actions */}
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 hover:bg-primary/10"
                  onClick={() => handleAddToTracker(item)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Track
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 hover:bg-blue-500/10 hover:text-blue-500"
                  onClick={() => handleAddToSkillUp(item)}
                >
                  <Target className="h-4 w-4 mr-1" />
                  Skill Up
                </Button>
                
                {/* GitHub Link */}
                {item.github ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="flex-1 hover:bg-purple-500/10 hover:text-purple-500"
                  >
                    <a href={item.github} target="_blank" rel="noopener noreferrer">
                      <Github className="h-4 w-4 mr-1" />
                      GitHub
                    </a>
                  </Button>
                ) : null}

                {/* Docs Link - Only show if docs exists (no fallback here to avoid duplicate) */}
                {item.docs ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="flex-1 hover:bg-blue-500/10 hover:text-blue-500"
                  >
                    <a href={item.docs} target="_blank" rel="noopener noreferrer">
                      <BookOpen className="h-4 w-4 mr-1" />
                      Docs
                    </a>
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
            );
          })}
        </div>
        </>
      )}

      {/* Pagination Controls */}
      {!isLoadingNews && filteredNews.length > 0 && totalPages > 1 && (
        <div className="flex flex-col items-center gap-4 mt-8">
          <div className="text-sm text-muted-foreground">
            Showing page {currentPage} of {totalPages} ({totalResults} total articles)
          </div>
          <Pagination>
            <PaginationContent>
              {/* Previous Button */}
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => {
                    if (currentPage > 1) {
                      setCurrentPage(currentPage - 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className={cn(
                    currentPage === 1 && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>

              {/* Page Numbers */}
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => {
                        setCurrentPage(pageNum);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      isActive={currentPage === pageNum}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              {/* Ellipsis for many pages */}
              {totalPages > 5 && currentPage < totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}

              {/* Next Button */}
              <PaginationItem>
                <PaginationNext 
                  onClick={() => {
                    if (currentPage < totalPages) {
                      setCurrentPage(currentPage + 1);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className={cn(
                    currentPage === totalPages && "pointer-events-none opacity-50"
                  )}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* AI Summary Dialog */}
      <Dialog open={!!selectedNews} onOpenChange={(open) => {
        if (!open) {
          setSelectedNews(null);
          setSummary("");
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-6 w-6 text-primary" />
              AI Summary
            </DialogTitle>
            {selectedNews && (
              <DialogDescription className="text-base font-medium pt-1">
                {selectedNews.title}
              </DialogDescription>
            )}
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center gap-4 py-12">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground text-lg">Generating AI summary with Azure OpenAI...</p>
              </div>
            ) : summary ? (
              <div className="bg-muted/30 rounded-lg p-6 border">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4 text-foreground" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-xl font-semibold mb-3 mt-6 text-foreground" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-lg font-semibold mb-2 mt-4 text-foreground" {...props} />,
                    p: ({node, ...props}) => <p className="mb-4 text-foreground leading-relaxed" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc list-inside mb-4 space-y-2 text-foreground" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-4 space-y-2 text-foreground" {...props} />,
                    li: ({node, ...props}) => <li className="text-foreground leading-relaxed" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-bold text-foreground" {...props} />,
                    em: ({node, ...props}) => <em className="italic text-foreground" {...props} />,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    code: ({node, inline, ...props}: any) => 
                      inline ? (
                        <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground" {...props} />
                      ) : (
                        <code className="block bg-muted p-4 rounded-lg text-sm font-mono text-foreground overflow-x-auto" {...props} />
                      ),
                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground" {...props} />,
                  }}
                >
                  {summary}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">No summary available</p>
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
    </div>
  );
};

export default Dashboard;
