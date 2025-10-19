/**
 * Test script for the summarize feature
 * This script tests the POST /api/news/:id/summarize endpoint
 */

async function testSummarize() {
  const BASE_URL = 'http://localhost:3001';
  
  try {
    console.log('🧪 Testing Summarize Feature...\n');
    
    // Step 1: Get news articles
    console.log('📰 Step 1: Fetching news articles...');
    const newsResponse = await fetch(`${BASE_URL}/api/news`);
    if (!newsResponse.ok) {
      throw new Error(`Failed to fetch news: ${newsResponse.status}`);
    }
    
    const news = await newsResponse.json();
    console.log(`✅ Fetched ${news.length} articles\n`);
    
    if (news.length === 0) {
      console.log('❌ No articles found to test');
      return;
    }
    
    // Step 2: Pick first article
    const firstArticle = news[0];
    console.log('📄 Step 2: Testing with article:');
    console.log(`   ID: ${firstArticle.id}`);
    console.log(`   Title: ${firstArticle.title}`);
    console.log(`   Category: ${firstArticle.category}\n`);
    
    // Step 3: Generate summary
    console.log('🤖 Step 3: Generating AI summary...');
    const startTime = Date.now();
    
    const summaryResponse = await fetch(`${BASE_URL}/api/news/${firstArticle.id}/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    if (!summaryResponse.ok) {
      const error = await summaryResponse.json();
      throw new Error(`Failed to generate summary: ${error.error} - ${error.details}`);
    }
    
    const summaryData = await summaryResponse.json();
    
    // Step 4: Display results
    console.log(`✅ Summary generated in ${duration}s\n`);
    console.log('📊 Results:');
    console.log(`   Provider: ${summaryData.provider}`);
    console.log(`   Model: ${summaryData.model}`);
    console.log(`   Technologies: ${summaryData.technologies?.join(', ') || 'None detected'}\n`);
    
    console.log('📝 Summary Content:');
    console.log('─'.repeat(80));
    console.log(summaryData.summary.substring(0, 500) + '...');
    console.log('─'.repeat(80));
    
    console.log('\n✅ TEST PASSED: Summarize feature is working correctly!');
    console.log(`\n💡 Full summary has ${summaryData.summary.length} characters`);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\n🔍 Troubleshooting:');
    console.error('   1. Make sure the server is running: npm run server');
    console.error('   2. Check if port 3001 is accessible');
    console.error('   3. Verify Azure OpenAI configuration in .env');
    console.error('   4. Check server logs for errors');
    process.exit(1);
  }
}

// Run the test
console.log('🚀 Starting Summarize Feature Test\n');
console.log('═'.repeat(80));
testSummarize();
