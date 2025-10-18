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

// Enable CORS for all origins
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"]
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Code Muse Board API',
      version: '1.0.0',
      description: 'Real-time API for the Code Muse Board application with Socket.io integration',
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
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
  apis: ['./server.js'], // Path to the API files
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// REST API Routes

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
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
 *                 timestamp:
 *                   type: string
 *                 uptime:
 *                   type: number
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
 * /api/news:
 *   get:
 *     summary: Get recent news updates
 *     tags: [News]
 *     responses:
 *       200:
 *         description: List of recent news items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/NewsItem'
 */
app.get('/api/news', async (req, res) => {
  try {
    const news = await getNews();
    res.json(news.slice(0, 50)); // Return first 50 news items
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

/**
 * @swagger
 * /api/comments:
 *   get:
 *     summary: Get recent comments
 *     tags: [Comments]
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
  res.json(globalComments.slice(-50)); // Return last 50 comments
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get connected users
 *     tags: [Users]
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

/**
 * @swagger
 * /api/news/refresh:
 *   post:
 *     summary: Trigger news refresh
 *     tags: [News]
 *     responses:
 *       200:
 *         description: News refresh triggered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 newsItem:
 *                   $ref: '#/components/schemas/NewsItem'
 */
app.post('/api/news/refresh', async (req, res) => {
  try {
    // Fetch fresh news from all sources
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
 *     tags: [News]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: News article ID
 *     responses:
 *       200:
 *         description: AI summary generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: string
 *                 newsId:
 *                   type: string
 *       404:
 *         description: News article not found
 *       500:
 *         description: Error generating summary
 */
app.post('/api/news/:id/summarize', async (req, res) => {
  try {
    const { id } = req.params;
    const newsItem = getNewsById(id);
    
    if (!newsItem) {
      return res.status(404).json({ error: 'News article not found' });
    }
    
    const summary = await generateAISummary(newsItem.title, newsItem.description);
    
    res.json({
      summary: summary,
      newsId: id,
      title: newsItem.title
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Serve static files for the frontend (if needed)
app.use(express.static('public'));

// 404 handler for undefined routes
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

const io = new SocketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store connected users and their data
const connectedUsers = new Map();
const newsUpdates = [];
const globalComments = [];

// Initialize news on server start
let allNews = [];

// Real-time news updates using the news service
const generateRealTimeNews = () => {
  const newsItem = generateRandomNews();
  newsUpdates.push(newsItem);
  
  // Keep only last 50 updates
  if (newsUpdates.length > 50) {
    newsUpdates.shift();
  }

  return newsItem;
};

// Socket connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Send recent news updates to new user
  socket.emit('recent_news', newsUpdates.slice(-10));
  socket.emit('recent_comments', globalComments.slice(-20));

  // Handle user joining
  socket.on('user_join', (userData) => {
    connectedUsers.set(socket.id, {
      ...userData,
      socketId: socket.id,
      joinedAt: new Date().toISOString()
    });
    
    // Broadcast user count update
    io.emit('user_count_update', connectedUsers.size);
    
    // Broadcast new user joined (without sensitive data)
    socket.broadcast.emit('user_joined', {
      username: userData.username || 'Anonymous',
      joinedAt: new Date().toISOString()
    });
  });

  // Handle news refresh request
  socket.on('request_news_refresh', () => {
    const newNews = generateRealTimeNews();
    io.emit('news_update', newNews);
  });

  // Handle global comments
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
    
    // Keep only last 100 comments
    if (globalComments.length > 100) {
      globalComments.shift();
    }
    
    io.emit('new_comment', comment);
  });

  // Handle reading progress updates
  socket.on('reading_progress', (progressData) => {
    const user = connectedUsers.get(socket.id);
    const progress = {
      ...progressData,
      user: user?.username || 'Anonymous',
      timestamp: new Date().toISOString()
    };
    
    // Broadcast to all users except sender
    socket.broadcast.emit('user_reading_progress', progress);
  });

  // Handle typing indicators
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

  // Handle disconnect
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    connectedUsers.delete(socket.id);
    
    // Broadcast user count update
    io.emit('user_count_update', connectedUsers.size);
    
    // Broadcast user left
    if (user) {
      socket.broadcast.emit('user_left', {
        username: user.username || 'Anonymous',
        leftAt: new Date().toISOString()
      });
    }
    
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Initialize news on server start
async function initializeNews() {
  try {
    console.log('Initializing news service...');
    allNews = await getNews();
    console.log(`Loaded ${allNews.length} news articles`);
  } catch (error) {
    console.error('Error initializing news:', error);
  }
}

// Schedule news fetching every 10 minutes
cron.schedule('*/10 * * * *', async () => {
  try {
    console.log('Scheduled news fetch...');
    allNews = await getNews();
    console.log(`Updated news cache with ${allNews.length} articles`);
  } catch (error) {
    console.error('Error in scheduled news fetch:', error);
  }
});

// Generate random news updates every 30-60 seconds
setInterval(() => {
  const newNews = generateRealTimeNews();
  io.emit('news_update', newNews);
}, Math.random() * 30000 + 30000); // 30-60 seconds

const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
  console.log(`Real-time server running on port ${PORT}`);
  console.log(`Socket.io server ready for connections`);
  console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
  
  // Initialize news service
  await initializeNews();
});
