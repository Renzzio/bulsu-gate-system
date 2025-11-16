// backend/routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();

const { getAdminOverview, getCampuses } = require('../controllers/dashboardController');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');

router.get('/overview', authenticateToken, authorizeRole('admin'), getAdminOverview);
router.get('/campuses', authenticateToken, authorizeRole('admin'), getCampuses);

module.exports = router;
