import { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  User,
  Loader2,
  Trash2,
  Copy,
  Check,
  Lightbulb,
  Code,
  BookOpen,
  Rocket
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const AIChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const suggestedPrompts = [
    {
      icon: Code,
      text: "Help me learn React hooks",
      category: "Learning"
    },
    {
      icon: Lightbulb,
      text: "Explain async/await in JavaScript",
      category: "Concepts"
    },
    {
      icon: Rocket,
      text: "Best practices for API design",
      category: "Best Practices"
    },
    {
      icon: BookOpen,
      text: "How to optimize web performance?",
      category: "Performance"
    }
  ];

  // Load messages from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem('aiChatMessages');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    }
  }, []);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('aiChatMessages', JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || inputMessage.trim();
    if (!textToSend) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/chat/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          conversationHistory: messages.slice(-10), // Last 10 messages for context
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message || data.response,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to get AI response. Please try again.',
        variant: 'destructive',
      });

      // Add fallback response
      const fallbackMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: "I apologize, but I'm having trouble connecting to the AI service right now. Please try again in a moment.",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('aiChatMessages');
    toast({
      title: 'Chat Cleared',
      description: 'All messages have been deleted.',
    });
  };

  const copyMessage = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      title: 'Copied!',
      description: 'Message copied to clipboard.',
    });
  };

  const handleSuggestedPrompt = (prompt: string) => {
    sendMessage(prompt);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent">
                  AI Assistant
                </h1>
                <p className="text-sm text-muted-foreground">
                  Powered by Azure OpenAI
                </p>
              </div>
            </div>
            {messages.length > 0 && (
              <Button 
                variant="outline" 
                onClick={clearChat}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Clear Chat
              </Button>
            )}
          </div>
        </div>

        {/* Chat Container */}
        <Card className="shadow-xl border-2">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Chat
                </CardTitle>
                <CardDescription>
                  Ask me anything about programming, tech concepts, or get help with your projects
                </CardDescription>
              </div>
              <Badge variant="secondary" className="gap-1">
                <Bot className="h-3 w-3" />
                Online
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Messages Area */}
            <ScrollArea className="h-[500px] p-6">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full space-y-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                    <Sparkles className="h-10 w-10 text-purple-500" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-semibold">Start a Conversation</h3>
                    <p className="text-muted-foreground max-w-md">
                      Ask questions, get explanations, or discuss any tech topic. I'm here to help!
                    </p>
                  </div>

                  {/* Suggested Prompts */}
                  <div className="w-full max-w-2xl space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Try asking:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {suggestedPrompts.map((prompt, idx) => {
                        const Icon = prompt.icon;
                        return (
                          <Button
                            key={idx}
                            variant="outline"
                            className="justify-start gap-3 h-auto p-4 hover:bg-primary/5 hover:border-primary/50"
                            onClick={() => handleSuggestedPrompt(prompt.text)}
                          >
                            <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                            <div className="text-left">
                              <div className="font-medium">{prompt.text}</div>
                              <div className="text-xs text-muted-foreground">{prompt.category}</div>
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex-shrink-0">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                      )}
                      
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted border'
                        }`}
                      >
                        {message.role === 'assistant' ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        )}
                        
                        <div className="flex items-center justify-between mt-2 gap-2">
                          <span className="text-xs opacity-70">
                            {new Date(message.timestamp).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => copyMessage(message.content, message.id)}
                          >
                            {copiedId === message.id ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {message.role === 'user' && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex-shrink-0">
                          <User className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex-shrink-0">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="bg-muted border rounded-2xl px-4 py-3">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input Area */}
            <div className="border-t p-4 bg-muted/30">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="min-h-[60px] max-h-[200px] resize-none"
                  disabled={isLoading}
                />
                <Button
                  onClick={() => sendMessage()}
                  disabled={!inputMessage.trim() || isLoading}
                  className="gap-2 px-6"
                  size="lg"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                💡 Tip: Ask about coding concepts, debugging help, best practices, or project guidance
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AIChat;
