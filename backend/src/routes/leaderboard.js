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
      
      for (let i = 0; i <= 6; i++) {
          const rd = team.gameState?.[`year${i}`];
          if (rd && rd.answers) {
              const ctoDone = Object.keys(rd.answers.cto || {}).length > 0;
              const cfoDone = Object.keys(rd.answers.cfo || {}).length > 0;
              const pmDone = Object.keys(rd.answers.pm || {}).length > 0;
              
              if (ctoDone) { rolesCount++; scoreSum += (rd.scores?.cto || 0); }
              if (cfoDone) { rolesCount++; scoreSum += (rd.scores?.cfo || 0); }
              if (pmDone)  { rolesCount++; scoreSum += (rd.scores?.pm || 0); }
              
              // Output time is ONLY calculated when ALL 3 roles are submitted
              if (ctoDone && cfoDone && pmDone) {
                const avgTimeSpent = (
                  (rd.timeSpent?.cto || 0) +
                  (rd.timeSpent?.cfo || 0) +
                  (rd.timeSpent?.pm || 0)
                ) / 3;
                // Output Time is the raw average time spent by the 3 roles (used for tie-breaking)
                const roundOutputTime = Math.round(avgTimeSpent);
                totalTimeSpent += roundOutputTime;
                anyTimeSpent = true;
              }
          }
      }
                               
      const rawEfficiency = rolesCount > 0 ? Math.round((scoreSum / (Math.ceil(rolesCount/3) * 30)) * 100) : 0;
      const avgEfficiency = Math.min(100, rawEfficiency);

      const getRoundPoints = (idx) => {
          const yd = team.gameState?.[`year${idx}`];
          if (!yd) return 0;
          return (yd.scores?.cto || 0) + (yd.scores?.cfo || 0) + (yd.scores?.pm || 0);
      };

      return {
          teamId: team.teamId,
          teamName: team.teamName,
          currentYear: team.currentYear,
          year0Points: getRoundPoints(0),
          year1Points: getRoundPoints(1),
          year2Points: getRoundPoints(2),
          year3Points: getRoundPoints(3),
          year4Points: getRoundPoints(4),
          year5Points: getRoundPoints(5),
          year6Points: getRoundPoints(6),
          status: team.eventStatus,
          scoreSum: scoreSum, // Use for sorting
          cumulativeProfit: team.finalScore?.cumulativeProfit || 0,
          avgEfficiency: avgEfficiency,
          totalTimeSpent: anyTimeSpent ? totalTimeSpent : undefined,
          createdAt: team.createdAt
      };
    });

    // Sort by scoreSum desc (Live Valuation), then totalTimeSpent asc, then createdAt asc
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
      const getFunPoints = (yearIdx) => {
          const yd = team.gameState?.[`year${yearIdx}`];
          return yd?.scores?.fun || 0;
      };

      return {
          teamId: team.teamId,
          teamName: team.teamName,
          funPoints: team.funPoints || 0,
          f1: getFunPoints(5),
          f2: getFunPoints(6),
          f3: getFunPoints(7),
          f4: getFunPoints(8),
          f5: getFunPoints(9),
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
