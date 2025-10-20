// src/routes/newsRoutes.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';
import { config } from '../../config.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all news with pagination, category, and date filtering
router.get('/', async (req, res, next) => {
  try {
    console.log('📥 GET /api/news - Query params:', req.query);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || (config.news && config.news.maxArticles) || 50;
    const skip = (page - 1) * limit;
    const category = req.query.category;
    const date = req.query.date;

    // Build where clause for filters
    const where = {};
    
    // Category filter (case-insensitive)
    if (category && category !== 'All') {
      where.category = {
        equals: category,
        mode: 'insensitive'
      };
      console.log('🔍 Category filter applied:', category);
    }
    
    // Date filter (exact date match)
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      where.timestamp = {
        gte: startDate,
        lte: endDate
      };
      console.log('📅 Date filter applied:', date, 'Range:', startDate, 'to', endDate);
    }

    console.log('🔎 Prisma where clause:', JSON.stringify(where, null, 2));

    const [news, total] = await Promise.all([
      prisma.news.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' }
      }),
      prisma.news.count({ where })
    ]);

    console.log('✅ Query result: Found', news.length, 'articles out of', total, 'total matching');
    
    // Log first article category if exists
    if (news.length > 0) {
      console.log('📰 Sample article categories:', news.slice(0, 3).map(n => ({ title: n.title.substring(0, 50), category: n.category })));
      console.log('📰 First article full data:', {
        id: news[0].id,
        title: news[0].title.substring(0, 50),
        hasDescription: !!news[0].description,
        descriptionLength: news[0].description?.length || 0,
        descriptionPreview: news[0].description?.substring(0, 100) || 'N/A',
        category: news[0].category,
        url: news[0].url,
        docs: news[0].docs,
        github: news[0].github
      });
    } else {
      console.log('ℹ️ No articles found matching the filters');
    }

    // Always return success, even with 0 results
    res.json({
      status: 'success',
      results: news.length,
      totalPages: Math.ceil(total / limit) || 0,
      currentPage: page,
      filters: { category, date },
      data: news || [] // Ensure empty array instead of null
    });
  } catch (error) {
    console.error('❌ Error fetching news:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      query: req.query
    });
    
    // Don't crash - return error response
    next(new AppError(500, 'Error fetching news from database'));
  }
});

// Get all configured news sources (MUST be before /:id route)
router.get('/meta/sources', async (req, res, next) => {
  try {
    // Import here to avoid circular dependencies
    const { getConfiguredSources, getSourcesByCategory } = await import('../services/officialTechSources.js');
    
    const sources = getConfiguredSources();
    const byCategory = getSourcesByCategory();
    
    // Count sources by category
    const categoryCounts = {};
    sources.forEach(source => {
      categoryCounts[source.category] = (categoryCounts[source.category] || 0) + 1;
    });
    
    res.json({
      status: 'success',
      data: {
        total: sources.length,
        withRssFeed: sources.filter(s => s.hasBlog).length,
        withoutRssFeed: sources.filter(s => !s.hasBlog).length,
        sources: sources,
        byCategory: byCategory,
        categoryCounts: categoryCounts
      }
    });
  } catch (error) {
    console.error('❌ Error fetching sources:', error.message);
    next(new AppError(500, 'Error fetching news sources'));
  }
});

// Get news by ID
router.get('/:id', async (req, res, next) => {
  try {
    console.log('🔍 Fetching single news item:', req.params.id);
    
    const news = await prisma.news.findUnique({
      where: { id: req.params.id }
    });

    if (!news) {
      console.log('⚠️ News item not found:', req.params.id);
      return next(new AppError(404, 'News article not found'));
    }

    console.log('✅ Found news item:', news.title.substring(0, 50));
    res.json({
      status: 'success',
      data: news
    });
  } catch (error) {
    console.error('❌ Error fetching news item:', error.message);
    next(new AppError(500, 'Error fetching news article'));
  }
});

// Create new news item
router.post('/', async (req, res, next) => {
  try {
    const news = await prisma.news.create({
      data: {
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        type: req.body.type,
        source: req.body.source,
        url: req.body.url
      }
    });

    res.status(201).json({
      status: 'success',
      data: news
    });
  } catch (error) {
    next(new AppError(400, 'Error creating news item'));
  }
});

// Mark news as read
router.patch('/:id/read', async (req, res, next) => {
  try {
    const news = await prisma.news.update({
      where: { id: req.params.id },
      data: { read: true }
    });

    res.json({
      status: 'success',
      data: news
    });
  } catch (error) {
    next(new AppError(400, 'Error updating news item'));
  }
});

export default router;