# 📚 Code Muse Board - API Documentation

## 🌐 Base URL
- **Development**: `http://localhost:3001`
- **Production**: `https://api.codemuse.com`

## 📖 Interactive Documentation
Visit `http://localhost:3001/api-docs` for the interactive Swagger UI documentation.

---

## 🔐 Authentication

### Current Status
Authentication is **not implemented** yet. All endpoints are currently public.

### Future Implementation
```http
Authorization: Bearer <jwt_token>
```

---

## 📰 News Endpoints

### Get Latest News
```http
GET /api/news
```

**Query Parameters:**
- `limit` (integer, optional): Number of articles to return (default: 20, max: 100)
- `category` (string, optional): Filter by category
- `source` (string, optional): Filter by news source
- `search` (string, optional): Search in titles and descriptions

**Response:**
```json
[
  {
    "id": "news-hacker-news-1703123456789-0",
    "title": "New JavaScript Framework Released",
    "description": "Latest news from Hacker News",
    "link": "https://example.com/article",
    "source": "Hacker News",
    "category": "General",
    "date": "2024-12-21",
    "timestamp": "2024-12-21T10:30:00.000Z",
    "read": false
  }
]
```

**Example:**
```bash
curl "http://localhost:3001/api/news?limit=10&category=Technology"
```

### Get News by ID
```http
GET /api/news/:id
```

**Response:**
```json
{
  "id": "news-hacker-news-1703123456789-0",
  "title": "New JavaScript Framework Released",
  "description": "Latest news from Hacker News",
  "link": "https://example.com/article",
  "source": "Hacker News",
  "category": "General",
  "date": "2024-12-21",
  "timestamp": "2024-12-21T10:30:00.000Z",
  "read": false
}
```

### Refresh News
```http
POST /api/news/refresh
```

**Response:**
```json
{
  "message": "News refresh initiated",
  "timestamp": "2024-12-21T10:30:00.000Z",
  "articlesCount": 45
}
```

### Generate AI Summary
```http
POST /api/news/:id/summarize
```

**Response:**
```json
{
  "id": "news-hacker-news-1703123456789-0",
  "summary": "This represents a significant advancement in the framework ecosystem. Latest news from Hacker News This update focuses on improving developer experience and performance optimizations. Developers should pay attention to this development as it may impact their current projects and future technology choices.",
  "timestamp": "2024-12-21T10:30:00.000Z",
  "aiGenerated": true
}
```

---

## 💬 Chat Endpoints

### Get Global Comments
```http
GET /api/comments
```

**Response:**
```json
[
  {
    "id": "comment-123",
    "message": "Great article!",
    "user": "Anonymous",
    "timestamp": "2024-12-21T10:30:00.000Z",
    "newsId": "news-hacker-news-1703123456789-0"
  }
]
```

### Add Global Comment
```http
POST /api/comments
```

**Request Body:**
```json
{
  "message": "Great article!",
  "newsId": "news-hacker-news-1703123456789-0"
}
```

**Response:**
```json
{
  "id": "comment-123",
  "message": "Great article!",
  "user": "Anonymous",
  "timestamp": "2024-12-21T10:30:00.000Z",
  "newsId": "news-hacker-news-1703123456789-0"
}
```

---

## 👥 User Endpoints

### Get Connected Users
```http
GET /api/users
```

**Response:**
```json
{
  "count": 5,
  "users": [
    {
      "id": "user-123",
      "username": "Anonymous",
      "connectedAt": "2024-12-21T10:30:00.000Z"
    }
  ]
}
```

---

## 🏥 System Endpoints

### Health Check
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-12-21T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "environment": "development"
}
```

### Server Info
```http
GET /api/info
```

**Response:**
```json
{
  "name": "Code Muse Board API",
  "version": "1.0.0",
  "description": "Real-time tech news aggregation and learning platform",
  "features": {
    "realtime": true,
    "aiSummaries": true,
    "newsSources": 8,
    "activeConnections": 5
  }
}
```

---

## 🔌 WebSocket Events

### Connection
```javascript
const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected to server');
});
```

### Available Events

#### Client to Server Events

**Join User**
```javascript
socket.emit('join_user', {
  username: 'John Doe',
  avatar: 'https://example.com/avatar.jpg'
});
```

**Chat Message**
```javascript
socket.emit('chat_message', {
  message: 'Hello everyone!',
  newsId: 'news-123' // optional
});
```

**Typing Status**
```javascript
socket.emit('typing', {
  user: 'John Doe',
  newsId: 'news-123' // optional
});

socket.emit('stop_typing');
```

**Request News Refresh**
```javascript
socket.emit('request_news_refresh');
```

**Update Reading Progress**
```javascript
socket.emit('update_reading_progress', {
  articleId: 'news-123',
  progress: 75, // percentage
  timeSpent: 300 // seconds
});
```

#### Server to Client Events

**News Update**
```javascript
socket.on('news_update', (news) => {
  console.log('New articles:', news);
});
```

**User Count Update**
```javascript
socket.on('user_count_update', (count) => {
  console.log('Connected users:', count);
});
```

**Chat Message**
```javascript
socket.on('chat_message', (data) => {
  console.log('New message:', data);
});
```

**Typing Status**
```javascript
socket.on('typing_status', (data) => {
  console.log('User typing:', data);
});
```

**Activity Feed**
```javascript
socket.on('activity_feed', (activities) => {
  console.log('New activities:', activities);
});
```

---

## 📊 Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

## 🚨 Error Responses

### Standard Error Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "limit",
      "reason": "Must be between 1 and 100"
    }
  },
  "timestamp": "2024-12-21T10:30:00.000Z"
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Invalid request parameters
- `NOT_FOUND`: Resource not found
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `AI_SERVICE_ERROR`: AI summarization failed
- `NEWS_FETCH_ERROR`: Failed to fetch news
- `DATABASE_ERROR`: Database operation failed

---

## 🔧 Rate Limiting

### Current Limits
- **General API**: 100 requests per 15 minutes per IP
- **News Refresh**: 10 requests per hour per IP
- **AI Summaries**: 20 requests per hour per IP

### Headers
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1703123456
```

---

## 📝 Request/Response Examples

### Get News with Filters
```bash
curl -X GET "http://localhost:3001/api/news?limit=5&category=Technology&source=Hacker%20News" \
  -H "Accept: application/json"
```

### Generate AI Summary
```bash
curl -X POST "http://localhost:3001/api/news/news-123/summarize" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json"
```

### Add Comment
```bash
curl -X POST "http://localhost:3001/api/comments" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "message": "Great article!",
    "newsId": "news-123"
  }'
```

---

## 🧪 Testing

### Health Check
```bash
curl http://localhost:3001/api/health
```

### Test News Endpoint
```bash
curl http://localhost:3001/api/news?limit=1
```

### Test WebSocket Connection
```javascript
// In browser console
const socket = io('http://localhost:3001');
socket.on('connect', () => console.log('Connected!'));
```

---

## 🔄 Webhook Support (Future)

### News Update Webhook
```http
POST /api/webhooks/news-update
```

**Headers:**
```http
Content-Type: application/json
X-Webhook-Signature: sha256=...
```

**Payload:**
```json
{
  "event": "news.update",
  "data": {
    "articleId": "news-123",
    "title": "New Article",
    "source": "Hacker News"
  },
  "timestamp": "2024-12-21T10:30:00.000Z"
}
```

---

## 📈 Analytics Endpoints (Future)

### Get Usage Statistics
```http
GET /api/analytics/usage
```

### Get Popular Articles
```http
GET /api/analytics/popular
```

### Get User Activity
```http
GET /api/analytics/activity
```

---

## 🔍 Search Endpoints (Future)

### Search Articles
```http
GET /api/search?q=javascript&category=Technology
```

### Get Trending Topics
```http
GET /api/trending
```

### Get Related Articles
```http
GET /api/news/:id/related
```

---

*For the most up-to-date API documentation, visit the interactive Swagger UI at `http://localhost:3001/api-docs`*
