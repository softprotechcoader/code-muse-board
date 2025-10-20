// update-links.js - Add GitHub and Docs links to news articles
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Sample link mappings based on common tech categories
const linkMappings = {
  // Frontend frameworks
  'react': {
    github: 'https://github.com/facebook/react',
    docs: 'https://react.dev'
  },
  'vue': {
    github: 'https://github.com/vuejs/core',
    docs: 'https://vuejs.org'
  },
  'angular': {
    github: 'https://github.com/angular/angular',
    docs: 'https://angular.io'
  },
  'next.js': {
    github: 'https://github.com/vercel/next.js',
    docs: 'https://nextjs.org'
  },
  'svelte': {
    github: 'https://github.com/sveltejs/svelte',
    docs: 'https://svelte.dev'
  },
  'tailwind': {
    github: 'https://github.com/tailwindlabs/tailwindcss',
    docs: 'https://tailwindcss.com'
  },
  
  // Backend frameworks
  'node.js': {
    github: 'https://github.com/nodejs/node',
    docs: 'https://nodejs.org'
  },
  'express': {
    github: 'https://github.com/expressjs/express',
    docs: 'https://expressjs.com'
  },
  'django': {
    github: 'https://github.com/django/django',
    docs: 'https://www.djangoproject.com'
  },
  'fastapi': {
    github: 'https://github.com/tiangolo/fastapi',
    docs: 'https://fastapi.tiangolo.com'
  },
  'spring boot': {
    github: 'https://github.com/spring-projects/spring-boot',
    docs: 'https://spring.io/projects/spring-boot'
  },
  
  // Databases
  'postgresql': {
    github: 'https://github.com/postgres/postgres',
    docs: 'https://www.postgresql.org/docs'
  },
  'mongodb': {
    github: 'https://github.com/mongodb/mongo',
    docs: 'https://www.mongodb.com/docs'
  },
  'redis': {
    github: 'https://github.com/redis/redis',
    docs: 'https://redis.io/docs'
  },
  
  // AI/ML
  'tensorflow': {
    github: 'https://github.com/tensorflow/tensorflow',
    docs: 'https://www.tensorflow.org'
  },
  'pytorch': {
    github: 'https://github.com/pytorch/pytorch',
    docs: 'https://pytorch.org'
  },
  
  // DevOps
  'docker': {
    github: 'https://github.com/docker/docker-ce',
    docs: 'https://docs.docker.com'
  },
  'kubernetes': {
    github: 'https://github.com/kubernetes/kubernetes',
    docs: 'https://kubernetes.io/docs'
  },
  
  // Programming languages
  'typescript': {
    github: 'https://github.com/microsoft/TypeScript',
    docs: 'https://www.typescriptlang.org'
  },
  'python': {
    github: 'https://github.com/python/cpython',
    docs: 'https://docs.python.org'
  },
  'rust': {
    github: 'https://github.com/rust-lang/rust',
    docs: 'https://www.rust-lang.org'
  },
  'go': {
    github: 'https://github.com/golang/go',
    docs: 'https://go.dev'
  }
};

async function updateArticleLinks() {
  try {
    console.log('🔗 Starting to update article links...\n');
    
    // Get all news articles
    const articles = await prisma.news.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        github: true,
        docs: true
      }
    });
    
    console.log(`📰 Found ${articles.length} articles\n`);
    
    let updatedCount = 0;
    
    for (const article of articles) {
      // Skip if already has links
      if (article.github && article.docs) {
        console.log(`⏭️  Skipping "${article.title.substring(0, 50)}..." - already has links`);
        continue;
      }
      
      // Check title and description for tech keywords
      const text = `${article.title} ${article.description}`.toLowerCase();
      let foundLinks = null;
      
      // Find matching tech in the text
      for (const [tech, links] of Object.entries(linkMappings)) {
        if (text.includes(tech)) {
          foundLinks = links;
          console.log(`✅ Found "${tech}" in: "${article.title.substring(0, 50)}..."`);
          break;
        }
      }
      
      if (foundLinks) {
        // Update the article
        await prisma.news.update({
          where: { id: article.id },
          data: {
            github: foundLinks.github,
            docs: foundLinks.docs
          }
        });
        
        console.log(`   ✓ Updated with GitHub: ${foundLinks.github}`);
        console.log(`   ✓ Updated with Docs: ${foundLinks.docs}\n`);
        updatedCount++;
      } else {
        console.log(`⚠️  No matching tech found for: "${article.title.substring(0, 50)}..."\n`);
      }
    }
    
    console.log(`\n🎉 Update complete! Updated ${updatedCount} out of ${articles.length} articles`);
    
  } catch (error) {
    console.error('❌ Error updating articles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateArticleLinks();
