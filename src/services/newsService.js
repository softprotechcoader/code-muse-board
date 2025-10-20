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
import { fetchAllOfficialSources } from './officialTechSources.js';

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
          
          // Extract description from multiple possible selectors
          let description = '';
          const descriptionSelectors = [
            source.descriptionSelector, // Custom selector if provided
            'p', // Common paragraph selector
            '.excerpt', '.summary', '.description', // Common class names
            '[data-description]', '[data-excerpt]' // Data attributes
          ].filter(Boolean); // Remove undefined/null values
          
          // Try to find description
          for (const selector of descriptionSelectors) {
            const descElement = $element.find(selector).first();
            if (descElement.length) {
              const descText = descElement.text().trim();
              if (descText && descText.length > 30) { // Ensure it's meaningful (3-4 lines needs ~30+ chars)
                description = descText.length > 250 
                  ? descText.substring(0, 250) + '...' 
                  : descText;
                break;
              }
            }
          }
          
          // Fallback: try to get meta description or first paragraph text
          if (!description) {
            const firstPara = $element.find('p').first().text().trim();
            if (firstPara && firstPara.length > 30) {
              description = firstPara.length > 250 
                ? firstPara.substring(0, 250) + '...' 
                : firstPara;
            }
          }
          
          // Final fallback to source name
          if (!description) {
            description = `Latest news from ${source.name}`;
          }
          
          if (title && link) {
            // Ensure links are absolute
            const absoluteLink = link.startsWith('http') ? link : new URL(link, source.url).href;
            articles.push({
              id: `news-${source.name.toLowerCase()}-${Date.now()}-${index}`,
              title,
              description,
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
    
    // Fetch from existing sources (web scraping)
    const existingSourcesPromises = NEWS_SOURCES.map(source => fetchNewsFromSource(source));
    
    // Fetch from official tech sources (RSS feeds)
    const officialSourcesPromise = fetchAllOfficialSources();
    
    // Wait for all sources
    const results = await Promise.allSettled([...existingSourcesPromises, officialSourcesPromise]);
    
    const allArticles = results
      .filter(result => result.status === 'fulfilled')
      .flatMap(result => result.value);
    
    // Remove duplicates (same/similar title)
    console.log(`Raw articles before dedupe: ${allArticles.length}`);
    const uniqueArticles = removeDuplicateArticles(allArticles);
    
    // Sort by recency
    uniqueArticles.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    console.log(`Total unique articles fetched: ${uniqueArticles.length}`);
    console.log(`  - From web scraping: ${NEWS_SOURCES.length} sources`);
    console.log(`  - From official RSS feeds: included`);
    
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
    // Normalize by removing punctuation and extra whitespace, keep letters/numbers
    const normalizedTitle = (article.title || '').toLowerCase().replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ').trim();
    if (!normalizedTitle) return false;
    if (seen.has(normalizedTitle)) return false;
    seen.add(normalizedTitle);
    return true;
  });
}

/**
 * Performs real-time AI summarization of a news article.
 * Uses aiService with fallback to static summary if errors occur.
 *
 * @param {string} title - The article title
 * @param {string} description - The article or excerpt
 * @param {string} [content] - Additional full content (optional)
 * @returns {Promise<string>} AI-generated (or fallback) summary
 */
async function generateAISummary(title, description, content = '') {
  try {
    console.log('Generating AI summary for:', title);
    
    // Use aiService for detailed analysis
    const article = { title, description, content };
    const analysisResult = await aiService.generateDetailedAnalysis(article);
    
    console.log('AI analysis result received');
    
    // Parse the JSON result from aiService
    const parsed = JSON.parse(analysisResult);
    
    // Return the full structured response with topics and use cases
    if (parsed.content) {
      return {
        summary: parsed.content,
        technologies: parsed.technologies || [],
        provider: parsed.provider || 'unknown',
        model: parsed.model || 'unknown'
      };
    }
    
    return generateFallbackSummary(title, description);
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
  const lowerContent = content.toLowerCase();
  
  // Priority scoring system - higher score = better match
  const categoryScores = {};
  
  // Check for trending keywords first (highest priority)
  const trendingKeywords = [
    'trending', 'popular', 'viral', 'hot topic', 'breaking news',
    'latest release', 'just launched', 'new release', 'announcing',
    'now available', 'top', 'most popular', 'gaining traction',
    'fastest growing', 'rising star', 'must know', 'everyone is talking',
    'game changer', 'revolutionary', 'breakthrough', 'cutting edge'
  ];
  
  const trendingMatches = trendingKeywords.filter(keyword => lowerContent.includes(keyword)).length;
  if (trendingMatches >= 2) {
    return 'Trending'; // Only return Trending if multiple strong indicators
  }
  
  // Comprehensive tech categories with weighted keywords
  // Format: [keyword, weight] - higher weight = stronger indicator
  const categories = {
    // Security & Hacking (specific terms)
    'Security': [
      ['cybersecurity', 3], ['infosec', 3], ['zero-day', 3], ['cve-', 3],
      ['vulnerability', 2], ['breach', 2], ['exploit', 2], ['malware', 2],
      ['ransomware', 2], ['phishing', 2], ['encryption', 2],
      ['security patch', 2], ['security flaw', 2], ['penetration test', 2],
      ['ethical hacking', 2], ['bug bounty', 2], ['security', 1]
    ],
    
    // Frontend (specific frameworks and tools)
    'Frontend': [
      ['react', 3], ['vue.js', 3], ['angular', 3], ['svelte', 3],
      ['next.js', 3], ['nuxt', 3], ['tailwind', 3],
      ['css', 2], ['html', 2], ['dom', 2], ['webpack', 2],
      ['vite', 2], ['ui component', 2], ['responsive', 2],
      ['frontend', 2], ['front-end', 2], ['web design', 2],
      ['user interface', 1], ['browser', 1]
    ],
    
    // Backend (server-side technologies)
    'Backend': [
      ['node.js', 3], ['express', 3], ['fastapi', 3], ['django', 3],
      ['flask', 3], ['spring boot', 3], ['nestjs', 3],
      ['graphql', 2], ['rest api', 2], ['microservices', 2],
      ['server-side', 2], ['api endpoint', 2],
      ['backend', 2], ['back-end', 2], ['server', 1]
    ],
    
    // Database
    'Database': [
      ['postgresql', 3], ['mysql', 3], ['mongodb', 3], ['redis', 3],
      ['cassandra', 3], ['dynamodb', 3], ['sqlite', 3],
      ['sql query', 2], ['nosql', 2], ['database', 2],
      ['orm', 2], ['migration', 2], ['indexing', 2]
    ],
    
    // DevOps & Cloud
    'DevOps': [
      ['kubernetes', 3], ['k8s', 3], ['docker', 3], ['terraform', 3],
      ['ansible', 3], ['jenkins', 3], ['gitlab ci', 3],
      ['ci/cd', 2], ['pipeline', 2], ['deployment', 2],
      ['devops', 2], ['containerization', 2]
    ],
    
    'Cloud': [
      ['aws', 3], ['azure', 3], ['google cloud', 3], ['gcp', 3],
      ['ec2', 2], ['s3', 2], ['lambda', 2], ['cloud function', 2],
      ['serverless', 2], ['cloud', 1]
    ],
    
    // AI & ML
    'AI & ML': [
      ['chatgpt', 3], ['gpt-4', 3], ['llama', 3], ['claude', 3],
      ['tensorflow', 3], ['pytorch', 3], ['hugging face', 3],
      ['machine learning', 2], ['deep learning', 2], ['neural network', 2],
      ['llm', 2], ['nlp', 2], ['computer vision', 2],
      ['artificial intelligence', 2], ['data science', 2],
      ['ai model', 2], ['training model', 2]
    ],
    
    // Mobile
    'Mobile': [
      ['ios', 3], ['android', 3], ['swift', 3], ['kotlin', 3],
      ['react native', 3], ['flutter', 3], ['swiftui', 3],
      ['mobile app', 2], ['app store', 2], ['play store', 2],
      ['mobile', 1]
    ],
    
    // Web3 & Blockchain
    'Web3': [
      ['blockchain', 3], ['ethereum', 3], ['solidity', 3], ['web3', 3],
      ['smart contract', 3], ['cryptocurrency', 2], ['bitcoin', 2],
      ['nft', 2], ['defi', 2], ['decentralized', 2]
    ],
    
    // Data & Architecture
    'Data': [
      ['big data', 3], ['data pipeline', 3], ['etl', 3], ['kafka', 3],
      ['spark', 3], ['hadoop', 3], ['data warehouse', 2],
      ['analytics', 2], ['data processing', 2]
    ],
    
    'Architecture': [
      ['architecture', 2], ['design pattern', 2], ['microservices', 2],
      ['monolith', 2], ['scalability', 2], ['system design', 2]
    ],
    
    // Testing
    'Testing': [
      ['jest', 3], ['pytest', 3], ['selenium', 3], ['cypress', 3],
      ['unit test', 2], ['integration test', 2], ['e2e', 2],
      ['test coverage', 2], ['tdd', 2], ['testing', 1]
    ],
    
    // Design
    'Design': [
      ['figma', 3], ['sketch', 3], ['adobe xd', 3],
      ['ui/ux', 2], ['ux design', 2], ['user experience', 2],
      ['wireframe', 2], ['prototype', 2], ['design system', 2]
    ],
    
    // Tools & Productivity
    'Tools': [
      ['vscode', 3], ['vim', 3], ['git', 2], ['github actions', 2],
      ['cli tool', 2], ['command line', 2], ['terminal', 2]
    ],
    
    // Emerging Tech
    'Emerging Tech': [
      ['quantum computing', 3], ['edge computing', 3], ['webassembly', 3],
      ['wasm', 3], ['ar', 2], ['vr', 2], ['metaverse', 2],
      ['iot', 2], ['5g', 2]
    ],
    
    // Open Source (lowest priority - catches everything)
    'Open Source': [
      ['open source', 3], ['oss', 2], ['github repo', 2],
      ['pull request', 2], ['contribute', 1]
    ]
  };

  // Calculate score for each category
  for (const [category, keywords] of Object.entries(categories)) {
    let score = 0;
    for (const [keyword, weight] of keywords) {
      if (lowerContent.includes(keyword)) {
        score += weight;
      }
    }
    if (score > 0) {
      categoryScores[category] = score;
    }
  }
  
  // Return category with highest score
  if (Object.keys(categoryScores).length > 0) {
    const sortedCategories = Object.entries(categoryScores)
      .sort((a, b) => b[1] - a[1]); // Sort by score descending
    
    console.log('📊 Category scores:', sortedCategories.slice(0, 3));
    return sortedCategories[0][0]; // Return highest scoring category
  }
  
  // Default to General if no matches
  return 'General';
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

  // Find the most relevant category and extract technologies
  let detectedCategory = 'General';
  let maxMatches = 0;
  const technologies = [];

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    const matchedKeywords = keywords.filter(keyword => content.includes(keyword));
    const matches = matchedKeywords.length;
    if (matches > maxMatches) {
      maxMatches = matches;
      detectedCategory = category;
    }
    technologies.push(...matchedKeywords);
  }

  // Generate dynamic summary based on detected category and content
  const dynamicInsights = generateDynamicInsights(title, description, detectedCategory);
  
  const summaryText = `# ${title}

## Summary
${dynamicInsights.intro} ${description}

## Technical Impact
${dynamicInsights.impact}

## Use Cases
${dynamicInsights.useCases}

## Key Takeaways
${dynamicInsights.recommendation}

**Category:** ${detectedCategory}
${technologies.length > 0 ? `\n**Related Technologies:** ${[...new Set(technologies)].join(', ')}` : ''}`;

  return {
    summary: summaryText,
    technologies: [...new Set(technologies)],
    provider: 'local-fallback',
    model: 'heuristic'
  };
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
    impact = 'This is a critical update that requires immediate attention from developers. It may introduce breaking changes that could affect existing applications.';
  } else if (content.includes('new') || content.includes('release') || content.includes('launch')) {
    impact = 'This introduces new capabilities and features that developers should explore. It opens up new possibilities for application development.';
  } else if (content.includes('update') || content.includes('improvement') || content.includes('enhancement')) {
    impact = 'This update brings improvements and optimizations to existing technologies, potentially improving performance and developer productivity.';
  }

  // Generate use cases based on category
  const useCases = {
    'Framework': 'Ideal for building modern web applications, single-page applications (SPAs), and component-based architectures. Perfect for teams looking to improve development speed and code maintainability.',
    'Language': 'Suitable for various application types including web services, data processing, system programming, and automation scripts. Enhances developer productivity and code quality.',
    'Build Tool': 'Essential for optimizing build processes, reducing bundle sizes, and improving development workflows. Useful for teams seeking faster build times and better developer experience.',
    'AI/ML': 'Applicable to intelligent applications, data analytics, predictive modeling, natural language processing, and computer vision projects.',
    'Database': 'Perfect for applications requiring data persistence, complex queries, real-time analytics, and scalable data solutions.',
    'Cloud': 'Ideal for scalable applications, microservices architectures, serverless computing, and distributed systems.',
    'DevOps': 'Essential for continuous integration/deployment pipelines, infrastructure automation, and monitoring solutions.',
    'Security': 'Critical for securing applications, protecting user data, implementing authentication/authorization, and ensuring compliance.',
    'Mobile': 'Perfect for cross-platform mobile apps, native mobile development, and progressive web applications.',
    'Backend': 'Suitable for building APIs, microservices, server-side logic, and data processing systems.',
    'Frontend': 'Ideal for creating interactive user interfaces, responsive designs, and engaging user experiences.',
    'Open Source': 'Great opportunity for community collaboration, learning from production-grade code, and contributing to widely-used projects.',
    'Startup': 'Relevant for technology adoption decisions, market trends analysis, and investment opportunities.',
    'Technology': 'Applicable across various domains for innovation, digital transformation, and staying current with industry trends.',
    'Science': 'Useful for research applications, data analysis, scientific computing, and advancing technological understanding.',
    'General': 'Broadly applicable across different technology domains and use cases.'
  };

  // Dynamic recommendation
  let recommendation = 'Developers should pay attention to this development as it may impact their current projects and future technology choices.';
  
  if (content.includes('security') || content.includes('vulnerability')) {
    recommendation = 'Immediate action may be required to address security concerns and protect applications. Review your dependencies and update as needed.';
  } else if (content.includes('performance') || content.includes('optimization')) {
    recommendation = 'Consider evaluating this update for potential performance improvements in your applications. Run benchmarks to measure impact.';
  } else if (content.includes('breaking') || content.includes('deprecated')) {
    recommendation = 'Review your current implementations to ensure compatibility with these changes. Plan migration path if necessary.';
  } else if (content.includes('new feature') || content.includes('capability')) {
    recommendation = 'Explore these new features in a development environment to understand their potential value for your projects.';
  }

  return {
    intro: intros[category] || intros['General'],
    impact: impact,
    useCases: useCases[category] || useCases['General'],
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
  let savedCount = 0;
  for (const [idx, article] of freshNews.entries()) {
    try {
      // Generate detailed AI analysis (returns fallback on error)
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
          url: article.link || article.url || null,
          summary: typeof detailedAnalysis === 'string' ? detailedAnalysis : JSON.stringify(detailedAnalysis),
          technicalAnalysis: techStackAnalysis ? (typeof techStackAnalysis === 'string' ? techStackAnalysis : JSON.stringify(techStackAnalysis)) : null
        }
      });
      savedCount++;
    } catch (err) {
      console.error(`Error saving article #${idx} (${article.title}):`, err?.message || err);
      // continue with next article
    }
  }

  console.log(`Saved ${savedCount} / ${freshNews.length} fetched articles to the database`);

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
