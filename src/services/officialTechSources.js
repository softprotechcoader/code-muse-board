// src/services/officialTechSources.js
//
// Fetches news from official tech blogs and documentation sites
// Provides authoritative sources with pre-mapped GitHub and docs links

import axios from 'axios';
import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'CodeMuse-Board/1.0'
  }
});

/**
 * Official Tech Sources Configuration
 * Each source includes: name, RSS feed URL, docs link, GitHub repo, and category
 */
export const OFFICIAL_SOURCES = {
  // Frontend Frameworks
  react: {
    name: 'React',
    blog: 'https://react.dev/blog/rss.xml',
    docs: 'https://react.dev',
    github: 'https://github.com/facebook/react',
    category: 'Frontend'
  },
  vue: {
    name: 'Vue.js',
    blog: 'https://blog.vuejs.org/feed.rss',
    docs: 'https://vuejs.org',
    github: 'https://github.com/vuejs/core',
    category: 'Frontend'
  },
  angular: {
    name: 'Angular',
    blog: 'https://blog.angular.dev/feed',
    docs: 'https://angular.dev',
    github: 'https://github.com/angular/angular',
    category: 'Frontend'
  },
  svelte: {
    name: 'Svelte',
    blog: 'https://svelte.dev/blog/rss.xml',
    docs: 'https://svelte.dev',
    github: 'https://github.com/sveltejs/svelte',
    category: 'Frontend'
  },
  nextjs: {
    name: 'Next.js',
    blog: 'https://nextjs.org/feed.xml',
    docs: 'https://nextjs.org/docs',
    github: 'https://github.com/vercel/next.js',
    category: 'Frontend'
  },

  // Backend & Runtime
  nodejs: {
    name: 'Node.js',
    blog: 'https://nodejs.org/en/feed/blog.xml',
    docs: 'https://nodejs.org/docs',
    github: 'https://github.com/nodejs/node',
    category: 'Backend'
  },
  deno: {
    name: 'Deno',
    blog: 'https://deno.com/blog/feed',
    docs: 'https://docs.deno.com',
    github: 'https://github.com/denoland/deno',
    category: 'Backend'
  },
  bun: {
    name: 'Bun',
    blog: 'https://bun.sh/blog/rss.xml',
    docs: 'https://bun.sh/docs',
    github: 'https://github.com/oven-sh/bun',
    category: 'Backend'
  },
  express: {
    name: 'Express.js',
    blog: null, // No RSS feed
    docs: 'https://expressjs.com',
    github: 'https://github.com/expressjs/express',
    category: 'Backend'
  },
  fastify: {
    name: 'Fastify',
    blog: null,
    docs: 'https://www.fastify.io',
    github: 'https://github.com/fastify/fastify',
    category: 'Backend'
  },

  // Databases
  postgres: {
    name: 'PostgreSQL',
    blog: 'https://www.postgresql.org/news.rss',
    docs: 'https://www.postgresql.org/docs',
    github: 'https://github.com/postgres/postgres',
    category: 'Database'
  },
  mongodb: {
    name: 'MongoDB',
    blog: 'https://www.mongodb.com/blog/rss.xml',
    docs: 'https://docs.mongodb.com',
    github: 'https://github.com/mongodb/mongo',
    category: 'Database'
  },
  redis: {
    name: 'Redis',
    blog: null,
    docs: 'https://redis.io/docs',
    github: 'https://github.com/redis/redis',
    category: 'Database'
  },
  mysql: {
    name: 'MySQL',
    blog: 'https://blogs.oracle.com/mysql/rss',
    docs: 'https://dev.mysql.com/doc',
    github: 'https://github.com/mysql/mysql-server',
    category: 'Database'
  },

  // AI & ML
  tensorflow: {
    name: 'TensorFlow',
    blog: 'https://blog.tensorflow.org/feeds/posts/default',
    docs: 'https://www.tensorflow.org',
    github: 'https://github.com/tensorflow/tensorflow',
    category: 'AI & ML'
  },
  pytorch: {
    name: 'PyTorch',
    blog: 'https://pytorch.org/blog/feed.xml',
    docs: 'https://pytorch.org/docs',
    github: 'https://github.com/pytorch/pytorch',
    category: 'AI & ML'
  },
  huggingface: {
    name: 'Hugging Face',
    blog: 'https://huggingface.co/blog/feed.xml',
    docs: 'https://huggingface.co/docs',
    github: 'https://github.com/huggingface',
    category: 'AI & ML'
  },
  openai: {
    name: 'OpenAI',
    blog: 'https://openai.com/blog/rss',
    docs: 'https://platform.openai.com/docs',
    github: 'https://github.com/openai',
    category: 'AI & ML'
  },

  // Cloud & DevOps
  kubernetes: {
    name: 'Kubernetes',
    blog: 'https://kubernetes.io/feed.xml',
    docs: 'https://kubernetes.io/docs',
    github: 'https://github.com/kubernetes/kubernetes',
    category: 'DevOps'
  },
  docker: {
    name: 'Docker',
    blog: 'https://www.docker.com/blog/feed/',
    docs: 'https://docs.docker.com',
    github: 'https://github.com/docker',
    category: 'DevOps'
  },
  terraform: {
    name: 'Terraform',
    blog: 'https://www.hashicorp.com/blog/products/terraform/feed.xml',
    docs: 'https://www.terraform.io/docs',
    github: 'https://github.com/hashicorp/terraform',
    category: 'DevOps'
  },
  ansible: {
    name: 'Ansible',
    blog: 'https://www.ansible.com/blog/rss.xml',
    docs: 'https://docs.ansible.com',
    github: 'https://github.com/ansible/ansible',
    category: 'DevOps'
  },

  // Programming Languages
  python: {
    name: 'Python',
    blog: 'https://blog.python.org/feeds/posts/default',
    docs: 'https://docs.python.org',
    github: 'https://github.com/python/cpython',
    category: 'Backend'
  },
  rust: {
    name: 'Rust',
    blog: 'https://blog.rust-lang.org/feed.xml',
    docs: 'https://doc.rust-lang.org',
    github: 'https://github.com/rust-lang/rust',
    category: 'Backend'
  },
  go: {
    name: 'Go',
    blog: 'https://go.dev/blog/feed.atom',
    docs: 'https://go.dev/doc',
    github: 'https://github.com/golang/go',
    category: 'Backend'
  },
  typescript: {
    name: 'TypeScript',
    blog: 'https://devblogs.microsoft.com/typescript/feed/',
    docs: 'https://www.typescriptlang.org/docs',
    github: 'https://github.com/microsoft/TypeScript',
    category: 'Frontend'
  },

  // Build Tools & Bundlers
  vite: {
    name: 'Vite',
    blog: null,
    docs: 'https://vitejs.dev',
    github: 'https://github.com/vitejs/vite',
    category: 'Tools'
  },
  webpack: {
    name: 'Webpack',
    blog: null,
    docs: 'https://webpack.js.org',
    github: 'https://github.com/webpack/webpack',
    category: 'Tools'
  },
  esbuild: {
    name: 'esbuild',
    blog: null,
    docs: 'https://esbuild.github.io',
    github: 'https://github.com/evanw/esbuild',
    category: 'Tools'
  },

  // Version Control & Collaboration
  github: {
    name: 'GitHub',
    blog: 'https://github.blog/feed/',
    docs: 'https://docs.github.com',
    github: 'https://github.com',
    category: 'Tools'
  },
  gitlab: {
    name: 'GitLab',
    blog: 'https://about.gitlab.com/atom.xml',
    docs: 'https://docs.gitlab.com',
    github: 'https://github.com/gitlabhq/gitlabhq',
    category: 'Tools'
  },

  // Testing Frameworks
  jest: {
    name: 'Jest',
    blog: null,
    docs: 'https://jestjs.io/docs/getting-started',
    github: 'https://github.com/facebook/jest',
    category: 'Testing'
  },
  cypress: {
    name: 'Cypress',
    blog: 'https://www.cypress.io/blog/rss.xml',
    docs: 'https://docs.cypress.io',
    github: 'https://github.com/cypress-io/cypress',
    category: 'Testing'
  },
  playwright: {
    name: 'Playwright',
    blog: null,
    docs: 'https://playwright.dev',
    github: 'https://github.com/microsoft/playwright',
    category: 'Testing'
  },

  // State Management
  redux: {
    name: 'Redux',
    blog: null,
    docs: 'https://redux.js.org',
    github: 'https://github.com/reduxjs/redux',
    category: 'Frontend'
  },
  zustand: {
    name: 'Zustand',
    blog: null,
    docs: 'https://github.com/pmndrs/zustand',
    github: 'https://github.com/pmndrs/zustand',
    category: 'Frontend'
  },

  // CSS Frameworks
  tailwind: {
    name: 'Tailwind CSS',
    blog: 'https://tailwindcss.com/blog/feed.xml',
    docs: 'https://tailwindcss.com/docs',
    github: 'https://github.com/tailwindlabs/tailwindcss',
    category: 'Frontend'
  }
};

/**
 * Fetch news from a single official source via RSS
 * @param {string} sourceKey - Key from OFFICIAL_SOURCES
 * @returns {Promise<Array>} Array of news items
 */
export async function fetchFromOfficialSource(sourceKey) {
  const source = OFFICIAL_SOURCES[sourceKey];
  
  if (!source) {
    console.error(`❌ Unknown source key: ${sourceKey}`);
    return [];
  }

  if (!source.blog) {
    console.log(`⚠️ No blog RSS feed configured for ${source.name}`);
    return [];
  }

  try {
    console.log(`📡 Fetching ${source.name} official blog...`);
    
    const feed = await parser.parseURL(source.blog);
    const newsItems = [];

    // Get latest 5 articles from each source
    const items = feed.items.slice(0, 5);

    for (const item of items) {
      // Clean up description
      let description = item.contentSnippet || item.content || item.summary || 'No description available';
      
      // Remove HTML tags if present
      description = description.replace(/<[^>]*>/g, '');
      
      // Truncate to reasonable length
      if (description.length > 300) {
        description = description.substring(0, 300) + '...';
      }

      newsItems.push({
        title: item.title || 'Untitled',
        description: description,
        url: item.link || source.blog,
        timestamp: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
        source: `${source.name} Official`,
        category: source.category,
        docs: source.docs,
        github: source.github,
        type: 'update',
        read: false
      });
    }

    console.log(`✅ Fetched ${newsItems.length} articles from ${source.name}`);
    return newsItems;

  } catch (error) {
    console.error(`❌ Failed to fetch ${source.name}:`, error.message);
    return [];
  }
}

/**
 * Fetch news from all official tech sources in parallel
 * @returns {Promise<Array>} Combined array of all news items
 */
export async function fetchAllOfficialSources() {
  console.log('🚀 Fetching from all official tech sources...');
  
  const allNews = [];
  const sourceKeys = Object.keys(OFFICIAL_SOURCES).filter(key => OFFICIAL_SOURCES[key].blog);

  console.log(`📋 Found ${sourceKeys.length} sources with RSS feeds`);

  // Fetch in parallel with Promise.allSettled for resilience
  const results = await Promise.allSettled(
    sourceKeys.map(key => fetchFromOfficialSource(key))
  );

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      allNews.push(...result.value);
    } else {
      console.error(`❌ Failed to fetch ${sourceKeys[index]}:`, result.reason?.message || result.reason);
    }
  });

  console.log(`✅ Total articles fetched from official sources: ${allNews.length}`);
  return allNews;
}

/**
 * Get list of all configured sources with metadata
 * @returns {Array} Array of source metadata objects
 */
export function getConfiguredSources() {
  return Object.entries(OFFICIAL_SOURCES).map(([key, source]) => ({
    key,
    name: source.name,
    category: source.category,
    hasBlog: !!source.blog,
    docs: source.docs,
    github: source.github
  }));
}

/**
 * Get sources grouped by category
 * @returns {Object} Sources grouped by category
 */
export function getSourcesByCategory() {
  const grouped = {};
  
  Object.entries(OFFICIAL_SOURCES).forEach(([key, source]) => {
    if (!grouped[source.category]) {
      grouped[source.category] = [];
    }
    grouped[source.category].push({
      key,
      name: source.name,
      hasBlog: !!source.blog,
      docs: source.docs,
      github: source.github
    });
  });
  
  return grouped;
}

export default {
  fetchAllOfficialSources,
  fetchFromOfficialSource,
  getConfiguredSources,
  getSourcesByCategory,
  OFFICIAL_SOURCES
};
