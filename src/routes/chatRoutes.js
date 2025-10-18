// src/routes/chatRoutes.js
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();
const prisma = new PrismaClient();

// Get chat messages for a room with pagination
router.get('/:roomId', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      prisma.chatMessage.findMany({
        where: { roomId: req.params.roomId },
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' }
      }),
      prisma.chatMessage.count({
        where: { roomId: req.params.roomId }
      })
    ]);

    res.json({
      status: 'success',
      results: messages.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: messages
    });
  } catch (error) {
    next(new AppError(500, 'Error fetching chat messages'));
  }
});

// Store chat message
router.post('/', async (req, res, next) => {
  try {
    const message = await prisma.chatMessage.create({
      data: {
        content: req.body.content,
        username: req.body.username,
        roomId: req.body.roomId
      }
    });

    res.status(201).json({
      status: 'success',
      data: message
    });
  } catch (error) {
    next(new AppError(400, 'Error creating chat message'));
  }
});

export default router;