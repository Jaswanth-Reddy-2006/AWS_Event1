const mongoose = require('mongoose');
const Question = require('./src/models/Question');
require('dotenv').config();

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const result = await Question.updateMany(
            { 'scoringRubric.full': 10 },
            { $set: { 'scoringRubric.full': 100, 'scoringRubric.partial': 50 } }
        );
        
        console.log(`Updated ${result.modifiedCount} questions.`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

migrate();
