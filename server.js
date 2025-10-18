// server.js
//
// Main backend entry for Code Muse Board. Sets up Express REST API, OpenAPI docs, Socket.io real-time server, scheduled tasks, and news aggregation logic.

import express from 'express';
import http from 'http';
import { Server as SocketIo } from 'socket.io';
import cors from 'cors';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import cron from 'node-cron';
import { getNews, getNewsById, generateAISummary, generateRandomNews } from './src/services/newsService.js';

const app = express();
const server = http.createServer(app);

// === Middleware ===
// Enable CORS for all origins (adjust for production!)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// === Swagger/OpenAPI configuration ===
// Provides interactive API docs at /api-docs
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Code Muse Board API',
      version: '1.0.0',
      description: 'Real-time API for the Code Muse Board application with Socket.io integration',
    },
    servers: [
      { url: 'http://localhost:3001', description: 'Development server' }
    ],
    components: {
      schemas: {
        NewsItem: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            type: { type: 'string', enum: ['breaking', 'alert', 'update'] },
            timestamp: { type: 'string', format: 'date-time' },
            read: { type: 'boolean' }
          }
        },
        Comment: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            text: { type: 'string' },
            author: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            newsId: { type: 'string' }
          }
        },
        User: {
          type: 'object',
          properties: {
            username: { type: 'string' },
            socketId: { type: 'string' },
            joinedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  },
  apis: ['./server.js'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// === In-memory state (shared across all connections) ===
const connectedUsers = new Map(); // Map<socketId, {username, joinedAt, ...}>
const newsUpdates = [];           // Array<newsItem> (real-time updates)
const globalComments = [];        // Array<comment>
let allNews = [];                 // Latest complete news cache

// === REST API Routes ===
/**
 * @swagger
 * Health check endpoint.
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connectedUsers: connectedUsers.size
  });
});

/**
 * @swagger
 * Returns most recent news items (max 50).
 */
app.get('/api/news', async (req, res) => {
  try {
    const news = await getNews();
    res.json(news.slice(0, 50));
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

/**
 * @swagger
 * Returns last 50 comments (across all news).
 */
app.get('/api/comments', (req, res) => {
  res.json(globalComments.slice(-50));
});

/**
 * @swagger
 * Returns currently connected users.
 */
app.get('/api/users', (req, res) => {
  const users = Array.from(connectedUsers.values()).map(user => ({
    username: user.username,
    joinedAt: user.joinedAt
  }));
  res.json({
    count: connectedUsers.size,
    users: users
  });
});

/**
 * @swagger
 * Manually trigger a news refresh and broadcast new real-time news to all clients.
 */
app.post('/api/news/refresh', async (req, res) => {
  try {
    // Fetches news and emits one new 'real-time' entry
    const freshNews = await getNews();
    const newNews = generateRealTimeNews();
    io.emit('news_update', newNews);
    res.json({
      message: 'News refresh triggered',
      newsItem: newNews,
      totalNews: freshNews.length
    });
  } catch (error) {
    console.error('Error refreshing news:', error);
    res.status(500).json({ error: 'Failed to refresh news' });
  }
});

/**
 * @swagger
 * Generate an AI summary for a specific news article.
 */
app.post('/api/news/:id/summarize', async (req, res) => {
  try {
    const { id } = req.params;
    const newsItem = getNewsById(id);
    if (!newsItem) {
      return res.status(404).json({ error: 'News article not found' });
    }
    const summary = await generateAISummary(newsItem.title, newsItem.description);
    res.json({ summary, newsId: id, title: newsItem.title });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Serve frontend files if present.
app.use(express.static('public'));

// 404 fallback for undefined API routes.
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The route ${req.originalUrl} does not exist`,
    availableRoutes: [
      'GET /api/health',
      'GET /api/news',
      'GET /api/comments',
      'GET /api/users',
      'POST /api/news/refresh',
      'GET /api-docs'
    ]
  });
});

// === WebSocket (Socket.io) Real-time Server ===
const io = new SocketIo(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

/**
 * Maintains only a rolling window of recent news updates (for real-time display).
 * @returns {Object} The new real-time news item.
 */
const generateRealTimeNews = () => {
  const newsItem = generateRandomNews();
  newsUpdates.push(newsItem);
  // Limit to 50 recent
  if (newsUpdates.length > 50) newsUpdates.shift();
  return newsItem;
};

// === WebSocket handlers ===
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Send the latest news and comments to newcomers
  socket.emit('recent_news', newsUpdates.slice(-10));
  socket.emit('recent_comments', globalComments.slice(-20));

  // --- USER JOIN/LEAVE MANAGEMENT ---
  socket.on('user_join', (userData) => {
    connectedUsers.set(socket.id, {
      ...userData,
      socketId: socket.id,
      joinedAt: new Date().toISOString()
    });
    io.emit('user_count_update', connectedUsers.size);
    socket.broadcast.emit('user_joined', {
      username: userData.username || 'Anonymous',
      joinedAt: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    connectedUsers.delete(socket.id);
    io.emit('user_count_update', connectedUsers.size);
    if (user) {
      socket.broadcast.emit('user_left', { username: user.username || 'Anonymous', leftAt: new Date().toISOString() });
    }
    console.log(`User disconnected: ${socket.id}`);
  });

  // --- NEWS ---
  socket.on('request_news_refresh', () => {
    const newNews = generateRealTimeNews();
    io.emit('news_update', newNews);
  });

  // --- GLOBAL COMMENTS (real-time chat) ---
  socket.on('add_global_comment', (commentData) => {
    const user = connectedUsers.get(socket.id);
    const comment = {
      id: `comment-${Date.now()}`,
      ...commentData,
      author: user?.username || 'Anonymous',
      timestamp: new Date().toISOString(),
      socketId: socket.id
    };
    globalComments.push(comment);
    if (globalComments.length > 100) globalComments.shift();
    io.emit('new_comment', comment);
  });

  // --- READING PROGRESS BROADCAST ---
  socket.on('reading_progress', (progressData) => {
    const user = connectedUsers.get(socket.id);
    const progress = {
      ...progressData,
      user: user?.username || 'Anonymous',
      timestamp: new Date().toISOString()
    };
    socket.broadcast.emit('user_reading_progress', progress);
  });

  // --- TYPING INDICATOR ---
  socket.on('typing_start', (data) => {
    const user = connectedUsers.get(socket.id);
    socket.broadcast.emit('user_typing', {
      user: user?.username || 'Anonymous',
      ...data
    });
  });
  socket.on('typing_stop', () => {
    const user = connectedUsers.get(socket.id);
    socket.broadcast.emit('user_stopped_typing', {
      user: user?.username || 'Anonymous'
    });
  });
});

// === SERVER INITIALIZATION AND SCHEDULED TASKS ===
/**
 * Fetches and caches news articles on startup.
 */
async function initializeNews() {
  try {
    console.log('Initializing news service...');
    allNews = await getNews();
    console.log(`Loaded ${allNews.length} news articles`);
  } catch (error) {
    console.error('Error initializing news:', error);
  }
}

// Re-fetches news every 10 minutes and updates cache
cron.schedule('*/10 * * * *', async () => {
  try {
    console.log('Scheduled news fetch...');
    allNews = await getNews();
    console.log(`Updated news cache with ${allNews.length} articles`);
  } catch (error) {
    console.error('Error in scheduled news fetch:', error);
  }
});

// Generates new random news for 'real-time' every 30-60 seconds
setInterval(() => {
  const newNews = generateRealTimeNews();
  io.emit('news_update', newNews);
}, Math.random() * 30000 + 30000); // Runs at a random interval between 30-60s

const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
  console.log(`Real-time server running on port ${PORT}`);
  console.log(`Socket.io server ready for connections`);
  console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
  await initializeNews();
});
