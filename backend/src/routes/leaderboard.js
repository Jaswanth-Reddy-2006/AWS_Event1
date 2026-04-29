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

    const unsortedLeaderboard = teams.map((team, idx) => {
      let scoreSum = 0;
      let rolesCount = 0;
      let totalTimeSpent = 0;
      let anyTimeSpent = false;
      const roundDetails = {};
      
      // Support all 11 rounds (Year 0-10)
      for (let i = 0; i <= 10; i++) {
          const rd = team.gameState?.[`year${i}`];
          if (rd && rd.answers) {
              const ctoDone = Object.keys(rd.answers.cto || {}).length > 0;
              const cfoDone = Object.keys(rd.answers.cfo || {}).length > 0;
              const pmDone = Object.keys(rd.answers.pm || {}).length > 0;
              
              let roundScore = 0;
              if (ctoDone) { rolesCount++; roundScore += (rd.scores?.cto || 0); }
              if (cfoDone) { rolesCount++; roundScore += (rd.scores?.cfo || 0); }
              if (pmDone)  { rolesCount++; roundScore += (rd.scores?.pm || 0); }
              
              scoreSum += roundScore;

              let roundTime = 0;
              if (ctoDone && cfoDone && pmDone) {
                const avgTimeSpent = (
                  (rd.timeSpent?.cto || 0) +
                  (rd.timeSpent?.cfo || 0) +
                  (rd.timeSpent?.pm || 0)
                ) / 3;
                roundTime = Math.round(avgTimeSpent);
                totalTimeSpent += roundTime;
                anyTimeSpent = true;
              }

              roundDetails[`year${i}Points`] = roundScore;
              roundDetails[`year${i}Time`] = roundTime;
              roundDetails[`year${i}Efficiency`] = roundScore > 0 ? Math.round((roundScore / 30) * 100) : 0;
          } else {
              roundDetails[`year${i}Points`] = 0;
              roundDetails[`year${i}Time`] = 0;
              roundDetails[`year${i}Efficiency`] = 0;
          }
      }
                               
      const rawEfficiency = rolesCount > 0 ? Math.round((scoreSum / (Math.ceil(rolesCount/3) * 30)) * 100) : 0;
      const avgEfficiency = Math.min(100, rawEfficiency);

      return {
          teamId: team.teamId,
          teamName: team.teamName,
          ...roundDetails,
          status: team.eventStatus,
          scoreSum: scoreSum, 
          avgEfficiency: avgEfficiency,
          totalTimeSpent: anyTimeSpent ? totalTimeSpent : undefined,
          createdAt: team.createdAt
      };
    });

    // Sort by scoreSum desc, then totalTimeSpent asc, then createdAt asc
    unsortedLeaderboard.sort((a, b) => {
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
    )
      .sort({ funPoints: -1, createdAt: 1 })
      .limit(100);

    const leaderboard = teams.map((team, idx) => {
      const funScoresByRound = {};
      let totalProfit = 0;
      let totalEfficiency = 0;
      let totalTime = 0;
      let roundsCounted = 0;

      // Support fun rounds starting from Year 5 (Round 6) to Year 10 (Round 11)
      for (let i = 5; i <= 10; i++) {
        const yd = team.gameState?.[`year${i}`];
        funScoresByRound[`f${i-4}`] = yd?.scores?.fun || 0;
        
        // Also aggregate overall metrics if available
        totalProfit += (yd?.scores?.total || 0);
        if (yd?.efficiency) {
            totalEfficiency += yd.efficiency;
            roundsCounted++;
        }
        totalTime += (yd?.performance?.timeSpent || 0);
      }

      return {
          teamId: team.teamId,
          teamName: team.teamName,
          funPoints: team.funPoints || 0,
          totalProfit,
          avgEfficiency: roundsCounted > 0 ? (totalEfficiency / roundsCounted) : 0,
          totalTime,
          ...funScoresByRound,
          rank: idx + 1
      };
    });

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

module.exports = router;
