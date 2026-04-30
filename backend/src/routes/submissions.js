const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const Submission = require('../models/Submission');
const Question = require('../models/Question');
const { verifyToken } = require('../middleware/auth');
const { 
  generateSubmissionId, 
  scoreAnswer, 
  calculateRoleScore,
  checkSuspiciousPatterns,
  formatCompanyState
} = require('../utils/helpers');
const { 
  calculateYear2StartingState,
  calculateYear3StartingState,
  applyMarketEvent
} = require('../utils/cascadeLogic');
const { redisClient, isRedisReady } = require('../utils/redis');

/**
 * POST /api/submissions/:year
 * Submit answers for a year
 */
router.post('/:year', verifyToken, async (req, res) => {
  try {
    const { year } = req.params;
    const { answers } = req.body;
    const { teamId, userId, role } = req.user;

    if (![0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(parseInt(year))) {
      return res.status(400).json({ error: 'Invalid year' });
    }

    // Check if round is currently active
    const GameSettings = require('../models/GameSettings');
    const settings = await GameSettings.findOne({ id: 'global_settings' });
    if (!settings || !settings.isRoundActive || settings.currentRound !== parseInt(year)) {
      return res.status(403).json({ error: 'Round is not currently active. Submission rejected.' });
    }

    // Check 20-minute timer enforcement
    if (settings.roundStartedAt) {
      const elapsed = (Date.now() - new Date(settings.roundStartedAt).getTime()) / 1000 / 60;
      if (elapsed > 20) {
        return res.status(403).json({ error: 'Round time limit exceeded. Submission rejected.' });
      }
    }

    // Get team and questions
    const [team, questions] = await Promise.all([
      Team.findOne({ teamId }),
      Question.find({ 
        year: parseInt(year), 
        $or: [{ role }, { role: 'fun' }]
      })
    ]);

    if (!team) return res.status(404).json({ error: 'Team not found' });
    if (!questions.length) return res.status(404).json({ error: 'Questions not found' });

    // Score answers
    const questionScores = {};
    for (const question of questions) {
      const userAnswer = answers[question.questionId];
      questionScores[question.questionId] = scoreAnswer(question, userAnswer);
    }

    let roleScore = calculateRoleScore(questionScores);

    // SPEED-BASED RANK SCORING FOR FUN ROUNDS (Year >= 5)
    if (parseInt(year) >= 5) {
      const activeQId = settings.activeFunQuestionId;
      if (!activeQId) return res.status(400).json({ error: 'No active fun question.' });

      // ENFORCE SINGLE PARTICIPANT: Check if ANY role from this team has already solved this question CORRECTLY
      const teamYearState = team.gameState?.[`year${year}`] || {};
      const allScores = teamYearState.questionScores || {};
      const hasAnyRoleSolved = Object.values(allScores).some(roleScores => roleScores[activeQId] > 0);
      
      if (hasAnyRoleSolved) {
        return res.status(403).json({ error: 'This question has already been solved by your team!' });
      }

      const isCorrect = questionScores[activeQId] > 0;

      if (!isCorrect) {
        return res.status(400).json({ error: 'Wrong answer! Try again.', isCorrect: false });
      }

      if (isCorrect) {
        // Count how many OTHER teams have already submitted a CORRECT answer for this specific question
        const correctSubmissionsCount = await Submission.countDocuments({
          year: parseInt(year),
          [`scores.questionScores.${activeQId}`]: { $gt: 0 },
          teamId: { $ne: teamId } // Don't count self if there was a retry (though blocked above)
        });

        // 1st: 1000, 2nd: 950, 3rd: 900... min 50
        roleScore = Math.max(50, 1000 - (correctSubmissionsCount * 50));
        console.log(`[FUN ROUND] Team ${teamId} (${role}) Correct! Rank: ${correctSubmissionsCount + 1}. Score: ${roleScore} pts`);
      } else {
        roleScore = 0;
        console.log(`[FUN ROUND] Team ${teamId} (${role}) Incorrect answer. 0 pts.`);
      }
    }
    
    // Create submission record
    const submissionId = generateSubmissionId();
    const submission = new Submission({
      submissionId,
      teamId,
      year: parseInt(year),
      role,
      answers,
      scores: {
        questionScores,
        roleTotal: Object.values(questionScores).reduce((a, b) => a + b, 0),
        rolePercentage: roleScore
      },
      timeSpentSeconds: req.body.timeSpent || 0
    });

    await submission.save();

    // Update team game state — store both answers AND questionScores for admin visibility
    const yearKey = `year${year}`;

    if (parseInt(year) >= 5) {
      // Fun rounds: MERGE answers and ADD scores (multiple questions per round)
      const updateData = {
        [`gameState.${yearKey}.timeSpent.${role}`]: req.body.timeSpent || 0,
        [`gameState.${yearKey}.submittedAt`]: new Date(),
        $inc: { points: roleScore, funPoints: roleScore }
      };
      // Merge individual answers
      for (const [qId, answer] of Object.entries(answers)) {
        updateData[`gameState.${yearKey}.answers.${role}.${qId}`] = answer;
      }
      // Merge individual question scores
      for (const [qId, score] of Object.entries(questionScores)) {
        if (score > 0) {
          updateData[`gameState.${yearKey}.questionScores.${role}.${qId}`] = score;
        }
      }
      // Add to existing score
      const existingScore = team.gameState?.[yearKey]?.scores?.[role] || 0;
      updateData[`gameState.${yearKey}.scores.${role}`] = existingScore + roleScore;

      await Team.updateOne({ teamId }, updateData);
    } else {
      // Normal rounds: replace as before
      const updateData = {
        [`gameState.${yearKey}.answers.${role}`]: answers,
        [`gameState.${yearKey}.scores.${role}`]: roleScore,
        [`gameState.${yearKey}.questionScores.${role}`]: questionScores,
        [`gameState.${yearKey}.timeSpent.${role}`]: req.body.timeSpent || 0,
        [`gameState.${yearKey}.submittedAt`]: new Date(),
        $inc: { points: roleScore }
      };
      await Team.updateOne({ teamId }, updateData);
    }

    // Invalidate Leaderboard cache so ranking updates immediately
    if (isRedisReady()) {
      await redisClient.del('global:leaderboard');
      await redisClient.del('global:leaderboard:fun');
    }

    // Check if all roles have submitted for THIS team
    const updatedTeam = await Team.findOne({ teamId });
    const checkState = updatedTeam.gameState[yearKey];
    const allSubmitted = 
      checkState && 
      Object.keys(checkState.answers.cto || {}).length > 0 &&
      Object.keys(checkState.answers.cfo || {}).length > 0 &&
      Object.keys(checkState.answers.pm || {}).length > 0;

    if (allSubmitted) {
      // Calculate cascade effects
      await processYearCompletion(teamId, year);
    }

    // Check if ALL teams have completed all 3 roles for this round
    // If so, automatically mark the round as done
    try {
      const allTeams = await Team.find({ teamId: { $ne: 'ADMIN-EVENT-2026' } });
      const allTeamsComplete = allTeams.length > 0 && allTeams.every(t => {
        const yd = t.gameState?.[yearKey];
        if (!yd || !yd.answers) return false;
        const ctoDone = yd.answers.cto && Object.keys(yd.answers.cto).length > 0;
        const cfoDone = yd.answers.cfo && Object.keys(yd.answers.cfo).length > 0;
        const pmDone = yd.answers.pm && Object.keys(yd.answers.pm).length > 0;
        return ctoDone && cfoDone && pmDone;
      });

      if (allTeamsComplete) {
        await GameSettings.findOneAndUpdate(
          { id: 'global_settings' },
          { isRoundActive: false, lastUpdated: new Date() }
        );
        console.log(`[AUTO] Round ${parseInt(year) + 1} auto-completed — all teams finished.`);
      }
    } catch (autoErr) {
      console.error('Auto-complete check error:', autoErr);
    }

    res.status(201).json({
      submissionId,
      roleScore,
      questionScores,
      allSubmitted: !!allSubmitted
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/**
 * Process year completion and cascade to next year
 */
async function processYearCompletion(teamId, year) {
  const team = await Team.findOne({ teamId });
  const yearKey = `year${year}`;

  // Aggregate all role scores (Sum of all roles for round total)
  const roundTotal = 
    (team.gameState[yearKey].scores.cto || 0) +
    (team.gameState[yearKey].scores.cfo || 0) +
    (team.gameState[yearKey].scores.pm || 0) +
    (team.gameState[yearKey].scores.fun || 0);
  
  const participantsCount = (parseInt(year) >= 5) ? 3 : 3; // Keep consistent for consistency or divide by roles that submitted
  const avgTimeSpent = (
    (team.gameState[yearKey].timeSpent?.cto || 0) +
    (team.gameState[yearKey].timeSpent?.cfo || 0) +
    (team.gameState[yearKey].timeSpent?.pm || 0) +
    (team.gameState[yearKey].timeSpent?.fun || 0)
  ) / 3;

  // Output Time is the raw average time spent (used for tie-breaking)
  const outputTime = Math.round(avgTimeSpent);

  if (!team.gameState[yearKey].timeSpent) {
      team.gameState[yearKey].timeSpent = { cto: 0, cfo: 0, pm: 0, fun: 0 };
  }
  team.gameState[yearKey].timeSpent.outputTime = outputTime;
  team.gameState[yearKey].scores.roundAvg = roundTotal; 
  // team.points and team.funPoints are now handled live in the submission route


  // For Fun Rounds, we skip tycoon logic (revenue, bill, runway etc)
  if (parseInt(year) >= 5) {
     if (!team.gameState[yearKey].companyState) {
         team.gameState[yearKey].companyState = { ...team.gameState[`year${parseInt(year)-1}`]?.companyState } || {};
     }
     await team.save();
     return;
  }

  // Initialize company state for year 1
  if (year === 1) {
    team.gameState[yearKey].companyState = {
      monthlyBill: 7400, // After cost cuts from answers
      monthlyRevenue: 12000,
      cumulativeProfit: -26400,
      runwayMonths: 12
    };
  }

  // Apply market event
  const event = await applyMarketEvent(teamId, year, `EVENT_YEAR${year}`);
  if (event && event.impact) {
    team.gameState[yearKey].marketEvent = {
      name: event.event.eventName,
      penalty: event.impact.penalty,
      description: event.event.description
    };

    const yearState = team.gameState[yearKey].companyState;
    yearState.cumulativeProfit += event.impact.penalty;
  }

  // Calculate next year starting state if not final year
  if (year < 3) {
    const nextYear = year + 1;
    const nextYearKey = `year${nextYear}`;
    
    if (year === 1) {
      team.gameState[nextYearKey].companyState = 
        await calculateYear2StartingState(team.gameState[yearKey].answers, team.gameState[yearKey].companyState);
    } else if (year === 2) {
      team.gameState[nextYearKey].companyState = 
        await calculateYear3StartingState(team.gameState[yearKey].answers, team.gameState[yearKey].companyState);
    }

    team.currentYear = nextYear;
  } else {
    // Final year completed
    team.eventStatus = 'completed';
  }

  const currentProfit = team.gameState[yearKey].companyState.cumulativeProfit || 0;
  
  if (!team.finalScore) {
      team.finalScore = { cumulativeProfit: currentProfit, totalScore: roundAvg };
  } else {
      team.finalScore.cumulativeProfit = currentProfit;
      if (year >= 3) {
        let total = 0;
        let count = 0;
        for(let i=1; i<=6; i++) {
           const yk = `year${i}`;
           if (team.gameState[yk]) {
              total += (team.gameState[yk].scores?.cto || 0) + 
                       (team.gameState[yk].scores?.cfo || 0) + 
                       (team.gameState[yk].scores?.pm || 0) +
                       (team.gameState[yk].scores?.fun || 0);
              count += 3;
           }
        }
        team.finalScore.totalScore = count > 0 ? Math.round(total / count) : 0;
      }
  }

  await team.save();
}

/**
 * GET /api/submissions/:teamId/:year
 * Get team's submission for a year
 */
router.get('/:teamId/:year', async (req, res) => {
  try {
    const { teamId, year } = req.params;

    const submission = await Submission.findOne({
      teamId,
      year: parseInt(year)
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.status(200).json(submission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/submissions/disqualify/:year
 * Disqualify a user for cheating
 */
router.post('/disqualify/:year', verifyToken, async (req, res) => {
  try {
    const { year } = req.params;
    const { reason } = req.body;
    const { teamId, role } = req.user;

    const team = await Team.findOne({ teamId });
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const yearKey = `year${year}`;
    if (!team.gameState[yearKey]) return res.status(400).json({ error: 'Invalid year' });

    const updateData = {
      [`gameState.${yearKey}.scores.${role}`]: 0,
      [`gameState.${yearKey}.answers.${role}`]: { disqualified: true },
      [`gameState.${yearKey}.submittedAt`]: new Date(),
      $inc: { 'fraudFlags.tabSwitches': 1 },
      $push: { 'gameState.violations': { role, year, reason: reason || 'Cheating detected' } }
    };

    await Team.updateOne({ teamId }, updateData);

    res.status(200).json({ success: true, message: 'User disqualified for this round' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/submissions/report-screen-out
 * Report a fullscreen exit violation
 */
router.post('/report-screen-out', verifyToken, async (req, res) => {
  try {
    const { teamId } = req.user;
    
    await Team.updateOne(
      { teamId },
      { $inc: { 'fraudFlags.screenOuts': 1 } }
    );

    const team = await Team.findOne({ teamId });
    res.status(200).json({ 
      success: true, 
      count: team.fraudFlags?.screenOuts || 0 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
