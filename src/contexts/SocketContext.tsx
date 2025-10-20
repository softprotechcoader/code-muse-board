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

// Singleton socket instance - survives HMR reloads
let globalSocketInstance: Socket | null = null;

/**
 * Provides all child components real-time communication state and emitters
 * via a React Context. Handles client connection/disconnection, subscribes
 * to server events, and keeps local state in sync as events occur.
 * 
 * Uses singleton pattern to maintain socket connection across HMR reloads.
 */
export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [recentNews, setRecentNews] = useState<any[]>([]);
  const [globalComments, setGlobalComments] = useState<any[]>([]);
  
  // Detect development mode
  const isDevelopment = import.meta.env.DEV;

  // Establishes and manages websocket connection on mount
  useEffect(() => {
    // Reuse existing socket if available (prevents HMR disconnect)
    if (globalSocketInstance && globalSocketInstance.connected) {
      console.log('♻️ Reusing existing socket connection (HMR safe)');
      setSocket(globalSocketInstance);
      setIsConnected(true);
      return;
    }

    // Create new socket only if none exists
    if (!globalSocketInstance) {
      console.log('🔌 Creating new socket connection');
      
      const newSocket = io('http://localhost:3001', {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        autoConnect: true
      });

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('✅ Connected to real-time server');
        setIsConnected(true);
      });
      
      newSocket.on('disconnect', (reason) => {
        console.log('⚠️ Disconnected from real-time server:', reason);
        setIsConnected(false);
        
        // Auto-reconnect if disconnect was not intentional
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, try to reconnect
          newSocket.connect();
        }
      });
      
      newSocket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error.message);
        setIsConnected(false);
      });
      
      newSocket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Reconnected after', attemptNumber, 'attempts');
        setIsConnected(true);
      });
      
      newSocket.on('reconnect_attempt', (attemptNumber) => {
        console.log('🔄 Reconnection attempt', attemptNumber);
      });
      
      newSocket.on('reconnect_error', (error) => {
        console.error('❌ Reconnection error:', error.message);
      });
      
      newSocket.on('reconnect_failed', () => {
        console.error('❌ Reconnection failed after all attempts');
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
      
      globalSocketInstance = newSocket;
      setSocket(newSocket);
    }
    
    // Only cleanup socket on actual page unload, not during HMR
    const handleBeforeUnload = () => {
      if (globalSocketInstance) {
        console.log('🧹 Cleaning up socket connection (page unload)');
        globalSocketInstance.close();
        globalSocketInstance = null;
      }
    };

    // In development, keep socket alive during HMR
    if (isDevelopment) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        // Don't close socket in development (HMR will reuse it)
      };
    } else {
      // In production, cleanup on unmount as normal
      return () => {
        if (globalSocketInstance) {
          console.log('🧹 Cleaning up socket connection (component unmount)');
          globalSocketInstance.close();
          globalSocketInstance = null;
        }
      };
    }
  }, []); // Empty dependency array ensures this only runs once on mount

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
