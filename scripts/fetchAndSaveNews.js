import { getNews } from '../src/services/newsService.js';

async function run() {
  try {
    console.log('Triggering fetch+save via getNews()...');
    const fresh = await getNews();
    console.log(`getNews returned ${fresh.length} articles`);
  } catch (err) {
    console.error('Error running getNews:', err);
  }
}

run();
