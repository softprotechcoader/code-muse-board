// src/services/newsService.js
//
// Responsible for fetching, caching, and deduplicating real-world tech news
// from a variety of sources and generating AI-powered summaries for articles.
// Integrates with OpenAI for summarization, Cheerio for web scraping, and Axios for HTTP.

import axios from 'axios';
import * as cheerio from 'cheerio';
import { PrismaClient } from '@prisma/client';
import { config } from '../../config.js';
import { aiService } from './aiService.js';

// Initialize Prisma client
const prisma = new PrismaClient();

// Technology extraction and analysis is now handled by aiService
// Dynamically determine enabled news sources from config
const NEWS_SOURCES = config.sources.filter(source => source.enabled);

import { saveNews, getLatestNews, markNewsAsRead } from './db/newsRepository.js';

// Cache duration for fetching news
const CACHE_DURATION = config.news.cacheDuration;

/**
 * Fetch and parse news from a single source using given selectors.
 * Handles relative links and normalizes article objects.
 *
 * @param {Object} source - Configured news source (see config.js)
 * @returns {Promise<Object[]>} List of news article objects from this source
 */
async function fetchNewsFromSource(source) {
  try {
    console.log(`Fetching news from ${source.name}...`);
    const response = await axios.get(source.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 ... Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });
    const $ = cheerio.load(response.data);
    const articles = [];

    // For each matching selector, extract title/link & normalize data
    $(source.selector).slice(0, config.dynamicContent.maxArticlesPerSource).each((index, element) => {
      try {
        const $element = $(element);
        const titleElement = $element.find(source.titleSelector).first();
        const linkElement = $element.find(source.linkSelector).first();
        if (titleElement.length && linkElement.length) {
          const title = titleElement.text().trim();
          const link = linkElement.attr('href');
          if (title && link) {
            // Ensure links are absolute
            const absoluteLink = link.startsWith('http') ? link : new URL(link, source.url).href;
            articles.push({
              id: `news-${source.name.toLowerCase()}-${Date.now()}-${index}`,
              title,
              description: `Latest news from ${source.name}`,
              link: absoluteLink,
              source: source.name,
              category: source.category,
              date: new Date().toISOString().split('T')[0],
              timestamp: new Date().toISOString(),
              read: false
            });
          }
        }
      } catch (error) {
        console.error(`Error parsing article from ${source.name}:`, error.message);
      }
    });
    console.log(`Fetched ${articles.length} articles from ${source.name}`);
    return articles;
  } catch (error) {
    console.error(`Error fetching news from ${source.name}:`, error.message);
    return [];
  }
}

/**
 * Fetches new articles from all sources in parallel, deduplicates, and sorts.
 * Uses removeDuplicateArticles utility to avoid duplicates by title.
 *
 * @returns {Promise<Object[]>} Array of unique news articles
 */
async function fetchAllNews() {
  try {
    console.log('Fetching news from all sources...');
    const promises = NEWS_SOURCES.map(source => fetchNewsFromSource(source));
    const results = await Promise.allSettled(promises);
    const allArticles = results
      .filter(result => result.status === 'fulfilled')
      .flatMap(result => result.value);
    // Remove duplicates (same/similar title)
    const uniqueArticles = removeDuplicateArticles(allArticles);
    // Sort by recency
    uniqueArticles.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    console.log(`Total unique articles fetched: ${uniqueArticles.length}`);
    return uniqueArticles;
  } catch (error) {
    console.error('Error fetching news:', error.message);
    return [];
  }
}

/**
 * Attempts to deduplicate news articles by normalizing and comparing titles.
 * Uses naive similarity heuristic; can be replaced with more sophisticated algorithm.
 *
 * @param {Object[]} articles
 * @returns {Object[]} deduplicated list
 */
function removeDuplicateArticles(articles) {
  const seen = new Set();
  return articles.filter(article => {
    const normalizedTitle = article.title.toLowerCase().replace(/[^"]+/g, '').trim();
    if (seen.has(normalizedTitle)) return false;
    seen.add(normalizedTitle);
    return true;
  });
}

/**
 * Performs real-time AI summarization of a news article.
 * Uses dynamic prompt generation and OpenAI's chat API. Fallbacks to static summary if OpenAI key absent or errors.
 *
 * @param {string} title - The article title
 * @param {string} description - The article or excerpt
 * @param {string} [content] - Additional full content (optional)
 * @returns {Promise<string>} AI-generated (or fallback) summary
 */
async function generateAISummary(title, description, content = '') {
  try {
    // Only proceed if API key is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key-here') {
      return generateFallbackSummary(title, description);
    }
    // Analyze content for context, category, urgency, etc
    const contentAnalysis = analyzeContentForPrompt(title, description, content);
    const dynamicPrompt = generateDynamicPrompt(title, description, content, contentAnalysis);
    const completion = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: generateSystemPrompt(contentAnalysis) },
        { role: 'user', content: dynamicPrompt }
      ],
      max_tokens: config.openai.maxTokens,
      temperature: config.openai.temperature
    });
    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating AI summary:', error.message);
    return generateFallbackSummary(title, description);
  }
}

/**
 * Analyze content to determine prompt strategy
 */
function analyzeContentForPrompt(title, description, content) {
  const fullContent = `${title} ${description} ${content}`.toLowerCase();
  
  return {
    category: detectContentCategory(fullContent),
    urgency: detectUrgency(fullContent),
    complexity: detectComplexity(fullContent),
    audience: detectTargetAudience(fullContent),
    keywords: extractKeyTerms(fullContent)
  };
}

/**
 * Detect content category for targeted prompts
 */
function detectContentCategory(content) {
  const categories = {
    'security': ['security', 'vulnerability', 'breach', 'attack', 'patch', 'cve'],
    'performance': ['performance', 'speed', 'optimization', 'fast', 'slow', 'benchmark'],
    'release': ['release', 'version', 'update', 'new', 'launch', 'announcement'],
    'tutorial': ['tutorial', 'guide', 'how to', 'learn', 'step by step', 'example'],
    'opinion': ['opinion', 'think', 'believe', 'should', 'recommend', 'suggest'],
    'breaking': ['breaking', 'urgent', 'critical', 'immediate', 'emergency'],
    'trending': ['trending', 'popular', 'growing', 'adoption', 'rising', 'hot']
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => content.includes(keyword))) {
      return category;
    }
  }
  return 'general';
}

/**
 * Detect urgency level
 */
function detectUrgency(content) {
  const urgentKeywords = ['breaking', 'urgent', 'critical', 'immediate', 'emergency', 'security alert'];
  const highUrgency = urgentKeywords.some(keyword => content.includes(keyword));
  
  if (highUrgency) return 'high';
  if (content.includes('update') || content.includes('release')) return 'medium';
  return 'low';
}

/**
 * Detect content complexity
 */
function detectComplexity(content) {
  const complexKeywords = ['architecture', 'algorithm', 'implementation', 'optimization', 'scalability'];
  const simpleKeywords = ['basic', 'simple', 'easy', 'beginner', 'introduction'];
  
  if (complexKeywords.some(keyword => content.includes(keyword))) return 'high';
  if (simpleKeywords.some(keyword => content.includes(keyword))) return 'low';
  return 'medium';
}

/**
 * Detect target audience
 */
function detectTargetAudience(content) {
  const audienceKeywords = {
    'beginner': ['beginner', 'newbie', 'getting started', 'introduction', 'basic'],
    'intermediate': ['intermediate', 'advanced', 'experienced', 'professional'],
    'expert': ['expert', 'senior', 'architect', 'lead', 'principal']
  };

  for (const [audience, keywords] of Object.entries(audienceKeywords)) {
    if (keywords.some(keyword => content.includes(keyword))) {
      return audience;
    }
  }
  return 'general';
}

/**
 * Extract key technical terms
 */
function extractKeyTerms(content) {
  const techTerms = [
    'javascript', 'typescript', 'react', 'vue', 'angular', 'node.js', 'python', 'java',
    'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'api', 'database', 'sql', 'nosql',
    'ai', 'ml', 'machine learning', 'blockchain', 'cryptocurrency', 'web3'
  ];
  
  return techTerms.filter(term => content.includes(term));
}

/**
 * Generate dynamic system prompt based on content analysis
 */
function generateSystemPrompt(analysis) {
  const basePrompt = "You are a tech news summarizer that helps developers understand the latest technology news.";
  
  const contextualPrompts = {
    'security': "Focus on security implications, potential risks, and immediate actions developers should take.",
    'performance': "Emphasize performance metrics, optimization techniques, and practical implementation tips.",
    'release': "Highlight new features, breaking changes, migration paths, and upgrade considerations.",
    'tutorial': "Provide clear, actionable steps and practical examples for developers to follow.",
    'opinion': "Present balanced perspectives and help developers form their own informed opinions.",
    'breaking': "Prioritize immediate impact, urgent actions, and critical information developers need to know.",
    'trending': "Explain why this is trending, market implications, and future outlook for developers."
  };

  const audiencePrompts = {
    'beginner': "Use simple language and explain technical concepts clearly for developers new to the topic.",
    'intermediate': "Provide technical depth while remaining accessible to experienced developers.",
    'expert': "Focus on advanced technical details, architectural implications, and deep insights."
  };

  const urgencyPrompts = {
    'high': "Prioritize immediate actions and critical information that developers need to address quickly.",
    'medium': "Balance immediate relevance with long-term implications for development practices.",
    'low': "Focus on educational value and long-term trends in technology development."
  };

  let contextualPrompt = contextualPrompts[analysis.category] || "";
  let audiencePrompt = audiencePrompts[analysis.audience] || "";
  let urgencyPrompt = urgencyPrompts[analysis.urgency] || "";

  return `${basePrompt} ${contextualPrompt} ${audiencePrompt} ${urgencyPrompt} Provide clear, concise summaries that highlight the most important aspects for developers.`;
}

/**
 * Generate dynamic user prompt based on content analysis
 */
function generateDynamicPrompt(title, description, content, analysis) {
  const baseStructure = `Please provide a concise, informative summary of this tech news article.

Title: ${title}
Description: ${description}
${content ? `Content: ${content.substring(0, 1000)}...` : ''}`;

  const dynamicSections = generateDynamicSections(analysis);
  const wordLimit = getWordLimit(analysis.urgency, analysis.complexity);

  return `${baseStructure}

${dynamicSections}

Keep the response under ${wordLimit} words and make it engaging for ${analysis.audience} developers.`;
}

/**
 * Generate dynamic sections based on content analysis
 */
function generateDynamicSections(analysis) {
  const sections = {
    'security': [
      "1. Security implications and potential risks",
      "2. Immediate actions developers should take", 
      "3. Long-term security considerations",
      "4. Best practices for prevention"
    ],
    'performance': [
      "1. Performance improvements and metrics",
      "2. Implementation techniques and tips",
      "3. Before/after comparisons",
      "4. Practical optimization strategies"
    ],
    'release': [
      "1. Key new features and capabilities",
      "2. Breaking changes and migration notes",
      "3. Upgrade path and considerations",
      "4. Impact on existing projects"
    ],
    'tutorial': [
      "1. Step-by-step implementation guide",
      "2. Key concepts and prerequisites",
      "3. Common pitfalls and solutions",
      "4. Next steps and advanced topics"
    ],
    'breaking': [
      "1. Critical information and immediate impact",
      "2. Urgent actions required",
      "3. Timeline and deadlines",
      "4. Resources for further information"
    ],
    'trending': [
      "1. Why this is trending now",
      "2. Market and industry implications",
      "3. Future outlook and predictions",
      "4. Opportunities for developers"
    ],
    'general': [
      "1. Brief summary (2-3 sentences)",
      "2. Key technical details",
      "3. Impact on developers/tech industry",
      "4. Why this matters"
    ]
  };

  const selectedSections = sections[analysis.category] || sections['general'];
  return selectedSections.join('\n');
}

/**
 * Get appropriate word limit based on urgency and complexity
 */
function getWordLimit(urgency, complexity) {
  if (urgency === 'high') return 150; // Shorter for urgent content
  if (complexity === 'high') return 250; // Longer for complex content
  if (complexity === 'low') return 150; // Shorter for simple content
  return 200; // Default
}

/**
 * Generate dynamic fallback summary based on content analysis
 */
function generateFallbackSummary(title, description) {
  // Analyze the content to determine key themes
  const content = `${title} ${description}`.toLowerCase();
  
  // Dynamic category detection based on keywords
  const categoryKeywords = {
    'Framework': ['framework', 'react', 'vue', 'angular', 'svelte', 'next.js', 'nuxt'],
    'Language': ['javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c++', 'c#'],
    'Build Tool': ['webpack', 'vite', 'rollup', 'parcel', 'esbuild', 'build', 'bundler'],
    'AI/ML': ['ai', 'machine learning', 'artificial intelligence', 'gpt', 'openai', 'neural'],
    'Database': ['database', 'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'data'],
    'Cloud': ['aws', 'azure', 'gcp', 'cloud', 'serverless', 'kubernetes', 'docker'],
    'DevOps': ['devops', 'ci/cd', 'deployment', 'infrastructure', 'monitoring'],
    'Security': ['security', 'vulnerability', 'encryption', 'authentication', 'authorization'],
    'Mobile': ['mobile', 'ios', 'android', 'react native', 'flutter', 'app'],
    'Backend': ['backend', 'api', 'server', 'node.js', 'express', 'fastapi'],
    'Frontend': ['frontend', 'ui', 'ux', 'css', 'html', 'design', 'interface'],
    'Open Source': ['open source', 'github', 'git', 'contribute', 'community'],
    'Startup': ['startup', 'funding', 'venture', 'investment', 'business'],
    'Technology': ['technology', 'tech', 'innovation', 'digital', 'software'],
    'Science': ['science', 'research', 'study', 'discovery', 'experiment']
  };

  // Find the most relevant category
  let detectedCategory = 'General';
  let maxMatches = 0;

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    const matches = keywords.filter(keyword => content.includes(keyword)).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      detectedCategory = category;
    }
  }

  // Generate dynamic summary based on detected category and content
  const dynamicInsights = generateDynamicInsights(title, description, detectedCategory);
  
  return `${dynamicInsights.intro} ${description} ${dynamicInsights.impact} ${dynamicInsights.recommendation}`;
}

/**
 * Generate dynamic insights based on content analysis
 */
function generateDynamicInsights(title, description, category) {
  const content = `${title} ${description}`.toLowerCase();
  
  // Dynamic intro based on category and content
  const intros = {
    'Framework': 'This represents a significant advancement in the framework ecosystem.',
    'Language': 'This is an important development in programming languages.',
    'Build Tool': 'This update enhances the development toolchain.',
    'AI/ML': 'This is a notable breakthrough in artificial intelligence.',
    'Database': 'This impacts data storage and management solutions.',
    'Cloud': 'This affects cloud computing and infrastructure.',
    'DevOps': 'This relates to development operations and deployment.',
    'Security': 'This is a critical security-related update.',
    'Mobile': 'This affects mobile development and platforms.',
    'Backend': 'This impacts server-side development.',
    'Frontend': 'This affects client-side development.',
    'Open Source': 'This is a significant open source contribution.',
    'Startup': 'This is an important startup and business development.',
    'Technology': 'This represents a notable technological advancement.',
    'Science': 'This is a significant scientific development.',
    'General': 'This is an important development in technology.'
  };

  // Dynamic impact assessment
  let impact = 'This update focuses on improving developer experience and performance optimizations.';
  
  if (content.includes('breaking') || content.includes('critical') || content.includes('urgent')) {
    impact = 'This is a critical update that requires immediate attention from developers.';
  } else if (content.includes('new') || content.includes('release') || content.includes('launch')) {
    impact = 'This introduces new capabilities and features that developers should explore.';
  } else if (content.includes('update') || content.includes('improvement') || content.includes('enhancement')) {
    impact = 'This update brings improvements and optimizations to existing technologies.';
  }

  // Dynamic recommendation
  let recommendation = 'Developers should pay attention to this development as it may impact their current projects and future technology choices.';
  
  if (content.includes('security') || content.includes('vulnerability')) {
    recommendation = 'Immediate action may be required to address security concerns and protect applications.';
  } else if (content.includes('performance') || content.includes('optimization')) {
    recommendation = 'Consider evaluating this update for potential performance improvements in your applications.';
  } else if (content.includes('breaking') || content.includes('deprecated')) {
    recommendation = 'Review your current implementations to ensure compatibility with these changes.';
  }

  return {
    intro: intros[category] || intros['General'],
    impact: impact,
    recommendation: recommendation
  };
}

/**
 * Get news from database or fetch new ones
 */
async function getNews() {
  const now = Date.now();
  const lastNews = await prisma.news.findFirst({
    orderBy: { timestamp: 'desc' }
  });
  
  if (lastNews && (now - lastNews.timestamp.getTime()) < CACHE_DURATION) {
    console.log('Returning recent news from database');
    return await prisma.news.findMany({
      orderBy: { timestamp: 'desc' },
      take: 50
    });
  }
  
  console.log('Fetching fresh news...');
  const freshNews = await fetchAllNews();
  
  // Store new articles in database with detailed analysis
  for (const article of freshNews) {
    // Generate detailed AI analysis
    const detailedAnalysis = await aiService.generateDetailedAnalysis(article);
    
    // Extract technologies mentioned in the article
    const technologies = aiService.extractTechnologies(article.description);
    const techStackAnalysis = technologies.length > 0 ? 
      await aiService.generateTechStackAnalysis(technologies) : null;
    
    await prisma.news.create({
      data: {
        title: article.title,
        description: article.description || '',
        category: article.category || 'general',
        type: article.type || 'update',
        source: article.source,
        url: article.url,
        summary: detailedAnalysis,
        technicalAnalysis: techStackAnalysis
      }
    });
  }
  
  return freshNews;
}

/**
 * Get a single news item by ID
 */
async function getNewsById(id) {
  try {
    return await prisma.news.findUnique({
      where: { id }
    });
  } catch (error) {
    console.error('Error fetching news by ID:', error);
    return null;
  }
}

/**
 * Generate dynamic news item based on current trends and database data
 */
async function generateRandomNews() {
  // Get recent news from database to base templates on real data
  const currentNews = await prisma.news.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' }
  }); // Use recent news as inspiration
  
  // Dynamic news types based on current trends
  const newsTypes = [
    {
      type: "breaking",
      urgency: "high",
      keywords: ["breaking", "urgent", "critical", "immediate"]
    },
    {
      type: "update", 
      urgency: "medium",
      keywords: ["update", "release", "version", "improvement"]
    },
    {
      type: "alert",
      urgency: "high", 
      keywords: ["security", "vulnerability", "warning", "patch"]
    },
    {
      type: "trending",
      urgency: "medium",
      keywords: ["trending", "popular", "growing", "adoption"]
    }
  ];

  // Extract categories from current news
  const currentCategories = [...new Set(currentNews.map(item => item.category))];
  const currentSources = [...new Set(currentNews.map(item => item.source))];
  
  // Generate dynamic template based on current data
  const selectedType = newsTypes[Math.floor(Math.random() * newsTypes.length)];
  const selectedCategory = currentCategories[Math.floor(Math.random() * currentCategories.length)] || 'Technology';
  const selectedSource = currentSources[Math.floor(Math.random() * currentSources.length)] || 'Tech News';
  
  // Generate dynamic title and description
  const dynamicContent = generateDynamicNewsContent(selectedType, selectedCategory, selectedSource);
  
  return {
    id: `realtime-${Date.now()}`,
    title: dynamicContent.title,
    description: dynamicContent.description,
    category: selectedCategory,
    type: selectedType.type,
    urgency: selectedType.urgency,
    timestamp: new Date().toISOString(),
    read: false,
    source: 'Real-time Updates',
    link: generateRelevantLink(selectedCategory),
    date: new Date().toISOString().split('T')[0]
  };
}

/**
 * Generate dynamic news content based on type, category, and source
 */
function generateDynamicNewsContent(type, category, source) {
  const contentTemplates = {
    breaking: {
      titlePrefixes: ["Breaking:", "Urgent:", "Critical Update:", "Immediate:"],
      descriptions: [
        "A significant development that requires immediate attention from developers",
        "This critical update affects multiple systems and requires prompt action",
        "An urgent announcement that impacts the development community",
        "Breaking news that could change how developers approach this technology"
      ]
    },
    update: {
      titlePrefixes: ["Update:", "New Release:", "Version Update:", "Enhancement:"],
      descriptions: [
        "Latest improvements and new features for better developer experience",
        "This update brings performance enhancements and new capabilities",
        "New version with improved functionality and developer tools",
        "Enhanced features and optimizations for better productivity"
      ]
    },
    alert: {
      titlePrefixes: ["Security Alert:", "Warning:", "Vulnerability:", "Security Update:"],
      descriptions: [
        "Important security information that developers need to address",
        "Critical security update to protect applications and data",
        "Security advisory requiring immediate attention from developers",
        "Important security patch to prevent potential vulnerabilities"
      ]
    },
    trending: {
      titlePrefixes: ["Trending:", "Popular:", "Growing:", "Rising:"],
      descriptions: [
        "Growing adoption and community interest in this technology",
        "Increasing popularity among developers and organizations",
        "Rising trend that's gaining momentum in the developer community",
        "Growing ecosystem and expanding use cases"
      ]
    }
  };

  const template = contentTemplates[type.type] || contentTemplates.update;
  const titlePrefix = template.titlePrefixes[Math.floor(Math.random() * template.titlePrefixes.length)];
  const description = template.descriptions[Math.floor(Math.random() * template.descriptions.length)];
  
  // Generate category-specific content
  const categoryContent = generateCategorySpecificContent(category);
  
  return {
    title: `${titlePrefix} ${categoryContent.title}`,
    description: `${description} ${categoryContent.description}`
  };
}

/**
 * Generate category-specific content
 */
function generateCategorySpecificContent(category) {
  const categoryContent = {
    'Framework': {
      title: "Framework Development",
      description: "This affects the framework ecosystem and development workflows."
    },
    'Language': {
      title: "Programming Language Update", 
      description: "This impacts language features and developer productivity."
    },
    'AI/ML': {
      title: "AI/ML Advancement",
      description: "This represents progress in artificial intelligence and machine learning."
    },
    'Database': {
      title: "Database Technology",
      description: "This affects data storage, management, and query performance."
    },
    'Cloud': {
      title: "Cloud Infrastructure",
      description: "This impacts cloud services and deployment strategies."
    },
    'Security': {
      title: "Security Update",
      description: "This addresses security concerns and best practices."
    },
    'Frontend': {
      title: "Frontend Development",
      description: "This affects user interface and client-side development."
    },
    'Backend': {
      title: "Backend Development", 
      description: "This impacts server-side development and API design."
    },
    'DevOps': {
      title: "DevOps Practice",
      description: "This affects development operations and deployment processes."
    },
    'Open Source': {
      title: "Open Source Project",
      description: "This represents community-driven development and collaboration."
    },
    'Technology': {
      title: "Technology Innovation",
      description: "This represents technological advancement and innovation."
    },
    'General': {
      title: "Technology News",
      description: "This is an important development in the technology space."
    }
  };

  return categoryContent[category] || categoryContent['General'];
}

/**
 * Generate relevant link based on category
 */
function generateRelevantLink(category) {
  const categoryLinks = {
    'Framework': 'https://github.com/trending/javascript',
    'Language': 'https://github.com/trending',
    'AI/ML': 'https://github.com/trending/machine-learning',
    'Database': 'https://github.com/trending/database',
    'Cloud': 'https://github.com/trending/cloud',
    'Security': 'https://github.com/trending/security',
    'Frontend': 'https://github.com/trending/css',
    'Backend': 'https://github.com/trending/api',
    'DevOps': 'https://github.com/trending/docker',
    'Open Source': 'https://github.com/trending',
    'Technology': 'https://news.ycombinator.com',
    'General': 'https://news.ycombinator.com'
  };

  return categoryLinks[category] || categoryLinks['General'];
}

export {
  getNews,
  getNewsById,
  generateAISummary,
  generateRandomNews,
  fetchAllNews
};
