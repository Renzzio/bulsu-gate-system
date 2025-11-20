//// backend/routes/gateRoutes.js
const express = require('express');
const router = express.Router();

const {
  scanStudent,
  getAccessLogs,
  getAccessLogsForUser,
  getViolations,
  getViolationsForUser,
  getReports,
  getReportsForUser
} = require('../controllers/gateController');
const {
  createCampus,
  getCampuses,
  updateCampus,
  deleteCampus,
  createGate,
  getGates,
  updateGate,
  deleteGate,
  getGatesByCampus,
  getCampusScopedLogs,
  getCampusScopedViolations,
  toggleGateStatus
} = require('../controllers/dashboardController');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');

// Security/admin personnel can scan IDs to check access in real-time
router.post('/scan', authenticateToken, authorizeRole('admin', 'guard'), scanStudent);

// Logs, violations, and reports are limited to admin and guard roles
// Guards can only see logs from their campus
router.get('/logs', authenticateToken, authorizeRole('admin', 'guard'), getAccessLogsForUser);
router.get('/violations', authenticateToken, authorizeRole('admin', 'guard'), getViolationsForUser);
router.get('/reports', authenticateToken, authorizeRole('admin', 'guard'), getReportsForUser);

// Campus Management - Admin only (CRUD operations)
router.post('/campuses', authenticateToken, authorizeRole('admin'), createCampus);
router.get('/campuses', authenticateToken, authorizeRole('admin', 'guard', 'security', 'security_guard', 'security_officer'), getCampuses);
router.put('/campuses/:campusId', authenticateToken, authorizeRole('admin'), updateCampus);
router.delete('/campuses/:campusId', authenticateToken, authorizeRole('admin'), deleteCampus);

// Gate Management - Admin only
router.post('/gates', authenticateToken, authorizeRole('admin'), createGate);
router.get('/gates', authenticateToken, authorizeRole('admin'), getGates);
router.put('/gates/:gateId', authenticateToken, authorizeRole('admin'), updateGate);
router.delete('/gates/:gateId', authenticateToken, authorizeRole('admin'), deleteGate);
// Guard roles can get gates for their campus
router.get('/gates/campus/:campusId', authenticateToken, authorizeRole('admin', 'guard'), getGatesByCampus);
// Security personnel can toggle gate status
router.put('/gates/:gateId/toggle-status', authenticateToken, authorizeRole('admin', 'guard'), toggleGateStatus);

// Campus-scoped access logs and violations - Admin only can view all campuses
router.post('/logs/campus', authenticateToken, authorizeRole('admin'), getCampusScopedLogs);
router.post('/violations/campus', authenticateToken, authorizeRole('admin'), getCampusScopedViolations);

module.exports = router;
