// Update existing articles with better descriptions
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const cheerio = require('cheerio');

const prisma = new PrismaClient();

async function fetchDescriptionFromUrl(url) {
  try {
    console.log(`🔍 Fetching description from: ${url.substring(0, 50)}...`);
    
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Try multiple methods to extract description
    let description = '';
    
    // 1. Try meta description
    const metaDesc = $('meta[name="description"]').attr('content') || 
                     $('meta[property="og:description"]').attr('content') ||
                     $('meta[name="twitter:description"]').attr('content');
    
    if (metaDesc && metaDesc.length > 30) {
      description = metaDesc.trim();
    }
    
    // 2. Try article excerpt/summary
    if (!description) {
      const excerpt = $('.excerpt, .summary, .intro, .lead, [itemprop="description"]').first().text().trim();
      if (excerpt && excerpt.length > 30) {
        description = excerpt;
      }
    }
    
    // 3. Try first paragraph in article/main content
    if (!description) {
      const firstPara = $('article p, .content p, .post-content p, main p').first().text().trim();
      if (firstPara && firstPara.length > 30) {
        description = firstPara;
      }
    }
    
    // Truncate to optimal length for 3-4 lines display (250 chars)
    if (description.length > 250) {
      description = description.substring(0, 250) + '...';
    }
    
    return description || null;
  } catch (error) {
    console.error(`❌ Error fetching from ${url.substring(0, 50)}: ${error.message}`);
    return null;
  }
}

async function updateDescriptions() {
  try {
    console.log('🚀 Starting description update process...\n');
    
    // Get all articles with generic descriptions
    const articles = await prisma.news.findMany({
      where: {
        OR: [
          { description: { contains: 'Latest news from' } },
          { description: { equals: '' } }
        ]
      },
      take: 100 // Process 100 at a time to avoid overwhelming
    });
    
    console.log(`📊 Found ${articles.length} articles with generic descriptions\n`);
    
    let updated = 0;
    let failed = 0;
    
    for (const article of articles) {
      console.log(`\n📰 Processing: ${article.title.substring(0, 60)}...`);
      console.log(`   Current: "${article.description}"`);
      
      if (!article.url) {
        console.log('   ⚠️ No URL available, skipping...');
        failed++;
        continue;
      }
      
      const newDescription = await fetchDescriptionFromUrl(article.url);
      
      if (newDescription && newDescription !== article.description) {
        await prisma.news.update({
          where: { id: article.id },
          data: { description: newDescription }
        });
        
        console.log(`   ✅ Updated: "${newDescription.substring(0, 80)}..."`);
        updated++;
      } else {
        console.log('   ⚠️ Could not extract better description');
        failed++;
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n\n✨ Update Complete!`);
    console.log(`✅ Updated: ${updated} articles`);
    console.log(`⚠️ Failed/Skipped: ${failed} articles`);
    
  } catch (error) {
    console.error('❌ Error in update process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateDescriptions();
