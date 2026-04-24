const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Seed Database Script
 * Run with: npm run seed
 * This will populate the MongoDB with Year 1 questions
 */

// Import Models
const Question = require('../models/Question');

// Seed Data - Year 1 Questions
const year1Questions = [
  // ===== CTO QUESTIONS (Year 1) =====
  {
    questionId: 'Y1_CTO_Q1',
    year: 1,
    role: 'cto',
    questionNumber: 1,
    type: 'mcq',
    scenario: 'PulseStream is bleeding money. Your monitoring shows 4 EC2 instances. Two are running at 5% CPU, two at 85% CPU.',
    question: 'Your monitoring shows 4 EC2 instances. Two are running at 5% CPU, two at 85% CPU. This is a clear waste. What\'s your first action?',
    options: [
      { optionId: 'A', text: 'Terminate the 2 low-CPU instances immediately to save money', value: 'A' },
      { optionId: 'B', text: 'Downsize the low-CPU instances to smaller types, monitor 85% CPU ones', value: 'B' },
      { optionId: 'C', text: 'Add 2 more instances to balance the load', value: 'C' },
      { optionId: 'D', text: 'Not sure / leave as is', value: 'D' }
    ],
    correctAnswer: 'B',
    correctAnswerText: 'Downsize the low-CPU instances to smaller types, monitor 85% CPU ones',
    explanation: 'Terminating without investigation risks breaking something. Downsizing is the pro move — keeps the service running while saving money. The 85% CPU ones might need attention too (upgrade or scale).',
    difficulty: 'medium',
    teachingMoment: 'Right-sizing is smarter than termination when you don\'t fully understand the workload.',
    scoringRubric: { full: 100, partial: 50, incorrect: 0 },
    cascadeEffect: {
      description: 'Choosing to downsize properly reduces Year 1 costs and carries forward to Year 2',
      impactOnYear2: { monthlyBillModifier: -0.15 },
      impactOnYear3: null
    }
  },
  {
    questionId: 'Y1_CTO_Q2',
    year: 1,
    role: 'cto',
    questionNumber: 2,
    type: 'mcq',
    scenario: 'One of your 3 RDS databases, called "legacy-analytics-db", hasn\'t had a single query in 6 months. The database stores 50GB of data.',
    question: 'One RDS database, "legacy-analytics-db", hasn\'t had a single query in 6 months. Nobody knows what it was for. What do you do?',
    options: [
      { optionId: 'A', text: 'Delete it immediately, save $200/month', value: 'A' },
      { optionId: 'B', text: 'Snapshot it to S3 as a backup, then delete it', value: 'B' },
      { optionId: 'C', text: 'Leave it running — too risky to touch', value: 'C' },
      { optionId: 'D', text: 'Move it to a cheaper instance type', value: 'D' }
    ],
    correctAnswer: 'B',
    correctAnswerText: 'Snapshot it to S3 as a backup, then delete it',
    explanation: 'Safe deletion is the professional approach. If it turns out you needed it, you have a backup. This teaches the importance of being cautious with production data.',
    difficulty: 'easy',
    teachingMoment: 'Always backup before deleting; you don\'t know what you don\'t know.',
    scoringRubric: { full: 100, partial: 0, incorrect: 0 },
    cascadeEffect: {
      description: 'Safe practices in Year 1 prevent data loss and build good habits',
      impactOnYear2: { monthlyBillModifier: -0.05 },
      impactOnYear3: null
    }
  },
  {
    questionId: 'Y1_CTO_Q3',
    year: 1,
    role: 'cto',
    questionNumber: 3,
    type: 'truefalse',
    scenario: 'Understanding EC2 instance lifecycle',
    question: 'Terminating an EC2 instance automatically deletes all attached EBS volumes.',
    options: [
      { optionId: 'true', text: 'True', value: true },
      { optionId: 'false', text: 'False', value: false }
    ],
    correctAnswer: false,
    correctAnswerText: 'False',
    explanation: 'By default, the OS disk (root volume) is deleted, but other data volumes are NOT deleted unless you explicitly check "Delete on Termination".',
    difficulty: 'easy',
    teachingMoment: 'EC2 termination is not the same as data deletion; you have control.',
    scoringRubric: { full: 100, partial: 0, incorrect: 0 }
  },

  // ===== CFO QUESTIONS (Year 1) =====
  {
    questionId: 'Y1_CFO_Q1',
    year: 1,
    role: 'cfo',
    questionNumber: 1,
    type: 'numerical',
    scenario: 'Current AWS costs breakdown: EC2: $12,000/month, RDS: $4,000/month, S3: $1,500/month, Other: $500/month. TOTAL: $18,000/month',
    question: 'After optimizations (EC2 -35%, RDS -$200, S3 -70%), what is your new monthly AWS bill? (Round to nearest $100)',
    options: null,
    correctAnswer: 13950,
    acceptableRange: { min: 13700, max: 14200 },
    explanation: '$18,000 – $2,800 (35% of $8,000) – $200 – $1,050 (70% of $1,500) = $13,950',
    difficulty: 'medium',
    teachingMoment: 'Even small cost cuts compound; a few wise decisions add up.',
    scoringRubric: { full: 100, partial: 50, incorrect: 0 }
  },
  {
    questionId: 'Y1_CFO_Q2',
    year: 1,
    role: 'cfo',
    questionNumber: 2,
    type: 'mcq',
    scenario: 'You have 10 reserved instances (RIs) with 1 year remaining. They cost $5,000/month. New on-demand instances cost $8,000/month for same capacity.',
    question: 'Your 10 Reserved Instances expire in 1 year. Renew for 3 years or go on-demand?',
    options: [
      { optionId: 'A', text: 'Renew RIs for 3 years at $4,200/month (30% discount)', value: 'A' },
      { optionId: 'B', text: 'Switch to on-demand ($8,000/month, full flexibility)', value: 'B' },
      { optionId: 'C', text: 'Mix: 5 RIs + 5 on-demand', value: 'C' },
      { optionId: 'D', text: 'Reduce to 5 RIs and 5 on-demand', value: 'D' }
    ],
    correctAnswer: 'A',
    correctAnswerText: 'Renew RIs for 3 years at $4,200/month (30% discount)',
    explanation: 'If you know you\'ll need the capacity, RIs save money. 3-year commitment locks in 30% discount vs on-demand.',
    difficulty: 'medium',
    teachingMoment: 'Reserved Instances are for predictable workloads; on-demand for spiky or uncertain.',
    scoringRubric: { full: 100, partial: 50, incorrect: 0 }
  },

  // ===== PM QUESTIONS (Year 1) =====
  {
    questionId: 'Y1_PM_Q1',
    year: 1,
    role: 'pm',
    questionNumber: 1,
    type: 'mcq',
    scenario: 'PulseStream is losing users. Churn is 15% per month. Server costs are rising.',
    question: 'To reduce churn, which AWS decision would have the BIGGEST product impact?',
    options: [
      { optionId: 'A', text: 'Move to cheaper servers (save $2k/month but slower)', value: 'A' },
      { optionId: 'B', text: 'Add edge caching with CloudFront to make app faster globally', value: 'B' },
      { optionId: 'C', text: 'Switch to a cheaper database provider', value: 'C' },
      { optionId: 'D', text: 'Reduce feature set to cut costs', value: 'D' }
    ],
    correctAnswer: 'B',
    correctAnswerText: 'Add edge caching with CloudFront to make app faster globally',
    explanation: 'Users leave because the app is slow. Speed is a product feature. CloudFront caches content at edge locations, making the app faster. Faster = happier users = lower churn.',
    difficulty: 'medium',
    teachingMoment: 'Product quality (speed) matters more than cost-cutting when facing churn.',
    scoringRubric: { full: 100, partial: 50, incorrect: 0 }
  },
  {
    questionId: 'Y1_PM_Q2',
    year: 1,
    role: 'pm',
    questionNumber: 2,
    type: 'rating',
    scenario: 'You need to decide how much to invest in AWS infrastructure.',
    question: 'How important is it to invest in high availability (Multi-AZ) right now? (1=Not important, 5=Critical)',
    options: [
      { optionId: '1', text: '1 - Not important', value: 1 },
      { optionId: '2', text: '2 - Low priority', value: 2 },
      { optionId: '3', text: '3 - Neutral', value: 3 },
      { optionId: '4', text: '4 - Important', value: 4 },
      { optionId: '5', text: '5 - Critical', value: 5 }
    ],
    correctAnswer: 3,
    explanation: 'High availability is important for enterprise, but for a startup in growth phase, it\'s a tradeoff. Some redundancy is smart, but not overkill.',
    difficulty: 'easy',
    teachingMoment: 'Balance reliability with cost; different stages of business have different priorities.',
    scoringRubric: { full: 100, partial: 0, incorrect: 0 }
  }
];

/**
 * Connect to MongoDB and seed questions
 */
async function seedDatabase() {
  try {
    console.log('🌱 Starting database seed...');
    
    // Mask password in logs
    const maskedUri = mongoUri.replace(/\/\/.*:.*@/, '//****:****@');
    console.log(`📦 Connecting to MongoDB: ${maskedUri}...`);
    
    // Connect to MongoDB
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ Connected to MongoDB');

    // Clear existing Year 1 questions (optional - comment out to keep)
    console.log('🗑️  Clearing existing Year 1 questions...');
    await Question.deleteMany({ year: 1 });
    console.log('✓ Cleared existing Year 1 questions');

    // Insert Year 1 questions
    console.log(`📚 Inserting ${year1Questions.length} Year 1 questions...`);
    const insertedQuestions = await Question.insertMany(year1Questions);
    console.log(`✓ Inserted ${insertedQuestions.length} questions`);

    // Count total questions in database
    const totalQuestions = await Question.countDocuments();
    console.log(`\n📊 Database Summary:`);
    console.log(`   Total questions: ${totalQuestions}`);
    
    const byYear = await Question.aggregate([
      { $group: { _id: '$year', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    byYear.forEach(year => {
      console.log(`   Year ${year._id}: ${year.count} questions`);
    });

    console.log('\n✅ Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase();
