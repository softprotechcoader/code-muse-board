// src/routes/chatRoutes.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';
import fetch from 'node-fetch';

const router = express.Router();
const prisma = new PrismaClient();

// Azure OpenAI Configuration
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || 'https://your-resource.openai.azure.com';
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY || '';
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';
const AZURE_OPENAI_API_VERSION = '2024-08-01-preview';

// Get chat messages for a room with pagination
router.get('/:roomId', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { roomId: req.params.roomId },
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' }
      }),
      prisma.chatMessage.count({
        where: { roomId: req.params.roomId }
      })
    ]);

    res.json({
      status: 'success',
      results: messages.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: messages
    });
  } catch (error) {
    next(new AppError(500, 'Error fetching chat messages'));
  }
});

// Store chat message
router.post('/', async (req, res, next) => {
  try {
    const message = await prisma.chatMessage.create({
      data: {
        content: req.body.content,
        username: req.body.username,
        roomId: req.body.roomId
      }
    });

    res.status(201).json({
      status: 'success',
      data: message
    });
  } catch (error) {
    next(new AppError(400, 'Error creating chat message'));
  }
});

// AI Chat endpoint - General purpose Azure OpenAI chat
router.post('/ai', async (req, res, next) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    if (!message) {
      return next(new AppError(400, 'Message is required'));
    }

    // Build conversation context from history
    const messages = [
      {
        role: 'system',
        content: `You are a helpful AI assistant specializing in programming, technology, and software development. 
You provide clear, accurate, and practical advice. You can help with:
- Coding concepts and best practices
- Debugging and problem-solving
- Technology explanations
- Architecture and design patterns
- Learning resources and guidance
- Project planning and optimization

Be conversational, friendly, and thorough in your explanations. Use code examples when helpful.
Format code blocks with proper markdown syntax.`
      },
      // Add conversation history for context (last 10 messages)
      ...conversationHistory.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ];

    // Call Azure OpenAI API
    const apiUrl = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_OPENAI_API_VERSION}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_OPENAI_API_KEY
      },
      body: JSON.stringify({
        messages,
        temperature: 0.7,
        max_tokens: 2000,
        top_p: 0.95,
        frequency_penalty: 0,
        presence_penalty: 0
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Azure OpenAI Error:', errorData);
      
      // Return fallback response if AI service is unavailable
      return res.json({
        message: generateFallbackResponse(message),
        fallback: true
      });
    }

    const data = await response.json();
    const aiMessage = data.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';

    res.json({
      message: aiMessage,
      fallback: false
    });

  } catch (error) {
    console.error('Error in AI chat:', error);
    
    // Return fallback response on error
    res.json({
      message: generateFallbackResponse(req.body.message),
      fallback: true
    });
  }
});

// Generate fallback responses when AI is unavailable
function generateFallbackResponse(userMessage) {
  const lowerMessage = userMessage.toLowerCase();
  
  // Pattern matching for common queries
  if (lowerMessage.includes('react') || lowerMessage.includes('hook')) {
    return `I'd love to help you with React! Here are some key concepts:

**React Hooks:**
- \`useState\`: Manage component state
- \`useEffect\`: Handle side effects
- \`useContext\`: Access context values
- \`useRef\`: Reference DOM elements or mutable values

For detailed explanations, I recommend checking the official React documentation or trying your question again when the AI service is available.`;
  }
  
  if (lowerMessage.includes('async') || lowerMessage.includes('await') || lowerMessage.includes('promise')) {
    return `**Async/Await in JavaScript:**

Async/await is syntactic sugar over Promises, making asynchronous code look synchronous:

\`\`\`javascript
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
  }
}
\`\`\`

Key points:
- \`async\` functions always return a Promise
- \`await\` pauses execution until Promise resolves
- Use try/catch for error handling

The AI service is currently unavailable, but I hope this helps!`;
  }
  
  if (lowerMessage.includes('api') || lowerMessage.includes('rest')) {
    return `**API Design Best Practices:**

1. **Use RESTful conventions**
   - GET for reading
   - POST for creating
   - PUT/PATCH for updating
   - DELETE for removing

2. **Consistent naming**
   - Use plural nouns: \`/api/users\`, \`/api/posts\`
   - Use kebab-case: \`/api/user-profiles\`

3. **Proper status codes**
   - 200: Success
   - 201: Created
   - 400: Bad request
   - 401: Unauthorized
   - 404: Not found
   - 500: Server error

4. **Versioning**: \`/api/v1/users\`

The AI service is temporarily unavailable. Try again later for more detailed guidance!`;
  }
  
  // Default fallback
  return `I apologize, but I'm currently unable to connect to the AI service. 

However, I can still help! Here are some resources:
- **MDN Web Docs**: Comprehensive web development documentation
- **Stack Overflow**: Community-driven Q&A
- **Official Documentation**: Always check the official docs for your framework/library

Please try your question again in a moment when the AI service is back online. Your question: "${userMessage}"`;
}

export default router;