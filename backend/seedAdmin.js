const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Team = require('./src/models/Team');
require('dotenv').config();

async function seedAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');

    const teamId = 'ADMIN-EVENT-2026';
    const memberName = 'Coordinator';
    const password = 'superuser123!';
    const role = 'admin';

    // Check if exists
    let adminTeam = await Team.findOne({ teamId });

    const hashedPassword = await bcrypt.hash(password, 10);

    if (adminTeam) {
      console.log('Overwriting existing Admin password...');
      adminTeam.members = [{
        userId: `admin-${Date.now()}`,
        name: memberName,
        role: role,
        password: hashedPassword,
        joinedAt: new Date()
      }];
    } else {
      console.log('Creating fresh Admin team...');
      adminTeam = new Team({
        teamId,
        teamName: 'Admin Control',
        members: [{
          userId: `admin-${Date.now()}`,
          name: memberName,
          role: role,
          password: hashedPassword,
          plainPassword: password,
          joinedAt: new Date()
        }],
        currentYear: 0,
        eventStatus: 'registered'
      });
    }

    await adminTeam.save();
    console.log('\n✅ ADMIN SUCCESSFULLY CREATED/RESET');
    console.log('-----------------------------------');
    console.log('Use these EXACT credentials to log in:');
    console.log(`Team ID:   ${teamId}`);
    console.log(`Role:      ${role}`);
    console.log(`Name:      ${memberName}`);
    console.log(`Password:  ${password}`);
    console.log('-----------------------------------\n');

  } catch (err) {
    console.error('Error seeding admin:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedAdmin();
