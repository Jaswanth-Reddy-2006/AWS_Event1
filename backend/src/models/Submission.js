const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  submissionId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  teamId: {
    type: String,
    required: true,
    index: true
  },
  year: {
    type: Number,
    required: true,
    enum: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  },
  role: {
    type: String,
    required: true,
    enum: ['cto', 'cfo', 'pm', 'fun']
  },
  answers: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  scores: {
    questionScores: {
      type: Map,
      of: Number
    },
    roleTotal: Number,
    rolePercentage: Number
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  timeSpentSeconds: Number,
  deviceInfo: {
    userAgent: String,
    ipAddress: String,
    screenResolution: String
  },
  suspiciousFlags: [
    {
      flagType: String,
      description: String,
      timestamp: Date
    }
  ]
}, { timestamps: true });

// Index for efficient submission retrieval
submissionSchema.index({ teamId: 1, year: 1 });
submissionSchema.index({ submittedAt: -1 });

module.exports = mongoose.model('Submission', submissionSchema);
