// backend/controllers/gateController.js

// Import 'admin' for sending notifications
const { db, admin } = require('../config/firebase'); 
const { v4: uuidv4 } = require('uuid');
const {
  getSchedulesByDay,
  getActiveScheduleNow
} = require('../utils/scheduleUtils');

/**
 * Handle a gate scan attempt (entry/exit)
 */
/**
 * Handle a gate scan attempt (entry/exit)
 */
const scanStudent = async (req, res) => {
  try {
    const {
      studentId,
      scanType,
      gateId,
      violationType,
      violationNotes
    } = req.body;

    if (!studentId || !scanType) {
      return res.status(400).json({
        success: false,
        message: 'studentId and scanType are required'
      });
    }

    if (!['entry', 'exit'].includes(scanType)) {
      return res.status(400).json({
        success: false,
        message: 'scanType must be either "entry" or "exit"'
      });
    }

    // Fetch student profile information
    const studentProfile = await findStudentProfile(studentId);
    if (!studentProfile) {
      return res.status(404).json({
        success: false,
        message: `Student ${studentId} not found`
      });
    }

    const now = new Date();
    const currentDay = getDayName(now);

    const schedulesToday = await getSchedulesByDay(studentId, currentDay);
    const hasScheduleToday = schedulesToday.length > 0;
    const activeSchedule = await getActiveScheduleNow(studentId);

    let allowed = true; // Allow all scans by default
    const reasons = [];

    // Only restrict entries for students without schedule
    if (scanType === 'entry' && !hasScheduleToday) {
      allowed = false;
      reasons.push('No scheduled classes for today');
    }

    const violationRecorded = Boolean(violationType);
    if (violationRecorded) {
      reasons.push(`Violation noted: ${violationType}`);
    }

    const logId = uuidv4();
    const timestamp = now.toISOString();
    const dateKey = formatDateKey(now);

    // Get gate information to include campus details
    const gateInfo = await findGateInfo(gateId || studentProfile.assignedGate || 'Main Gate');
    const campusInfo = await findCampusInfo(gateInfo?.campusId);

    const logData = {
      logId,
      studentId, // This is the ID that was scanned
      studentName: `${studentProfile.firstName || ''} ${studentProfile.lastName || ''}`.trim(),
      scanType,
      gateId: gateId || studentProfile.assignedGate || 'Main Gate',
      gateName: gateInfo?.name || 'Unknown Gate',
      gateLocation: gateInfo?.location || 'Unknown Location',
      campusId: gateInfo?.campusId || studentProfile.campusId || 'unknown',
      campusName: campusInfo?.name || 'Unknown Campus',
      timestamp,
      allowed,
      reasons,
      scheduleSummary: activeSchedule ? formatScheduleSummary(activeSchedule) : null,
      createdBy: req.user?.userId || req.user?.userID || 'system'
    };

    await db.ref(`accessLogs/${dateKey}/${logId}`).set(logData);

    if (!allowed || violationRecorded) {
      await recordViolation({
        logId,
        studentId,
        studentName: logData.studentName,
        scanType,
        gateId: logData.gateId,
        gateName: logData.gateName,
        gateLocation: logData.gateLocation,
        campusId: logData.campusId,
        campusName: logData.campusName,
        timestamp,
        violationType: violationType || (allowed ? 'policy' : 'schedule'),
        violationNotes: violationNotes || reasons.join(', ')
      }, dateKey);
    }

    // --- === UPDATED NOTIFICATION & ALERT LOGIC === ---
    
    let notifTitle = "";
    let notifBody = "";
    let alertSeverity = "info"; // Default severity

    if (allowed) {
        notifTitle = (scanType === 'entry') ? "Entry Approved" : "Exit Recorded";
        notifBody = `Your ${scanType} at ${logData.gateName} was successful.`;
        alertSeverity = "success"; // Set severity for "Approved"
        
        if (violationRecorded) {
            notifTitle = "Access Approved (with Violation)";
            notifBody = `Violation noted: ${violationType}. ${violationNotes || ''}`;
            alertSeverity = "warning"; // Set severity for "Violation"
        }
    } else {
        notifTitle = "Entry Denied";
        notifBody = `Access was denied. Reason: ${reasons.join(', ')}`;
        alertSeverity = "error"; // Set severity for "Denied"
    }

    // 1. ALWAYS create the alert log to show in the app's notification tab
    await createAlert({
      studentId: studentProfile.userId, // The Firebase Key
      studentName: logData.studentName,
      gateId: logData.gateId,
      campusId: logData.campusId,
      timestamp: timestamp, 
      severity: alertSeverity,
      message: notifTitle 
    });
    
    // 2. ALWAYS send the push notification pop-up
    await sendNotificationToStudent(studentProfile.userId, notifTitle, notifBody);
    
    // --- === END OF UPDATED LOGIC === ---

    res.json({
      success: true,
      message: allowed ? 'Access granted' : 'Access denied',
      allowed,
      reasons,
      violationRecorded,
      log: logData
    });

  } catch (error) {
    console.error('scanStudent error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing gate scan'
    });
  }
}; //END OF NOTIFICATION UPDATED BEFORE const getAccessLogsForUser

/**
 * Return access logs for a given time range - filtered by user's campus for guards
 */
const getAccessLogsForUser = async (req, res) => {
  try {
    const { range = 'day' } = req.query;
    const { start, end } = resolveRange(range);
    const logs = await collectAccessLogs(start, end);

    // Filter by user's campus for guards (admins see all)
    let filteredLogs = logs;
    if (req.user.role === 'guard') {
      const userCampusId = req.user.campusId;
      filteredLogs = logs.filter(log => log.campusId === userCampusId);
    }

    res.json({
      success: true,
      range,
      logs: filteredLogs
    });
  } catch (error) {
    console.error('getAccessLogsForUser error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching access logs'
    });
  }
};

/**
 * Return access logs for a given time range (unfiltered - for backwards compatibility)
 */
const getAccessLogs = async (req, res) => {
  try {
    const { range = 'day' } = req.query;
    const { start, end } = resolveRange(range);
    const logs = await collectAccessLogs(start, end);

    res.json({
      success: true,
      range,
      logs
    });
  } catch (error) {
    console.error('getAccessLogs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching access logs'
    });
  }
};

/**
 * Return violation records for a given time range - filtered by user's campus for guards
 */
const getViolationsForUser = async (req, res) => {
  try {
    const { range = 'day' } = req.query;
    const { start, end } = resolveRange(range);
    const violations = await collectViolations(start, end);

    // Filter by user's campus for guards (admins see all)
    let filteredViolations = violations;
    if (req.user.role === 'guard') {
      const userCampusId = req.user.campusId;
      filteredViolations = violations.filter(violation => violation.campusId === userCampusId);
    }

    res.json({
      success: true,
      range,
      violations: filteredViolations
    });
  } catch (error) {
    console.error('getViolationsForUser error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching violations'
    });
  }
}; 

/**
 * Return violation records for a given time range (unfiltered - for backwards compatibility)
 */
const getViolations = async (req, res) => {
  try {
    const { range = 'day' } = req.query;
    const { start, end } = resolveRange(range);
    const violations = await collectViolations(start, end);

    res.json({
      success: true,
      range,
      violations
    });
  } catch (error) {
    console.error('getViolations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching violations'
    });
  }
};

/**
 * Generate lightweight reports for dashboard summaries
 */
const getReports = async (req, res) => {
  try {
    const { start, end } = resolveRange(req.query.range || 'day');
    const logs = await collectAccessLogs(start, end);

    const report = logs.reduce((acc, log) => {
      acc.total += 1;
      if (log.scanType === 'entry') acc.entries += 1;
      if (log.scanType === 'exit') acc.exits += 1;
      if (!log.allowed) acc.denied += 1;
      return acc;
    }, { total: 0, entries: 0, exits: 0, denied: 0 });

    const violations = await collectViolations(start, end);
    report.violations = violations.length;

    res.json({ success: true, report });
  } catch (error) {
    console.error('getReports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while building reports'
    });
  }
};

// Helpers ------------------------------------------------------------------
const findStudentProfile = async (studentId) => {
  // This function needs to find the correct USER KEY (the one like -Oe3...)
  // The 'studentId' param is what comes from the QR code.

  // First, check if the QR code IS the Firebase key
  const direct = await db.ref(`users/${studentId}`).once('value');
  if (direct.exists()) {
    // The QR code was the Firebase key.
    return { ...direct.val(), userId: studentId }; // Return profile and the key
  }

  // If not, check if it matches the `studentId` field
  let snapshot = await db.ref('users').orderByChild('studentId').equalTo(studentId).once('value');
  if (snapshot.exists()) {
    const records = snapshot.val();
    const key = Object.keys(records)[0]; // This is the Firebase key
    return { ...records[key], userId: key }; // Return profile and the key
  }

  // Fallback to `userID` field
  snapshot = await db.ref('users').orderByChild('userID').equalTo(studentId).once('value');
  if (snapshot.exists()) {
    const records = snapshot.val();
    const key = Object.keys(records)[0]; // This is the Firebase key
    return { ...records[key], userId: key }; // Return profile and the key
  }

  return null;
};

const formatScheduleSummary = (schedule) => ({
  subjectCode: schedule.subjectCode,
  subjectName: schedule.subjectName,
  dayOfWeek: schedule.dayOfWeek,
  startTime: schedule.startTime,
  endTime: schedule.endTime,
  room: schedule.room
});

const recordViolation = async (violationData, dateKey) => {
  const violationId = violationData.logId || uuidv4();
  await db.ref(`violations/${dateKey}/${violationId}`).set({
    violationId,
    ...violationData
  });
};

const createAlert = async (alert) => {
  const alertId = uuidv4();
  // We log this under the user's ID so they can fetch it in their "Notifications" screen
  await db.ref(`alerts/${alert.studentId}/${alertId}`).set({ 
    alertId,
    isRead: false,
    createdAt: new Date().toISOString(),
    ...alert
  });
};

const resolveRange = (range) => {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  switch (range) {
    case 'month':
      start.setDate(start.getDate() - 30);
      break;
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'day':
    default:
      start.setHours(0, 0, 0, 0);
      break;
  }

  return { start, end };
};

const collectAccessLogs = async (startDate, endDate) => {
  const logs = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const key = formatDateKey(cursor);
    const snapshot = await db.ref(`accessLogs/${key}`).once('value');
    if (snapshot.exists()) {
      const dayLogs = snapshot.val();
      Object.values(dayLogs).forEach((log) => logs.push(log));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

const collectViolations = async (startDate, endDate) => {
  const violations = [];
  const cursor = new Date(startDate);

  while (cursor <= endDate) {
    const key = formatDateKey(cursor);
    const snapshot = await db.ref(`violations/${key}`).once('value');
    if (snapshot.exists()) {
      const dayViolations = snapshot.val();
      Object.values(dayViolations).forEach((violation) => violations.push(violation));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return violations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

const getDayName = (date) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
};

// Helper functions to get gate and campus information
const findGateInfo = async (gateId) => {
  try {
    const gateSnapshot = await db.ref(`gates/${gateId}`).once('value');
    if (gateSnapshot.exists()) {
      return gateSnapshot.val();
    }
    return null;
  } catch (error) {
    console.error('Error finding gate info:', error);
    return null;
  }
};

const findCampusInfo = async (campusId) => {
  try {
    if (!campusId) return null;
    const campusSnapshot = await db.ref(`campuses/${campusId}`).once('value');
     if (campusSnapshot.exists()) {
      return campusSnapshot.val();
    }
    return null;
  } catch (error) {
    console.error('Error finding campus info:', error);
    return null;
  }
};

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Generate reports for dashboard summaries - filtered by user's campus for guards
 */
const getReportsForUser = async (req, res) => {
  try {
    const { start, end } = resolveRange(req.query.range || 'day');
    const logs = await collectAccessLogs(start, end);

    // Filter logs by user's campus for guards
    let filteredLogs = logs;
    if (req.user.role === 'guard') {
      const userCampusId = req.user.campusId;
      filteredLogs = logs.filter(log => log.campusId === userCampusId);
    }

    const report = filteredLogs.reduce((acc, log) => {
      acc.total += 1;
      if (log.scanType === 'entry') acc.entries += 1;
      if (log.scanType === 'exit') acc.exits += 1;
      if (!log.allowed) acc.denied += 1;
      return acc;
    }, { total: 0, entries: 0, exits: 0, denied: 0 });

    const violations = await collectViolations(start, end);
    // Filter violations by user's campus for guards
    let filteredViolations = violations;
    if (req.user.role === 'guard') {
      const userCampusId = req.user.campusId;
      filteredViolations = violations.filter(violation => violation.campusId === userCampusId);
    }
    report.violations = filteredViolations.length;

    res.json({ success: true, report });
  } catch (error) {
    console.error('getReportsForUser error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while building reports'
    });
  }
};

// --- === NEW HELPER FUNCTION TO SEND NOTIFICATIONS === ---
/**
 * Sends a push notification to a specific user using their Firebase User ID.
 * @param {string} userId The Firebase key of the user (e.g., "-Oe3PDsd5yun4I-n12kl")
 * @param {string} title The title of the notification.
 * @param {string} body The body text of the notification.
 */
async function sendNotificationToStudent(userId, title, body) {
  if (!userId) {
    console.error('No userId provided, cannot send notification.');
    return;
  }

  try {
    // 1. Get the user's fcmToken from the database
    const userRef = db.ref(`/users/${userId}`);
    const snapshot = await userRef.once('value');
    const userData = snapshot.val();

    if (!userData || !userData.fcmToken) {
      console.log(`User ${userId} does not have an fcmToken. Cannot send notification.`);
      return;
    }

    const token = userData.fcmToken;

    // 2. Construct the notification message
    const message = {
      notification: {
        title: title,
        body: body,
      },
      token: token,
      data: { // Optional: send extra data to your app
        type: "access_update",
        status: title,
        body: body
      },
      android: {
        priority: "high" // Ensures the notification pops up
      }
    };

    // 3. Send the message using the Firebase Admin SDK
    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);

  } catch (error) {
    // This often happens if a token is expired.
    console.error(`Error sending notification to user ${userId}:`, error.message);
  }
}
// --- === END OF NEW FUNCTION === ---

module.exports = {
  scanStudent,
  getAccessLogs,
  getAccessLogsForUser,
  getViolations,
  getViolationsForUser,
  getReports,
  getReportsForUser
};