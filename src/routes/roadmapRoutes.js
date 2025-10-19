import express from 'express';
import { aiService } from '../services/aiService.js';

const router = express.Router();

// POST /api/roadmap
// body: { topic: string, profile: { level, weeks, goals } }
router.post('/', async (req, res) => {
  try {
    const { topic, profile } = req.body;
    if (!topic) return res.status(400).json({ error: 'Missing topic' });
    const roadmap = await aiService.generateRoadmap(topic, profile);
    res.json(roadmap);
  } catch (error) {
    console.error('Error generating roadmap:', error);
    res.status(500).json({ error: 'Failed to generate roadmap' });
  }
});

export default router;
