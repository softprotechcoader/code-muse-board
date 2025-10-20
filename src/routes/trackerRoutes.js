import express from 'express';
import { aiService } from '../services/aiService.js';

const router = express.Router();

/**
 * POST /api/tracker/analyze
 * Analyze a tracked item to extract insights, technologies, and suggestions
 */
router.post('/analyze', async (req, res) => {
  try {
    const { title, description, link } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ error: 'Missing required fields: title and description' });
    }

    const insights = await analyzeTrackedItem(title, description, link);
    res.json(insights);
  } catch (error) {
    console.error('Error analyzing tracked item:', error);
    res.status(500).json({ error: 'Failed to analyze item', details: error.message });
  }
});

/**
 * POST /api/tracker/analyze-progress
 * Analyze user's overall learning progress and provide personalized recommendations
 */
router.post('/analyze-progress', async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items must be an array' });
    }

    const analysis = await analyzeLearningProgress(items);
    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing learning progress:', error);
    res.status(500).json({ error: 'Failed to analyze progress', details: error.message });
  }
});

/**
 * POST /api/tracker/generate-roadmap
 * Generate a personalized roadmap based on a tracked item
 */
router.post('/generate-roadmap', async (req, res) => {
  try {
    const { item, type } = req.body;
    
    if (!item || !type) {
      return res.status(400).json({ error: 'Missing required fields: item and type' });
    }

    const roadmap = await generateRoadmapFromTrackedItem(item, type);
    res.json(roadmap);
  } catch (error) {
    console.error('Error generating roadmap from tracked item:', error);
    res.status(500).json({ error: 'Failed to generate roadmap', details: error.message });
  }
});

/**
 * POST /api/tracker/batch-analyze
 * Batch analyze multiple tracked items for insights
 */
router.post('/batch-analyze', async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items must be a non-empty array' });
    }

    // Limit batch size to prevent overload
    if (items.length > 10) {
      return res.status(400).json({ error: 'Batch size limited to 10 items' });
    }

    const insights = await batchAnalyzeItems(items);
    res.json(insights);
  } catch (error) {
    console.error('Error batch analyzing items:', error);
    res.status(500).json({ error: 'Failed to batch analyze items', details: error.message });
  }
});

/**
 * Analyze a single tracked item using AI
 */
async function analyzeTrackedItem(title, description, link) {
  const systemPrompt = `You are an expert learning analyst and technology educator.
Analyze the provided article/content and extract actionable insights for learners.

Provide a comprehensive analysis in JSON format including:
- Key technologies mentioned
- Difficulty level assessment
- Related topics worth exploring
- Practical takeaways
- Suggested learning paths`;

  const userPrompt = `Analyze this article for a learner:

Title: ${title}
Description: ${description}
${link ? `Link: ${link}` : ''}

Provide analysis in this JSON structure:
{
  "keyTechnologies": ["Technology1", "Technology2", ...],
  "difficultyLevel": "Beginner" | "Intermediate" | "Advanced",
  "estimatedReadTime": 5,
  "relatedTopics": ["Topic1", "Topic2", ...],
  "suggestedRoadmaps": [
    {
      "technology": "React",
      "type": "scratch" | "upgrade",
      "reason": "Why this roadmap would be beneficial"
    }
  ],
  "keyTakeaways": [
    "Main point 1",
    "Main point 2",
    "Main point 3"
  ],
  "practiceIdeas": [
    "Hands-on exercise 1",
    "Project idea 1",
    "Practice suggestion 1"
  ]
}

Focus on:
1. Identify ALL technologies, frameworks, and tools mentioned
2. Assess difficulty honestly (not everything is "Advanced")
3. Suggest 2-3 practical roadmaps based on content
4. Provide 3-5 key takeaways
5. Suggest 2-4 concrete practice ideas`;

  try {
    if (aiService.openai) {
      const completion = await aiService.openai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0].message.content;
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn('AI analysis failed, using fallback:', error.message);
  }

  // Fallback analysis
  return generateFallbackInsights(title, description);
}

/**
 * Analyze user's overall learning progress
 */
async function analyzeLearningProgress(items) {
  const completed = items.filter(item => item.status === 'completed');
  const inProgress = items.filter(item => item.status === 'inProgress');
  
  const systemPrompt = `You are an expert learning advisor and career coach.
Analyze a user's learning progress based on their tracked articles and readings.
Provide personalized recommendations for their learning journey.`;

  const userPrompt = `Analyze this user's learning progress:

Total tracked items: ${items.length}
Completed: ${completed.length}
In progress: ${inProgress.length}

Sample items:
${items.slice(0, 5).map(item => `- ${item.title}`).join('\n')}

Provide analysis in this JSON structure:
{
  "topTechnologies": [
    {"name": "React", "count": 5},
    {"name": "TypeScript", "count": 3}
  ],
  "learningStreak": 7,
  "suggestedNextSteps": [
    "Specific action 1",
    "Specific action 2",
    "Specific action 3"
  ],
  "skillGaps": [
    "Area needing attention 1",
    "Area needing attention 2"
  ],
  "recommendedRoadmaps": [
    {
      "technology": "React",
      "type": "upgrade",
      "priority": "high",
      "reason": "Why this is recommended"
    }
  ]
}

Provide:
1. Top 5 technologies they're learning
2. Personalized next steps
3. Identify skill gaps from their reading patterns
4. Recommend 3-5 roadmaps with priority levels`;

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
      const analysis = JSON.parse(content);
      
      return {
        totalItemsTracked: items.length,
        completedItems: completed.length,
        inProgressItems: inProgress.length,
        ...analysis
      };
    }
  } catch (error) {
    console.warn('AI progress analysis failed, using fallback:', error.message);
  }

  // Fallback analysis
  return generateFallbackAnalysis(items);
}

/**
 * Generate roadmap from a tracked item
 */
async function generateRoadmapFromTrackedItem(item, type) {
  const isScratch = type === 'scratch';
  
  // Extract technologies from the article
  const technologies = extractTechnologies(item.title + ' ' + item.description);
  const primaryTech = technologies[0] || 'the topic';
  
  const systemPrompt = `You are an expert learning coach creating personalized learning roadmaps.
Generate a roadmap based on an article the user has read, ensuring it builds on their current knowledge.`;

  const userPrompt = `The user read this article:
Title: ${item.title}
Description: ${item.description}

Create a ${isScratch ? 'beginner' : 'upgrade'} roadmap for "${primaryTech}" that:
${isScratch 
  ? '- Starts from basics and builds comprehensive understanding\n- Assumes minimal prior knowledge'
  : '- Focuses on advanced features mentioned in the article\n- Assumes they have basic knowledge\n- Helps them apply concepts from the article'
}

Generate a JSON roadmap following this structure:
{
  "technology": "${primaryTech}",
  "category": "Frontend",
  "description": "Learning path based on: ${item.title}",
  "difficulty": "${isScratch ? 'Beginner' : 'Intermediate'}",
  "estimatedTime": "${isScratch ? '4-8 weeks' : '1-2 weeks'}",
  "learningPath": "${type}",
  "prerequisites": ["List prerequisites"],
  "outcomes": ["What they'll achieve"],
  "steps": [
    {
      "id": "step-1",
      "title": "Step title",
      "description": "What to learn",
      "estimatedHours": 4,
      "resources": [
        {"name": "Official Docs", "url": "https://...", "type": "docs"},
        {"name": "Video Tutorial", "url": "https://...", "type": "video"},
        {"name": "GitHub Example", "url": "https://...", "type": "github"}
      ],
      "completed": false
    }
  ]
}

Include ${isScratch ? '6-8' : '4-6'} steps with 3-5 real, working resource URLs per step.`;

  try {
    if (aiService.openai) {
      const completion = await aiService.openai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 3500,
        response_format: { type: "json_object" }
      });

      const content = completion.choices[0].message.content;
      const roadmap = JSON.parse(content);
      
      // Add metadata about source article
      roadmap.sourceArticle = {
        title: item.title,
        link: item.link,
        addedAt: item.addedAt
      };
      
      return roadmap;
    }
  } catch (error) {
    console.warn('AI roadmap generation failed:', error.message);
    throw new Error('Failed to generate roadmap from article');
  }
}

/**
 * Batch analyze multiple items
 */
async function batchAnalyzeItems(items) {
  const insights = {};
  
  for (const item of items) {
    try {
      const analysis = await analyzeTrackedItem(item.title, item.description, item.link);
      insights[item.id] = analysis;
    } catch (error) {
      console.error(`Failed to analyze item ${item.id}:`, error);
      insights[item.id] = generateFallbackInsights(item.title, item.description);
    }
  }
  
  return insights;
}

/**
 * Helper: Extract technologies from text
 */
function extractTechnologies(text) {
  const techKeywords = [
    'React', 'Vue', 'Angular', 'JavaScript', 'TypeScript', 'Python', 'Java',
    'Node.js', 'Express', 'Next.js', 'Nuxt', 'Django', 'Flask', 'FastAPI',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'MongoDB', 'PostgreSQL',
    'CSS', 'Tailwind', 'Git', 'GraphQL', 'REST API', 'Machine Learning', 'AI'
  ];

  const found = [];
  const lowerText = text.toLowerCase();

  techKeywords.forEach(tech => {
    if (lowerText.includes(tech.toLowerCase())) {
      found.push(tech);
    }
  });

  return found;
}

/**
 * Fallback insights generation
 */
function generateFallbackInsights(title, description) {
  const technologies = extractTechnologies(title + ' ' + description);
  
  return {
    keyTechnologies: technologies.slice(0, 5),
    difficultyLevel: 'Intermediate',
    estimatedReadTime: Math.ceil(description.split(/\s+/).length / 225),
    relatedTopics: technologies.slice(0, 3),
    suggestedRoadmaps: technologies.slice(0, 2).map(tech => ({
      technology: tech,
      type: 'upgrade',
      reason: `Deepen your ${tech} knowledge based on this article`
    })),
    keyTakeaways: [
      'Read and understand the main concepts',
      'Take notes on important technical details',
      'Try implementing any code examples'
    ],
    practiceIdeas: [
      'Build a small project using these concepts',
      'Share your learnings with the community',
      'Explore the official documentation'
    ]
  };
}

/**
 * Fallback learning analysis
 */
function generateFallbackAnalysis(items) {
  const completed = items.filter(item => item.status === 'completed');
  const inProgress = items.filter(item => item.status === 'inProgress');
  
  // Count technologies
  const techCounts = new Map();
  items.forEach(item => {
    const techs = extractTechnologies(item.title + ' ' + item.description);
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
    learningStreak: 0,
    suggestedNextSteps: [
      'Complete your in-progress items',
      'Review completed items for better retention',
      'Create roadmaps for your top technologies'
    ],
    skillGaps: topTechnologies.slice(0, 3).map(t => t.name),
    recommendedRoadmaps: topTechnologies.slice(0, 3).map((tech, idx) => ({
      technology: tech.name,
      type: 'upgrade',
      priority: idx === 0 ? 'high' : 'medium',
      reason: `You've tracked ${tech.count} articles about ${tech.name}`
    }))
  };
}

export default router;
