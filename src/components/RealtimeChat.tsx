// src/components/RealtimeChat.tsx
//
// Real-time chat component using the SocketContext for live community discussion.
// Handles joining chat, sending/receiving messages, real-time typing indicators, online user status, and avatars.

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useSocket } from '@/contexts/SocketContext';
import { MessageSquare, Send, Users, Wifi, WifiOff, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/**
 * ChatMessage describes a single chat bubble message (from globalComments, etc)
 */
interface ChatMessage {
  id: string;
  text: string;
  author: string;
  timestamp: string;
  newsId?: string;
}

/**
 * For real-time typing indicators (not currently populated from server).
 */
interface TypingUser {
  user: string;
  timestamp: string;
}

/**
 * RealtimeChat component handles a join-gate for username then presents UI for sending messages,
 * responding in real-time to server pushes (global comments), and managing typing state.
 */
const RealtimeChat = () => {
  const {
    isConnected, userCount, globalComments, addGlobalComment, startTyping, stopTyping
  } = useSocket();
  // Message input state
  const [message, setMessage] = useState('');
  // All displayed chat messages (transformed from globalComments)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // Typing users (optional future logic)
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  // Local typing state
  const [isTyping, setIsTyping] = useState(false);
  // Username for current session
  const [username, setUsername] = useState('');
  // Flag for join form
  const [showUsernameInput, setShowUsernameInput] = useState(true);
  // For scrolling to bottom on new message
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  // Internal timer for typing indicator
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Recompute chat messages on any globalComments update
  useEffect(() => {
    // Convert globalComments to messages for display
    const chatMessages: ChatMessage[] = globalComments.map(comment => ({
      id: comment.id,
      text: comment.text,
      author: comment.author,
      timestamp: comment.timestamp,
      newsId: comment.newsId
    }));
    setMessages(chatMessages);
  }, [globalComments]);

  // Whenever messages change, auto-scroll to the bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  /**
   * Send the current message, reset input, and emit stop-typing event.
   */
  const handleSendMessage = () => {
    if (!message.trim() || !username.trim()) return;
    addGlobalComment(message, 'general');
    setMessage('');
    stopTyping();
    setIsTyping(false);
  };

  /**
   * Allow Enter for send/sendMessage.
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * Updates message state and manages typing indicator emission.
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    // If typing just began, emit event.
    if (!isTyping && e.target.value.trim()) {
      setIsTyping(true);
      startTyping({ newsId: 'general' });
    }
    // Reset typing timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      stopTyping();
    }, 1000); // 1 second after last key
  };

  /**
   * Handles username input join for chat participation.
   */
  const handleUsernameSubmit = () => {
    if (username.trim()) {
      setShowUsernameInput(false);
    }
  };

  /**
   * Helper to get 1-2 initials from full name, for fallback avatars.
   */
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  /**
   * Generates unique color classes for avatar/badge by author name. Simple hash.
   */
  const getMessageColor = (author: string) => {
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

  // --- UI for username join (before chat loads) ---
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

  // --- Main chat UI ---
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
        {/* Message area will scroll to latest */}
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
        {/* Real-time typing indicators (future, if implemented) */}
        {typingUsers.length > 0 && (
          <div className="text-xs text-muted-foreground italic">
            {typingUsers.map(user => user.user).join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}
        {/* Message input bar */}
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
