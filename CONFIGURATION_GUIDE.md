# 🚀 Code Muse Board - Configuration Guide

This guide covers all configuration options for the Code Muse Board application, including OpenAPI/Swagger setup, news sources, AI integration, and more.

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Setup](#environment-setup)
3. [OpenAPI/Swagger Configuration](#openapiswagger-configuration)
4. [News Sources Configuration](#news-sources-configuration)
5. [AI Integration Setup](#ai-integration-setup)
6. [Real-time Features](#real-time-features)
7. [Database Configuration](#database-configuration)
8. [Security Configuration](#security-configuration)
9. [Performance Tuning](#performance-tuning)
10. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- OpenAI API key (optional, for AI features)

### Installation
```bash
# Clone the repository
git clone <your-repo-url>
cd code-muse-board

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Start the application
npm run dev:full
```

---

## 🔧 Environment Setup

Create a `.env` file in the root directory:

```env
# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=200
OPENAI_TEMPERATURE=0.7

# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration (Future)
DATABASE_URL=sqlite:./data/app.db
# DATABASE_URL=postgresql://user:password@localhost:5432/codemuse

# Security
JWT_SECRET=your-super-secret-jwt-key
SESSION_SECRET=your-session-secret

# News Configuration
NEWS_CACHE_DURATION=300000
NEWS_FETCH_INTERVAL=600000
NEWS_REALTIME_INTERVAL=30000

# Feature Flags
ENABLE_AI_SUMMARIES=true
ENABLE_REALTIME_FEATURES=true
ENABLE_USER_AUTHENTICATION=false
ENABLE_ANALYTICS=true
```

---

## 📚 OpenAPI/Swagger Configuration

### Current Setup
The application includes Swagger UI for API documentation at `http://localhost:3001/api-docs`.

### Configuration Files

#### `server.js` - Swagger Setup
```javascript
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Code Muse Board API',
      version: '1.0.0',
      description: 'Real-time tech news aggregation and learning platform API',
      contact: {
        name: 'API Support',
        email: 'support@codemuse.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server'
      },
      {
        url: 'https://api.codemuse.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./server.js', './src/services/*.js']
};

const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
```

### API Endpoints Documentation

#### Health Check
```javascript
/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Server health check
 *     tags: [System]
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
 *                   example: "healthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 */
```

#### News Endpoints
```javascript
/**
 * @swagger
 * /api/news:
 *   get:
 *     summary: Get latest tech news
 *     tags: [News]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of news articles to return
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *     responses:
 *       200:
 *         description: List of news articles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/NewsArticle'
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     NewsArticle:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique article identifier
 *         title:
 *           type: string
 *           description: Article title
 *         description:
 *           type: string
 *           description: Article description
 *         link:
 *           type: string
 *           format: uri
 *           description: Article URL
 *         source:
 *           type: string
 *           description: News source
 *         category:
 *           type: string
 *           description: Article category
 *         date:
 *           type: string
 *           format: date
 *         timestamp:
 *           type: string
 *           format: date-time
 *         read:
 *           type: boolean
 *           description: Whether article has been read
 */
```

### Customizing Swagger UI

#### Theme Customization
```javascript
// In server.js
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #3b82f6 }
  `,
  customSiteTitle: "Code Muse Board API",
  customfavIcon: "/favicon.ico"
}));
```

#### Authentication Setup
```javascript
// Add to swaggerOptions.definition.components.securitySchemes
{
  apiKey: {
    type: 'apiKey',
    in: 'header',
    name: 'X-API-Key'
  },
  oauth2: {
    type: 'oauth2',
    flows: {
      authorizationCode: {
        authorizationUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        scopes: {
          read: 'Read access',
          write: 'Write access'
        }
      }
    }
  }
}
```

---

## 📰 News Sources Configuration

### Current Sources
The application supports multiple news sources configured in `config.js`:

```javascript
sources: [
  {
    name: 'Hacker News',
    url: 'https://news.ycombinator.com',
    selector: '.athing',
    titleSelector: '.titleline > a',
    linkSelector: '.titleline > a',
    category: 'General',
    priority: 'high',
    enabled: true
  },
  // ... more sources
]
```

### Adding New Sources

#### 1. Web Scraping Source
```javascript
{
  name: 'Your News Source',
  url: 'https://example.com',
  selector: 'article', // CSS selector for articles
  titleSelector: 'h2 a', // CSS selector for titles
  linkSelector: 'h2 a', // CSS selector for links
  category: 'Technology',
  priority: 'medium',
  enabled: true
}
```

#### 2. API-based Source
```javascript
{
  name: 'Reddit Programming',
  url: 'https://www.reddit.com/r/programming/hot.json',
  selector: 'data.children',
  titleSelector: 'data.title',
  linkSelector: 'data.url',
  category: 'Community',
  priority: 'medium',
  enabled: false,
  type: 'api',
  headers: {
    'User-Agent': 'CodeMuseBoard/1.0'
  }
}
```

### Source Configuration Options

| Option | Type | Description |
|--------|------|-------------|
| `name` | string | Display name for the source |
| `url` | string | Source URL or API endpoint |
| `selector` | string | CSS selector for articles |
| `titleSelector` | string | CSS selector for article titles |
| `linkSelector` | string | CSS selector for article links |
| `category` | string | Default category for articles |
| `priority` | string | `high`, `medium`, `low` |
| `enabled` | boolean | Whether source is active |
| `type` | string | `web` (default) or `api` |
| `headers` | object | Custom headers for API requests |
| `timeout` | number | Request timeout in milliseconds |

---

## 🤖 AI Integration Setup

### OpenAI Configuration

#### 1. Get API Key
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create an account and get your API key
3. Add to `.env` file: `OPENAI_API_KEY=sk-...`

#### 2. Model Configuration
```javascript
// In config.js
openai: {
  apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key-here',
  model: 'gpt-3.5-turbo', // or 'gpt-4' for better quality
  maxTokens: 200,
  temperature: 0.7
}
```

#### 3. AI Features Configuration
```javascript
// In config.js
ai: {
  enableDynamicPrompts: true,
  enableContentAnalysis: true,
  enablePersonalization: false, // Future feature
  maxSummaryLength: 300,
  minSummaryLength: 100,
  enableFallbackSummaries: true
}
```

### Alternative AI Providers

#### Using Anthropic Claude
```javascript
// Add to package.json
"@anthropic-ai/sdk": "^0.9.0"

// In newsService.js
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Use in generateAISummary function
const completion = await anthropic.messages.create({
  model: 'claude-3-sonnet-20240229',
  max_tokens: 200,
  messages: [{ role: 'user', content: prompt }]
});
```

#### Using Google Gemini
```javascript
// Add to package.json
"@google/generative-ai": "^0.2.0"

// In newsService.js
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
```

---

## ⚡ Real-time Features

### Socket.io Configuration

#### Server Setup
```javascript
// In server.js
import { Server } from 'socket.io';
import { createServer } from 'http';

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:8080",
    methods: ["GET", "POST"]
  }
});
```

#### Client Configuration
```javascript
// In SocketContext.tsx
const newSocket = io('http://localhost:3001', {
  transports: ['websocket', 'polling'],
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});
```

### Real-time Events

#### Available Events
```javascript
// Client to Server
socket.emit('chat_message', { message: 'Hello', user: 'John' });
socket.emit('typing', { user: 'John' });
socket.emit('request_news_refresh');
socket.emit('update_reading_progress', { articleId: '123', progress: 50 });

// Server to Client
socket.on('news_update', (news) => { /* handle news update */ });
socket.on('user_count_update', (count) => { /* handle user count */ });
socket.on('chat_message', (data) => { /* handle chat message */ });
socket.on('typing_status', (data) => { /* handle typing status */ });
```

---

## 🗄️ Database Configuration

### SQLite Setup (Current)
```javascript
// In config.js
database: {
  type: 'sqlite',
  url: './data/app.db',
  synchronize: true,
  logging: false
}
```

### PostgreSQL Setup (Production)
```javascript
// In config.js
database: {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false, // Set to false in production
  logging: process.env.NODE_ENV === 'development',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
}
```

### Prisma Setup (Future)
```bash
# Install Prisma
npm install prisma @prisma/client

# Initialize Prisma
npx prisma init

# Generate client
npx prisma generate

# Run migrations
npx prisma migrate dev
```

---

## 🔒 Security Configuration

### JWT Authentication
```javascript
// In config.js
security: {
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: '7d',
  refreshTokenExpiresIn: '30d',
  bcryptRounds: 12
}
```

### CORS Configuration
```javascript
// In server.js
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### Rate Limiting
```javascript
// Add to package.json
"express-rate-limit": "^7.0.0"

// In server.js
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

---

## ⚡ Performance Tuning

### Caching Configuration
```javascript
// In config.js
cache: {
  news: {
    duration: 5 * 60 * 1000, // 5 minutes
    maxSize: 1000
  },
  ai: {
    duration: 60 * 60 * 1000, // 1 hour
    maxSize: 500
  }
}
```

### Redis Setup (Optional)
```bash
# Install Redis client
npm install redis

# In config.js
redis: {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: 0
}
```

### Memory Management
```javascript
// In server.js
// Set memory limits
process.setMaxListeners(0);

// Garbage collection optimization
if (global.gc) {
  setInterval(() => {
    global.gc();
  }, 30000); // Run every 30 seconds
}
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Kill all Node.js processes
taskkill /f /im node.exe

# Or find and kill specific process
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

#### 2. OpenAI API Errors
```javascript
// Check API key format
if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
  console.log('OpenAI API key not configured, using fallback summaries');
}
```

#### 3. News Fetching Issues
```javascript
// Enable debug logging
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('Fetching news from:', source.name);
  console.log('Response status:', response.status);
}
```

#### 4. Socket.io Connection Issues
```javascript
// Check CORS configuration
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:8080", // Must match frontend URL
    methods: ["GET", "POST"]
  }
});
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=* npm run dev:full

# Or specific modules
DEBUG=socket.io* npm run dev:full
```

### Logging Configuration
```javascript
// In server.js
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

---

## 📞 Support

### Getting Help
1. Check the [GitHub Issues](https://github.com/your-repo/issues)
2. Review the [API Documentation](http://localhost:3001/api-docs)
3. Check the console logs for error messages
4. Verify your environment variables

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## 🔄 Updates and Maintenance

### Regular Maintenance Tasks
1. **Update Dependencies**: `npm audit` and `npm update`
2. **Clear Cache**: Restart the server to clear news cache
3. **Monitor Logs**: Check for errors and performance issues
4. **Backup Data**: Regular database backups (when implemented)

### Configuration Updates
- Review and update news sources quarterly
- Monitor AI API usage and costs
- Update security configurations as needed
- Test new features in development environment

---

*Last updated: December 2024*
*Version: 1.0.0*
