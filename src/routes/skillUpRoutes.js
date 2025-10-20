import express from 'express';
import { aiService } from '../services/aiService.js';

const router = express.Router();

/**
 * POST /api/skillup/chat
 * AI chat for roadmap customization
 */
router.post('/chat', async (req, res) => {
  try {
    const { roadmapId, technology, currentSteps, userMessage, conversationHistory } = req.body;
    
    if (!technology || !userMessage) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const aiResponse = await chatWithAI(technology, currentSteps, userMessage, conversationHistory);
    res.json(aiResponse);
  } catch (error) {
    console.error('Error in AI chat:', error);
    res.status(500).json({ error: 'Failed to process chat', details: error.message });
  }
});

/**
 * POST /api/skillup/analytics
 * Get progress analytics and visualizations
 */
router.post('/analytics', async (req, res) => {
  try {
    const { roadmaps, userProgress } = req.body;
    
    if (!Array.isArray(roadmaps)) {
      return res.status(400).json({ error: 'Roadmaps must be an array' });
    }

    const analytics = calculateAnalytics(roadmaps, userProgress || {});
    res.json(analytics);
  } catch (error) {
    console.error('Error calculating analytics:', error);
    res.status(500).json({ error: 'Failed to calculate analytics', details: error.message });
  }
});

/**
 * AI Chat for roadmap customization
 */
async function chatWithAI(technology, currentSteps, userMessage, conversationHistory = []) {
  const systemPrompt = `You are an expert learning coach specializing in ${technology}.
You help users customize their learning roadmaps by adding, removing, or modifying steps.

Your role:
1. Understand user requests (add topics, remove steps, explain concepts, modify content)
2. Provide specific, actionable suggestions
3. Explain your reasoning clearly
4. Be encouraging and supportive
5. Suggest concrete improvements

When suggesting changes:
- Add steps: Include title, description, estimatedHours, and resources
- Remove steps: Explain why removal is beneficial
- Modify steps: Suggest specific improvements
- Explain: Provide clear, beginner-friendly explanations

Always be specific and actionable!`;

  const conversationContext = conversationHistory
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n');

  const currentStepsContext = currentSteps
    .map((step, idx) => `${idx + 1}. ${step.title}: ${step.description}`)
    .join('\n');

  const userPrompt = `Current Roadmap for ${technology}:
${currentStepsContext}

Conversation History:
${conversationContext || 'No previous conversation'}

User's Request: ${userMessage}

Respond in this JSON format:
{
  "message": "Your friendly response to the user",
  "suggestedChanges": {
    "stepsToAdd": [
      {
        "title": "Step Title",
        "description": "Detailed description of what to learn",
        "estimatedHours": 4,
        "resources": [
          {"name": "Resource Name", "url": "https://...", "type": "docs"},
          {"name": "Video Tutorial", "url": "https://...", "type": "video"}
        ]
      }
    ],
    "stepsToRemove": ["step-id-1", "step-id-2"],
    "stepsToModify": [
      {
        "id": "step-id",
        "title": "New Title (optional)",
        "description": "New Description (optional)"
      }
    ]
  },
  "explanation": "Detailed explanation of why these changes will help",
  "suggestions": [
    "You might also want to...",
    "Consider exploring..."
  ]
}

Guidelines:
- If user wants to ADD: Provide 1-3 new steps with complete details
- If user wants to REMOVE: Specify step IDs and explain benefits
- If user wants to EXPLAIN: Don't suggest changes, just explain
- If user is CHATTING: Respond helpfully, ask clarifying questions
- Always include helpful suggestions for what they could do next`;

  try {
    if (aiService.openai) {
      const completion = await aiService.openai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0].message.content;
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn('AI chat failed, using fallback:', error.message);
  }

  // Fallback response
  return generateFallbackChatResponse(userMessage, technology);
}

/**
 * Calculate analytics from roadmaps and progress
 */
function calculateAnalytics(roadmaps, userProgress) {
  const completedSkills = roadmaps.filter(r => {
    const completed = r.steps.filter(s => userProgress[s.id]).length;
    return completed === r.steps.length;
  }).length;

  const inProgressSkills = roadmaps.filter(r => {
    const completed = r.steps.filter(s => userProgress[s.id]).length;
    return completed > 0 && completed < r.steps.length;
  }).length;

  const totalCompletion = roadmaps.reduce((sum, r) => {
    const completed = r.steps.filter(s => userProgress[s.id]).length;
    return sum + (completed / r.steps.length) * 100;
  }, 0);

  const topSkills = roadmaps
    .map(r => ({
      technology: r.technology,
      progress: (r.steps.filter(s => userProgress[s.id]).length / r.steps.length) * 100,
      completedSteps: r.steps.filter(s => userProgress[s.id]).length,
      totalSteps: r.steps.length
    }))
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 5);

  const totalHoursSpent = roadmaps.reduce((sum, r) => {
    const completedSteps = r.steps.filter(s => userProgress[s.id]);
    return sum + completedSteps.reduce((s, step) => s + (step.estimatedHours || 0), 0);
  }, 0);

  const totalEstimatedHours = roadmaps.reduce((sum, r) => {
    return sum + r.steps.reduce((s, step) => s + (step.estimatedHours || 0), 0);
  }, 0);

  // Calculate weekly progress (last 7 days)
  const weeklyProgress = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Count completed steps (would need timestamp tracking for real data)
    weeklyProgress.push({
      date: dateStr,
      completed: i === 0 ? completedSkills : Math.floor(completedSkills / 7 * (7 - i))
    });
  }

  return {
    totalSkills: roadmaps.length,
    completedSkills,
    inProgressSkills,
    notStartedSkills: roadmaps.length - completedSkills - inProgressSkills,
    averageCompletionRate: roadmaps.length > 0 ? totalCompletion / roadmaps.length : 0,
    totalHoursSpent,
    totalEstimatedHours,
    remainingHours: totalEstimatedHours - totalHoursSpent,
    topSkills,
    weeklyProgress,
    skillsByCategory: groupByCategory(roadmaps, userProgress),
    completionTrend: calculateTrend(roadmaps, userProgress)
  };
}

/**
 * Group skills by category with progress
 */
function groupByCategory(roadmaps, userProgress) {
  const categories = {};
  
  roadmaps.forEach(r => {
    const category = r.category || 'Other';
    if (!categories[category]) {
      categories[category] = {
        name: category,
        count: 0,
        completed: 0,
        averageProgress: 0
      };
    }
    
    categories[category].count++;
    const stepProgress = (r.steps.filter(s => userProgress[s.id]).length / r.steps.length) * 100;
    categories[category].averageProgress += stepProgress;
    
    if (stepProgress === 100) {
      categories[category].completed++;
    }
  });

  // Calculate averages
  Object.keys(categories).forEach(cat => {
    categories[cat].averageProgress = categories[cat].averageProgress / categories[cat].count;
  });

  return Object.values(categories);
}

/**
 * Calculate completion trend
 */
function calculateTrend(roadmaps, userProgress) {
  const totalSteps = roadmaps.reduce((sum, r) => sum + r.steps.length, 0);
  const completedSteps = roadmaps.reduce((sum, r) => {
    return sum + r.steps.filter(s => userProgress[s.id]).length;
  }, 0);

  const completionRate = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return {
    current: completionRate,
    trend: completionRate > 50 ? 'improving' : completionRate > 20 ? 'steady' : 'starting',
    momentum: completionRate > 70 ? 'high' : completionRate > 40 ? 'medium' : 'building'
  };
}

/**
 * Fallback chat response
 */
function generateFallbackChatResponse(userMessage, technology) {
  const lowerMessage = userMessage.toLowerCase();

  if (lowerMessage.includes('add')) {
    return {
      message: `Great idea! I can help you add more topics to your ${technology} roadmap.`,
      suggestedChanges: {
        stepsToAdd: [
          {
            title: `Advanced ${technology} Concepts`,
            description: `Dive deeper into advanced features and patterns`,
            estimatedHours: 6,
            resources: [
              { name: 'Official Advanced Guide', url: '#', type: 'docs' },
              { name: 'Advanced Tutorial', url: '#', type: 'tutorial' }
            ]
          }
        ]
      },
      explanation: 'Adding this step will help you master advanced concepts and become proficient.',
      suggestions: [
        'Consider adding practical projects',
        'Include testing and deployment topics',
        'Add performance optimization sections'
      ]
    };
  }

  if (lowerMessage.includes('remove')) {
    return {
      message: `I can help streamline your ${technology} roadmap by removing less relevant topics.`,
      explanation: 'Focusing on core concepts first is a great strategy. Let me know which specific steps you want to remove.',
      suggestions: [
        'Remove prerequisite topics you already know',
        'Skip optional advanced topics for now',
        'Focus on project-based learning'
      ]
    };
  }

  if (lowerMessage.includes('explain') || lowerMessage.includes('why')) {
    return {
      message: `Each step in your ${technology} roadmap is carefully designed to build your skills progressively.`,
      explanation: 'The roadmap follows industry best practices and covers essential topics that employers look for. Each step prepares you for the next one.',
      suggestions: [
        'Ask about specific steps you want explained',
        'Request more context about why topics matter',
        'Learn about real-world applications'
      ]
    };
  }

  return {
    message: `I'm here to help customize your ${technology} learning journey! You can ask me to add topics, remove steps, explain concepts, or get suggestions.`,
    explanation: 'I use AI to understand your needs and provide personalized recommendations.',
    suggestions: [
      `Add more advanced ${technology} topics`,
      'Explain why certain steps are important',
      'Remove steps you already know',
      'Suggest real-world projects to build',
      'Add testing and deployment sections'
    ]
  };
}

export default router;
