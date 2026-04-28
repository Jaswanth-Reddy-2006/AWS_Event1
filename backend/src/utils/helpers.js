const crypto = require('crypto');

/**
 * Generate unique team ID
 */
function generateTeamId() {
  return 'T' + crypto.randomBytes(6).toString('hex').toUpperCase();
}

/**
 * Generate unique user ID
 */
function generateUserId() {
  return 'U' + crypto.randomBytes(6).toString('hex').toUpperCase();
}

/**
 * Generate unique submission ID
 */
function generateSubmissionId() {
  return 'S' + crypto.randomBytes(6).toString('hex').toUpperCase();
}

/**
 * Calculate score for a single answer
 */
function scoreAnswer(question, userAnswer) {
  if (!question) return 0;
  
  const fullScore = question.scoringRubric?.full || 10;
  const partialScore = question.scoringRubric?.partial || 0;
  const incorrectScore = question.scoringRubric?.incorrect || 0;

  // Type-specific scoring
  switch (question.type) {
    case 'mcq':
    case 'truefalse':
      return userAnswer === question.correctAnswer ? fullScore : incorrectScore;

    case 'multi-select':
      // Expect userAnswer to be an array of optionIds
      if (!Array.isArray(userAnswer) || userAnswer.length === 0) return incorrectScore;
      
      const correctAnswers = Array.isArray(question.correctAnswer) ? question.correctAnswer : 
                            (question.correctAnswers || [question.correctAnswer]);
      
      // Match exactly?
      const isExactlyCorrect = userAnswer.length === correctAnswers.length && 
                              userAnswer.every(val => correctAnswers.includes(val));
      
      if (isExactlyCorrect) return fullScore;
      
      // Strictly no partial credit if any wrong answer is chosen
      const hasWrong = userAnswer.some(val => !correctAnswers.includes(val));
      if (hasWrong) return incorrectScore;

      // If all chosen are correct but some are missing, give partial if configured
      const hasSomeRight = userAnswer.every(val => correctAnswers.includes(val));
      if (hasSomeRight && partialScore > 0) return partialScore;
      
      return incorrectScore;

    case 'range':
      // Expect userAnswer to be { min: number, max: number }
      if (!userAnswer || typeof userAnswer !== 'object') return incorrectScore;
      
      const userMin = parseFloat(userAnswer.min);
      const userMax = parseFloat(userAnswer.max);
      
      if (isNaN(userMin) || isNaN(userMax)) return incorrectScore;
      if (userMin > userMax) return incorrectScore; // Invalid range

      // Check acceptableRange
      const correctMin = question.acceptableRange?.min;
      const correctMax = question.acceptableRange?.max;

      if (correctMin !== undefined && correctMax !== undefined) {
        // IMPROVED: User's range must be within the correct range to get points
        if (userMin >= correctMin && userMax <= correctMax) {
          return fullScore;
        }
      }
      return incorrectScore;

    case 'numerical':
    case 'rating':
      const val = parseFloat(userAnswer);
      if (isNaN(val)) return incorrectScore;
      
      // Use acceptableRange if provided, otherwise exact match
      const numMin = question.acceptableRange?.min ?? (typeof question.correctAnswer === 'number' ? question.correctAnswer : parseFloat(question.correctAnswer));
      const numMax = question.acceptableRange?.max ?? (typeof question.correctAnswer === 'number' ? question.correctAnswer : parseFloat(question.correctAnswer));

      if (numMin !== undefined && numMax !== undefined) {
        if (val >= numMin && val <= numMax) return fullScore;
      }
      return incorrectScore;

    default:
      return userAnswer === question.correctAnswer ? fullScore : incorrectScore;
  }
}

/**
 * Calculate role total score (sum of all question scores, NOT average)
 */
function calculateRoleScore(questionScores) {
  if (!questionScores || Object.keys(questionScores).length === 0) return 0;
  
  const scores = Object.values(questionScores);
  const total = scores.reduce((a, b) => a + b, 0);
  return total; // Raw sum — not averaged
}

/**
 * Check for suspicious answer patterns
 */
function checkSuspiciousPatterns(submission, timeSpentSeconds) {
  const flags = [];

  // Too fast submission (less than 2 minutes for 6-8 questions)
  if (timeSpentSeconds < 120) {
    flags.push({
      flagType: 'fast-submission',
      description: `Submitted in ${timeSpentSeconds}s (suspicious)`
    });
  }

  // All same answer
  const answers = Object.values(submission.answers || {});
  if (answers.length > 1 && answers.every(a => a === answers[0])) {
    flags.push({
      flagType: 'all-same-answers',
      description: 'All answers identical'
    });
  }

  return flags;
}

/**
 * Format company state for display
 */
function formatCompanyState(state) {
  return {
    monthlyBill: Math.round(state.monthlyBill),
    monthlyRevenue: Math.round(state.monthlyRevenue),
    monthlyProfit: Math.round(state.monthlyRevenue - state.monthlyBill),
    runwayMonths: state.runwayMonths,
    cumulativeProfit: Math.round(state.cumulativeProfit),
    status: state.runwayMonths > 12 ? 'THRIVING' : state.runwayMonths > 0 ? 'STABLE' : 'CRITICAL'
  };
}

module.exports = {
  generateTeamId,
  generateUserId,
  generateSubmissionId,
  scoreAnswer,
  calculateRoleScore,
  checkSuspiciousPatterns,
  formatCompanyState
};
