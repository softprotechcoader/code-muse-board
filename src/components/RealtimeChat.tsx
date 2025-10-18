import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useSocket } from '@/contexts/SocketContext';
import { 
  MessageSquare, 
  Send, 
  Users, 
  Wifi, 
  WifiOff,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatMessage {
  id: string;
  text: string;
  author: string;
  timestamp: string;
  newsId?: string;
}

interface TypingUser {
  user: string;
  timestamp: string;
}

const RealtimeChat = () => {
  const { 
    isConnected, 
    userCount, 
    globalComments, 
    addGlobalComment, 
    startTyping, 
    stopTyping 
  } = useSocket();
  
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [username, setUsername] = useState('');
  const [showUsernameInput, setShowUsernameInput] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Convert global comments to chat messages
    const chatMessages: ChatMessage[] = globalComments.map(comment => ({
      id: comment.id,
      text: comment.text,
      author: comment.author,
      timestamp: comment.timestamp,
      newsId: comment.newsId
    }));

    setMessages(chatMessages);
  }, [globalComments]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!message.trim() || !username.trim()) return;

    addGlobalComment(message, 'general');
    setMessage('');
    stopTyping();
    setIsTyping(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);

    // Handle typing indicators
    if (!isTyping && e.target.value.trim()) {
      setIsTyping(true);
      startTyping({ newsId: 'general' });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      stopTyping();
    }, 1000);
  };

  const handleUsernameSubmit = () => {
    if (username.trim()) {
      setShowUsernameInput(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getMessageColor = (author: string) => {
    // Generate a consistent color based on author name
    const colors = [
      'bg-blue-500/10 text-blue-400 border-blue-500/20',
      'bg-green-500/10 text-green-400 border-green-500/20',
      'bg-purple-500/10 text-purple-400 border-purple-500/20',
      'bg-orange-500/10 text-orange-400 border-orange-500/20',
      'bg-pink-500/10 text-pink-400 border-pink-500/20',
      'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    ];
    
    const index = author.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  if (showUsernameInput) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Join Chat
          </CardTitle>
          <CardDescription>
            Enter your username to start chatting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleUsernameSubmit()}
            />
            <Button onClick={handleUsernameSubmit} disabled={!username.trim()}>
              Join
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            <CardTitle className="text-lg">Community Chat</CardTitle>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {userCount} online
          </Badge>
        </div>
        <CardDescription>
          Chat with other developers in real-time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="h-[300px]">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mb-2" />
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(msg.author)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {msg.author}
                      </span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getMessageColor(msg.author)}`}
                      >
                        {msg.author}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                      </div>
                    </div>
                    <p className="text-sm text-foreground bg-secondary/30 rounded-lg p-2">
                      {msg.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Typing indicators */}
        {typingUsers.length > 0 && (
          <div className="text-xs text-muted-foreground italic">
            {typingUsers.map(user => user.user).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        {/* Message input */}
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            disabled={!isConnected}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!message.trim() || !isConnected}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default RealtimeChat;
