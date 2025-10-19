import { fetchAllNews, fetchAllNews as fetchAlias } from '../src/services/newsService.js';

async function run() {
  try {
    console.log('Running news fetch test...');
    const articles = await fetchAllNews();
    console.log(`Fetch result: ${articles.length} articles`);
    console.log('Sample titles:');
    articles.slice(0, 10).forEach((a, i) => console.log(`${i + 1}. [${a.source}] ${a.title}`));
  } catch (err) {
    console.error('Error in test fetch:', err);
  }
}

run();
