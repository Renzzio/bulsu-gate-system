// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { login, verifyToken, logout } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Public routes
router.post('/login', login);

// Protected routes
router.get('/verify', authenticateToken, verifyToken);
router.post('/logout', authenticateToken, logout);

module.exports = router;