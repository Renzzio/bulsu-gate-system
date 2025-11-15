// backend/controllers/userController.js
const { db } = require('../config/firebase');
const { hashPassword } = require('../utils/passwordUtils');
const crypto = require('crypto');

// Generate random credentials with UserID format
const generateCredentials = () => {
  const userID = 'U' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const username = userID; // Username is just the UserID
  const password = userID + '@2025';
  return { userID, username, password };
};

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const usersRef = db.ref('users');
    const snapshot = await usersRef.once('value');

    if (!snapshot.exists()) {
      return res.json({
        success: true,
        users: [],
        message: 'No users found'
      });
    }

    const users = [];
    snapshot.forEach((childSnapshot) => {
      const user = childSnapshot.val();
      // Don't include password in response
      const { password, ...userWithoutPassword } = user;
      users.push({
        userId: childSnapshot.key,
        ...userWithoutPassword
      });
    });

    res.json({
      success: true,
      users: users
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
};

// Get users by role
const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;

    // Validate role
    const validRoles = ['admin', 'faculty', 'staff', 'guard', 'vip', 'student'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Valid roles: admin, faculty, staff, guard, vip, student'
      });
    }

    const usersRef = db.ref('users');
    const snapshot = await usersRef.orderByChild('role').equalTo(role).once('value');

    if (!snapshot.exists()) {
      return res.json({
        success: true,
        users: [],
        message: `No ${role} users found`
      });
    }

    const users = [];
    snapshot.forEach((childSnapshot) => {
      const user = childSnapshot.val();
      const { password, ...userWithoutPassword } = user;
      users.push({
        userId: childSnapshot.key,
        ...userWithoutPassword
      });
    });

    res.json({
      success: true,
      users: users
    });
  } catch (error) {
    console.error('Get users by role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
};

// Create new user with auto-generated credentials
const createUser = async (req, res) => {
  try {
    const {
      firstName, lastName, email, role,
      phoneNumber, address, campusId,
      department, position, subjects, qualifications,
      studentId, yearLevel, program, section, studentDepartment,
      remarks
    } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide firstName, lastName, email, and role'
      });
    }

    // Validate role
    const validRoles = ['admin', 'faculty', 'staff', 'guard', 'vip', 'student'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Valid roles: admin, faculty, staff, guard, vip, student'
      });
    }

    // Check if email already exists
    const usersRef = db.ref('users');
    const emailSnapshot = await usersRef.orderByChild('email').equalTo(email).once('value');
    
    if (emailSnapshot.exists()) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Generate credentials
    const { userID, username, password } = generateCredentials();
    const hashedPassword = await hashPassword(password);

    // Create user object
    const newUser = {
      userID,
      username,
      password: hashedPassword,
      email,
      firstName,
      lastName,
      role,
      status: 'active',
      campusId: campusId || null,
      phoneNumber: phoneNumber || null,
      address: address || null,
      // Faculty/Staff fields
      department: department || null,
      position: position || null,
      subjects: subjects || null,
      qualifications: qualifications || null,
      // Student fields
      studentId: studentId || null,
      yearLevel: yearLevel || null,
      program: program || null,
      section: section || null,
      studentDepartment: studentDepartment || null,
      // General fields
      remarks: remarks || null,
      firstTimeLogin: true, // Force password change on first login
      createdAt: new Date().toISOString(),
      lastLogin: null
    };

    // Add user to database
    const newUserRef = usersRef.push();
    await newUserRef.set(newUser);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        userId: newUserRef.key,
        userID,
        username,
        password, // Return plain password only on creation
        email,
        firstName,
        lastName,
        role,
        campusId,
        status: 'active',
        phoneNumber,
        address,
        department,
        position,
        subjects,
        qualifications,
        studentId,
        yearLevel,
        program,
        section,
        studentDepartment,
        remarks,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating user'
    });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      firstName, lastName, email, role, status,
      phoneNumber, address, campusId,
      department, position, subjects, qualifications,
      studentId, yearLevel, program, section, studentDepartment,
      remarks
    } = req.body;

    // Check if user exists
    const userRef = db.ref(`users/${userId}`);
    const snapshot = await userRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Build update object with only provided fields
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (address !== undefined) updateData.address = address;
    if (campusId !== undefined) updateData.campusId = campusId;
    if (department !== undefined) updateData.department = department;
    if (position !== undefined) updateData.position = position;
    if (subjects !== undefined) updateData.subjects = subjects;
    if (qualifications !== undefined) updateData.qualifications = qualifications;
    if (studentId !== undefined) updateData.studentId = studentId;
    if (yearLevel !== undefined) updateData.yearLevel = yearLevel;
    if (program !== undefined) updateData.program = program;
    if (section !== undefined) updateData.section = section;
    if (studentDepartment !== undefined) updateData.studentDepartment = studentDepartment;
    if (remarks !== undefined) updateData.remarks = remarks;

    // Role and status validation
    if (role !== undefined) {
      const validRoles = ['admin', 'faculty', 'staff', 'guard', 'vip', 'student'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role'
        });
      }
      updateData.role = role;
    }
    if (status !== undefined) {
      const validStatuses = ['active', 'inactive', 'suspended'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status'
        });
      }
      updateData.status = status;
    }

    updateData.updatedAt = new Date().toISOString();

    // Update user
    await userRef.update(updateData);

    // Fetch updated user
    const updatedSnapshot = await userRef.once('value');
    const updatedUser = updatedSnapshot.val();
    const { password, ...userWithoutPassword } = updatedUser;

    res.json({
      success: true,
      message: 'User updated successfully',
      user: {
        userId,
        ...userWithoutPassword
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user'
    });
  }
};

// Deactivate user
const deactivateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const userRef = db.ref(`users/${userId}`);
    const snapshot = await userRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Deactivate user
    await userRef.update({
      status: 'inactive',
      deactivatedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deactivating user'
    });
  }
};

// Activate user
const activateUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const userRef = db.ref(`users/${userId}`);
    const snapshot = await userRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Activate user
    await userRef.update({
      status: 'active',
      activatedAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'User activated successfully'
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while activating user'
    });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const userRef = db.ref(`users/${userId}`);
    const snapshot = await userRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete user
    await userRef.remove();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting user'
    });
  }
};

// Change user password (for first-time login or user-initiated change)
const changeUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validation
    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation do not match'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user exists
    const userRef = db.ref(`users/${userId}`);
    const snapshot = await userRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userData = snapshot.val();

    // If currentPassword is provided, verify it (for non-first-time logins)
    if (currentPassword) {
      const { comparePassword } = require('../utils/passwordUtils');
      const isCurrentPasswordValid = await comparePassword(currentPassword, userData.password);

      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
    }

    // Hash new password
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password and clear firstTimeLogin flag
    const updateData = {
      password: hashedNewPassword,
      firstTimeLogin: false, // Clear forced password change flag
      passwordChangedAt: new Date().toISOString()
    };

    await userRef.update(updateData);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while changing password'
    });
  }
};

// Reset user password (generate new one)
const resetUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user exists
    const userRef = db.ref(`users/${userId}`);
    const snapshot = await userRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new password
    const { password } = generateCredentials();
    const hashedPassword = await hashPassword(password);

    // Update password
    await userRef.update({
      password: hashedPassword,
      passwordResetAt: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'User password reset successfully',
      newPassword: password // Return new password
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while resetting password'
    });
  }
};

module.exports = {
  getAllUsers,
  getUsersByRole,
  createUser,
  updateUser,
  deactivateUser,
  activateUser,
  deleteUser,
  changeUserPassword,
  resetUserPassword
};
