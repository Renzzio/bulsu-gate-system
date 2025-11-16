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

// Get students in faculty's department
const getStudentsInDepartment = async (req, res) => {
  try {
    const facultyUser = req.user; // From auth middleware

    console.log('Faculty user data:', {
      userId: facultyUser.userId,
      role: facultyUser.role,
      department: facultyUser.department,
      campusId: facultyUser.campusId
    });

    // Verify user is a faculty member
    if (facultyUser.role !== 'faculty') {
      return res.status(403).json({
        success: false,
        message: 'Only faculty members can access this endpoint'
      });
    }

    // Faculty must have a department assigned to view students
    if (!facultyUser.department) {
      console.log('Faculty user has no department assigned');
      return res.status(400).json({
        success: false,
        message: 'Your account does not have a department assigned. Please contact an administrator to assign your department.'
      });
    }

    const usersRef = db.ref('users');
    // Get all students
    const snapshot = await usersRef.orderByChild('role').equalTo('student').once('value');

    if (!snapshot.exists()) {
      console.log('No student users found in database');
      return res.json({
        success: true,
        users: [],
        message: 'No students found'
      });
    }

    const students = [];
    let totalStudents = 0;
    let campusMatch = 0;
    let departmentMatch = 0;

    snapshot.forEach((childSnapshot) => {
      const user = childSnapshot.val();
      totalStudents++;

      // Debug logging
      if (user.campusId === facultyUser.campusId) {
        campusMatch++;
      }

      // Filter by campus and department matching faculty's department
      if (user.campusId === facultyUser.campusId && user.studentDepartment === facultyUser.department) {
        departmentMatch++;
        const { password, ...userWithoutPassword } = user;
        students.push({
          userId: childSnapshot.key,
          ...userWithoutPassword
        });
      }
    });

    // Show detailed breakdown of filtering
    const departmentBreakdown = {};
    snapshot.forEach((childSnapshot) => {
      const user = childSnapshot.val();
      const dept = user.studentDepartment || 'NO_DEPT';
      if (!departmentBreakdown[dept]) departmentBreakdown[dept] = 0;
      departmentBreakdown[dept]++;
    });

    console.log('Advanced Students filtering results:', {
      facultyInfo: {
        userId: facultyUser.userId,
        name: `${facultyUser.firstName} ${facultyUser.lastName}`,
        department: facultyUser.department,
        campusId: facultyUser.campusId,
        role: facultyUser.role
      },
      filteringSummary: {
        totalStudents,
        campusMatch,
        departmentMatch,
        finalMatches: students.length
      },
      departmentBreakdown: departmentBreakdown,
      studentsBeingReturned: students.map(s => ({
        userId: s.userId,
        name: `${s.firstName} ${s.lastName}`,
        department: s.studentDepartment || 'NO_DEPT'
      }))
    });

    res.json({
      success: true,
      users: students,
      message: `${students.length} students found in your ${facultyUser.department} department`
    });
  } catch (error) {
    console.error('Get students in department error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching students'
    });
  }
};

// Get users by role
const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;

    // Validate role
    const validRoles = ['admin', 'faculty', 'staff', 'guard', 'student'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Valid roles: admin, faculty, staff, guard, student'
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
    const validRoles = ['admin', 'faculty', 'staff', 'guard', 'student'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Valid roles: admin, faculty, staff, guard, student'
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
      const validRoles = ['admin', 'faculty', 'staff', 'guard', 'student'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Valid roles: admin, faculty, staff, guard, student'
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

    console.log(`Password change request for userId: ${userId}`);
    console.log(`Requesting user:`, { id: req.user?.userId, role: req.user?.role });

    // Validation
    if (!newPassword || !confirmPassword) {
      console.log('Validation failed: missing new password or confirmation');
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation are required'
      });
    }

    if (newPassword !== confirmPassword) {
      console.log('Validation failed: passwords do not match');
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation do not match'
      });
    }

    if (newPassword.length < 6) {
      console.log('Validation failed: password too short');
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if user exists
    const userRef = db.ref(`users/${userId}`);
    const snapshot = await userRef.once('value');

    if (!snapshot.exists()) {
      console.log(`User not found: ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userData = snapshot.val();
    console.log(`User found:`, {
      userId: userData.userID || userData.username,
      firstTimeLogin: userData.firstTimeLogin,
      hasPassword: !!userData.password
    });

    // Check if user is trying to change their own password
    if (req.user.userId !== userId) {
      console.log(`Authorization failed: user ${req.user.userId} trying to change password for ${userId}`);
      return res.status(403).json({
        success: false,
        message: 'You can only change your own password'
      });
    }

    // For faculty users who have already logged in (firstTimeLogin is false), require current password
    // For first-time login (firstTimeLogin is true), don't require current password
    if (!userData.firstTimeLogin && currentPassword) {
      console.log('Verifying current password for established user...');
      const { comparePassword } = require('../utils/passwordUtils');
      const isCurrentPasswordValid = await comparePassword(currentPassword, userData.password);

      console.log(`Password verification result:`, isCurrentPasswordValid);

      if (!isCurrentPasswordValid) {
        console.log('Current password verification failed');
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }
    } else if (!userData.firstTimeLogin && !currentPassword) {
      console.log('Current password required for established user but not provided');
      return res.status(400).json({
        success: false,
        message: 'Current password is required for password changes'
      });
    } else {
      console.log('Skipping current password verification (first-time login or password reset)');
    }

    // Hash new password
    console.log('Hashing new password...');
    const hashedNewPassword = await hashPassword(newPassword);

    // Update password and clear firstTimeLogin flag
    const updateData = {
      password: hashedNewPassword,
      firstTimeLogin: false, // Clear forced password change flag
      passwordChangedAt: new Date().toISOString()
    };

    console.log('Updating user password in database...');
    await userRef.update(updateData);

    console.log('Password change successful');
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

// Update own profile (not requiring admin role)
const updateOwnProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const requestingUser = req.user; // From auth middleware

    // Only allow users to update their own profile
    if (requestingUser.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile'
      });
    }

    const { firstName, lastName, email } = req.body;

    // Validation - only allow updating certain fields
    if (firstName !== undefined && (!firstName || firstName.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'First name cannot be empty'
      });
    }

    if (lastName !== undefined && (!lastName || lastName.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'Last name cannot be empty'
      });
    }

    if (email !== undefined && (!email || email.trim() === '' || !email.includes('@'))) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
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

    // Check if email already exists (if changing email)
    if (email !== undefined) {
      const currentUser = snapshot.val();
      if (email !== currentUser.email) {
        const usersRef = db.ref('users');
        const emailSnapshot = await usersRef.orderByChild('email').equalTo(email).once('value');
        if (emailSnapshot.exists()) {
          return res.status(400).json({
            success: false,
            message: 'Email already exists'
          });
        }
      }
    }

    // Build update object with only allowed fields
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName.trim();
    if (lastName !== undefined) updateData.lastName = lastName.trim();
    if (email !== undefined) updateData.email = email.trim().toLowerCase();

    updateData.updatedAt = new Date().toISOString();

    // Update user
    await userRef.update(updateData);

    // Fetch updated user
    const updatedSnapshot = await userRef.once('value');
    const updatedUser = updatedSnapshot.val();
    const { password, ...userWithoutPassword } = updatedUser;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        userId,
        ...userWithoutPassword
      }
    });
  } catch (error) {
    console.error('Update own profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
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
};
