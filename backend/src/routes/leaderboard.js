const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const { redisClient, isRedisReady } = require('../utils/redis');

/**
 * GET /api/leaderboard
 * Get live leaderboard
 */
router.get('/', async (req, res) => {
  try {
    const cacheKey = 'global:leaderboard';
    
    if (isRedisReady()) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log('[Redis Hit] Serving Leaderboard Cache');
        return res.status(200).json(JSON.parse(cached));
      }
    }

    const teams = await Team.find(
      { eventStatus: { $in: ['registered', 'in-progress', 'completed'] }, teamId: { $ne: 'ADMIN-EVENT-2026' } },
      'teamId teamName gameState finalScore points createdAt'
    )
      .sort({ 'finalScore.cumulativeProfit': -1, createdAt: 1 })
      .limit(100);

    const Question = require('../models/Question');
    const questions = await Question.find({}, 'year role scoringRubric');
    const maxScores = {}; // { year_role: maxScore }
    
    questions.forEach(q => {
        const key = `${q.year}_${q.role}`;
        // Standard rounds: 100 pts. Fun rounds (Year >= 5): 1000 pts potential.
        let score = (q.scoringRubric?.full && q.scoringRubric.full !== 10) ? q.scoringRubric.full : 100;
        if (parseInt(q.year) >= 5) score = 1000; 
        
        maxScores[key] = (maxScores[key] || 0) + score;
    });

    const unsortedLeaderboard = teams.map((team, idx) => {
      let totalScoreSum = 0;
      let totalEfficiencySum = 0;
      let roundsWithSubmissions = 0;
      let totalTimeSpent = 0;
      let anyTimeSpent = false;
      const roundDetails = {};
      
      // Support standard rounds (Year 0-4)
      for (let i = 0; i <= 4; i++) {
          const rd = team.gameState?.[`year${i}`];
          if (rd && rd.answers) {
              const roles = ['cto', 'cfo', 'pm'];
              let roundEfficiencySum = 0;
              let rolesInRound = 0;
              let roundScore = 0;

              roles.forEach(role => {
                  const hasSubmitted = Object.keys(rd.answers[role] || {}).length > 0;
                  if (hasSubmitted) {
                      const score = rd.scores?.[role] || 0;
                      const max = maxScores[`${i}_${role}`] || 100;
                      roundEfficiencySum += (score / max) * 100;
                      rolesInRound++;
                      roundScore += score;
                  }
              });

              // Special case for Fun Rounds or combined scores if 'fun' role exists
              if (rd.answers.fun && Object.keys(rd.answers.fun).length > 0) {
                  const score = rd.scores?.fun || 0;
                  const max = maxScores[`${i}_fun`] || 100;
                  roundEfficiencySum += (score / max) * 100;
                  rolesInRound++;
                  roundScore += score;
              }

              if (rolesInRound > 0) {
                  const roundEfficiency = Math.min(100, Math.round(roundEfficiencySum / rolesInRound));
                  roundDetails[`year${i}Points`] = roundScore;
                  roundDetails[`year${i}Efficiency`] = roundEfficiency;
                  
                  totalScoreSum += roundScore;
                  totalEfficiencySum += roundEfficiency;
                  roundsWithSubmissions++;
              } else {
                  roundDetails[`year${i}Points`] = 0;
                  roundDetails[`year${i}Efficiency`] = 0;
              }

              // Time calculation
              let roundTime = 0;
              if (rolesInRound === 3) {
                const avgTimeSpent = (
                  (rd.timeSpent?.cto || 0) +
                  (rd.timeSpent?.cfo || 0) +
                  (rd.timeSpent?.pm || 0)
                ) / 3;
                roundTime = Math.round(avgTimeSpent);
                totalTimeSpent += roundTime;
                anyTimeSpent = true;
              }
              roundDetails[`year${i}Time`] = roundTime;

          } else {
              roundDetails[`year${i}Points`] = 0;
              roundDetails[`year${i}Time`] = 0;
              roundDetails[`year${i}Efficiency`] = 0;
          }
      }
                               
      const avgEfficiency = roundsWithSubmissions > 0 ? Math.round(totalEfficiencySum / roundsWithSubmissions) : 0;

      return {
          teamId: team.teamId,
          teamName: team.teamName,
          ...roundDetails,
          status: team.eventStatus,
          scoreSum: totalScoreSum, 
          avgEfficiency: Math.min(100, avgEfficiency),
          totalTimeSpent: anyTimeSpent ? totalTimeSpent : undefined,
          createdAt: team.createdAt
      };
    });

    // Sort by avgEfficiency desc, then scoreSum desc, then totalTimeSpent asc, then createdAt asc
    unsortedLeaderboard.sort((a, b) => {
        if (b.avgEfficiency !== a.avgEfficiency) {
            return b.avgEfficiency - a.avgEfficiency;
        }
        if (b.scoreSum !== a.scoreSum) {
            return b.scoreSum - a.scoreSum;
        }
        const timeA = a.totalTimeSpent ?? Infinity;
        const timeB = b.totalTimeSpent ?? Infinity;
        if (timeA !== timeB) {
            return timeA - timeB;
        }
        return new Date(a.createdAt) - new Date(b.createdAt);
    });

    const leaderboard = unsortedLeaderboard.map((team, idx) => ({
        ...team,
        rank: idx + 1
    }));

    const result = {
      timestamp: new Date().toISOString(),
      totalTeams: leaderboard.length,
      leaderboard
    };

    if (isRedisReady()) {
      await redisClient.setEx(cacheKey, 5, JSON.stringify(result));
    }

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/leaderboard/:teamId
 * Get specific team's leaderboard position
 */
router.get('/team/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findOne({ teamId });
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const position = await Team.countDocuments({
      eventStatus: { $in: ['in-progress', 'completed'] },
      'finalScore.cumulativeProfit': { $gt: team.finalScore?.cumulativeProfit || 0 }
    });

    res.status(200).json({
      teamId,
      teamName: team.teamName,
      rank: position + 1,
      cumulativeProfit: team.finalScore?.cumulativeProfit || 0,
      currentYear: team.currentYear,
      status: team.eventStatus
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/leaderboard/fun
 * Get Fun Round leaderboard
 */
router.get('/fun', async (req, res) => {
  try {
    const cacheKey = 'global:leaderboard:fun';

    if (isRedisReady()) {
      const cached = await redisClient.get(cacheKey);
      if (cached) return res.status(200).json(JSON.parse(cached));
    }

    const teams = await Team.find(
      { teamId: { $ne: 'ADMIN-EVENT-2026' } },
      'teamId teamName gameState funPoints createdAt'
    ).limit(100);

    const unsortedLeaderboard = teams.map((team) => {
      const funScoresByRound = {};
      let totalFunPoints = 0;

      for (let i = 5; i <= 10; i++) {
        const yd = team.gameState?.[`year${i}`];
        const roundScore = (yd?.scores?.cto || 0) + (yd?.scores?.cfo || 0) + (yd?.scores?.pm || 0);
        funScoresByRound[`f${i - 4}`] = roundScore;
        totalFunPoints += roundScore;
      }

      return {
        teamId: team.teamId,
        teamName: team.teamName,
        funPoints: totalFunPoints,
        ...funScoresByRound,
        createdAt: team.createdAt
      };
    });

    unsortedLeaderboard.sort((a, b) => {
      if (b.funPoints !== a.funPoints) return b.funPoints - a.funPoints;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    const leaderboard = unsortedLeaderboard.map((team, idx) => ({
      ...team,
      rank: idx + 1
    }));

    const result = {
      timestamp: new Date().toISOString(),
      totalTeams: leaderboard.length,
      leaderboard
    };

    if (isRedisReady()) {
      await redisClient.setEx(cacheKey, 1, JSON.stringify(result));
    }

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
