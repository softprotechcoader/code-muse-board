import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Trash2, Wifi, WifiOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSocket } from "@/contexts/SocketContext";

interface TrackedItem {
  id: string;
  title: string;
  description: string;
  status: "started" | "inProgress" | "completed";
  addedAt: string;
  comments: Array<{ text: string; date: string }>;
}

const Tracker = () => {
  const [items, setItems] = useState<TrackedItem[]>([]);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();
  const { isConnected, userCount, updateReadingProgress } = useSocket();

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = () => {
    const tracked = JSON.parse(localStorage.getItem("trackedItems") || "[]");
    setItems(tracked);
  };

  const updateStatus = (id: string, status: "started" | "inProgress" | "completed") => {
    const updated = items.map((item) =>
      item.id === id ? { ...item, status } : item
    );
    setItems(updated);
    localStorage.setItem("trackedItems", JSON.stringify(updated));
    
    // Broadcast reading progress update
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
    
    toast({
      title: "Status Updated",
      description: `Item marked as ${status}`,
    });
  };

  const addComment = (id: string) => {
    const comment = commentText[id]?.trim();
    if (!comment) return;

    const updated = items.map((item) =>
      item.id === id
        ? {
            ...item,
            comments: [
              ...item.comments,
              { text: comment, date: new Date().toISOString() },
            ],
          }
        : item
    );
    setItems(updated);
    localStorage.setItem("trackedItems", JSON.stringify(updated));
    setCommentText({ ...commentText, [id]: "" });
    
    toast({
      title: "Comment Added",
      description: "Your comment has been saved.",
    });
  };

  const removeItem = (id: string) => {
    const updated = items.filter((item) => item.id !== id);
    setItems(updated);
    localStorage.setItem("trackedItems", JSON.stringify(updated));
    
    toast({
      title: "Item Removed",
      description: "Item has been removed from tracker.",
    });
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
