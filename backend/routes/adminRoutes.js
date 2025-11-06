// backend/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getDashboardStats,
  getAccessLogs,
  getViolations,
  getSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  generateReports
} = require('../controllers/adminController');

// All routes require admin authentication
router.use(authenticateToken);
router.use(authorizeRole('admin'));

// User Management Routes
router.get('/users', getAllUsers);
router.get('/users/:userId', getUserById);
router.post('/users', createUser);
router.put('/users/:userId', updateUser);
router.delete('/users/:userId', deleteUser);

// Dashboard Routes
router.get('/dashboard/stats', getDashboardStats);
router.get('/access-logs', getAccessLogs);
router.get('/violations', getViolations);

// Schedule Management Routes
router.get('/schedules', getSchedules);
router.post('/schedules', createSchedule);
router.put('/schedules/:scheduleId', updateSchedule);
router.delete('/schedules/:scheduleId', deleteSchedule);

// Reports Routes
router.get('/reports/:type', generateReports);

module.exports = router;