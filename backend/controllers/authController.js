// backend/controllers/authController.js
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');
const { comparePassword } = require('../utils/passwordUtils');

// Login controller
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password'
      });
    }

    // Find user by username
    const usersRef = db.ref('users');
    const snapshot = await usersRef.orderByChild('username').equalTo(username).once('value');
    
    if (!snapshot.exists()) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Get user data
    const userData = snapshot.val();
    const userId = Object.keys(userData)[0];
    const user = userData[userId];

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is inactive. Please contact the administrator.'
      });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: userId,
        role: user.role,
        username: user.username,
        campusId: user.campusId,
        campusName: user.campusName || 'Unknown Campus'
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Update last login
    await db.ref(`users/${userId}`).update({
      lastLogin: new Date().toISOString()
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        userId,
        ...userWithoutPassword
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Verify token controller
const verifyToken = async (req, res) => {
  try {
    const user = req.user;
    
    // Fetch fresh user data from database
    const userSnapshot = await db.ref(`users/${user.userId}`).once('value');
    
    if (!userSnapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userData = userSnapshot.val();
    const { password: _, ...userWithoutPassword } = userData;

    res.json({
      success: true,
      user: {
        userId: user.userId,
        ...userWithoutPassword
      }
    });

  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during verification'
    });
  }
};

// Logout controller
const logout = (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

module.exports = {
  login,
  verifyToken,
  logout
};
