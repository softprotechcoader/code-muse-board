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
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';
import { errorHandler } from './src/middleware/errorHandler.js';
import newsRoutes from './src/routes/newsRoutes.js';
import chatRoutes from './src/routes/chatRoutes.js';
import activityRoutes from './src/routes/activityRoutes.js';
import roadmapRoutes from './src/routes/roadmapRoutes.js';
import { getNews, getNewsById, generateAISummary, generateRandomNews } from './src/services/newsService.js';

const app = express();
const server = http.createServer(app);
const prisma = new PrismaClient();

// === Security Middleware ===
app.use(helmet()); // Adds various HTTP headers for security
app.use(compression()); // Compress responses

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// === Middleware ===
// Enable CORS for development (adjust for production!)
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  credentials: true
}));
app.use(express.json({ limit: '10kb' }));
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
  apis: ['./server.js', './src/routes/*.js'],
};
let swaggerSpec = swaggerJsdoc(swaggerOptions);

// If swagger-jsdoc failed to parse route JSDoc correctly (empty/malformed paths),
// provide a small manual spec so the UI is useful.
if (!swaggerSpec || !swaggerSpec.paths || Object.keys(swaggerSpec.paths).length === 0) {
  const manualPaths = {
    '/api/health': {
      get: {
        summary: 'Health check',
        responses: {
          '200': { description: 'OK' }
        }
      }
    },
    '/api/news': {
      get: {
        summary: 'Get recent news',
        responses: {
          '200': {
            description: 'A list of news items',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/NewsItem' } } } }
          }
        }
      }
    },
    '/api/comments': {
      get: {
        summary: 'Get recent comments',
        responses: { '200': { description: 'Array of comments', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Comment' } } } } } }
      }
    },
    '/api/users': {
      get: {
        summary: 'Get connected users',
        responses: { '200': { description: 'Connected users', content: { 'application/json': { schema: { type: 'object' } } } } }
      }
    },
    '/api/news/refresh': {
      post: {
        summary: 'Trigger news refresh',
        responses: { '200': { description: 'Refresh triggered' } }
      }
    },
    '/api/news/{id}/summarize': {
      post: {
        summary: 'Generate AI summary for news item',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Generated summary', content: { 'application/json': { schema: { type: 'object' } } } } }
      }
    }
  };

  swaggerSpec = {
    openapi: '3.0.0',
    info: swaggerOptions.definition.info,
    servers: swaggerOptions.definition.servers,
    paths: manualPaths,
    components: swaggerOptions.definition.components || {}
  };
}

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// === In-memory state (shared across all connections) ===
const connectedUsers = new Map(); // Map<socketId, {username, joinedAt, ...}>
const newsUpdates = [];           // Array<newsItem> (real-time updates)
const globalComments = [];        // Array<comment>
let allNews = [];                 // Latest complete news cache

// === REST API Routes ===
/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns server health status and basic metrics
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                 connectedUsers:
 *                   type: number
 *                   description: Number of connected users
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
 * /api/comments:
 *   get:
 *     summary: Get recent comments
 *     description: Returns the last 50 comments across all news articles
 *     tags:
 *       - Comments
 *     responses:
 *       200:
 *         description: List of recent comments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Comment'
 */
app.get('/api/comments', (req, res) => {
  res.json(globalComments.slice(-50));
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get connected users
 *     description: Returns currently connected users via Socket.io
 *     tags:
 *       - Users
 *     responses:
 *       200:
 *         description: List of connected users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: number
 *                   description: Number of connected users
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
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

// Mount API routers (newsRoutes handles /api/news)
app.use('/api/news', newsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/roadmap', roadmapRoutes);


/**
 * @swagger
 * /api/news/refresh:
 *   post:
 *     summary: Manually trigger news refresh
 *     description: Fetches fresh news and broadcasts new real-time news to all connected clients
 *     tags:
 *       - News
 *     responses:
 *       200:
 *         description: News refresh triggered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 newsItem:
 *                   $ref: '#/components/schemas/NewsItem'
 *                 totalNews:
 *                   type: number
 *       500:
 *         description: Failed to refresh news
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
 * /api/news/{id}/summarize:
 *   post:
 *     summary: Generate AI summary for a news article
 *     description: Uses Azure OpenAI to generate a detailed summary with topics, technical impact, use cases, and key takeaways
 *     tags:
 *       - News
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The news article ID
 *     responses:
 *       200:
 *         description: Successfully generated summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: string
 *                   description: Markdown formatted AI-generated summary
 *                 technologies:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Related technologies identified
 *                 provider:
 *                   type: string
 *                   description: AI provider used (azure-openai, claude, or local-fallback)
 *                 model:
 *                   type: string
 *                   description: AI model used
 *                 newsId:
 *                   type: string
 *                 title:
 *                   type: string
 *       404:
 *         description: News article not found
 *       500:
 *         description: Failed to generate summary
 */
app.post('/api/news/:id/summarize', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Summarize request for article ID: ${id}`);
    
    const newsItem = await getNewsById(id);
    if (!newsItem) {
      console.log(`Article not found: ${id}`);
      return res.status(404).json({ error: 'News article not found' });
    }
    
    console.log(`Generating summary for: ${newsItem.title}`);
    const summaryResult = await generateAISummary(newsItem.title, newsItem.description || '', newsItem.content || '');
    
    // summaryResult is now an object with { summary, technologies, provider, model }
    res.json({ 
      summary: summaryResult.summary,
      technologies: summaryResult.technologies || [],
      provider: summaryResult.provider || 'unknown',
      model: summaryResult.model || 'unknown',
      newsId: id, 
      title: newsItem.title 
    });
    
    console.log(`Summary generated successfully using ${summaryResult.provider}`);
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: 'Failed to generate summary', details: error.message });
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

  socket.on('disconnect', (reason) => {
    const user = connectedUsers.get(socket.id);
    connectedUsers.delete(socket.id);
    io.emit('user_count_update', connectedUsers.size);
    if (user) {
      socket.broadcast.emit('user_left', { username: user.username || 'Anonymous', leftAt: new Date().toISOString() });
    }
    
    // Log disconnect with reason (HMR in dev causes frequent disconnects)
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev && (reason === 'client namespace disconnect' || reason === 'transport close')) {
      console.log(`🔄 User reconnecting (HMR): ${socket.id} - ${reason}`);
    } else {
      console.log(`User disconnected: ${socket.id} - Reason: ${reason}`);
    }
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
  try {
    await initializeNews();
  } catch (error) {
    console.error('Error initializing news:', error);
  }
}).on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
