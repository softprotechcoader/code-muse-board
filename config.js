// Configuration file for the application
export const config = {
  // Azure OpenAI Configuration
  azureOpenAI: {
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    modelName: process.env.AZURE_OPENAI_MODEL,
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-04-01-preview'
  },
  
  // Server Configuration
  server: {
    port: process.env.PORT || 3001,
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  },
  
  // News Configuration
  news: {
    cacheDuration: 5 * 60 * 1000, // 5 minutes
    fetchInterval: 10 * 60 * 1000, // 10 minutes
    maxArticles: 50,
    realtimeInterval: 30 * 1000 // 30 seconds
  },
  
  // News Sources - Dynamic and configurable
  sources: [
    {
      name: 'Hacker News',
      url: 'https://news.ycombinator.com',
      selector: '.athing',
      titleSelector: '.titleline > a',
      linkSelector: '.titleline > a',
      category: 'General',
      priority: 'high',
      enabled: true
    },
    {
      name: 'GitHub Trending',
      url: 'https://github.com/trending',
      selector: 'article',
      titleSelector: 'h2 a',
      linkSelector: 'h2 a',
      category: 'Open Source',
      priority: 'high',
      enabled: true
    },
    {
      name: 'Ars Technica',
      url: 'https://arstechnica.com',
      selector: 'article',
      titleSelector: 'h2 a, h3 a',
      linkSelector: 'h2 a, h3 a',
      category: 'Science',
      priority: 'medium',
      enabled: true
    },
    {
      name: 'Dev.to',
      url: 'https://dev.to',
      selector: 'article',
      titleSelector: 'h2 a, h3 a',
      linkSelector: 'h2 a, h3 a',
      category: 'Development',
      priority: 'high',
      enabled: true
    },
    {
      name: 'Reddit Programming',
      url: 'https://www.reddit.com/r/programming/hot.json',
      selector: 'data.children',
      titleSelector: 'data.title',
      linkSelector: 'data.url',
      category: 'Community',
      priority: 'medium',
      enabled: false, // API-based, needs special handling
      type: 'api'
    },
    {
      name: 'Stack Overflow Blog',
      url: 'https://stackoverflow.blog',
      selector: 'article',
      titleSelector: 'h2 a, h3 a',
      linkSelector: 'h2 a, h3 a',
      category: 'Development',
      priority: 'medium',
      enabled: true
    },
    {
      name: 'CSS-Tricks',
      url: 'https://css-tricks.com',
      selector: 'article',
      titleSelector: 'h2 a, h3 a',
      linkSelector: 'h2 a, h3 a',
      category: 'Frontend',
      priority: 'medium',
      enabled: true
    },
    {
      name: 'Smashing Magazine',
      url: 'https://www.smashingmagazine.com',
      selector: 'article',
      titleSelector: 'h2 a, h3 a',
      linkSelector: 'h2 a, h3 a',
      category: 'Design',
      priority: 'medium',
      enabled: true
    }
  ],

  // Dynamic content generation settings
  dynamicContent: {
    enableTrendingAnalysis: true,
    enableCategoryDetection: true,
    enableUrgencyDetection: true,
    enableAudienceDetection: true,
    maxArticlesPerSource: 10,
    duplicateThreshold: 0.8, // Similarity threshold for duplicate detection
    trendingKeywords: [
      'ai', 'artificial intelligence', 'machine learning', 'react', 'vue', 'angular',
      'typescript', 'javascript', 'python', 'docker', 'kubernetes', 'aws', 'azure',
      'blockchain', 'web3', 'cryptocurrency', 'security', 'performance', 'optimization'
    ]
  },

  // AI Configuration
  ai: {
    enableDynamicPrompts: true,
    enableContentAnalysis: true,
    enablePersonalization: false, // Future feature
    maxSummaryLength: 300,
    minSummaryLength: 100,
    enableFallbackSummaries: true
  },

  // Anthropic / Claude configuration
  claude: {
    enabled: process.env.ENABLE_CLAUDE === 'true' || false,
    apiKey: process.env.CLAUDE_API_KEY || null,
    model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022'
  },

  // GPT-5 Configuration (OpenAI)
  gpt5: {
    enabled: process.env.ENABLE_GPT5 === 'true' || false,
    apiKey: process.env.GPT5_API_KEY || process.env.OPENAI_API_KEY || null,
    model: process.env.GPT5_MODEL || 'gpt-5',
    endpoint: process.env.GPT5_ENDPOINT || 'https://api.openai.com/v1',
    maxTokens: parseInt(process.env.GPT5_MAX_TOKENS) || 4000,
    temperature: parseFloat(process.env.GPT5_TEMPERATURE) || 0.7
  },
};
