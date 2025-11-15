// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUsersByRole,
  createUser,
  updateUser,
  deactivateUser,
  activateUser,
  deleteUser,
  changeUserPassword,
  resetUserPassword
} = require('../controllers/userController');
const { authenticateToken, authorizeRole } = require('../middleware/authMiddleware');

// Protected routes - only admin can manage users
// Get all users
router.get('/', authenticateToken, authorizeRole('admin'), getAllUsers);

// Get users by role
router.get('/role/:role', authenticateToken, authorizeRole('admin'), getUsersByRole);

// Create new user
router.post('/', authenticateToken, authorizeRole('admin'), createUser);

// Update user
router.put('/:userId', authenticateToken, authorizeRole('admin'), updateUser);

// Deactivate user
router.patch('/:userId/deactivate', authenticateToken, authorizeRole('admin'), deactivateUser);

// Activate user
router.patch('/:userId/activate', authenticateToken, authorizeRole('admin'), activateUser);

// Change user password (users can change their own password, doesn't require current password for first login)
router.patch('/:userId/change-password', authenticateToken, changeUserPassword);

// Reset user password
router.patch('/:userId/reset-password', authenticateToken, authorizeRole('admin'), resetUserPassword);

// Delete user
router.delete('/:userId', authenticateToken, authorizeRole('admin'), deleteUser);

module.exports = router;
