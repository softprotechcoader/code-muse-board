// src/routes/activityRoutes.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get activity logs with filtering and pagination
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const where = {};
    if (req.query.category) where.category = req.query.category;
    if (req.query.importance) where.importance = req.query.importance;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' }
      }),
      prisma.activityLog.count({ where })
    ]);

    res.json({
      status: 'success',
      results: logs.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: logs
    });
  } catch (error) {
    next(new AppError(500, 'Error fetching activity logs'));
  }
});

// Log new activity
router.post('/', async (req, res, next) => {
  try {
    const activity = await prisma.activityLog.create({
      data: {
        action: req.body.action,
        details: req.body.details,
        category: req.body.category,
        importance: req.body.importance || 'LOW'
      }
    });

    res.status(201).json({
      status: 'success',
      data: activity
    });
  } catch (error) {
    next(new AppError(400, 'Error creating activity log'));
  }
});

export default router;