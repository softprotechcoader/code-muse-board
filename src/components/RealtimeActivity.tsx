import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useSocket } from '@/contexts/SocketContext';
import { 
  Users, 
  MessageSquare, 
  Newspaper, 
  Activity, 
  Wifi, 
  WifiOff,
  RefreshCw,
  Clock,
  UserPlus,
  UserMinus
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'news' | 'comment' | 'user_join' | 'user_left' | 'progress';
  message: string;
  timestamp: string;
  data?: any;
}

const RealtimeActivity = () => {
  const { 
    isConnected, 
    userCount, 
    recentNews, 
    globalComments, 
    requestNewsRefresh 
  } = useSocket();
  
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Convert recent news to activities
    const newsActivities: ActivityItem[] = recentNews.map(news => ({
      id: `news-${news.id}`,
      type: 'news',
      message: `New ${news.type} update: ${news.title}`,
      timestamp: news.timestamp,
      data: news
    }));

    // Convert comments to activities
    const commentActivities: ActivityItem[] = globalComments.map(comment => ({
      id: `comment-${comment.id}`,
      type: 'comment',
      message: `${comment.author} commented: "${comment.text.substring(0, 50)}${comment.text.length > 50 ? '...' : ''}"`,
      timestamp: comment.timestamp,
      data: comment
    }));

    // Combine and sort by timestamp
    const allActivities = [...newsActivities, ...commentActivities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20); // Keep last 20 activities

    setActivities(allActivities);
  }, [recentNews, globalComments]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    requestNewsRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'news':
        return <Newspaper className="h-4 w-4 text-blue-500" />;
      case 'comment':
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'user_join':
        return <UserPlus className="h-4 w-4 text-purple-500" />;
      case 'user_left':
        return <UserMinus className="h-4 w-4 text-gray-500" />;
      case 'progress':
        return <Activity className="h-4 w-4 text-orange-500" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'news':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'comment':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'user_join':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'user_left':
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      case 'progress':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
              <CardTitle className="text-lg">Real-time Activity</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {userCount} online
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          <CardDescription>
            Live updates from the community
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Activity Feed */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mb-2" />
                <p>No recent activity</p>
                <p className="text-sm">Activity will appear here as it happens</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((activity, index) => (
                  <div key={activity.id}>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                      <div className="flex-shrink-0 mt-0.5">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{activity.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getActivityColor(activity.type)}`}
                          >
                            {activity.type}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    </div>
                    {index < activities.length - 1 && <Separator className="my-2" />}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealtimeActivity;
