require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const rateLimit = require('express-rate-limit');

// Import routes
const authRoutes = require('./routes/auth');
const questionsRoutes = require('./routes/questions');
const submissionsRoutes = require('./routes/submissions');
const leaderboardRoutes = require('./routes/leaderboard');
const adminRoutes = require('./routes/admin');
const { connectRedis } = require('./utils/redis');

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes and try again.' }
});

const submissionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many submissions. Please wait before submitting again.' }
});

const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many admin requests. Please slow down.' }
});


// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [process.env.FRONTEND_URL, 'http://localhost:3000', 'https://aws-event1.vercel.app','http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004'],
    methods: ['GET', 'POST'],
  }
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
  origin: [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001', 'https://aws-event1.vercel.app', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004'],
  credentials: true
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/auth', loginLimiter, authRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/submissions', submissionLimiter, submissionsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminLimiter, adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Socket.io events
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('join-event', (teamId) => {
    socket.join(`team-${teamId}`);
    socket.join('leaderboard');
    if (teamId === 'ADMIN-EVENT-2026') {
      socket.join('admin');
    }
    console.log(`${teamId} joined leaderboard`);
  });

  socket.on('update-leaderboard', (data) => {
    io.emit('leaderboard-updated', data);
  });

  socket.on('fraud-alert', (data) => {
    io.to('admin').emit('fraud-detected', data);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Store io instance globally for access in controllers
app.set('io', io);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✓ Connected to MongoDB');
    connectRedis();
  })
  .catch((err) => console.error('✗ MongoDB connection error:', err));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    status: err.status || 500
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Cloud-Tycoon Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}\n`);
});

module.exports = app;
