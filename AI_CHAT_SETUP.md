# AI Chat - Quick Setup Guide

## 🚀 Quick Start

### 1. Environment Variables
Add these to your `.env` file in the project root:

```env
# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
```

### 2. Verify Installation
The required packages are already installed:
- ✅ `node-fetch` (v3.3.2)
- ✅ `express`
- ✅ `react`
- ✅ `react-router-dom`
- ✅ `lucide-react`
- ✅ `react-markdown`

### 3. Start the Application

```bash
# Option 1: Start both frontend and backend
npm run dev:full

# Option 2: Start separately
# Terminal 1 - Backend
npm run server

# Terminal 2 - Frontend  
npm run dev
```

### 4. Access AI Chat
1. Open browser to `http://localhost:5173`
2. Click "AI Chat" (✨) in the navbar
3. Start chatting!

## 🔧 Testing Without Azure OpenAI

The AI Chat works even without Azure OpenAI configured! It uses intelligent fallback responses.

### Fallback Mode Features
- ✅ Detects React/hooks questions
- ✅ Explains async/await
- ✅ Provides API design tips
- ✅ General programming resources

### Test Fallback Mode
1. Don't configure Azure OpenAI (or use invalid credentials)
2. Ask questions like:
   - "Help me learn React hooks"
   - "Explain async/await"
   - "Best practices for API design"
3. Get instant, helpful responses!

## 📁 Files Created/Modified

### New Files
```
src/pages/AIChat.tsx                    (400+ lines)
AI_CHAT_FEATURE.md                      (500+ lines)
AI_CHAT_IMPLEMENTATION_SUMMARY.md       (200+ lines)
AI_CHAT_VISUAL_GUIDE.md                 (500+ lines)
AI_CHAT_SETUP.md                        (this file)
```

### Modified Files
```
src/components/Layout.tsx               (Added AI Chat nav item)
src/App.tsx                             (Added /ai-chat route)
src/routes/chatRoutes.js                (Added POST /api/chat/ai endpoint)
```

## 🎯 Feature Verification

### Quick Test Checklist
```bash
✅ Navbar shows "AI Chat" with Sparkles icon
✅ Clicking navigates to /ai-chat
✅ Chat interface loads with suggested prompts
✅ Can click a suggested prompt
✅ Can type and send a message
✅ AI responds (or fallback if no Azure config)
✅ Can copy message
✅ Can clear chat
✅ Messages persist on page reload
✅ Keyboard shortcuts work (Enter/Shift+Enter)
```

## 🌐 API Endpoint Test

### Test with curl (Backend must be running)
```bash
curl -X POST http://localhost:3001/api/chat/ai \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do React hooks work?",
    "conversationHistory": []
  }'
```

### Expected Response (with Azure OpenAI)
```json
{
  "message": "React hooks are functions that let you 'hook into' React state and lifecycle features from function components...",
  "fallback": false
}
```

### Expected Response (without Azure OpenAI)
```json
{
  "message": "I'd love to help you with React! Here are some key concepts:\n\n**React Hooks:**\n- `useState`: Manage component state\n...",
  "fallback": true
}
```

## 🔍 Troubleshooting

### Issue: AI Chat not appearing in navbar
**Solution**: 
1. Check `src/components/Layout.tsx` has the AI Chat nav item
2. Verify `Sparkles` icon is imported from lucide-react
3. Hard refresh browser (Ctrl+Shift+R / Cmd+Shift+R)

### Issue: Route not found (404)
**Solution**:
1. Check `src/App.tsx` has the `/ai-chat` route
2. Verify `AIChat` component is imported
3. Restart dev server

### Issue: API error "Failed to get AI response"
**Solution**:
1. Check backend is running (`npm run server`)
2. Verify endpoint `http://localhost:3001/api/chat/ai` is accessible
3. Check browser console for error details
4. Fallback response should still work

### Issue: Azure OpenAI error
**Solution**:
1. Verify `.env` file has correct values:
   - `AZURE_OPENAI_ENDPOINT` format: `https://your-resource.openai.azure.com`
   - `AZURE_OPENAI_API_KEY` is valid (check Azure portal)
   - `AZURE_OPENAI_DEPLOYMENT` matches your deployment name
2. Test Azure credentials with curl:
```bash
curl -X POST "https://your-resource.openai.azure.com/openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-08-01-preview" \
  -H "Content-Type: application/json" \
  -H "api-key: YOUR_API_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### Issue: Messages not persisting
**Solution**:
1. Check browser's localStorage is enabled
2. Not in incognito/private mode
3. Check browser console for storage quota errors
4. Clear localStorage manually: `localStorage.removeItem('aiChatMessages')`

## 📊 Backend Configuration

### chatRoutes.js Environment Variables
```javascript
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || 'https://your-resource.openai.azure.com';
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY || '';
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';
const AZURE_OPENAI_API_VERSION = '2024-08-01-preview';
```

### Default Behavior
- If environment variables are not set, uses fallback responses
- No crashes or errors
- Graceful degradation

## 🎨 Customization Options

### Change AI Model
In `src/routes/chatRoutes.js`:
```javascript
const AZURE_OPENAI_DEPLOYMENT = 'gpt-4'; // or 'gpt-35-turbo'
```

### Adjust Response Length
In `src/routes/chatRoutes.js`:
```javascript
max_tokens: 2000, // Increase for longer responses (e.g., 4000)
```

### Change Temperature (Creativity)
In `src/routes/chatRoutes.js`:
```javascript
temperature: 0.7, // Lower (0.3) = focused, Higher (0.9) = creative
```

### Modify System Prompt
In `src/routes/chatRoutes.js`:
```javascript
{
  role: 'system',
  content: `Your custom instructions here...`
}
```

### Add More Suggested Prompts
In `src/pages/AIChat.tsx`:
```typescript
const suggestedPrompts = [
  // ... existing prompts
  {
    icon: YourIcon,
    text: "Your prompt text",
    category: "Category"
  }
];
```

### Change Message History Context
In `src/pages/AIChat.tsx`:
```typescript
conversationHistory: messages.slice(-10), // Change -10 to -20 for more context
```

## 💾 Data Storage

### localStorage Structure
```javascript
// Check current messages
localStorage.getItem('aiChatMessages')

// Clear all messages
localStorage.removeItem('aiChatMessages')

// Manually set messages
localStorage.setItem('aiChatMessages', JSON.stringify([
  {
    id: 'user-1',
    role: 'user',
    content: 'Hello',
    timestamp: new Date().toISOString()
  }
]))
```

## 🔒 Security Best Practices

### ✅ Already Implemented
- API key in environment variables (not in code)
- API key never sent to frontend
- Input validation on backend
- Error messages don't expose sensitive info

### 🔐 Additional Recommendations
1. **Rate Limiting**: Add to backend
```javascript
const aiChatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30 // limit each IP to 30 requests per windowMs
});

router.post('/ai', aiChatLimiter, async (req, res) => {
  // ... existing code
});
```

2. **Input Length Validation**: Add to backend
```javascript
if (!message || message.length > 5000) {
  return next(new AppError(400, 'Message must be 1-5000 characters'));
}
```

3. **Rotate API Keys**: Regularly rotate Azure OpenAI keys

## 📈 Performance Monitoring

### Check API Response Time
```javascript
// In chatRoutes.js
const startTime = Date.now();
const response = await fetch(apiUrl, {...});
const endTime = Date.now();
console.log(`Azure OpenAI response time: ${endTime - startTime}ms`);
```

### Monitor Token Usage
Azure OpenAI response includes usage data:
```javascript
const data = await response.json();
console.log('Tokens used:', data.usage);
// { prompt_tokens: 50, completion_tokens: 100, total_tokens: 150 }
```

## 🎓 Next Steps

### Recommended Enhancements
1. **Streaming Responses**: Show AI typing in real-time
2. **Voice Input**: Add speech-to-text
3. **Export Chat**: Download conversation as text/PDF
4. **Analytics**: Track popular questions
5. **Multi-thread**: Support multiple conversations
6. **Code Execution**: Run code snippets in chat
7. **File Uploads**: Attach code files for review

### Learning Resources
- [Azure OpenAI Documentation](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
- [React Hooks Guide](https://react.dev/reference/react)
- [shadcn/ui Components](https://ui.shadcn.com/)

## 📞 Support

### Common Questions

**Q: Do I need Azure OpenAI to use this?**
A: No! The chat works with intelligent fallback responses even without Azure OpenAI.

**Q: Can I use OpenAI instead of Azure OpenAI?**
A: Yes! Modify `chatRoutes.js` to use OpenAI's API endpoint instead.

**Q: How much does Azure OpenAI cost?**
A: See [Azure OpenAI Pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/openai-service/)

**Q: Can I self-host the AI model?**
A: Yes! Replace Azure OpenAI with Ollama, LM Studio, or other local models.

## ✨ You're All Set!

Your AI Chat feature is ready to use. Start chatting and enjoy! 🎉

---

**Need Help?** Check the detailed documentation:
- `AI_CHAT_FEATURE.md` - Complete feature documentation
- `AI_CHAT_IMPLEMENTATION_SUMMARY.md` - Technical summary
- `AI_CHAT_VISUAL_GUIDE.md` - Visual interface guide

**Status**: ✅ Production Ready
**Version**: 1.0.0
**Date**: October 20, 2025
