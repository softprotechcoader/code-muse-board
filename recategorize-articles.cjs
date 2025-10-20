const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import the improved category detection function
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
    
    return sortedCategories[0][0]; // Return highest scoring category
  }
  
  // Default to General if no matches
  return 'General';
}

async function recategorizeAllArticles() {
  try {
    console.log('🔄 Starting re-categorization of all articles...\n');
    
    // Get all articles
    const articles = await prisma.news.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        category: true
      }
    });
    
    console.log(`📰 Found ${articles.length} articles to process\n`);
    
    const categoryChanges = {};
    let updatedCount = 0;
    
    for (const article of articles) {
      const content = `${article.title} ${article.description || ''}`;
      const newCategory = detectContentCategory(content);
      
      if (newCategory !== article.category) {
        const oldCat = article.category;
        const newCat = newCategory;
        
        // Track changes
        const changeKey = `${oldCat} → ${newCat}`;
        categoryChanges[changeKey] = (categoryChanges[changeKey] || 0) + 1;
        
        // Update in database
        await prisma.news.update({
          where: { id: article.id },
          data: { category: newCategory }
        });
        
        updatedCount++;
        
        // Show sample changes (first 10)
        if (updatedCount <= 10) {
          console.log(`  ✏️ "${article.title.substring(0, 50)}..."`);
          console.log(`     ${oldCat} → ${newCat}`);
        }
      }
    }
    
    console.log(`\n✅ Updated ${updatedCount} articles out of ${articles.length}`);
    console.log('\n📊 Category changes summary:');
    
    for (const [change, count] of Object.entries(categoryChanges).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${change}: ${count} articles`);
    }
    
    // Show new distribution
    console.log('\n📊 New category distribution:');
    const distribution = await prisma.news.groupBy({
      by: ['category'],
      _count: true,
      orderBy: { _count: { category: 'desc' } }
    });
    
    for (const { category, _count } of distribution) {
      console.log(`  ${category}: ${_count} articles`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
recategorizeAllArticles();
