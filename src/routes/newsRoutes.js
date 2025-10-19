// src/routes/newsRoutes.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';
import { config } from '../../config.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get all news with pagination
router.get('/', async (req, res, next) => {
  try {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || (config.news && config.news.maxArticles) || 10;
    const skip = (page - 1) * limit;

    const [news, total] = await Promise.all([
      prisma.news.findMany({
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' }
      }),
      prisma.news.count()
    ]);

    res.json({
      status: 'success',
      results: news.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: news
    });
  } catch (error) {
    next(new AppError(500, 'Error fetching news'));
  }
});

// Get news by ID
router.get('/:id', async (req, res, next) => {
  try {
    const news = await prisma.news.findUnique({
      where: { id: req.params.id }
    });

    if (!news) {
      return next(new AppError(404, 'News not found'));
    }

    res.json({
      status: 'success',
      data: news
    });
  } catch (error) {
    next(new AppError(500, 'Error fetching news item'));
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