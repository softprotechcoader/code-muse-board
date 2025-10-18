# ⚡ Quick Configuration Reference

## 🚀 Essential Setup (5 minutes)

### 1. Environment Variables
```bash
# Create .env file
cp .env.example .env

# Edit .env with your settings
OPENAI_API_KEY=sk-your-key-here
PORT=3001
NODE_ENV=development
```

### 2. Start Application
```bash
# Install dependencies
npm install

# Start both frontend and backend
npm run dev:full
```

### 3. Access Points
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3001
- **API Docs**: http://localhost:3001/api-docs

---

## 🔧 Common Configurations

### Add New News Source
```javascript
// In config.js - sources array
{
  name: 'Your Source',
  url: 'https://example.com',
  selector: 'article',
  titleSelector: 'h2 a',
  linkSelector: 'h2 a',
  category: 'Technology',
  priority: 'medium',
  enabled: true
}
```

### Enable/Disable Features
```javascript
// In config.js
ai: {
  enableDynamicPrompts: true,    // Smart AI prompts
  enableContentAnalysis: true,   // Content analysis
  enableFallbackSummaries: true  // Fallback when AI fails
}
```

### Change Cache Duration
```javascript
// In config.js
news: {
  cacheDuration: 5 * 60 * 1000,  // 5 minutes
  fetchInterval: 10 * 60 * 1000, // 10 minutes
  realtimeInterval: 30 * 1000    // 30 seconds
}
```

---

## 🛠️ Troubleshooting Quick Fixes

### Port Already in Use
```bash
# Windows
taskkill /f /im node.exe

# Mac/Linux
pkill -f node
```

### OpenAI API Issues
```bash
# Check if API key is set
echo $OPENAI_API_KEY

# Test API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
```

### News Not Loading
```javascript
// Check if sources are enabled
console.log('Enabled sources:', config.sources.filter(s => s.enabled));

// Test individual source
node -e "import('./src/services/newsService.js').then(service => service.fetchAllNews())"
```

---

## 📊 Performance Tuning

### Reduce Memory Usage
```javascript
// In config.js
dynamicContent: {
  maxArticlesPerSource: 5,  // Reduce from 10
  duplicateThreshold: 0.9   // Increase from 0.8
}
```

### Speed Up AI Responses
```javascript
// In config.js
openai: {
  model: 'gpt-3.5-turbo',  // Faster than gpt-4
  maxTokens: 150,          // Reduce from 200
  temperature: 0.5         // Reduce from 0.7
}
```

---

## 🔒 Security Quick Setup

### Basic Security
```javascript
// In .env
JWT_SECRET=your-super-secret-key-here
SESSION_SECRET=your-session-secret-here
```

### CORS Configuration
```javascript
// In server.js
app.use(cors({
  origin: ['http://localhost:8080'],
  credentials: true
}));
```

---

## 📱 Mobile/PWA Configuration

### Enable PWA
```json
// In package.json
"dependencies": {
  "workbox-webpack-plugin": "^6.5.0"
}
```

### Mobile Optimization
```javascript
// In config.js
mobile: {
  enablePWA: true,
  enableOfflineMode: true,
  enablePushNotifications: false
}
```

---

## 🎯 Feature Flags

### Enable/Disable Features
```javascript
// In config.js
features: {
  realtimeChat: true,
  realtimeActivity: true,
  aiSummaries: true,
  userAuthentication: false,
  analytics: true,
  darkMode: true
}
```

---

## 📈 Monitoring & Logs

### Enable Debug Logging
```bash
# Full debug
DEBUG=* npm run dev:full

# Specific modules
DEBUG=socket.io* npm run dev:full
DEBUG=news* npm run dev:full
```

### Check System Health
```bash
# API health check
curl http://localhost:3001/api/health

# News endpoint test
curl http://localhost:3001/api/news?limit=5
```

---

## 🔄 Common Updates

### Update Dependencies
```bash
# Check for updates
npm outdated

# Update all
npm update

# Update specific package
npm install package@latest
```

### Clear Cache
```bash
# Clear npm cache
npm cache clean --force

# Clear application cache (restart server)
npm run dev:full
```

---

## 📞 Quick Help

### Check Logs
```bash
# Server logs
npm run server

# Frontend logs
npm run dev
```

### Test API Endpoints
```bash
# Health check
curl http://localhost:3001/api/health

# Get news
curl http://localhost:3001/api/news

# Test AI summary
curl -X POST http://localhost:3001/api/news/123/summarize
```

### Reset Everything
```bash
# Stop all processes
taskkill /f /im node.exe

# Clear node_modules
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Start fresh
npm run dev:full
```

---

*Keep this reference handy for quick configuration changes!*
