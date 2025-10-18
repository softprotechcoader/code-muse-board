import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Calendar } from "lucide-react";

interface HistoryItem {
  id: string;
  title: string;
  description: string;
  status: string;
  completedAt: string;
  comments: Array<{ text: string; date: string }>;
}

const HistoryPage = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const savedHistory = JSON.parse(localStorage.getItem("history") || "[]");
    setHistory(savedHistory.sort((a: HistoryItem, b: HistoryItem) => 
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    ));
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Reading History</h2>
        <p className="text-muted-foreground">
          Your completed readings and learning journey
        </p>
      </div>

      {history.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No completed readings yet. Keep learning!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <Card key={item.id} className="border-border bg-card">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>{item.title}</CardTitle>
                      <Badge className="bg-green-500/10 text-green-400 border-green-500/20">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Completed
                      </Badge>
                    </div>
                    <CardDescription>{item.description}</CardDescription>
                    <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Completed on {new Date(item.completedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </CardHeader>
              {item.comments && item.comments.length > 0 && (
                <CardContent>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Notes</h4>
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
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
