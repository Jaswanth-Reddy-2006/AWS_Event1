const mongoose = require('mongoose');

const yearStateSchema = {
  answers: {
    cto: { type: mongoose.Schema.Types.Mixed, default: {} },
    cfo: { type: mongoose.Schema.Types.Mixed, default: {} },
    pm: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  scores: {
    cto: { type: Number, default: 0 },
    cfo: { type: Number, default: 0 },
    pm: { type: Number, default: 0 },
    roundAvg: { type: Number, default: 0 }
  },
  timeSpent: {
    cto: { type: Number, default: 0 },
    cfo: { type: Number, default: 0 },
    pm: { type: Number, default: 0 },
    outputTime: { type: Number, default: 0 }
  },
  companyState: {
    monthlyBill: { type: Number, default: 0 },
    monthlyRevenue: { type: Number, default: 0 },
    runwayMonths: { type: Number, default: 0 },
    cumulativeProfit: { type: Number, default: 0 }
  },
  marketEvent: {
    name: String,
    penalty: Number,
    description: String
  },
  submittedAt: Date
};

const teamSchema = new mongoose.Schema({
  teamId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  teamName: {
    type: String,
    required: true,
    trim: true
  },
  teamLead: {
    name: String,
    email: String,
    phone: String
  },
  members: [
    {
      userId: String,
      name: String,
      role: {
        type: String,
        enum: ['cto', 'cfo', 'pm', 'admin'],
        required: true
      },
      password: String,
      plainPassword: String, // For Admin view
      lastLogin: Date
    }
  ],
  college: String,
  department: String,
  domain: {
    type: String,
    trim: true
  },
  population: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  eventStatus: {
    type: String,
    enum: ['registered', 'in-progress', 'completed'],
    default: 'registered'
  },
  currentYear: {
    type: Number,
    default: 0,
    min: 0,
    max: 10 // Increased to support Fun Rounds
  },
  points: {
    type: Number,
    default: 0
  },
  funPoints: { // Separate leaderboard for fun rounds
    type: Number,
    default: 0
  },
  fraudFlags: {
    tabSwitches: { type: Number, default: 0 },
    screenOuts: { type: Number, default: 0 }, // Track fullscreen exits
    multiDeviceLogin: { type: Boolean, default: false },
    fastSubmissions: { type: Number, default: 0 },
    lastFlaggedAt: Date
  },
  gameState: {
    year0: yearStateSchema,
    year1: yearStateSchema,
    year2: yearStateSchema,
    year3: yearStateSchema,
    year4: yearStateSchema,
    year5: yearStateSchema,
    year6: yearStateSchema,
    year7: yearStateSchema,
    year8: yearStateSchema,
    year9: yearStateSchema,
    violations: [{
      role: String,
      year: Number,
      reason: String,
      timestamp: { type: Date, default: Date.now }
    }]
  },
  finalScore: {
    cumulativeProfit: Number,
    totalScore: Number,
    rank: Number,
    finishedAt: Date
  }
}, { timestamps: true });

// Index for fast leaderboard queries
teamSchema.index({ points: -1 });
teamSchema.index({ 'finalScore.cumulativeProfit': -1 });
teamSchema.index({ 'finalScore.rank': 1 });
teamSchema.index({ eventStatus: 1, currentYear: 1 });

module.exports = mongoose.model('Team', teamSchema);
