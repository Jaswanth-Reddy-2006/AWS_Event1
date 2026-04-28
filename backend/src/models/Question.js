const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionId: {
    type: String,
    unique: true,
    required: true,
    index: true
  },
  year: {
    type: Number,
    required: true,
    enum: [0, 1, 2, 3, 4, 5, 6],
    index: true
  },
  role: {
    type: String,
    required: true,
    enum: ['cto', 'cfo', 'pm', 'fun'],
    index: true
  },
  questionNumber: Number,
  type: {
    type: String,
    required: true,
    enum: ['mcq', 'numerical', 'range', 'multi-select', 'truefalse', 'rating', 'shorttext']
  },
  scenario: {
    type: String,
    required: true
  },
  question: {
    type: String,
    required: true
  },
  options: [
    {
      optionId: String,
      text: String,
      value: mongoose.Schema.Types.Mixed
    }
  ],
  correctAnswer: mongoose.Schema.Types.Mixed,
  correctAnswerText: String,
  acceptableRange: {
    min: Number,
    max: Number
  },
  explanation: String,
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  teachingMoment: String,
  cascadeEffect: {
    description: String,
    impactOnYear2: mongoose.Schema.Types.Mixed,
    impactOnYear3: mongoose.Schema.Types.Mixed
  },
  scoringRubric: {
    full: Number,
    partial: Number,
    incorrect: Number
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for efficient question retrieval
questionSchema.index({ year: 1, role: 1 });

module.exports = mongoose.model('Question', questionSchema);
