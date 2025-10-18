import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  userCount: number;
  recentNews: any[];
  globalComments: any[];
  joinUser: (userData: { username: string; avatar?: string }) => void;
  requestNewsRefresh: () => void;
  addGlobalComment: (comment: string, newsId?: string) => void;
  updateReadingProgress: (progress: any) => void;
  startTyping: (data: any) => void;
  stopTyping: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [recentNews, setRecentNews] = useState<any[]>([]);
  const [globalComments, setGlobalComments] = useState<any[]>([]);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:3001', {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to real-time server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from real-time server');
      setIsConnected(false);
    });

    newSocket.on('user_count_update', (count) => {
      setUserCount(count);
    });

    newSocket.on('recent_news', (news) => {
      setRecentNews(news);
    });

    newSocket.on('news_update', (newsItem) => {
      setRecentNews(prev => [...prev, newsItem].slice(-20)); // Keep last 20
    });

    newSocket.on('recent_comments', (comments) => {
      setGlobalComments(comments);
    });

    newSocket.on('new_comment', (comment) => {
      setGlobalComments(prev => [...prev, comment].slice(-50)); // Keep last 50
    });

    newSocket.on('user_joined', (userData) => {
      console.log('User joined:', userData);
    });

    newSocket.on('user_left', (userData) => {
      console.log('User left:', userData);
    });

    newSocket.on('user_reading_progress', (progress) => {
      console.log('Reading progress update:', progress);
    });

    newSocket.on('user_typing', (data) => {
      console.log('User typing:', data);
    });

    newSocket.on('user_stopped_typing', (data) => {
      console.log('User stopped typing:', data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const joinUser = (userData: { username: string; avatar?: string }) => {
    if (socket) {
      socket.emit('user_join', userData);
    }
  };

  const requestNewsRefresh = () => {
    if (socket) {
      socket.emit('request_news_refresh');
    }
  };

  const addGlobalComment = (comment: string, newsId?: string) => {
    if (socket) {
      socket.emit('add_global_comment', {
        text: comment,
        newsId: newsId || 'general'
      });
    }
  };

  const updateReadingProgress = (progress: any) => {
    if (socket) {
      socket.emit('reading_progress', progress);
    }
  };

  const startTyping = (data: any) => {
    if (socket) {
      socket.emit('typing_start', data);
    }
  };

  const stopTyping = () => {
    if (socket) {
      socket.emit('typing_stop');
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    userCount,
    recentNews,
    globalComments,
    joinUser,
    requestNewsRefresh,
    addGlobalComment,
    updateReadingProgress,
    startTyping,
    stopTyping
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
