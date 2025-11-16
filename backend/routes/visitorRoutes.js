// backend/routes/visitorRoutes.js
const express = require('express');
const router = express.Router();
const {
  getTodaysVisitors,
  getAllVisitors,
  getVisitorById,
  createVisitor,
  updateVisitor,
  updateVisitorUsage,
  getVisitorByQrcode,
  deleteVisitor
} = require('../controllers/visitorController');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');

// Protected routes - security personnel and admin can manage visitors
// Get today's visitors
router.get('/', authenticateToken, authorizeRole('admin', 'guard', 'security', 'security_guard', 'security_officer'), getTodaysVisitors);

// Get visitor by QR code (for validation at gate)
router.get('/qr/:qrCode', authenticateToken, authorizeRole('admin', 'guard', 'security', 'security_guard', 'security_officer'), getVisitorByQrcode);

// Create new visitor
router.post('/', authenticateToken, authorizeRole('admin', 'guard', 'security', 'security_guard', 'security_officer'), createVisitor);

// Update visitor usage (entry/exit)
router.patch('/:visitorId/usage', authenticateToken, authorizeRole('admin', 'guard', 'security', 'security_guard', 'security_officer'), updateVisitorUsage);

// Admin-only routes for full visitor management
// Get all visitors (with optional campus filtering)
router.get('/admin/all', authenticateToken, authorizeRole('admin'), getAllVisitors);

// Get visitor by ID (admin only)
router.get('/:visitorId', authenticateToken, authorizeRole('admin'), getVisitorById);

// Update visitor (admin only)
router.put('/:visitorId', authenticateToken, authorizeRole('admin'), updateVisitor);

// Delete visitor (admin only)
router.delete('/:visitorId', authenticateToken, authorizeRole('admin'), deleteVisitor);

module.exports = router;
