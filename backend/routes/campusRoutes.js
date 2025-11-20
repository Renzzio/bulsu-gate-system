// backend/routes/campusRoutes.js
const express = require('express');
const router = express.Router();
const {
  getCampusById,
  getAllCampuses
} = require('../controllers/campusController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Get campus by ID (authenticated users)
router.get('/:campusId', authenticateToken, getCampusById);

// Get all campuses (authenticated users)
router.get('/', authenticateToken, getAllCampuses);

module.exports = router;
