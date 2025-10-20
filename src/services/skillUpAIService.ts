// src/services/skillUpAIService.ts
// AI-powered service for SkillUp customization and chat

import type { TechRoadmap, RoadmapStep } from './roadmapService';

export interface RoadmapCustomizationRequest {
  roadmapId: string;
  technology: string;
  currentSteps: Array<{ id: string; title: string; description: string }>;
  userMessage: string;
  action: 'add' | 'remove' | 'modify' | 'explain' | 'chat';
}

export interface AIResponse {
  message: string;
  suggestedChanges?: {
    stepsToAdd?: Array<{ title: string; description: string; estimatedHours: number }>;
    stepsToRemove?: string[]; // step IDs
    stepsToModify?: Array<{ id: string; title?: string; description?: string }>;
  };
  explanation?: string;
  suggestions?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestions?: string[];
}

export interface SkillProgressAnalytics {
  totalSkills: number;
  completedSkills: number;
  inProgressSkills: number;
  notStartedSkills: number;
  averageCompletionRate: number;
  totalHoursSpent: number;
  totalEstimatedHours: number;
  remainingHours: number;
  topSkills: Array<{ technology: string; progress: number }>;
  weeklyProgress: Array<{ date: string; completed: number }>;
}

class SkillUpAIService {
  private apiUrl = 'http://localhost:3001/api';

  /**
   * Chat with AI about roadmap customization
   */
  async chatWithAI(
    roadmapId: string,
    technology: string,
    currentSteps: RoadmapStep[],
    userMessage: string,
    conversationHistory: ChatMessage[] = []
  ): Promise<AIResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/skillup/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roadmapId,
          technology,
          currentSteps,
          userMessage,
          conversationHistory: conversationHistory.slice(-5), // Last 5 messages for context
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to chat with AI');
      }

      return await response.json();
    } catch (error) {
      console.error('Error chatting with AI:', error);
      return this.generateFallbackResponse(userMessage);
    }
  }

  /**
   * Apply AI-suggested changes to roadmap
   */
  async applyCustomization(
    roadmapId: string,
    changes: AIResponse['suggestedChanges']
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/skillup/apply-customization`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roadmapId, changes }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error applying customization:', error);
      return false;
    }
  }

  /**
   * Get analytics and progress visualization data
   */
  async getProgressAnalytics(roadmaps: TechRoadmap[], userProgress: Record<string, boolean>): Promise<SkillProgressAnalytics> {
    try {
      const response = await fetch(`${this.apiUrl}/skillup/analytics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roadmaps, userProgress }),
      });

      if (!response.ok) {
        throw new Error('Failed to get analytics');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting analytics:', error);
      return this.generateFallbackAnalytics(roadmaps, userProgress);
    }
  }

  /**
   * Generate suggested questions for the user
   */
  generateSuggestedQuestions(technology: string, currentProgress: number): string[] {
    const questions = [
      `Add more advanced topics about ${technology}`,
      `I want to focus more on practical projects`,
      'Can you add testing and deployment sections?',
      'Make this roadmap more beginner-friendly',
      'Add industry best practices and patterns',
      'Include more video resources',
      'Suggest real-world projects to build',
      `What are the latest features in ${technology}?`,
      'How can I prepare for interviews?',
      'Add security and performance optimization topics',
    ];

    // Customize based on progress
    if (currentProgress < 30) {
      return questions.slice(0, 5);
    } else if (currentProgress < 70) {
      return [
        ...questions.slice(2, 5),
        'What should I learn next after this?',
        'Add more complex real-world scenarios',
      ];
    } else {
      return [
        'What advanced topics should I explore?',
        'How can I contribute to open source?',
        'Suggest career paths with this skill',
        'Add certification preparation resources',
      ];
    }
  }

  /**
   * Fallback response when AI is unavailable
   */
  private generateFallbackResponse(userMessage: string): AIResponse {
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('add') || lowerMessage.includes('include')) {
      return {
        message: "I understand you'd like to add new topics. I'll help you expand your learning path!",
        suggestedChanges: {
          stepsToAdd: [
            {
              title: 'Additional Learning Module',
              description: 'Based on your request, explore this related topic',
              estimatedHours: 4,
            },
          ],
        },
        explanation: 'I can help add new steps to your roadmap. Please be specific about what topics you want to include.',
      };
    }

    if (lowerMessage.includes('remove') || lowerMessage.includes('delete')) {
      return {
        message: "I can help remove steps that don't fit your goals. Which specific topics would you like to skip?",
        explanation: 'Removing steps helps focus on what matters most to you.',
      };
    }

    if (lowerMessage.includes('explain') || lowerMessage.includes('why')) {
      return {
        message: 'Each step is designed to build your skills progressively. Let me know which step you want explained!',
        explanation: 'Understanding the reasoning behind each step helps with motivation and focus.',
      };
    }

    return {
      message: "I'm here to help customize your learning path! You can ask me to add topics, remove steps, explain concepts, or suggest improvements.",
      explanation: 'Try asking: "Add more advanced topics" or "Explain why this step is important"',
    };
  }

  /**
   * Fallback analytics when API is unavailable
   */
  private generateFallbackAnalytics(roadmaps: TechRoadmap[], userProgress: Record<string, boolean>): SkillProgressAnalytics {
    const completedSkills = roadmaps.filter(r => {
      const completed = r.steps.filter((s) => userProgress[s.id]).length;
      return completed === r.steps.length;
    }).length;

    const inProgressSkills = roadmaps.filter(r => {
      const completed = r.steps.filter((s) => userProgress[s.id]).length;
      return completed > 0 && completed < r.steps.length;
    }).length;

    const totalCompletion = roadmaps.reduce((sum, r) => {
      const completed = r.steps.filter((s) => userProgress[s.id]).length;
      return sum + (completed / r.steps.length) * 100;
    }, 0);

    const topSkills = roadmaps
      .map(r => ({
        technology: r.technology,
        progress: (r.steps.filter((s) => userProgress[s.id]).length / r.steps.length) * 100,
      }))
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 5);

    const totalHoursSpent = roadmaps.reduce((sum, r) => {
      const completedSteps = r.steps.filter((s) => userProgress[s.id]);
      return sum + completedSteps.reduce((s: number, step) => s + (step.estimatedHours || 0), 0);
    }, 0);

    const totalEstimatedHours = roadmaps.reduce((sum, r) => {
      return sum + r.steps.reduce((s: number, step) => s + (step.estimatedHours || 0), 0);
    }, 0);

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
      weeklyProgress: [], // Would need date tracking
    };
  }

  /**
   * Generate visual progress patterns (for charts)
   */
  generateProgressPattern(progress: number): string {
    // Generate SVG pattern based on progress
    const segments = 10;
    const filledSegments = Math.floor((progress / 100) * segments);
    
    return Array.from({ length: segments }, (_, i) => i < filledSegments ? '█' : '░').join('');
  }

  /**
   * Calculate skill mastery level
   */
  calculateMasteryLevel(progress: number, hoursSpent: number): {
    level: string;
    icon: string;
    color: string;
  } {
    if (progress >= 90 && hoursSpent >= 40) {
      return { level: 'Expert', icon: '🏆', color: 'text-yellow-500' };
    } else if (progress >= 70 && hoursSpent >= 25) {
      return { level: 'Advanced', icon: '⭐', color: 'text-purple-500' };
    } else if (progress >= 40 && hoursSpent >= 15) {
      return { level: 'Intermediate', icon: '🎯', color: 'text-blue-500' };
    } else if (progress > 0) {
      return { level: 'Beginner', icon: '🌱', color: 'text-green-500' };
    }
    return { level: 'Not Started', icon: '○', color: 'text-gray-500' };
  }
}

export const skillUpAIService = new SkillUpAIService();
