const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const { verifyToken } = require('../middleware/auth');

const { redisClient, isRedisReady } = require('../utils/redis');

/**
 * GET /api/questions/:year/:role
 * Get all questions for a specific year and role
 */
router.get('/:year/:role', verifyToken, async (req, res) => {
  try {
    const { year, role } = req.params;

    // Validate inputs
    if (![0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(parseInt(year))) {
      return res.status(400).json({ error: 'Invalid year (0-10)' });
    }

    if (!['cto', 'cfo', 'pm', 'fun'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const cacheKey = `qs:${year}:${role}`;
    
    if (isRedisReady()) {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        console.log(`[Redis Hit] Serving questions for ${cacheKey}`);
        return res.status(200).json(JSON.parse(cachedData));
      }
    }

    console.log(`[Redis Miss] Fetching questions from DB for ${cacheKey}`);
    const questions = await Question.find(
      { 
        year: parseInt(year), 
        $or: [{ role }, { role: 'fun' }]
      },
      '-correctAnswer -explanation -scalingEffect'
    );

    if (!questions.length) {
      return res.status(200).json({ year: parseInt(year), role, count: 0, questions: [] });
    }

    const responseObj = {
      year: parseInt(year),
      role,
      count: questions.length,
      questions
    };

    // Cache the response for 1 hour
    if (isRedisReady()) {
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(responseObj));
    }

    res.status(200).json(responseObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/questions/:questionId
 * Get a specific question (for admin/preview)
 */
router.get('/question/:questionId', async (req, res) => {
  try {
    const { questionId } = req.params;

    const question = await Question.findOne({ questionId });
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.status(200).json(question);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
