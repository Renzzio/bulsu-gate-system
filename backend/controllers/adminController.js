// backend/controllers/adminController.js
const { admin, db } = require('../config/firebase');

// User Management
exports.getAllUsers = async (req, res) => {
  try {
    const { role, status } = req.query;
    const usersRef = db.ref('users');
    const snapshot = await usersRef.once('value');
    let users = [];

    snapshot.forEach((childSnapshot) => {
      const user = childSnapshot.val();
      user.userId = childSnapshot.key;
      
      // Apply filters if provided
      if ((!role || user.role === role) && (!status || user.status === status)) {
        users.push(user);
      }
    });

    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const userRef = db.ref(`users/${userId}`);
    const snapshot = await userRef.once('value');
    
    if (!snapshot.exists()) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userData = snapshot.val();
    userData.userId = userId;

    res.json({ success: true, user: userData });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { email, password, ...userData } = req.body;
    
    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${userData.firstName} ${userData.lastName}`
    });

    // Store additional user data in Realtime Database
    await db.ref(`users/${userRecord.uid}`).set({
      ...userData,
      email,
      createdAt: admin.database.ServerValue.TIMESTAMP,
      status: 'active'
    });

    res.status(201).json({ 
      success: true, 
      message: 'User created successfully',
      userId: userRecord.uid 
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    
    // Update auth profile if email or password included
    if (updates.email || updates.password) {
      const authUpdates = {};
      if (updates.email) authUpdates.email = updates.email;
      if (updates.password) authUpdates.password = updates.password;
      await admin.auth().updateUser(userId, authUpdates);
    }

    // Update user data in database
    const userRef = db.ref(`users/${userId}`);
    const cleanUpdates = { ...updates };
    delete cleanUpdates.password; // Don't store password in database
    
    await userRef.update({
      ...cleanUpdates,
      updatedAt: admin.database.ServerValue.TIMESTAMP
    });

    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Delete from Firebase Auth
    await admin.auth().deleteUser(userId);
    
    // Delete from Realtime Database
    await db.ref(`users/${userId}`).remove();

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Dashboard Statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const stats = {
      totalUsers: 0,
      activeUsers: 0,
      todayEntries: 0,
      pendingRequests: 0
    };

    // Get users stats
    const usersSnapshot = await db.ref('users').once('value');
    usersSnapshot.forEach((user) => {
      stats.totalUsers++;
      if (user.val().status === 'active') stats.activeUsers++;
    });

    // Get today's entries
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const logsSnapshot = await db.ref('accessLogs')
      .orderByChild('timestamp')
      .startAt(today.getTime())
      .once('value');
    
    logsSnapshot.forEach(() => {
      stats.todayEntries++;
    });

    // Get pending requests
    const requestsSnapshot = await db.ref('requests')
      .orderByChild('status')
      .equalTo('pending')
      .once('value');
    
    requestsSnapshot.forEach(() => {
      stats.pendingRequests++;
    });

    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Access Logs
exports.getAccessLogs = async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    let logsRef = db.ref('accessLogs');
    
    if (startDate) {
      logsRef = logsRef.orderByChild('timestamp').startAt(Number(startDate));
    }
    if (endDate) {
      logsRef = logsRef.endAt(Number(endDate));
    }

    const snapshot = await logsRef.once('value');
    const logs = [];

    snapshot.forEach((log) => {
      const logData = log.val();
      logData.logId = log.key;
      if (!userId || logData.userId === userId) {
        logs.push(logData);
      }
    });

    res.json({ success: true, logs });
  } catch (error) {
    console.error('Error fetching access logs:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Violations
exports.getViolations = async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;
    let violationsRef = db.ref('violations');
    
    if (startDate) {
      violationsRef = violationsRef.orderByChild('timestamp').startAt(Number(startDate));
    }
    if (endDate) {
      violationsRef = violationsRef.endAt(Number(endDate));
    }

    const snapshot = await violationsRef.once('value');
    const violations = [];

    snapshot.forEach((violation) => {
      const violationData = violation.val();
      violationData.violationId = violation.key;
      if (!userId || violationData.userId === userId) {
        violations.push(violationData);
      }
    });

    res.json({ success: true, violations });
  } catch (error) {
    console.error('Error fetching violations:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Schedule Management
exports.getSchedules = async (req, res) => {
  try {
    const { userId } = req.query;
    let schedulesRef = db.ref('schedules');
    
    if (userId) {
      schedulesRef = schedulesRef.orderByChild('userId').equalTo(userId);
    }

    const snapshot = await schedulesRef.once('value');
    const schedules = [];

    snapshot.forEach((schedule) => {
      const scheduleData = schedule.val();
      scheduleData.scheduleId = schedule.key;
      schedules.push(scheduleData);
    });

    res.json({ success: true, schedules });
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createSchedule = async (req, res) => {
  try {
    const scheduleData = {
      ...req.body,
      createdAt: admin.database.ServerValue.TIMESTAMP
    };

    const newScheduleRef = db.ref('schedules').push();
    await newScheduleRef.set(scheduleData);

    res.status(201).json({ 
      success: true, 
      message: 'Schedule created successfully',
      scheduleId: newScheduleRef.key 
    });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const updates = {
      ...req.body,
      updatedAt: admin.database.ServerValue.TIMESTAMP
    };

    await db.ref(`schedules/${scheduleId}`).update(updates);

    res.json({ success: true, message: 'Schedule updated successfully' });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteSchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    await db.ref(`schedules/${scheduleId}`).remove();

    res.json({ success: true, message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reports
exports.generateReports = async (req, res) => {
  try {
    const { type } = req.params;
    const { startDate, endDate } = req.query;
    
    let data = [];
    let dateRange = {
      start: startDate ? Number(startDate) : Date.now() - (30 * 24 * 60 * 60 * 1000), // Default to last 30 days
      end: endDate ? Number(endDate) : Date.now()
    };

    switch (type) {
      case 'daily':
      case 'weekly':
      case 'monthly': {
        const logsRef = db.ref('accessLogs')
          .orderByChild('timestamp')
          .startAt(dateRange.start)
          .endAt(dateRange.end);
        
        const snapshot = await logsRef.once('value');
        snapshot.forEach((log) => {
          data.push(log.val());
        });
        break;
      }
      default:
        throw new Error('Invalid report type');
    }

    // Calculate summary statistics
    const summary = {
      dateRange,
      totalEntries: data.filter(log => log.type === 'entry').length,
      totalExits: data.filter(log => log.type === 'exit').length,
      uniqueUsers: new Set(data.map(log => log.userId)).size
    };

    res.json({
      success: true,
      report: {
        type,
        summary,
        data
      }
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};