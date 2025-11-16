// backend/routes/scheduleRoutes.js
const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  getStudentSchedules,
  addSchedule,
  updateSchedule,
  deleteSchedule,
  importSchedulesFromExcel
} = require('../controllers/scheduleController');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Check file extension and MIME type
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/x-msexcel',
      'application/octet-stream'
    ];
    
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileName = file.originalname.toLowerCase();
    const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (hasValidExtension || allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * GET /api/schedules/:studentId
 * Get all schedules for a specific student
 * Protected: Token required
 */
router.get('/:studentId', authenticateToken, getStudentSchedules);

/**
 * POST /api/schedules/:studentId/import
 * Import schedules from Excel file
 * Protected: Admin or Faculty only
 */
router.post('/:studentId/import', authenticateToken, authorizeRole('admin', 'faculty'), upload.single('file'), importSchedulesFromExcel);

/**
 * POST /api/schedules/add
 * Add a new schedule for a student
 * Protected: Admin or Faculty only
 */
router.post('/add', authenticateToken, authorizeRole('admin', 'faculty'), addSchedule);

/**
 * PATCH /api/schedules/:studentId/:scheduleId
 * Update an existing schedule
 * Protected: Admin or Faculty only
 */
router.patch('/:studentId/:scheduleId', authenticateToken, authorizeRole('admin', 'faculty'), updateSchedule);

/**
 * DELETE /api/schedules/:studentId/:scheduleId
 * Delete a schedule
 * Protected: Admin only
 */
router.delete('/:studentId/:scheduleId', authenticateToken, authorizeRole('admin'), deleteSchedule);

module.exports = router;
