// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getStudentsInDepartment,
  getUsersByRole,
  createUser,
  updateUser,
  updateOwnProfile,
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

// Update own profile (users can update their own profile)
router.put('/:userId/profile', authenticateToken, updateOwnProfile);

// Change user password (users can change their own password, doesn't require current password for first login)
router.patch('/:userId/change-password', authenticateToken, changeUserPassword);

// Reset user password
router.patch('/:userId/reset-password', authenticateToken, authorizeRole('admin'), resetUserPassword);

// Delete user
router.delete('/:userId', authenticateToken, authorizeRole('admin'), deleteUser);

// Faculty routes - faculty can view students in their department
router.get('/faculty/students-department', authenticateToken, authorizeRole('faculty'), getStudentsInDepartment);

module.exports = router;
