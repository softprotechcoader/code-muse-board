// src/contexts/SocketContext.tsx
//
// Provides a React Context wrapping the Socket.io client for fully centralized real-time interaction (news, chat, activity, presence, etc).
// Encapsulates connection state, event listeners, and utility emitters for the UI layer.

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * Describes all real-time actions and state for consumers of this context,
 * including helpers for news, comments, presence, typing, and reading progress.
 */
interface SocketContextType {
  /** The live socket instance (null if not connected) */
  socket: Socket | null;
  /** True if connected to websocket back-end */
  isConnected: boolean;
  /** Number of connected users (as reported by server) */
  userCount: number;
  /** Array of the most recent news items from server */
  recentNews: any[];
  /** Array of most recent global comments/chat */
  globalComments: any[];
  /** Emit join event for username/avatar (on login/chat join, etc) */
  joinUser: (userData: { username: string; avatar?: string }) => void;
  /** Request latest news from the server (manually trigger fetch) */
  requestNewsRefresh: () => void;
  /** Add a global chat/comment (broadcast to all users) */
  addGlobalComment: (comment: string, newsId?: string) => void;
  /** Update reading progress for a news/article, broadcast to others */
  updateReadingProgress: (progress: any) => void;
  /** Emit typing indicator event (chat textarea, etc) */
  startTyping: (data: any) => void;
  /** Emit stop-typing indicator */
  stopTyping: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

/**
 * Provides all child components real-time communication state and emitters
 * via a React Context. Handles client connection/disconnection, subscribes
 * to server events, and keeps local state in sync as events occur.
 */
export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [recentNews, setRecentNews] = useState<any[]>([]);
  const [globalComments, setGlobalComments] = useState<any[]>([]);

  // Establishes and manages websocket connection on mount
  useEffect(() => {
    // Connect to backend
    const newSocket = io('http://localhost:3001', {
      transports: ['websocket', 'polling']
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Connected to real-time server');
      setIsConnected(true);
    });
    newSocket.on('disconnect', () => {
      console.log('Disconnected from real-time server');
      setIsConnected(false);
    });
    newSocket.on('user_count_update', (count) => setUserCount(count));
    // News event handlers
    newSocket.on('recent_news', (news) => setRecentNews(news));
    newSocket.on('news_update', (newsItem) => setRecentNews(prev => [...prev, newsItem].slice(-20))); // Last 20 only
    // Comments/chat event handlers
    newSocket.on('recent_comments', (comments) => setGlobalComments(comments));
    newSocket.on('new_comment', (comment) => setGlobalComments(prev => [...prev, comment].slice(-50))); // Last 50 only
    // Presence/typing feedback
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
    // On unmount, cleanup socket
    return () => {
      newSocket.close();
    };
  }, []);

  /** Emits a user_join event (with username/avatar) */
  const joinUser = (userData: { username: string; avatar?: string }) => {
    if (socket) {
      socket.emit('user_join', userData);
    }
  };

  /** Requests a news refresh from the backend, triggers a push to all clients */
  const requestNewsRefresh = () => {
    if (socket) {
      socket.emit('request_news_refresh');
    }
  };

  /** Emits an add_global_comment event, used to add a chat message to global feed */
  const addGlobalComment = (comment: string, newsId?: string) => {
    if (socket) {
      socket.emit('add_global_comment', {
        text: comment,
        newsId: newsId || 'general'
      });
    }
  };

  /** Emits a reading_progress event (used for tracker page updates, etc) */
  const updateReadingProgress = (progress: any) => {
    if (socket) {
      socket.emit('reading_progress', progress);
    }
  };

  /** Notifies server this client/user is actively typing in some text area */
  const startTyping = (data: any) => {
    if (socket) {
      socket.emit('typing_start', data);
    }
  };

  /** Notifies server this client/user has stopped typing */
  const stopTyping = () => {
    if (socket) {
      socket.emit('typing_stop');
    }
  };

  // Full context value for all consumers
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

/**
 * React hook for easy access to socket context state and actions.
 * Throws if used outside a SocketProvider!
 * @returns {SocketContextType}
 */
export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
