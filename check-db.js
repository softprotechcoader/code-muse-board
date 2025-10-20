// Quick script to check database categories
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCategories() {
  try {
    console.log('🔍 Checking database categories...\n');
    
    // Get all unique categories using Prisma's groupBy
    const categoryGroups = await prisma.news.groupBy({
      by: ['category'],
      _count: {
        category: true
      },
      orderBy: {
        _count: {
          category: 'desc'
        }
      }
    });
    
    console.log('📊 Categories in database:');
    categoryGroups.forEach(group => {
      console.log(`  ${group.category}: ${group._count.category} articles`);
    });
    
    // Get sample articles
    const samples = await prisma.news.findMany({
      take: 5,
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        title: true,
        category: true,
        timestamp: true
      }
    });
    
    console.log('\n📰 Sample recent articles:');
    samples.forEach(article => {
      console.log(`  - ${article.title.substring(0, 60)} | Category: "${article.category}"`);
    });
    
    // Test a specific category query
    const frontendArticles = await prisma.news.findMany({
      where: {
        category: {
          equals: 'Frontend',
          mode: 'insensitive'
        }
      },
      take: 3
    });
    
    console.log(`\n🔎 Test query for "Frontend": Found ${frontendArticles.length} articles`);
    frontendArticles.forEach(article => {
      console.log(`  - ${article.title.substring(0, 60)} | Category: "${article.category}"`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCategories();
