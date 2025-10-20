/**
 * AI Service for Tracker & Roadmap Integration
 * Provides intelligent analysis, insights, and roadmap generation based on tracked learning
 */

export interface TrackedItem {
  id: string;
  title: string;
  description: string;
  link: string;
  status: "started" | "inProgress" | "completed";
  addedAt: string;
  comments: Array<{ text: string; date: string }>;
  docs?: string;
  github?: string;
  category?: string;
  tags?: string[];
  aiInsights?: AIInsights;
}

export interface AIInsights {
  keyTechnologies: string[];
  difficultyLevel: "Beginner" | "Intermediate" | "Advanced";
  estimatedReadTime: number;
  relatedTopics: string[];
  suggestedRoadmaps: Array<{
    technology: string;
    type: "scratch" | "upgrade";
    reason: string;
  }>;
  keyTakeaways: string[];
  practiceIdeas: string[];
}

export interface LearningAnalysis {
  totalItemsTracked: number;
  completedItems: number;
  inProgressItems: number;
  topTechnologies: Array<{ name: string; count: number }>;
  learningStreak: number;
  suggestedNextSteps: string[];
  skillGaps: string[];
  recommendedRoadmaps: Array<{
    technology: string;
    type: "scratch" | "upgrade";
    priority: "high" | "medium" | "low";
    reason: string;
  }>;
}

class TrackerAIService {
  private apiUrl = "http://localhost:3001/api";

  /**
   * Analyze a tracked item using AI to extract insights
   */
  async analyzeTrackedItem(item: TrackedItem): Promise<AIInsights> {
    try {
      const response = await fetch(`${this.apiUrl}/tracker/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          description: item.description,
          link: item.link,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze item");
      }

      const insights = await response.json();
      return insights;
    } catch (error) {
      console.error("Error analyzing tracked item:", error);
      // Return fallback insights
      return this.generateFallbackInsights(item);
    }
  }

  /**
   * Analyze user's overall learning progress and provide recommendations
   */
  async analyzeLearningProgress(items: TrackedItem[]): Promise<LearningAnalysis> {
    try {
      const response = await fetch(`${this.apiUrl}/tracker/analyze-progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze progress");
      }

      const analysis = await response.json();
      return analysis;
    } catch (error) {
      console.error("Error analyzing learning progress:", error);
      return this.generateFallbackAnalysis(items);
    }
  }

  /**
   * Generate a personalized roadmap based on tracked items
   */
  async generateRoadmapFromTrackedItem(item: TrackedItem, type: "scratch" | "upgrade"): Promise<unknown> {
    try {
      const response = await fetch(`${this.apiUrl}/tracker/generate-roadmap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item,
          type,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate roadmap");
      }

      const roadmap = await response.json();
      return roadmap;
    } catch (error) {
      console.error("Error generating roadmap from tracked item:", error);
      throw error;
    }
  }

  /**
   * Batch analyze multiple items for patterns and insights
   */
  async batchAnalyzeItems(items: TrackedItem[]): Promise<Map<string, AIInsights>> {
    const insights = new Map<string, AIInsights>();
    
    // Analyze items in parallel (limit to 5 concurrent requests)
    const chunks = this.chunkArray(items, 5);
    
    for (const chunk of chunks) {
      const promises = chunk.map(item => this.analyzeTrackedItem(item));
      const results = await Promise.all(promises);
      
      chunk.forEach((item, index) => {
        insights.set(item.id, results[index]);
      });
    }
    
    return insights;
  }

  /**
   * Extract technologies mentioned in text
   */
  extractTechnologies(text: string): string[] {
    const techKeywords = [
      "React", "Vue", "Angular", "JavaScript", "TypeScript", "Python", "Java",
      "Node.js", "Express", "Next.js", "Nuxt", "Django", "Flask", "FastAPI",
      "Docker", "Kubernetes", "AWS", "Azure", "GCP", "MongoDB", "PostgreSQL",
      "MySQL", "Redis", "GraphQL", "REST", "API", "CSS", "Tailwind", "SASS",
      "Git", "GitHub", "CI/CD", "Testing", "Jest", "Cypress", "Webpack", "Vite",
      "AI", "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "GPT",
      "Web3", "Blockchain", "Solidity", "Rust", "Go", "C++", "C#", ".NET"
    ];

    const found = new Set<string>();
    const lowerText = text.toLowerCase();

    techKeywords.forEach(tech => {
      if (lowerText.includes(tech.toLowerCase())) {
        found.add(tech);
      }
    });

    return Array.from(found);
  }

  /**
   * Generate fallback insights when AI is unavailable
   */
  private generateFallbackInsights(item: TrackedItem): AIInsights {
    const technologies = this.extractTechnologies(item.title + " " + item.description);
    
    return {
      keyTechnologies: technologies.slice(0, 5),
      difficultyLevel: this.estimateDifficulty(item),
      estimatedReadTime: this.estimateReadTime(item.description),
      relatedTopics: technologies.slice(0, 3),
      suggestedRoadmaps: technologies.slice(0, 2).map(tech => ({
        technology: tech,
        type: "upgrade" as const,
        reason: `Learn more about ${tech} based on this article`,
      })),
      keyTakeaways: [
        "Read and understand the main concepts",
        "Take notes on important details",
        "Practice any code examples mentioned",
      ],
      practiceIdeas: [
        "Try implementing examples from the article",
        "Create a small project using these concepts",
        "Share your learnings with the community",
      ],
    };
  }

  /**
   * Generate fallback learning analysis
   */
  private generateFallbackAnalysis(items: TrackedItem[]): LearningAnalysis {
    const completed = items.filter(item => item.status === "completed");
    const inProgress = items.filter(item => item.status === "inProgress");
    
    // Extract all technologies
    const techCounts = new Map<string, number>();
    items.forEach(item => {
      const techs = this.extractTechnologies(item.title + " " + item.description);
      techs.forEach(tech => {
        techCounts.set(tech, (techCounts.get(tech) || 0) + 1);
      });
    });

    const topTechnologies = Array.from(techCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalItemsTracked: items.length,
      completedItems: completed.length,
      inProgressItems: inProgress.length,
      topTechnologies,
      learningStreak: this.calculateStreak(items),
      suggestedNextSteps: [
        "Complete your in-progress items",
        "Review completed items for better retention",
        "Create a roadmap for your top technologies",
      ],
      skillGaps: topTechnologies.slice(0, 3).map(tech => tech.name),
      recommendedRoadmaps: topTechnologies.slice(0, 3).map(tech => ({
        technology: tech.name,
        type: "upgrade" as const,
        priority: tech.count > 2 ? "high" : "medium",
        reason: `You've tracked ${tech.count} articles about ${tech.name}`,
      })),
    };
  }

  /**
   * Estimate difficulty based on content
   */
  private estimateDifficulty(item: TrackedItem): "Beginner" | "Intermediate" | "Advanced" {
    const text = (item.title + " " + item.description).toLowerCase();
    
    const advancedKeywords = ["advanced", "deep dive", "architecture", "optimization", "performance", "scalability"];
    const beginnerKeywords = ["introduction", "getting started", "basics", "tutorial", "beginner", "learn"];
    
    const hasAdvanced = advancedKeywords.some(keyword => text.includes(keyword));
    const hasBeginner = beginnerKeywords.some(keyword => text.includes(keyword));
    
    if (hasAdvanced) return "Advanced";
    if (hasBeginner) return "Beginner";
    return "Intermediate";
  }

  /**
   * Estimate read time based on word count
   */
  private estimateReadTime(description: string): number {
    const words = description.split(/\s+/).length;
    // Average reading speed: 200-250 words per minute
    return Math.ceil(words / 225);
  }

  /**
   * Calculate learning streak (consecutive days with activity)
   */
  private calculateStreak(items: TrackedItem[]): number {
    if (items.length === 0) return 0;

    const dates = items
      .map(item => new Date(item.addedAt).toDateString())
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    let streak = 1;
    let currentDate = new Date(dates[0]);

    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i]);
      const diffDays = Math.floor((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        streak++;
        currentDate = prevDate;
      } else if (diffDays > 1) {
        break;
      }
    }

    return streak;
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

export const trackerAIService = new TrackerAIService();
