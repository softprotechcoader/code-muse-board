import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Github, BookOpen, Sparkles, Plus, Calendar as CalendarIcon, Filter, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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

const categories = ["All", "Framework", "Language", "Build Tool", "AI/ML", "Database", "Cloud", "DevOps", "Security", "Mobile", "Backend", "Frontend"];

// Generate news for multiple dates
const generateMockNews = (): NewsItem[] => {
  const today = new Date();
  const news: NewsItem[] = [];
  
  const templates = [
    {
      title: "React 19 Released",
      description: "React 19 brings new features including automatic batching, transitions API, and improved suspense.",
      link: "https://react.dev",
      docs: "https://react.dev/docs",
      github: "https://github.com/facebook/react",
      category: "Framework",
    },
    {
      title: "Python 3.13 Performance Boost",
      description: "Python 3.13 introduces major performance improvements with up to 40% faster execution.",
      link: "https://python.org",
      docs: "https://docs.python.org/3.13/",
      github: "https://github.com/python/cpython",
      category: "Language",
    },
    {
      title: "Java 22 Released",
      description: "Java 22 brings pattern matching enhancements and preview of string templates.",
      link: "https://openjdk.org",
      docs: "https://docs.oracle.com/en/java/",
      github: "https://github.com/openjdk/jdk",
      category: "Language",
    },
    {
      title: "TypeScript 5.8 Announcement",
      description: "TypeScript 5.8 introduces new type system features and improved performance optimizations.",
      link: "https://typescriptlang.org",
      docs: "https://www.typescriptlang.org/docs/",
      github: "https://github.com/microsoft/TypeScript",
      category: "Language",
    },
    {
      title: "Vite 6.0 Launch",
      description: "Vite 6.0 offers faster build times and improved HMR with better plugin ecosystem.",
      link: "https://vitejs.dev",
      docs: "https://vitejs.dev/guide/",
      github: "https://github.com/vitejs/vite",
      category: "Build Tool",
    },
    {
      title: "GPT-5 Model Preview",
      description: "OpenAI announces GPT-5 with improved reasoning capabilities and multimodal understanding.",
      link: "https://openai.com",
      docs: "https://platform.openai.com/docs",
      github: "https://github.com/openai",
      category: "AI/ML",
    },
    {
      title: "PostgreSQL 17 Major Release",
      description: "PostgreSQL 17 introduces performance improvements and new JSON features.",
      link: "https://postgresql.org",
      docs: "https://www.postgresql.org/docs/",
      github: "https://github.com/postgres/postgres",
      category: "Database",
    },
    {
      title: "Node.js 22 LTS Released",
      description: "Node.js 22 becomes LTS with enhanced security and performance improvements.",
      link: "https://nodejs.org",
      docs: "https://nodejs.org/docs/",
      github: "https://github.com/nodejs/node",
      category: "Backend",
    },
    {
      title: "Angular 18 Update",
      description: "Angular 18 introduces standalone components by default and improved performance.",
      link: "https://angular.io",
      docs: "https://angular.io/docs",
      github: "https://github.com/angular/angular",
      category: "Framework",
    },
    {
      title: "Vue 3.5 Release",
      description: "Vue 3.5 brings reactivity improvements and better TypeScript support.",
      link: "https://vuejs.org",
      docs: "https://vuejs.org/guide/",
      github: "https://github.com/vuejs/core",
      category: "Framework",
    },
    {
      title: "Go 1.23 Announcement",
      description: "Go 1.23 includes performance optimizations and new standard library features.",
      link: "https://go.dev",
      docs: "https://go.dev/doc/",
      github: "https://github.com/golang/go",
      category: "Language",
    },
    {
      title: "Rust 1.80 Stable",
      description: "Rust 1.80 improves compile times and adds new cargo features.",
      link: "https://rust-lang.org",
      docs: "https://doc.rust-lang.org/",
      github: "https://github.com/rust-lang/rust",
      category: "Language",
    },
    {
      title: "AWS Lambda Updates",
      description: "AWS Lambda now supports custom runtimes and improved cold start performance.",
      link: "https://aws.amazon.com/lambda",
      docs: "https://docs.aws.amazon.com/lambda/",
      category: "Cloud",
    },
    {
      title: "Docker Desktop 5.0",
      description: "Docker Desktop 5.0 brings enhanced container management and performance optimizations.",
      link: "https://docker.com",
      docs: "https://docs.docker.com/",
      github: "https://github.com/docker",
      category: "DevOps",
    },
    {
      title: "Kubernetes 1.31",
      description: "Kubernetes 1.31 introduces new security features and improved cluster management.",
      link: "https://kubernetes.io",
      docs: "https://kubernetes.io/docs/",
      github: "https://github.com/kubernetes/kubernetes",
      category: "DevOps",
    },
    {
      title: "Next.js 15 Released",
      description: "Next.js 15 brings App Router improvements and better server components support.",
      link: "https://nextjs.org",
      docs: "https://nextjs.org/docs",
      github: "https://github.com/vercel/next.js",
      category: "Framework",
    },
    {
      title: "TailwindCSS 4.0 Beta",
      description: "TailwindCSS 4.0 introduces new design tokens and improved performance.",
      link: "https://tailwindcss.com",
      docs: "https://tailwindcss.com/docs",
      github: "https://github.com/tailwindlabs/tailwindcss",
      category: "Frontend",
    },
    {
      title: "MongoDB 8.0 GA",
      description: "MongoDB 8.0 brings enhanced query performance and new aggregation features.",
      link: "https://mongodb.com",
      docs: "https://www.mongodb.com/docs/",
      github: "https://github.com/mongodb/mongo",
      category: "Database",
    },
  ];

  // Generate news for the last 7 days
  templates.forEach((template, index) => {
    const daysAgo = index % 7;
    const newsDate = new Date(today);
    newsDate.setDate(today.getDate() - daysAgo);
    
    news.push({
      id: `news-${index}`,
      ...template,
      date: newsDate.toISOString().split('T')[0],
    });
  });

  return news;
};

const mockNews: NewsItem[] = generateMockNews();

const Dashboard = () => {
  const [news, setNews] = useState<NewsItem[]>(mockNews);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
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

  const handleSummarize = async (item: NewsItem) => {
    setSelectedNews(item);
    setIsGenerating(true);
    setSummary("");

    // Simulated AI summary - will integrate real AI later
    setTimeout(() => {
      setSummary(
        `${item.title} represents a significant update in the ${item.category.toLowerCase()} space. ${item.description} This release focuses on developer experience improvements and performance optimizations.`
      );
      setIsGenerating(false);
    }, 1500);
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
            <h2 className="text-3xl font-bold tracking-tight">Latest Tech News</h2>
            <p className="text-muted-foreground">
              Stay updated with the latest developments in technology
            </p>
          </div>
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
    </div>
  );
};

export default Dashboard;
