// Configuration file for the application
export const config = {
  // OpenAI API Configuration
  // Get your API key from: https://platform.openai.com/api-keys
  openai: {
    apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key-here',
    model: 'gpt-3.5-turbo',
    maxTokens: 300,
    temperature: 0.7
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
  }
};
