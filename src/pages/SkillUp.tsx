import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, BookOpen, ExternalLink, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  resources: { name: string; url: string }[];
  completed: boolean;
}

interface TechRoadmap {
  technology: string;
  category: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estimatedTime: string;
  steps: RoadmapStep[];
}

const roadmaps: TechRoadmap[] = [
  {
    technology: "React 19",
    category: "Framework",
    description: "Master the latest React features including Server Components, Actions, and improved hooks.",
    difficulty: "Intermediate",
    estimatedTime: "4-6 weeks",
    steps: [
      {
        id: "react-1",
        title: "Understanding React Server Components",
        description: "Learn how Server Components work and when to use them.",
        resources: [
          { name: "Official Docs", url: "https://react.dev/reference/rsc/server-components" },
          { name: "Tutorial", url: "https://react.dev/learn" },
        ],
        completed: false,
      },
      {
        id: "react-2",
        title: "React Actions and Forms",
        description: "Master the new Actions API for handling form submissions.",
        resources: [
          { name: "Actions Guide", url: "https://react.dev/reference/react-dom/components/form" },
        ],
        completed: false,
      },
      {
        id: "react-3",
        title: "New Hooks and APIs",
        description: "Explore use(), useOptimistic(), and useFormStatus().",
        resources: [
          { name: "Hooks Reference", url: "https://react.dev/reference/react" },
        ],
        completed: false,
      },
      {
        id: "react-4",
        title: "Build a Full Project",
        description: "Create a complete application using React 19 features.",
        resources: [
          { name: "Project Ideas", url: "https://react.dev/learn/thinking-in-react" },
        ],
        completed: false,
      },
    ],
  },
  {
    technology: "TypeScript 5.8",
    category: "Language",
    description: "Deep dive into advanced TypeScript features and type system improvements.",
    difficulty: "Advanced",
    estimatedTime: "6-8 weeks",
    steps: [
      {
        id: "ts-1",
        title: "Advanced Type System",
        description: "Master conditional types, mapped types, and template literal types.",
        resources: [
          { name: "Handbook", url: "https://www.typescriptlang.org/docs/handbook/intro.html" },
        ],
        completed: false,
      },
      {
        id: "ts-2",
        title: "New 5.8 Features",
        description: "Explore the latest features introduced in TypeScript 5.8.",
        resources: [
          { name: "Release Notes", url: "https://www.typescriptlang.org/docs/handbook/release-notes/overview.html" },
        ],
        completed: false,
      },
      {
        id: "ts-3",
        title: "Type-Safe Patterns",
        description: "Learn design patterns and best practices for type safety.",
        resources: [
          { name: "Best Practices", url: "https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html" },
        ],
        completed: false,
      },
    ],
  },
  {
    technology: "GPT-5 & AI",
    category: "AI/ML",
    description: "Learn to integrate and build applications with advanced AI models.",
    difficulty: "Intermediate",
    estimatedTime: "5-7 weeks",
    steps: [
      {
        id: "ai-1",
        title: "AI Fundamentals",
        description: "Understand LLMs, tokens, and prompt engineering basics.",
        resources: [
          { name: "OpenAI Docs", url: "https://platform.openai.com/docs" },
        ],
        completed: false,
      },
      {
        id: "ai-2",
        title: "API Integration",
        description: "Learn to integrate OpenAI APIs in your applications.",
        resources: [
          { name: "API Reference", url: "https://platform.openai.com/docs/api-reference" },
        ],
        completed: false,
      },
      {
        id: "ai-3",
        title: "Advanced Prompting",
        description: "Master prompt engineering and fine-tuning techniques.",
        resources: [
          { name: "Prompt Guide", url: "https://platform.openai.com/docs/guides/prompt-engineering" },
        ],
        completed: false,
      },
      {
        id: "ai-4",
        title: "Build AI Apps",
        description: "Create practical AI-powered applications.",
        resources: [
          { name: "Examples", url: "https://platform.openai.com/examples" },
        ],
        completed: false,
      },
    ],
  },
  {
    technology: "PostgreSQL 17",
    category: "Database",
    description: "Master modern database design and PostgreSQL advanced features.",
    difficulty: "Intermediate",
    estimatedTime: "4-6 weeks",
    steps: [
      {
        id: "pg-1",
        title: "Database Fundamentals",
        description: "Learn SQL basics, normalization, and database design.",
        resources: [
          { name: "Official Docs", url: "https://www.postgresql.org/docs/" },
        ],
        completed: false,
      },
      {
        id: "pg-2",
        title: "Advanced Queries",
        description: "Master JOINs, subqueries, CTEs, and window functions.",
        resources: [
          { name: "Tutorial", url: "https://www.postgresql.org/docs/current/tutorial.html" },
        ],
        completed: false,
      },
      {
        id: "pg-3",
        title: "Performance & Indexing",
        description: "Optimize queries and understand indexing strategies.",
        resources: [
          { name: "Performance Tips", url: "https://www.postgresql.org/docs/current/performance-tips.html" },
        ],
        completed: false,
      },
      {
        id: "pg-4",
        title: "PostgreSQL 17 Features",
        description: "Explore new JSON features and improvements in version 17.",
        resources: [
          { name: "Release Notes", url: "https://www.postgresql.org/docs/17/release.html" },
        ],
        completed: false,
      },
    ],
  },
  {
    technology: "Docker & DevOps",
    category: "DevOps",
    description: "Learn containerization and modern DevOps practices.",
    difficulty: "Beginner",
    estimatedTime: "3-5 weeks",
    steps: [
      {
        id: "docker-1",
        title: "Docker Basics",
        description: "Understand containers, images, and Docker fundamentals.",
        resources: [
          { name: "Get Started", url: "https://docs.docker.com/get-started/" },
        ],
        completed: false,
      },
      {
        id: "docker-2",
        title: "Docker Compose",
        description: "Learn to orchestrate multi-container applications.",
        resources: [
          { name: "Compose Docs", url: "https://docs.docker.com/compose/" },
        ],
        completed: false,
      },
      {
        id: "docker-3",
        title: "CI/CD Integration",
        description: "Integrate Docker in your deployment pipeline.",
        resources: [
          { name: "CI/CD Guide", url: "https://docs.docker.com/build/ci/" },
        ],
        completed: false,
      },
    ],
  },
];

const SkillUp = () => {
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [aiRoadmap, setAiRoadmap] = useState<string | null>(null);
  const [userProgress, setUserProgress] = useState<{ [key: string]: boolean }>(() => {
    const saved = localStorage.getItem("skillUpProgress");
    return saved ? JSON.parse(saved) : {};
  });
  const { toast } = useToast();

  const selectedRoadmap = roadmaps.find((r) => r.technology === selectedTech);

  const toggleStepCompletion = (stepId: string) => {
    const newProgress = { ...userProgress, [stepId]: !userProgress[stepId] };
    setUserProgress(newProgress);
    localStorage.setItem("skillUpProgress", JSON.stringify(newProgress));
    
    toast({
      title: userProgress[stepId] ? "Step marked incomplete" : "Step completed!",
      description: userProgress[stepId] ? "Keep going!" : "Great progress! 🎉",
    });
  };

  const calculateProgress = (roadmap: TechRoadmap) => {
    const completedSteps = roadmap.steps.filter((step) => userProgress[step.id]).length;
    return (completedSteps / roadmap.steps.length) * 100;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "Intermediate":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "Advanced":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-primary/10 text-primary border-primary/20";
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Skill Up</h2>
        <p className="text-muted-foreground">
          Choose a technology and follow a structured roadmap to master it
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {roadmaps.map((roadmap) => {
          const progress = calculateProgress(roadmap);
          return (
            <Card
              key={roadmap.technology}
              className={`cursor-pointer transition-all hover:shadow-lg hover:shadow-primary/10 ${
                selectedTech === roadmap.technology ? "border-primary ring-2 ring-primary/20" : "border-border"
              }`}
              onClick={() => setSelectedTech(roadmap.technology)}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="secondary">{roadmap.category}</Badge>
                  <Badge className={getDifficultyColor(roadmap.difficulty)} variant="outline">
                    {roadmap.difficulty}
                  </Badge>
                </div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  {roadmap.technology}
                </CardTitle>
                <CardDescription>{roadmap.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  <span>{roadmap.estimatedTime}</span>
                </div>
              </CardContent>
              {aiRoadmap && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>AI Generated Roadmap</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap text-sm">{aiRoadmap}</pre>
                  </CardContent>
                </Card>
              )}
            </Card>
          );
        })}
      </div>

      {selectedRoadmap && (
        <Card className="border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">
                  {selectedRoadmap.technology} Roadmap
                </CardTitle>
                <CardDescription className="mt-2">
                  {selectedRoadmap.description}
                </CardDescription>
              </div>
              <Badge className={getDifficultyColor(selectedRoadmap.difficulty)} variant="outline">
                {selectedRoadmap.difficulty}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 mb-2">
              <Button
                onClick={async () => {
                  try {
                    setAiRoadmap(null);
                    const res = await fetch('/api/roadmap', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ topic: selectedRoadmap.technology, profile: { level: selectedRoadmap.difficulty, weeks: 6 } })
                    });
                    const data = await res.json();
                    setAiRoadmap(data.content || JSON.stringify(data));
                  } catch (err) {
                    setAiRoadmap('Failed to generate AI roadmap');
                  }
                }}
              >
                Generate with AI
              </Button>
              {aiRoadmap && <Badge variant="secondary">AI Roadmap Ready</Badge>}
            </div>
            {selectedRoadmap.steps.map((step, index) => {
              const isCompleted = userProgress[step.id];
              return (
                <Card
                  key={step.id}
                  className={`transition-all ${
                    isCompleted ? "bg-primary/5 border-primary/20" : "bg-card border-border"
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-1 h-8 w-8 p-0"
                        onClick={() => toggleStepCompletion(step.id)}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-6 w-6 text-primary" />
                        ) : (
                          <Circle className="h-6 w-6 text-muted-foreground" />
                        )}
                      </Button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Step {index + 1}
                          </Badge>
                          <CardTitle className="text-lg">{step.title}</CardTitle>
                        </div>
                        <CardDescription className="mt-2">
                          {step.description}
                        </CardDescription>
                        <div className="flex flex-wrap gap-2 mt-4">
                          {step.resources.map((resource, idx) => (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              asChild
                            >
                              <a
                                href={resource.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="mr-1 h-3 w-3" />
                                {resource.name}
                              </a>
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SkillUp;
