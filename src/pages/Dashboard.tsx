import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Github, BookOpen, Sparkles, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

const mockNews: NewsItem[] = [
  {
    id: "1",
    title: "React 19 Released",
    description: "React 19 brings new features including automatic batching, transitions API, and improved suspense.",
    link: "https://react.dev",
    docs: "https://react.dev/docs",
    github: "https://github.com/facebook/react",
    tutorial: "https://react.dev/learn",
    category: "Framework",
    date: "2025-10-15",
  },
  {
    id: "2",
    title: "TypeScript 5.8 Announcement",
    description: "TypeScript 5.8 introduces new type system features and improved performance optimizations.",
    link: "https://typescriptlang.org",
    docs: "https://www.typescriptlang.org/docs/",
    github: "https://github.com/microsoft/TypeScript",
    category: "Language",
    date: "2025-10-14",
  },
  {
    id: "3",
    title: "Vite 6.0 Launch",
    description: "Vite 6.0 offers faster build times and improved HMR with better plugin ecosystem.",
    link: "https://vitejs.dev",
    docs: "https://vitejs.dev/guide/",
    github: "https://github.com/vitejs/vite",
    tutorial: "https://vitejs.dev/guide/why.html",
    category: "Build Tool",
    date: "2025-10-13",
  },
];

const Dashboard = () => {
  const [news] = useState<NewsItem[]>(mockNews);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

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
        <h2 className="text-3xl font-bold tracking-tight">Latest Tech News</h2>
        <p className="text-muted-foreground">
          Stay updated with the latest developments in technology
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {news.map((item) => (
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
