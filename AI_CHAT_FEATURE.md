# AI Chat Feature Documentation

## Overview
The AI Chat feature provides a general-purpose conversational AI assistant powered by Azure OpenAI. Users can ask questions about programming, technology, debugging, best practices, and get instant AI-powered responses.

## Features

### 🎯 Core Functionality
- **Real-time AI Conversations**: Chat with Azure OpenAI GPT-4o-mini
- **Conversation History**: Maintains context across messages
- **Message Persistence**: Saves chat history to localStorage
- **Copy Messages**: One-click copy for AI responses
- **Clear Chat**: Remove all messages with confirmation
- **Fallback Responses**: Works even when AI service is unavailable

### 💡 Smart Features
- **Suggested Prompts**: Pre-built questions to get started
- **Markdown Support**: AI responses formatted with code blocks, lists, etc.
- **Typing Indicators**: Visual feedback while AI is thinking
- **Auto-scroll**: Automatically scrolls to latest message
- **Keyboard Shortcuts**: Press Enter to send, Shift+Enter for new line

## User Interface

### Navigation
- **Location**: Navbar → "AI Chat" (after History)
- **Icon**: ✨ Sparkles icon
- **Route**: `/ai-chat`

### Chat Interface Components

#### Header
- AI Assistant title with Azure OpenAI branding
- Online/Offline status badge
- Clear Chat button (when messages exist)

#### Messages Area
- Scrollable message history (500px height)
- User messages (right-aligned, blue background)
- AI messages (left-aligned, muted background with markdown)
- Timestamps for each message
- Copy button for each message

#### Empty State
- Welcome message
- 4 suggested prompts:
  1. "Help me learn React hooks" (Learning)
  2. "Explain async/await in JavaScript" (Concepts)
  3. "Best practices for API design" (Best Practices)
  4. "How to optimize web performance?" (Performance)

#### Input Area
- Multi-line textarea
- Send button with loading state
- Keyboard shortcut hint
- Usage tip

## Technical Implementation

### Frontend Architecture

**File**: `src/pages/AIChat.tsx` (400+ lines)

#### State Management
```typescript
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [inputMessage, setInputMessage] = useState('');
const [isLoading, setIsLoading] = useState(false);
const [copiedId, setCopiedId] = useState<string | null>(null);
```

#### Message Interface
```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
```

#### Key Functions
1. **sendMessage(messageText?)**: Sends user message to AI
2. **clearChat()**: Removes all messages
3. **copyMessage(content, id)**: Copies message to clipboard
4. **handleSuggestedPrompt(prompt)**: Sends pre-built prompt

### Backend API

**File**: `src/routes/chatRoutes.js`

#### Endpoint
```
POST /api/chat/ai
```

**Request Body**:
```json
{
  "message": "How do React hooks work?",
  "conversationHistory": [
    {
      "role": "user",
      "content": "Previous message",
      "timestamp": "2025-10-20T10:00:00Z"
    }
  ]
}
```

**Response**:
```json
{
  "message": "React hooks are functions that let you...",
  "fallback": false
}
```

#### Azure OpenAI Configuration
```javascript
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY;
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';
const AZURE_OPENAI_API_VERSION = '2024-08-01-preview';
```

#### System Prompt
The AI is configured as a helpful programming assistant with expertise in:
- Coding concepts and best practices
- Debugging and problem-solving
- Technology explanations
- Architecture and design patterns
- Learning resources and guidance
- Project planning and optimization

#### AI Parameters
```javascript
{
  temperature: 0.7,        // Balanced creativity
  max_tokens: 2000,        // ~1500 words max
  top_p: 0.95,            // Nucleus sampling
  frequency_penalty: 0,    // No repetition penalty
  presence_penalty: 0      // No topic penalty
}
```

### Fallback System

When Azure OpenAI is unavailable, the system provides intelligent fallback responses based on keyword detection:

#### Supported Fallback Topics
1. **React/Hooks**: Explains useState, useEffect, useContext, useRef
2. **Async/Await**: Promises, async functions, error handling
3. **API Design**: REST conventions, status codes, versioning
4. **Default**: General resources and retry suggestion

### Data Persistence

**Storage**: localStorage
**Key**: `aiChatMessages`
**Format**: JSON array of ChatMessage objects

```typescript
// Save
localStorage.setItem('aiChatMessages', JSON.stringify(messages));

// Load
const savedMessages = localStorage.getItem('aiChatMessages');
const messages = JSON.parse(savedMessages);
```

## UI Components Used

### shadcn/ui Components
- **Card**: Main chat container
- **Button**: Send, Clear, Copy, Suggested prompts
- **Textarea**: Message input
- **Badge**: Online status
- **ScrollArea**: Message list
- **Toast**: Notifications

### Lucide Icons
- `Sparkles`: AI branding
- `MessageSquare`: Chat icon
- `Bot`: AI message avatar
- `User`: User message avatar
- `Send`: Send button
- `Trash2`: Clear chat
- `Copy/Check`: Copy message
- `Loader2`: Loading spinner
- `Lightbulb`: Learning category
- `Code`: Coding category
- `BookOpen`: Documentation category
- `Rocket`: Best practices category

## Environment Variables

Required in `.env` file:

```env
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=your-api-key-here
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
```

**Note**: If not configured, the system will use fallback responses.

## User Workflows

### Starting a New Conversation
1. Click "AI Chat" in navbar
2. See welcome screen with suggested prompts
3. Click a suggested prompt OR type custom message
4. Click "Send" or press Enter
5. Wait for AI response (typing indicator shows)
6. Continue conversation

### Using Suggested Prompts
1. Click any of the 4 pre-built prompts on empty state
2. Message is automatically sent
3. AI responds with detailed explanation

### Copying AI Responses
1. Hover over any message
2. Click copy icon (bottom-right of message)
3. Icon changes to checkmark for 2 seconds
4. Toast notification confirms copy
5. Paste anywhere (Ctrl+V / Cmd+V)

### Clearing Chat History
1. Click "Clear Chat" button (top-right, only visible when messages exist)
2. Confirm in toast notification
3. All messages removed from UI and localStorage

### Multi-line Input
1. Type message in textarea
2. Press Shift+Enter to add new line
3. Press Enter alone to send

## Styling & Theme

### Color Scheme
- **Primary Gradient**: Purple (#8B5CF6) to Blue (#3B82F6)
- **User Messages**: Primary color background
- **AI Messages**: Muted background with border
- **Accents**: Purple for AI branding

### Responsive Design
- Desktop: 2 columns for suggested prompts
- Mobile: 1 column for suggested prompts
- Max width: 6xl (1280px)
- Auto-adjusting message widths (80% max)

### Animations
- Smooth scrolling to new messages
- Fade-in for typing indicator
- Button hover effects
- Copy icon transition

## Error Handling

### Network Errors
- Caught in try/catch
- Fallback response provided
- Toast notification shown
- User can retry

### AI Service Unavailable
- Graceful degradation to fallback responses
- `fallback: true` flag in response
- Intelligent keyword-based responses

### Empty Input
- Send button disabled when input is empty
- Prevents unnecessary API calls

### Rate Limiting
- Backend may implement rate limiting
- Frontend shows appropriate error message

## Accessibility

- **Keyboard Navigation**: Full keyboard support
- **ARIA Labels**: Proper semantic HTML
- **Focus Management**: Logical tab order
- **Screen Reader**: Descriptive button labels
- **Color Contrast**: WCAG AA compliant

## Performance Optimizations

1. **Context Limiting**: Only last 10 messages sent for context
2. **Auto-scroll**: Smooth scrolling with requestAnimationFrame
3. **Debouncing**: Copy confirmation auto-clears after 2s
4. **Lazy Loading**: ReactMarkdown only renders for AI messages
5. **localStorage**: Async save operations

## Future Enhancements

### Potential Features
- [ ] Export chat history
- [ ] Search within conversation
- [ ] Voice input/output
- [ ] Code execution sandbox
- [ ] Share conversation link
- [ ] Multiple conversation threads
- [ ] AI model selection
- [ ] Custom system prompts
- [ ] Conversation templates
- [ ] Analytics dashboard

### Improvements
- [ ] Message editing
- [ ] Regenerate response
- [ ] Token usage tracking
- [ ] Cost estimation
- [ ] Response quality rating
- [ ] Context window management
- [ ] Streaming responses
- [ ] Rich media attachments

## Integration Points

### Related Features
1. **SkillUp AI Chat**: Uses similar AI service for roadmap customization
2. **Tracker AI**: Shares Azure OpenAI configuration
3. **History**: Could track AI chat sessions

### Shared Services
- Azure OpenAI API
- localStorage utilities
- Toast notifications
- Theme/styling system

## Testing

### Manual Test Cases
1. ✅ Send message and receive response
2. ✅ Use suggested prompt
3. ✅ Copy message to clipboard
4. ✅ Clear chat history
5. ✅ Multi-line message input
6. ✅ Keyboard shortcuts (Enter/Shift+Enter)
7. ✅ Auto-scroll behavior
8. ✅ Message persistence across page reloads
9. ✅ Fallback response when AI unavailable
10. ✅ Loading states and animations

### Edge Cases
- Empty conversation start
- Very long messages (>2000 tokens)
- Network timeout
- Invalid API credentials
- Rate limit exceeded
- localStorage quota exceeded

## Troubleshooting

### AI Not Responding
**Issue**: No response from AI
**Solutions**:
1. Check Azure OpenAI credentials in `.env`
2. Verify endpoint URL format
3. Check API key validity
4. Review deployment name
5. Check network connectivity
6. Review browser console for errors

### Messages Not Persisting
**Issue**: Chat history lost on refresh
**Solutions**:
1. Check browser localStorage quota
2. Verify no browser privacy mode
3. Check for localStorage errors in console
4. Clear corrupted data manually

### Slow Responses
**Issue**: AI takes too long to respond
**Solutions**:
1. Check network speed
2. Reduce max_tokens setting
3. Limit conversation history context
4. Monitor Azure OpenAI quota

### Fallback Responses Only
**Issue**: Always getting fallback, never real AI
**Solutions**:
1. Verify Azure OpenAI endpoint configuration
2. Check API key is set correctly
3. Review backend logs for API errors
4. Test Azure OpenAI directly (Postman/curl)

## Code Examples

### Adding a New Suggested Prompt
```typescript
const suggestedPrompts = [
  // Existing prompts...
  {
    icon: YourIcon,
    text: "Your prompt text here",
    category: "Your Category"
  }
];
```

### Customizing AI System Prompt
```javascript
// In chatRoutes.js
{
  role: 'system',
  content: `Your custom system prompt here...`
}
```

### Adjusting AI Temperature
```javascript
// In chatRoutes.js
temperature: 0.7,  // Lower = more focused, Higher = more creative
```

## Security Considerations

### API Key Protection
- Never expose Azure API key in frontend
- Use environment variables
- Rotate keys regularly

### Input Validation
- Sanitize user input
- Limit message length
- Rate limit requests

### Data Privacy
- Messages stored locally only
- No server-side persistence (optional enhancement)
- Clear chat option available

## Documentation Updates

**Created**: October 20, 2025
**Last Updated**: October 20, 2025
**Version**: 1.0.0

## Related Documentation
- `SKILLUP_AI_CHAT.md` - SkillUp AI chat feature
- `README.md` - Project overview
- Azure OpenAI documentation

---

## Quick Reference

**Route**: `/ai-chat`
**API Endpoint**: `POST /api/chat/ai`
**Component**: `src/pages/AIChat.tsx`
**Backend**: `src/routes/chatRoutes.js`
**Storage**: localStorage (`aiChatMessages`)
**Icons**: Lucide React
**UI**: shadcn/ui components
**AI**: Azure OpenAI GPT-4o-mini
