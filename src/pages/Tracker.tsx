// src/pages/Tracker.tsx
//
// Lets users track their own reading/progress on news items. Supports adding comments, updating statuses,
// and shares progress in real time with others using SocketContext.

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Trash2, Wifi, WifiOff, BookOpen, Github } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/contexts/SocketContext";

/**
 * Information structure for each tracked item in the reading list.
 */
interface TrackedItem {
  id: string;
  title: string;
  description: string;
  link: string;
  status: "started" | "inProgress" | "completed";
  addedAt: string;
  comments: Array<{ text: string; date: string }>;
  docs?: string;
  github?: string;
}

/**
 * Tracker component, manages a personalized set of news/progress items for the user.
 * Allows status and comments to be updated, syncs via sockets for team/real-time progress.
 */
const Tracker = () => {
  const [items, setItems] = useState<TrackedItem[]>([]);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();
  const { isConnected, userCount, updateReadingProgress } = useSocket();

  // Loads items from localStorage on mount (persistent user-tracking)
  useEffect(() => {
    loadItems();
  }, []);

  /**
   * Loads tracked items from browser localStorage
   */
  const loadItems = () => {
    const tracked = JSON.parse(localStorage.getItem("trackedItems") || "[]");
    setItems(tracked);
  };

  /**
   * Updates the status (started/inProgress/completed) for a tracked item.
   * Broadcasts change in real time, and syncs with local & global user state.
   * Adds to history if completed.
   * @param {string} id - Item id
   * @param {string} status - New status
   */
  const updateStatus = (id: string, status: "started" | "inProgress" | "completed") => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, status } : item
    );
    setItems(updated);
    localStorage.setItem("trackedItems", JSON.stringify(updated));
    // Broadcast as real-time update (if connected)
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
    // Add to history if completed
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

  /**
   * Handler for adding a comment to a specific tracked item.
   * @param {string} id - The tracked item's id
   */
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

  /**
   * Removes a tracked item from the user's reading list.
   * @param {string} id - Item id to be removed
   */
  const removeItem = (id: string) => {
    const filtered = items.filter((item) => item.id !== id);
    setItems(filtered);
    localStorage.setItem('trackedItems', JSON.stringify(filtered));
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

  // --- Render ---
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-3xl font-bold tracking-tight">Reading Tracker</h2>
          {isConnected ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-500" />
          )}
        </div>
        <p className="text-muted-foreground">
          Track your progress and add notes to your readings
          {isConnected && ` • ${userCount} users online`}
        </p>
      </div>

      {items.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground">No items tracked yet. Add some from the Dashboard!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="border-border bg-card">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle>{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItem(item.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Select
                    value={item.status}
                    onValueChange={(value: any) => updateStatus(item.id, value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="started">Started</SelectItem>
                      <SelectItem value="inProgress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge className={getStatusColor(item.status)}>
                    {item.status === "inProgress" ? "In Progress" : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Documentation and GitHub Links - Moved to CardContent for better visibility */}
                {(item.docs || item.github || item.link) && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Resources</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {item.link && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => window.open(item.link, "_blank")}
                        >
                          <BookOpen className="h-4 w-4" />
                          Article
                        </Button>
                      )}
                      {item.github && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => window.open(item.github, "_blank")}
                        >
                          <Github className="h-4 w-4" />
                          GitHub
                        </Button>
                      )}
                      {item.docs && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => window.open(item.docs, "_blank")}
                        >
                          <BookOpen className="h-4 w-4" />
                          Documentation
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                
                {item.comments.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Comments
                    </h4>
                    <div className="space-y-2">
                      {item.comments.map((comment, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg bg-secondary/50 p-3 text-sm"
                        >
                          <p className="text-foreground">{comment.text}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(comment.date).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add a comment..."
                    value={commentText[item.id] || ""}
                    onChange={(e) =>
                      setCommentText({ ...commentText, [item.id]: e.target.value })
                    }
                    className="min-h-[80px]"
                  />
                  <Button onClick={() => addComment(item.id)} className="shrink-0">
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Tracker;
