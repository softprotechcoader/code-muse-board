/**
 * Roadmap Generation Service using Azure OpenAI
 * Generates personalized learning roadmaps based on skill level
 */

export interface RoadmapResource {
  name: string;
  url: string;
  type?: "docs" | "tutorial" | "video" | "github" | "practice" | "article";
}

export interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  resources: RoadmapResource[];
  completed: boolean;
  estimatedHours?: number;
}

export interface TechRoadmap {
  technology: string;
  category: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estimatedTime: string;
  steps: RoadmapStep[];
  learningPath?: "scratch" | "upgrade"; // Optional: tracks if learning from scratch or upgrading
  prerequisites?: string[];
  outcomes?: string[];
}

export type RoadmapType = "scratch" | "upgrade";

class RoadmapService {
  private apiEndpoint: string;

  constructor() {
    // Use the backend API endpoint for roadmap generation
    this.apiEndpoint = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  }

  /**
   * Generate a personalized roadmap using Azure OpenAI
   * @param technology - The technology to learn (e.g., "React", "TypeScript")
   * @param type - "scratch" for beginners, "upgrade" for those with existing knowledge
   * @param category - The category (e.g., "Frontend", "Backend")
   * @param context - Optional context (article content, current knowledge level)
   */
  async generateRoadmap(
    technology: string,
    type: RoadmapType,
    category: string,
    context?: string
  ): Promise<TechRoadmap> {
    try {
      const response = await fetch(`${this.apiEndpoint}/api/roadmap/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          technology,
          type,
          category,
          context,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate roadmap: ${response.statusText}`);
      }

      const roadmap = await response.json();
      return roadmap;
    } catch (error) {
      console.error('Error generating roadmap:', error);
      
      // Fallback to local generation if API fails
      return this.generateLocalRoadmap(technology, type, category, context);
    }
  }

  /**
   * Fallback: Generate a basic roadmap locally without AI
   */
  private generateLocalRoadmap(
    technology: string,
    type: RoadmapType,
    category: string,
    context?: string
  ): TechRoadmap {
    const isScratch = type === "scratch";
    
    const baseSteps: RoadmapStep[] = isScratch ? [
      {
        id: `${technology.toLowerCase().replace(/\s+/g, '-')}-1`,
        title: `Introduction to ${technology}`,
        description: `Learn the basics and core concepts of ${technology}`,
        resources: [
          { name: "Official Documentation", url: this.getOfficialDocs(technology) },
          { name: "Getting Started Guide", url: this.getOfficialDocs(technology) },
        ],
        completed: false,
        estimatedHours: 4,
      },
      {
        id: `${technology.toLowerCase().replace(/\s+/g, '-')}-2`,
        title: "Setup Development Environment",
        description: `Set up your local environment for ${technology} development`,
        resources: [
          { name: "Installation Guide", url: this.getOfficialDocs(technology) },
        ],
        completed: false,
        estimatedHours: 2,
      },
      {
        id: `${technology.toLowerCase().replace(/\s+/g, '-')}-3`,
        title: "Build Your First Project",
        description: `Create a simple project to practice ${technology} fundamentals`,
        resources: [
          { name: "Tutorial", url: this.getOfficialDocs(technology) },
        ],
        completed: false,
        estimatedHours: 8,
      },
      {
        id: `${technology.toLowerCase().replace(/\s+/g, '-')}-4`,
        title: "Explore Advanced Features",
        description: `Dive deeper into advanced concepts and best practices`,
        resources: [
          { name: "Advanced Guide", url: this.getOfficialDocs(technology) },
        ],
        completed: false,
        estimatedHours: 12,
      },
    ] : [
      {
        id: `${technology.toLowerCase().replace(/\s+/g, '-')}-1`,
        title: `What's New in ${technology}`,
        description: `Explore the latest features and updates in ${technology}`,
        resources: [
          { name: "Release Notes", url: this.getOfficialDocs(technology) },
          { name: "Migration Guide", url: this.getOfficialDocs(technology) },
        ],
        completed: false,
        estimatedHours: 3,
      },
      {
        id: `${technology.toLowerCase().replace(/\s+/g, '-')}-2`,
        title: "Upgrade Your Existing Projects",
        description: `Learn how to migrate and upgrade your current ${technology} projects`,
        resources: [
          { name: "Breaking Changes", url: this.getOfficialDocs(technology) },
        ],
        completed: false,
        estimatedHours: 4,
      },
      {
        id: `${technology.toLowerCase().replace(/\s+/g, '-')}-3`,
        title: "New Best Practices",
        description: `Update your knowledge with new patterns and recommendations`,
        resources: [
          { name: "Best Practices", url: this.getOfficialDocs(technology) },
        ],
        completed: false,
        estimatedHours: 3,
      },
    ];

    // Add context article if provided
    if (context) {
      baseSteps.unshift({
        id: `${technology.toLowerCase().replace(/\s+/g, '-')}-0`,
        title: "Read the Article",
        description: context.substring(0, 150) + '...',
        resources: [],
        completed: false,
        estimatedHours: 1,
      });
    }

    return {
      technology,
      category,
      description: isScratch 
        ? `Complete learning path for ${technology} from the ground up`
        : `Stay updated with the latest features and improvements in ${technology}`,
      difficulty: isScratch ? "Beginner" : "Intermediate",
      estimatedTime: isScratch ? "4-6 weeks" : "1-2 weeks",
      steps: baseSteps,
      learningPath: type,
      prerequisites: isScratch ? [] : [`Basic knowledge of ${technology}`],
      outcomes: isScratch 
        ? [`Build projects with ${technology}`, `Understand core concepts`]
        : [`Master new features`, `Upgrade existing projects`],
    };
  }

  /**
   * Get official documentation URL for popular technologies
   */
  private getOfficialDocs(technology: string): string {
    const docsMap: { [key: string]: string } = {
      'react': 'https://react.dev',
      'vue': 'https://vuejs.org',
      'angular': 'https://angular.io',
      'typescript': 'https://www.typescriptlang.org',
      'javascript': 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
      'python': 'https://docs.python.org',
      'node.js': 'https://nodejs.org/docs',
      'next.js': 'https://nextjs.org/docs',
      'docker': 'https://docs.docker.com',
      'kubernetes': 'https://kubernetes.io/docs',
    };

    const key = technology.toLowerCase();
    return docsMap[key] || `https://www.google.com/search?q=${encodeURIComponent(technology + ' documentation')}`;
  }

  /**
   * Download roadmap as Markdown
   */
  downloadAsMarkdown(roadmap: TechRoadmap): void {
    let markdown = `# ${roadmap.technology} Learning Roadmap\n\n`;
    
    if (roadmap.learningPath) {
      markdown += `**Type**: ${roadmap.learningPath === 'scratch' ? 'Learning from Scratch' : 'Upgrade/Update Skills'}\n`;
    }
    
    markdown += `**Category**: ${roadmap.category}\n`;
    markdown += `**Difficulty**: ${roadmap.difficulty}\n`;
    markdown += `**Estimated Time**: ${roadmap.estimatedTime}\n\n`;
    markdown += `## Description\n\n${roadmap.description}\n\n`;
    
    if (roadmap.prerequisites && roadmap.prerequisites.length > 0) {
      markdown += `## Prerequisites\n\n`;
      roadmap.prerequisites.forEach(prereq => {
        markdown += `- ${prereq}\n`;
      });
      markdown += `\n`;
    }

    markdown += `## Learning Steps\n\n`;
    roadmap.steps.forEach((step, index) => {
      markdown += `### ${index + 1}. ${step.title}\n\n`;
      markdown += `${step.description}\n\n`;
      if (step.estimatedHours) {
        markdown += `**Estimated Time**: ${step.estimatedHours} hours\n\n`;
      }
      if (step.resources.length > 0) {
        markdown += `**Resources**:\n`;
        step.resources.forEach(resource => {
          markdown += `- [${resource.name}](${resource.url})\n`;
        });
        markdown += `\n`;
      }
    });

    if (roadmap.outcomes && roadmap.outcomes.length > 0) {
      markdown += `## Learning Outcomes\n\n`;
      roadmap.outcomes.forEach(outcome => {
        markdown += `- ${outcome}\n`;
      });
    }

    // Create download
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${roadmap.technology.replace(/\s+/g, '-')}-roadmap.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Download roadmap as JSON
   */
  downloadAsJSON(roadmap: TechRoadmap): void {
    const json = JSON.stringify(roadmap, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${roadmap.technology.replace(/\s+/g, '-')}-roadmap.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const roadmapService = new RoadmapService();
