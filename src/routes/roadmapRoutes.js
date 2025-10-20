import express from 'express';
import { aiService } from '../services/aiService.js';

const router = express.Router();

// POST /api/roadmap
// body: { topic: string, profile: { level, weeks, goals } }
router.post('/', async (req, res) => {
  try {
    const { topic, profile } = req.body;
    if (!topic) return res.status(400).json({ error: 'Missing topic' });
    const roadmap = await aiService.generateRoadmap(topic, profile);
    res.json(roadmap);
  } catch (error) {
    console.error('Error generating roadmap:', error);
    res.status(500).json({ error: 'Failed to generate roadmap' });
  }
});

/**
 * POST /api/roadmap/generate
 * Generate a structured, personalized roadmap based on skill level
 * body: { technology: string, type: 'scratch' | 'upgrade', category: string, context?: string }
 */
router.post('/generate', async (req, res) => {
  try {
    const { technology, type, category, context } = req.body;
    
    if (!technology || !type) {
      return res.status(400).json({ error: 'Missing required fields: technology and type' });
    }

    if (type !== 'scratch' && type !== 'upgrade') {
      return res.status(400).json({ error: 'Type must be either "scratch" or "upgrade"' });
    }

    // Generate structured roadmap using AI
    const roadmap = await generateStructuredRoadmap(technology, type, category, context);
    res.json(roadmap);
  } catch (error) {
    console.error('Error generating structured roadmap:', error);
    res.status(500).json({ error: 'Failed to generate roadmap', details: error.message });
  }
});

/**
 * Generate a structured roadmap with AI
 */
async function generateStructuredRoadmap(technology, type, category, context) {
  const isScratch = type === 'scratch';
  const temperature = 0.7;
  
  const systemPrompt = `You are an expert learning coach and software developer with deep knowledge of modern technologies.
Generate a structured, actionable STEP-BY-STEP learning roadmap in JSON format.
Focus on practical, hands-on learning with real resources and clear progression.

🎯 CRITICAL REQUIREMENTS:
1. Each step must build upon the previous one (progressive learning)
2. Provide REAL, WORKING URLs from authoritative sources only
3. Include 3-5 DIVERSE resources per step (different types)
4. Use official documentation, GitHub repos, video tutorials, and practice platforms
5. Make each step actionable with clear learning objectives

📚 RESOURCE TYPES (include mix for each step):
- "docs": Official Documentation (REQUIRED - always include)
- "tutorial": Interactive Tutorials (freeCodeCamp, MDN, official tutorials)
- "video": Video Courses (YouTube official channels, conference talks)
- "github": GitHub Repositories (official repos, awesome lists, example projects)
- "practice": Practice Platforms (CodeSandbox, StackBlitz, CodePen)
- "article": Blog Posts (official blogs, dev.to, Medium from maintainers)

✅ Examples of GOOD resources:
- Official docs: react.dev, vuejs.org, developer.mozilla.org
- Tutorials: freecodecamp.org, official getting started guides
- Videos: Official YouTube channels, conference talks
- GitHub: facebook/react, vuejs/core, awesome lists
- Practice: codesandbox.io, stackblitz.com

❌ DO NOT use generic search URLs or placeholders!`;

  const userPrompt = isScratch
    ? `Create a comprehensive learning roadmap for someone who wants to learn ${technology} from scratch.
Category: ${category}
${context ? `Context: ${context}` : ''}

Generate a JSON roadmap with this structure:
{
  "technology": "${technology}",
  "category": "${category}",
  "description": "Brief description of what they'll learn",
  "difficulty": "Beginner",
  "estimatedTime": "4-8 weeks",
  "learningPath": "scratch",
  "prerequisites": ["List any prerequisites"],
  "outcomes": ["What they'll be able to do after completion"],
  "steps": [
    {
      "id": "unique-id",
      "title": "Step title",
      "description": "What to do in this step",
      "estimatedHours": 4,
      "resources": [
        {"name": "Official Documentation", "url": "https://...", "type": "docs"},
        {"name": "Interactive Tutorial", "url": "https://...", "type": "tutorial"},
        {"name": "Video Course", "url": "https://youtube.com/...", "type": "video"},
        {"name": "GitHub Examples", "url": "https://github.com/...", "type": "github"},
        {"name": "Practice Playground", "url": "https://codesandbox.io/...", "type": "practice"}
      ],
      "completed": false
    }
  ]
}

Create a COMPLETE LEARNING PATH with 6-8 progressive steps:

📌 Step 1: "Getting Started with ${technology}"
- What is ${technology} and why use it?
- Resources: Official docs homepage, intro video (YouTube), getting started tutorial

📌 Step 2: "Environment Setup & First Hello World"
- Install tools, setup IDE, run first program
- Resources: Installation guide, setup video, GitHub starter template

📌 Step 3: "Core Concepts & Fundamentals"
- Learn the fundamental building blocks
- Resources: Core concepts docs, interactive tutorial, video series, practice exercises

📌 Step 4: "Hands-On Practice Project"
- Build a small real-world project
- Resources: Project tutorial, video walkthrough, GitHub examples, practice playground

📌 Step 5: "Intermediate Features & Patterns"
- Dive deeper into advanced concepts
- Resources: Advanced guides, video tutorials, GitHub patterns, practice examples

📌 Step 6: "Real-World Application Development"
- Build production-ready application
- Resources: Full course/guide, video series, GitHub boilerplate, best practices

📌 Step 7: "Testing, Performance & Best Practices"
- Learn professional development practices
- Resources: Testing docs, performance guides, video tutorials, GitHub examples

📌 Step 8: "Community Resources & Next Steps"
- Where to go next, community, staying updated
- Resources: Community links, awesome lists, video channels, GitHub collections

🎯 FOR EACH STEP:
- Provide 3-5 REAL URLs (official docs, GitHub, YouTube, tutorials)
- Use resource types: "docs", "tutorial", "video", "github", "practice"
- Make URLs specific (not just homepage)
- Include official sources first, then community resources

IMPORTANT: Use REAL URLs like:
- https://react.dev/learn/start-a-new-react-project
- https://www.youtube.com/watch?v=Tn6-PIqc4UM (official React doc)
- https://github.com/facebook/react
- https://codesandbox.io/s/react-new
- https://www.freecodecamp.org/learn/front-end-development-libraries/`
    : `Create an upgrade/update roadmap for someone who already knows ${technology} but wants to learn the latest features and improvements.
Category: ${category}
${context ? `Context (recent update/article): ${context}` : ''}

Generate a JSON roadmap with this structure:
{
  "technology": "${technology}",
  "category": "${category}",
  "description": "Brief description of what's new",
  "difficulty": "Intermediate",
  "estimatedTime": "1-2 weeks",
  "learningPath": "upgrade",
  "prerequisites": ["Existing knowledge of ${technology}"],
  "outcomes": ["What they'll master after completion"],
  "steps": [
    {
      "id": "unique-id",
      "title": "Step title",
      "description": "What to learn/update",
      "estimatedHours": 2,
      "resources": [
        {"name": "Release Notes", "url": "https://...", "type": "docs"},
        {"name": "Migration Guide", "url": "https://...", "type": "tutorial"},
        {"name": "What's New Video", "url": "https://youtube.com/...", "type": "video"},
        {"name": "GitHub Changelog", "url": "https://github.com/...", "type": "github"},
        {"name": "Blog Post Analysis", "url": "https://...", "type": "article"}
      ],
      "completed": false
    }
  ]
}

Create a FOCUSED UPGRADE PATH with 4-6 progressive steps:

📌 Step 1: "What's New in Latest ${technology}"
- Overview of new features, breaking changes, improvements
- Resources: Release notes, what's new video, official blog, GitHub changelog

📌 Step 2: "Breaking Changes & Migration Guide"
- Understand what changed and how to migrate
- Resources: Migration guide, video tutorial, GitHub migration examples, upgrade checklist

📌 Step 3: "New Features Deep Dive"
- Learn and practice the major new features
- Resources: Feature documentation, video demos, GitHub examples, interactive tutorials

📌 Step 4: "Updated Best Practices & Patterns"
- Modern approaches and recommended patterns
- Resources: Best practices guide, conference talks, GitHub patterns, blog posts

📌 Step 5: "Hands-On: Upgrade Real Project"
- Apply new features to a real codebase
- Resources: Upgrade tutorial, video walkthrough, GitHub before/after examples

📌 Step 6: "Performance & Advanced Features"
- Optimize with new capabilities
- Resources: Performance guide, advanced docs, video optimization tips, GitHub examples

🎯 FOR EACH STEP:
- Provide 3-5 REAL URLs (official sources preferred)
- Use resource types: "docs", "tutorial", "video", "github", "article"
- Focus on RECENT content (latest version)
- Include migration paths and examples

IMPORTANT: Use REAL URLs like:
- https://react.dev/blog (release announcements)
- https://github.com/facebook/react/releases
- https://www.youtube.com/@reactjs (official channel)
- https://github.com/reactjs/react.dev/tree/main/src/content/blog
- Migration guides from official docs`;

  try {
    // Try Azure OpenAI first
    if (aiService.openai) {
      try {
        const completion = await aiService.openai.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature,
          max_tokens: 3500,
          response_format: { type: "json_object" }
        });

        const content = completion.choices[0].message.content;
        const roadmap = JSON.parse(content);
        
        // Ensure all required fields are present
        return {
          ...roadmap,
          learningPath: type,
          steps: roadmap.steps.map((step, index) => ({
            ...step,
            id: step.id || `${technology.toLowerCase().replace(/\s+/g, '-')}-${index + 1}`,
            completed: false
          }))
        };
      } catch (err) {
        console.warn('Azure OpenAI failed, trying fallback:', err.message);
      }
    }

    // Fallback to basic structure
    return createFallbackRoadmap(technology, type, category, context);
  } catch (error) {
    console.error('AI roadmap generation error:', error);
    return createFallbackRoadmap(technology, type, category, context);
  }
}

/**
 * Create a fallback roadmap when AI is unavailable
 */
function createFallbackRoadmap(technology, type, category, context) {
  const isScratch = type === 'scratch';
  const resources = getTechnologyResources(technology);
  
  const steps = isScratch ? [
    {
      id: `${technology.toLowerCase().replace(/\s+/g, '-')}-1`,
      title: `Introduction to ${technology}`,
      description: `Learn the core concepts and fundamentals of ${technology}`,
      estimatedHours: 4,
      resources: [
        { name: "Official Documentation", url: resources.docs, type: "docs" },
        { name: "Interactive Tutorial", url: resources.tutorial, type: "tutorial" },
        { name: "Video Introduction", url: resources.video, type: "video" },
      ],
      completed: false
    },
    {
      id: `${technology.toLowerCase().replace(/\s+/g, '-')}-2`,
      title: "Setup Development Environment",
      description: `Configure your development environment for ${technology}`,
      estimatedHours: 2,
      resources: [
        { name: "Installation Guide", url: resources.docs, type: "docs" },
        { name: "Setup Video Tutorial", url: resources.video, type: "video" },
        { name: "GitHub Repository", url: resources.github, type: "github" },
      ],
      completed: false
    },
    {
      id: `${technology.toLowerCase().replace(/\s+/g, '-')}-3`,
      title: "Build Your First Project",
      description: `Create a hands-on project to practice ${technology}`,
      estimatedHours: 8,
      resources: [
        { name: "Getting Started Tutorial", url: resources.tutorial, type: "tutorial" },
        { name: "Project Video Walkthrough", url: resources.video, type: "video" },
        { name: "Practice Playground", url: resources.practice, type: "practice" },
        { name: "Example Projects", url: resources.github, type: "github" },
      ],
      completed: false
    },
    {
      id: `${technology.toLowerCase().replace(/\s+/g, '-')}-4`,
      title: "Master Advanced Features",
      description: "Explore advanced concepts and best practices",
      estimatedHours: 12,
      resources: [
        { name: "Advanced Guide", url: resources.docs, type: "docs" },
        { name: "Advanced Video Series", url: resources.video, type: "video" },
        { name: "Best Practices", url: resources.github, type: "github" },
      ],
      completed: false
    }
  ] : [
    {
      id: `${technology.toLowerCase().replace(/\s+/g, '-')}-1`,
      title: `What's New in ${technology}`,
      description: "Discover the latest features and improvements",
      estimatedHours: 3,
      resources: [
        { name: "Release Notes", url: resources.docs, type: "docs" },
        { name: "What's New Video", url: resources.video, type: "video" },
        { name: "GitHub Changelog", url: resources.github, type: "github" },
      ],
      completed: false
    },
    {
      id: `${technology.toLowerCase().replace(/\s+/g, '-')}-2`,
      title: "Upgrade Your Projects",
      description: "Learn how to migrate and upgrade existing projects",
      estimatedHours: 4,
      resources: [
        { name: "Migration Guide", url: resources.docs, type: "docs" },
        { name: "Migration Video Tutorial", url: resources.video, type: "video" },
        { name: "Example Migrations", url: resources.github, type: "github" },
      ],
      completed: false
    },
    {
      id: `${technology.toLowerCase().replace(/\s+/g, '-')}-3`,
      title: "New Best Practices",
      description: "Update your knowledge with modern patterns",
      estimatedHours: 3,
      resources: [
        { name: "Best Practices", url: resources.docs, type: "docs" },
        { name: "Community Patterns", url: resources.github, type: "github" },
        { name: "Tutorial on Modern Patterns", url: resources.tutorial, type: "tutorial" },
      ],
      completed: false
    }
  ];

  return {
    technology,
    category,
    description: isScratch 
      ? `Complete learning path for ${technology} from the ground up`
      : `Stay current with the latest ${technology} features and improvements`,
    difficulty: isScratch ? "Beginner" : "Intermediate",
    estimatedTime: isScratch ? "4-8 weeks" : "1-2 weeks",
    learningPath: type,
    prerequisites: isScratch ? [] : [`Basic knowledge of ${technology}`],
    outcomes: isScratch 
      ? [`Build real projects with ${technology}`, `Understand core concepts and patterns`]
      : [`Master new features`, `Successfully upgrade existing projects`],
    steps
  };
}

/**
 * Get comprehensive resource URLs for common technologies
 */
function getTechnologyResources(technology) {
  const key = technology.toLowerCase().replace(/\s+/g, '');
  
  const resourceMap = {
    'react': {
      docs: 'https://react.dev',
      tutorial: 'https://react.dev/learn',
      video: 'https://www.youtube.com/watch?v=Tn6-PIqc4UM',
      github: 'https://github.com/facebook/react',
      practice: 'https://codesandbox.io/s/react-new'
    },
    'vue': {
      docs: 'https://vuejs.org',
      tutorial: 'https://vuejs.org/tutorial/',
      video: 'https://www.youtube.com/watch?v=nhBVL41-_Cw',
      github: 'https://github.com/vuejs/core',
      practice: 'https://play.vuejs.org/'
    },
    'angular': {
      docs: 'https://angular.io',
      tutorial: 'https://angular.io/tutorial',
      video: 'https://www.youtube.com/watch?v=3qBXWUpoPHo',
      github: 'https://github.com/angular/angular',
      practice: 'https://stackblitz.com/angular/new'
    },
    'typescript': {
      docs: 'https://www.typescriptlang.org',
      tutorial: 'https://www.typescriptlang.org/docs/handbook/intro.html',
      video: 'https://www.youtube.com/watch?v=BwuLxPH8IDs',
      github: 'https://github.com/microsoft/TypeScript',
      practice: 'https://www.typescriptlang.org/play'
    },
    'javascript': {
      docs: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
      tutorial: 'https://javascript.info/',
      video: 'https://www.youtube.com/watch?v=W6NZfCO5SIk',
      github: 'https://github.com/tc39',
      practice: 'https://jsfiddle.net/'
    },
    'python': {
      docs: 'https://docs.python.org',
      tutorial: 'https://docs.python.org/3/tutorial/',
      video: 'https://www.youtube.com/watch?v=_uQrJ0TkZlc',
      github: 'https://github.com/python/cpython',
      practice: 'https://www.programiz.com/python-programming/online-compiler/'
    },
    'node.js': {
      docs: 'https://nodejs.org/docs',
      tutorial: 'https://nodejs.dev/learn',
      video: 'https://www.youtube.com/watch?v=TlB_eWDSMt4',
      github: 'https://github.com/nodejs/node',
      practice: 'https://replit.com/languages/nodejs'
    },
    'next.js': {
      docs: 'https://nextjs.org/docs',
      tutorial: 'https://nextjs.org/learn',
      video: 'https://www.youtube.com/watch?v=mTz0GXj8NN0',
      github: 'https://github.com/vercel/next.js',
      practice: 'https://codesandbox.io/s/nextjs'
    },
    'docker': {
      docs: 'https://docs.docker.com',
      tutorial: 'https://docs.docker.com/get-started/',
      video: 'https://www.youtube.com/watch?v=fqMOX6JJhGo',
      github: 'https://github.com/docker',
      practice: 'https://labs.play-with-docker.com/'
    },
    'kubernetes': {
      docs: 'https://kubernetes.io/docs',
      tutorial: 'https://kubernetes.io/docs/tutorials/',
      video: 'https://www.youtube.com/watch?v=X48VuDVv0do',
      github: 'https://github.com/kubernetes/kubernetes',
      practice: 'https://labs.play-with-k8s.com/'
    }
  };

  return resourceMap[key] || {
    docs: `https://www.google.com/search?q=${encodeURIComponent(technology + ' documentation')}`,
    tutorial: `https://www.google.com/search?q=${encodeURIComponent(technology + ' tutorial')}`,
    video: `https://www.youtube.com/results?search_query=${encodeURIComponent(technology + ' tutorial')}`,
    github: `https://github.com/search?q=${encodeURIComponent(technology)}`,
    practice: `https://www.google.com/search?q=${encodeURIComponent(technology + ' online playground')}`
  };
}

/**
 * Get official documentation URL for common technologies
 */
function getOfficialDocs(technology) {
  const resources = getTechnologyResources(technology);
  return resources.docs;
}

export default router;
