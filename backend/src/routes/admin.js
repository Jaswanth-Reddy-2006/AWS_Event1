const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const Question = require('../models/Question');
const GameSettings = require('../models/GameSettings');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { redisClient, isRedisReady } = require('../utils/redis');

/**
 * GET /api/admin/settings
 * Get global game settings
 */
router.get('/settings', verifyToken, async (req, res) => {
  try {
    const cacheKey = 'global:settings';
    
    // Check Cache
    if (isRedisReady()) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log('[Redis Hit] Serving global settings');
        return res.status(200).json(JSON.parse(cached));
      }
    }

    let settings = await GameSettings.findOne({ id: 'global_settings' });
    if (!settings) {
      settings = new GameSettings({ id: 'global_settings' });
      await settings.save();
    }

    // Save to Cache (5 min TTL)
    if (isRedisReady()) {
      await redisClient.setEx(cacheKey, 300, JSON.stringify(settings));
    }

    res.status(200).json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/settings
 * Update active round or start/stop round
 */
// In-memory round timer (resets on server restart — acceptable for single-day event)
let roundAutoCloseTimer = null;

router.post('/settings', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { currentRound, isRoundActive, resetRoundData, activeFunQuestionId } = req.body;

    // Build update object — only include fields that were explicitly sent
    const updateFields = { lastUpdated: new Date() };
    if (currentRound !== undefined) updateFields.currentRound = currentRound;
    if (isRoundActive !== undefined) updateFields.isRoundActive = isRoundActive;
    if (activeFunQuestionId !== undefined) updateFields.activeFunQuestionId = activeFunQuestionId;

    // When starting a round, record the start time for timer enforcement
    if (isRoundActive === true) {
      updateFields.roundStartedAt = new Date();

      // Clear any existing timer
      if (roundAutoCloseTimer) {
        clearTimeout(roundAutoCloseTimer);
        roundAutoCloseTimer = null;
      }

      // Auto-close after 20 minutes
      roundAutoCloseTimer = setTimeout(async () => {
        try {
          await GameSettings.findOneAndUpdate(
            { id: 'global_settings' },
            { isRoundActive: false, lastUpdated: new Date() }
          );
          console.log(`[TIMER] Round ${currentRound + 1} auto-closed after 20 minutes.`);

          // Invalidate caches
          if (isRedisReady()) {
            await redisClient.del('global:settings');
            await redisClient.del('global:leaderboard');
          }
        } catch (e) {
          console.error('[TIMER] Auto-close error:', e);
        }
        roundAutoCloseTimer = null;
      }, 20 * 60 * 1000); // 20 minutes

    } else if (isRoundActive === false) {
      if (roundAutoCloseTimer) {
        clearTimeout(roundAutoCloseTimer);
        roundAutoCloseTimer = null;
      }
    }

    const settings = await GameSettings.findOneAndUpdate(
      { id: 'global_settings' },
      updateFields,
      { new: true, upsert: true }
    );

    if (resetRoundData !== undefined && resetRoundData !== null) {
       const updateObj = {};
       updateObj[`gameState.year${resetRoundData}`] = { 
           answers: { cto: {}, cfo: {}, pm: {} }, 
           scores: { cto: 0, cfo: 0, pm: 0, roundAvg: 0 }, 
           questionScores: { cto: {}, cfo: {}, pm: {} },
           companyState: { monthlyBill: 0, monthlyRevenue: 0, runwayMonths: 0, cumulativeProfit: 0 } 
       };
       
       await Team.updateMany({ teamId: { $ne: 'ADMIN-EVENT-2026' } }, {
          $set: updateObj
       });
    }

    // Invalidate caches
    if (isRedisReady()) {
      await redisClient.del('global:settings');
      await redisClient.del('global:leaderboard');
    }

    res.status(200).json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/**
 * GET /api/admin/teams
 */
router.get('/teams', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const teams = await Team.find(
      { teamId: { $ne: 'ADMIN-EVENT-2026' } },
      'teamId teamName members currentYear eventStatus points finalScore gameState college department domain population'
    );

    res.status(200).json({
      total: teams.length,
      teams: teams.map(team => ({
        _id: team._id,
        teamId: team.teamId,
        teamName: team.teamName,
        college: team.college,
        department: team.department,
        domain: team.domain,
        population: team.population,
        members: team.members ? team.members.map(m => ({
          name: m.name,
          role: m.role,
          password: m.plainPassword || null,
          hasPassword: !!m.password
        })) : [],
        status: team.eventStatus,
        currentYear: team.currentYear,
        points: team.points || 0,
        cumulativeProfit: team.finalScore?.cumulativeProfit || 0,
        gameState: team.gameState
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/reset-game
 */
router.post('/reset-game', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { resetType } = req.body;
    const Submission = require('../models/Submission');
    
    if (resetType === 'total') {
      // DANGEROUS: Wipes all teams except main admin
      await Team.deleteMany({ teamId: { $ne: 'ADMIN-EVENT-2026' } });
      await Submission.deleteMany({});
    } else {
      // PARTIAL: Wipes submissions and resets progress but keeps teams and questions
      await Submission.deleteMany({});
      await Team.updateMany({ teamId: { $ne: 'ADMIN-EVENT-2026' } }, { 
        currentYear: 0, 
        points: 0, 
        eventStatus: 'registered',
        fraudFlags: { tabSwitches: 0, multiDeviceLogin: false, fastSubmissions: 0 },
        gameState: { 
          year0: { answers: { cto: {}, cfo: {}, pm: {} }, scores: { cto: 0, cfo: 0, pm: 0, roundAvg: 0 }, companyState: { monthlyBill: 0, monthlyRevenue: 0, runwayMonths: 0, cumulativeProfit: 0 } },
          year1: { answers: { cto: {}, cfo: {}, pm: {} }, scores: { cto: 0, cfo: 0, pm: 0, roundAvg: 0 }, companyState: { monthlyBill: 0, monthlyRevenue: 0, runwayMonths: 0, cumulativeProfit: 0 } },
          year2: { answers: { cto: {}, cfo: {}, pm: {} }, scores: { cto: 0, cfo: 0, pm: 0, roundAvg: 0 }, companyState: { monthlyBill: 0, monthlyRevenue: 0, runwayMonths: 0, cumulativeProfit: 0 } },
          year3: { answers: { cto: {}, cfo: {}, pm: {} }, scores: { cto: 0, cfo: 0, pm: 0, roundAvg: 0 }, companyState: { monthlyBill: 0, monthlyRevenue: 0, runwayMonths: 0, cumulativeProfit: 0 } },
          year4: { answers: { cto: {}, cfo: {}, pm: {} }, scores: { cto: 0, cfo: 0, pm: 0, roundAvg: 0 }, companyState: { monthlyBill: 0, monthlyRevenue: 0, runwayMonths: 0, cumulativeProfit: 0 } },
          violations: [] 
        },
        finalScore: { cumulativeProfit: 0, totalScore: 0, rank: 0 }
      });
    }

    // Reset global round settings
    await GameSettings.findOneAndUpdate(
      { id: 'global_settings' },
      { currentRound: 0, isRoundActive: false, lastUpdated: new Date() }
    );

    res.status(200).json({ success: true, message: 'Game re-initialized successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/round-submissions/:round
 * Get submission stats for a specific round
 */
router.get('/round-submissions/:round', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const round = parseInt(req.params.round);
    const teams = await Team.find(
      { teamId: { $ne: 'ADMIN-EVENT-2026' } },
      `teamId teamName gameState.year${round}`
    );

    const totalTeams = teams.length;
    let ctoSubmitted = 0, cfoSubmitted = 0, pmSubmitted = 0;
    const teamDetails = [];

    teams.forEach(team => {
      const yearData = team.gameState?.[`year${round}`];
      const ctoAnswers = yearData?.answers?.cto || {};
      const cfoAnswers = yearData?.answers?.cfo || {};
      const pmAnswers = yearData?.answers?.pm || {};
      const ctoDone = Object.keys(ctoAnswers).length > 0;
      const cfoDone = Object.keys(cfoAnswers).length > 0;
      const pmDone = Object.keys(pmAnswers).length > 0;

      if (ctoDone) ctoSubmitted++;
      if (cfoDone) cfoSubmitted++;
      if (pmDone) pmSubmitted++;

      teamDetails.push({
        teamId: team.teamId,
        teamName: team.teamName,
        cto: ctoDone,
        cfo: cfoDone,
        pm: pmDone,
        allDone: ctoDone && cfoDone && pmDone
      });
    });

    const allTeamsComplete = teamDetails.every(t => t.allDone);

    res.status(200).json({
      round,
      totalTeams,
      ctoSubmitted,
      cfoSubmitted,
      pmSubmitted,
      allTeamsComplete,
      teams: teamDetails
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/admin/teams/:teamId
 * Delete a single team and its submissions
 */
router.delete('/teams/:teamId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { teamId } = req.params;
    if (teamId === 'ADMIN-EVENT-2026') {
      return res.status(403).json({ error: 'Cannot delete admin team.' });
    }
    const Submission = require('../models/Submission');
    await Team.deleteOne({ teamId });
    await Submission.deleteMany({ teamId });
    if (isRedisReady()) {
      await redisClient.del('global:leaderboard');
    }
    res.status(200).json({ success: true, message: `Team ${teamId} deleted.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/admin/teams/:teamId/reset-password
 * Reset a team member's password (admin only)
 */
router.put('/teams/:teamId/reset-password', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { role, newPassword } = req.body;
    if (!role || !newPassword) return res.status(400).json({ error: 'role and newPassword required' });

    const team = await Team.findOne({ teamId });
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const member = team.members.find(m => m.role === role.toLowerCase());
    if (!member) return res.status(404).json({ error: `No ${role} member found` });

    member.password = await bcrypt.hash(newPassword, 10);
    member.plainPassword = newPassword;
    await team.save();

    res.status(200).json({ success: true, message: `Password reset for ${role} in team ${teamId}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Question Management (CRUD)
 */
router.get('/questions', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const questions = await Question.find().sort({ year: 1, role: 1 });
    res.status(200).json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/questions', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { year, role, question, options, correctAnswer, scoringRubric, type, scenario, acceptableRange, assetUrl } = req.body;
    const questionId = `Q-${year}-${role}-${Date.now()}`;
    const newQuestion = new Question({
      questionId,
      year,
      role,
      question,
      options,
      correctAnswer,
      type: type || 'mcq',
      assetUrl,
      scenario: scenario || 'AWS Operational Event',
      scoringRubric: scoringRubric || { full: 10, partial: 0, incorrect: 0 },
      acceptableRange: acceptableRange
    });
    await newQuestion.save();

    if (isRedisReady()) {
      const keys = await redisClient.keys('qs:*');
      if (keys.length > 0) await redisClient.del(keys);
    }

    res.status(201).json(newQuestion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/questions/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const updated = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (isRedisReady()) {
      const keys = await redisClient.keys('qs:*');
      if (keys.length > 0) await redisClient.del(keys);
    }

    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/questions/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await Question.findByIdAndDelete(req.params.id);

    if (isRedisReady()) {
      const keys = await redisClient.keys('qs:*');
      if (keys.length > 0) await redisClient.del(keys);
    }

    res.status(200).json({ message: 'Question eliminated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Create Admin
 */
const bcrypt = require('bcryptjs');

router.post('/create-admin', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { teamId, memberName, password } = req.body;
    if (await Team.findOne({ teamId })) return res.status(400).json({ error: 'Admin ID exists' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const adminTeam = new Team({
      teamId, teamName: 'Admin Control',
      members: [{ name: memberName, role: 'admin', password: hashedPassword, userId: `admin-${Date.now()}` }],
      currentYear: 0, eventStatus: 'registered'
    });
    await adminTeam.save();
    res.status(201).json({ message: 'Admin created successfully', teamId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/broadcast
 * Send announcement to all connected clients (stored in settings for polling)
 */
router.post('/broadcast', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { message, type } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });

    const broadcast = { message, type: type || 'info', timestamp: new Date() };

    const settings = await GameSettings.findOneAndUpdate(
      { id: 'global_settings' },
      {
        $push: {
          broadcasts: {
            $each: [broadcast],
            $slice: -50
          }
        }
      },
      { new: true, upsert: true }
    );

    if (isRedisReady()) {
      await redisClient.del('global:settings');
    }

    const saved = settings.broadcasts?.slice(-1)[0];
    const io = req.app.get('io');
    if (io) {
      io.emit('broadcast', saved);
    }

    res.status(200).json({ success: true, broadcast: saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/broadcasts', verifyToken, async (req, res) => {
  try {
    const settings = await GameSettings.findOne({ id: 'global_settings' }, 'broadcasts');
    res.status(200).json({ broadcasts: settings?.broadcasts || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/broadcasts', verifyToken, verifyAdmin, async (req, res) => {
  try {
    await GameSettings.findOneAndUpdate(
      { id: 'global_settings' },
      { $set: { broadcasts: [] } }
    );
    if (isRedisReady()) {
      await redisClient.del('global:settings');
    }
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/analytics
 * Per-question analytics: how many answered, how many got each option
 */
router.get('/analytics', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const questions = await Question.find().sort({ year: 1, role: 1 });
    const teams = await Team.find({ teamId: { $ne: 'ADMIN-EVENT-2026' } }, 'gameState');

    const analytics = questions.map(q => {
      const yearKey = `year${q.year}`;
      let totalAnswered = 0;
      let totalCorrect = 0;
      const optionCounts = {};

      teams.forEach(team => {
        const roleAnswers = team.gameState?.[yearKey]?.answers?.[q.role];
        if (!roleAnswers || typeof roleAnswers !== 'object') return;

        const answer = roleAnswers[q.questionId];
        if (answer === undefined || answer === '') return;

        totalAnswered++;

        if (q.type === 'mcq' || q.type === 'truefalse') {
          optionCounts[answer] = (optionCounts[answer] || 0) + 1;
          if (answer === q.correctAnswer) totalCorrect++;
        } else if (q.type === 'multi-select') {
          const correct = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
          if (Array.isArray(answer)) {
            answer.forEach(a => { optionCounts[a] = (optionCounts[a] || 0) + 1; });
            if (JSON.stringify([...answer].sort()) === JSON.stringify([...correct].sort())) totalCorrect++;
          }
        } else {
          // Normalized text comparison for short answers
          if (typeof answer === 'string' && typeof q.correctAnswer === 'string') {
            const normalize = (s) => String(s).replace(/\s+/g, '').toLowerCase();
            if (normalize(answer) === normalize(q.correctAnswer)) totalCorrect++;
          } else if (answer === q.correctAnswer) {
            totalCorrect++;
          }
        }
      });

      return {
        questionId: q.questionId,
        question: q.question?.substring(0, 80),
        type: q.type,
        year: q.year,
        role: q.role,
        totalTeams: teams.length,
        totalAnswered,
        totalCorrect,
        accuracy: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
        optionCounts
      };
    });

    res.status(200).json(analytics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/session-recovery
 * Admin grants a player access to re-enter their session
 */
router.post('/session-recovery', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { teamId, role, year } = req.body;
    if (!teamId || !role || year === undefined) {
      return res.status(400).json({ error: 'teamId, role, and year are required' });
    }

    const team = await Team.findOne({ teamId });
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const yearKey = `year${year}`;
    const answers = team.gameState?.[yearKey]?.answers?.[role.toLowerCase()];

    if (answers?.disqualified) {
      team.gameState[yearKey].answers[role.toLowerCase()] = {};
      if (team.gameState[yearKey].scores) {
        team.gameState[yearKey].scores[role.toLowerCase()] = 0;
      }
      team.markModified('gameState');
      await team.save();

      if (isRedisReady()) {
        await redisClient.del('global:leaderboard');
      }

      return res.status(200).json({ success: true, message: `Session recovered for ${role} in ${teamId}. Player can re-enter round ${parseInt(year) + 1}.` });
    }

    if (answers && Object.keys(answers).length > 0) {
      return res.status(400).json({ error: 'Player already submitted answers. Cannot recover a completed session.' });
    }

    res.status(200).json({ success: true, message: 'No recovery needed — player has not been disqualified or submitted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/admin/activate-fun-question
 */
router.post('/activate-fun-question', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { questionId } = req.body;
    if (!questionId) return res.status(400).json({ error: 'Question ID required' });

    const settings = await GameSettings.findOneAndUpdate(
      { id: 'global_settings' },
      { activeFunQuestionId: questionId, lastUpdated: new Date() },
      { new: true }
    );

    if (isRedisReady()) {
      await redisClient.del('global:settings');
    }

    res.status(200).json({ success: true, activeFunQuestionId: settings.activeFunQuestionId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/active-question-stats
 */
router.get('/active-question-stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const settings = await GameSettings.findOne({ id: 'global_settings' });
    const qId = settings?.activeFunQuestionId;
    const year = settings?.currentRound;
    const totalTeams = await Team.countDocuments({ teamId: { $ne: 'ADMIN-EVENT-2026' } });

    if (!qId || year < 5) {
      return res.json({ answeredCount: 0, totalTeams, perQuestion: [] });
    }

    const Submission = require('../models/Submission');
    const Question = require('../models/Question');

    const answeredTeams = await Submission.distinct('teamId', {
      year,
      [`scores.questionScores.${qId}`]: { $gt: 0 }
    });
    const answeredCount = answeredTeams.length;

    const funQuestions = await Question.find({ year, role: 'fun' }, 'questionId questionText');
    const perQuestion = [];
    for (const q of funQuestions) {
      const teams = await Submission.distinct('teamId', {
        year,
        [`scores.questionScores.${q.questionId}`]: { $gt: 0 }
      });
      perQuestion.push({ questionId: q.questionId, text: q.questionText, correctCount: teams.length });
    }

    res.status(200).json({ answeredCount, totalTeams, activeQId: qId, perQuestion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/round-stats
 * Comprehensive stats for the current round completion
 */
router.get('/round-stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const settings = await GameSettings.findOne({ id: 'global_settings' });
    const year = settings?.currentRound || 0;
    const yearKey = `year${year}`;

    const teams = await Team.find({ teamId: { $ne: 'ADMIN-EVENT-2026' } });
    const totalTeams = teams.length;
    let totalParticipants = 0;
    let onlinePeople = 0;
    
    let ctoCompleted = 0;
    let cfoCompleted = 0;
    let pmCompleted = 0;
    let teamsFullyCompleted = 0;

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    teams.forEach(team => {
      totalParticipants += (team.members?.length || 0);
      
      // Track online status (any member logged in last 5 mins)
      const isOnline = team.members?.some(m => m.lastLogin && new Date(m.lastLogin) > fiveMinutesAgo);
      if (isOnline) onlinePeople++;

      const yd = team.gameState?.[yearKey];
      if (yd?.answers) {
        const ctoDone = yd.answers.cto && Object.keys(yd.answers.cto).length > 0;
        const cfoDone = yd.answers.cfo && Object.keys(yd.answers.cfo).length > 0;
        const pmDone = yd.answers.pm && Object.keys(yd.answers.pm).length > 0;
        const funDone = yd.answers.fun && Object.keys(yd.answers.fun).length > 0;
        
        if (ctoDone) ctoCompleted++;
        if (cfoDone) cfoCompleted++;
        if (pmDone) pmCompleted++;
        if (funDone) {
            ctoCompleted++; // For fun rounds, we can just increment these or add a new field
            cfoCompleted++;
            pmCompleted++;
        }
        if ((year < 5 && ctoDone && cfoDone && pmDone) || (year >= 5 && funDone)) teamsFullyCompleted++;
      }
    });

    res.json({
      totalTeams,
      totalParticipants,
      onlinePeople,
      ctoCompleted,
      cfoCompleted,
      pmCompleted,
      teamsFullyCompleted,
      isRoundActive: settings?.isRoundActive,
      currentRound: year,
      activeFunQuestionId: settings?.activeFunQuestionId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
