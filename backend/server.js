// backend/server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Gate Restriction System API is running' });
});

// Debug route for Firebase connection
app.get('/debug-firebase', async (req, res) => {
  const { admin } = require('./config/firebase');
  try {
    // Try to write to a test location in Firebase
    const testRef = admin.database().ref('system-test');
    await testRef.set({
      timestamp: admin.database.ServerValue.TIMESTAMP,
      test: 'Connection test'
    });
    
    res.json({ 
      success: true, 
      message: 'Firebase connection successful',
      projectId: admin.app().options.projectId,
      databaseURL: admin.app().options.databaseURL
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      full: error.toString()
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});