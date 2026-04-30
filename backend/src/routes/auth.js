const express = require('express');
const router = express.Router();
const Team = require('../models/Team');
const { generateTeamId, generateUserId } = require('../utils/helpers');
const { generateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');
const { validatePassword } = require('../utils/passwordValidator');

const { verifyToken, verifyAdmin } = require('../middleware/auth');

/**
 * POST /api/auth/register
 * Register a new team with password validation
 * RESTRICTED: Only administrators can create new teams.
 */
router.post('/register', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { teamName, teamLead, members, college, department, domain, population } = req.body;

    // Validate input
    if (!teamName || !members || members.length !== 3) {
      return res.status(400).json({ error: 'Team must have exactly 3 members' });
    }

    // Validate all 3 roles are present
    const roles = members.map(m => m.role).sort();
    if (JSON.stringify(roles) !== JSON.stringify(['cfo', 'cto', 'pm'])) {
      return res.status(400).json({ 
        error: 'Team must have exactly 3 members with roles: CTO, CFO, PM' 
      });
    }

    // Validate passwords
    const passwordValidation = [];
    for (const member of members) {
      const validation = validatePassword(member.password);
      if (!validation.isValid) {
        passwordValidation.push({
          role: member.role,
          errors: validation.errors
        });
      }
    }

    if (passwordValidation.length > 0) {
      return res.status(400).json({ 
        error: 'Password validation failed',
        details: passwordValidation 
      });
    }

    // Generate team ID and user IDs
    const teamId = generateTeamId();
    const newMembers = await Promise.all(
      members.map(async (member) => ({
        userId: generateUserId(),
        name: member.name.trim(),
        role: member.role.toLowerCase(),
        password: await bcrypt.hash(member.password, 10),
        plainPassword: member.password, // Store for admin reference
        joinedAt: new Date()
      }))
    );

    // Create team
    const team = new Team({
      teamId,
      teamName,
      teamLead,
      members: newMembers,
      college,
      department,
      domain,
      population,
      eventStatus: 'registered',
      createdAt: new Date()
    });

    await team.save();

    res.status(201).json({
      success: true,
      teamId,
      teamName,
      message: 'Team registered successfully! Share this Team ID with your members.',
      members: newMembers.map(m => ({
        userId: m.userId,
        name: m.name,
        role: m.role
      }))
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/login
 * Login team member with improved validation
 */
router.post('/login', async (req, res) => {
  try {
    const { teamId, memberName, password, role } = req.body;

    // Validate input
    if (!teamId || !memberName || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields: teamId, memberName, password' 
      });
    }

    // Find team by ID (case-insensitive, trim whitespace)
    const cleanTeamId = teamId.trim();
    let team = await Team.findOne({ teamId: cleanTeamId });
    if (!team) {
      team = await Team.findOne({ teamId: { $regex: new RegExp(`^${cleanTeamId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } });
    }
    if (!team) {
      return res.status(404).json({ error: 'Team not found. Check your Team ID.' });
    }

    // Find member by name. If role is provided, ensure it matches.
    // For admin team, skip role check since admin role isn't in the login dropdown.
    const isAdminTeam = teamId === 'ADMIN-EVENT-2026';
    let member;
    if (role && !isAdminTeam) {
      member = team.members.find(m =>
        m.name.toLowerCase() === memberName.toLowerCase() &&
        m.role.toLowerCase() === role.toLowerCase()
      );
    } else {
      member = team.members.find(m =>
        m.name.toLowerCase() === memberName.toLowerCase()
      );
    }

    if (!member) {
      return res.status(401).json({ 
        error: 'Invalid credentials. Participant name not found in this team.' 
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, member.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Update last login timestamp
    await Team.updateOne(
      { teamId, 'members.userId': member.userId },
      { 'members.$.lastLogin': new Date() }
    );

    // Generate JWT token
    const token = generateToken({
      userId: member.userId,
      teamId,
      role: member.role,
      name: member.name
    });

    res.status(200).json({
      success: true,
      token,
      teamId,
      memberName: member.name,
      role: member.role,
      currentYear: team.currentYear || 1,
      message: `Welcome ${member.name}!`
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  res.status(200).json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/team/:teamId
 * Get team information (name and members)
 */
router.get('/team/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findOne({ teamId });
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Return team info without passwords
    res.status(200).json({
      teamId: team.teamId,
      teamName: team.teamName,
      teamLead: team.teamLead,
      members: team.members.map(m => ({
        userId: m.userId,
        name: m.name,
        role: m.role,
        joinedAt: m.joinedAt,
        lastLogin: m.lastLogin
      })),
      college: team.college,
      department: team.department,
      createdAt: team.createdAt,
      gameState: team.gameState,
      eventStatus: team.eventStatus,
      currentYear: team.currentYear,
      points: team.points
    });
  } catch (err) {
    console.error('Error fetching team data:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
