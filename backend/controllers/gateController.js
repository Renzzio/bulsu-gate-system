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
      violationNotes,
      guardDecision // 'approve' or 'deny' - indicates guard making final decision
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

    // Get gate and campus information early
    const gateInfo = await findGateInfo(gateId || studentProfile.assignedGate || 'Main Gate');
    const campusInfo = await findCampusInfo(gateInfo?.campusId);

    let allowed = true; // Allow all scans by default
    const reasons = [];

    // Flag for approval needed - ALL entries and exits during class
    const approvalNeeded = (scanType === 'entry') || (scanType === 'exit' && activeSchedule);

    // First check: if this is an initial entry or exit scan (no guardDecision)
    if ((scanType === 'entry' || scanType === 'exit') && !guardDecision) {
      let responseMessage, responseReasons, responseAllowed, exitApprovalNeeded;

      if (scanType === 'exit') {
        // SPECIAL LOGIC FOR EXIT SCANS
        if (activeSchedule) {
          // Student HAS ongoing class - show exit confirmation modal
          responseMessage = 'Exit confirmation required - student has ongoing class';
          responseReasons = ['Student leaving during class time'];
          responseAllowed = false; // Guard will decide
          exitApprovalNeeded = true; // Show exit approval modal
        } else {
          // Student has NO ongoing class - allow exit immediately
          responseMessage = 'Exit allowed - no ongoing classes detected';
          responseReasons = ['No ongoing classes at this time'];
          responseAllowed = true; // Always allow
          exitApprovalNeeded = false; // Just show success modal and log

          // Log the exit immediately
          const logId = uuidv4();
          const timestamp = now.toISOString();
          const dateKey = formatDateKey(now);

          const logData = {
            logId,
            studentId,
            studentName: `${studentProfile.firstName || ''} ${studentProfile.lastName || ''}`.trim(),
            scanType,
            gateId: gateId || studentProfile.assignedGate || 'Main Gate',
            gateName: gateInfo?.name || 'Unknown Gate',
            gateLocation: gateInfo?.location || 'Unknown Location',
            campusId: gateInfo?.campusId || studentProfile.campusId || 'unknown',
            campusName: campusInfo?.name || 'Unknown Campus',
            timestamp,
            allowed: true,
            reasons: responseReasons,
            scheduleSummary: null,
            createdBy: req.user?.userId || req.user?.userID || 'system'
          };

          await db.ref(`accessLogs/${dateKey}/${logId}`).set(logData);

          // No alert or notification for successful exits with no ongoing class

          return res.json({
            success: true,
            message: responseMessage,
            allowed: responseAllowed,
            reasons: responseReasons,
            exitApprovalNeeded,
            log: logData
          });
        }
      } 
      // Check if this is a guard approval from violation modal (has violation data)
      else if (hasScheduleToday && typeof violationType !== 'undefined') {
        // This is a guard approving from the violation modal - allow entry
        responseMessage = 'Entry approved - processing access';
        responseReasons = ['Guard approval granted'];
        responseAllowed = true;
        exitApprovalNeeded = false; // Don't show modal, process immediately

        // Create success log
        const logId = uuidv4();
        const timestamp = now.toISOString();
        const dateKey = formatDateKey(now);

        const logData = {
          logId,
          studentId,
          studentName: `${studentProfile.firstName || ''} ${studentProfile.lastName || ''}`.trim(),
          scanType,
          gateId: gateId || studentProfile.assignedGate || 'Main Gate',
          gateName: gateInfo?.name || 'Unknown Gate',
          gateLocation: gateInfo?.location || 'Unknown Location',
          campusId: gateInfo?.campusId || studentProfile.campusId || 'unknown',
          campusName: campusInfo?.name || 'Unknown Campus',
          timestamp,
          allowed: true,
          reasons: responseReasons,
          scheduleSummary: activeSchedule ? formatScheduleSummary(activeSchedule) : null,
          createdBy: req.user?.userId || req.user?.userID || 'system'
        };

        // Log the approval
        await db.ref(`accessLogs/${dateKey}/${logId}`).set(logData);

        // Record violation if present
        if (violationType) {
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
            violationType,
            violationNotes: violationNotes || 'No additional notes'
          }, dateKey);
        }

        // Send approval notification
        await createAlert({
          studentId: studentProfile.userId,
          studentName: logData.studentName,
          gateId: logData.gateId,
          campusId: logData.campusId,
          timestamp,
          severity: violationType ? 'warning' : 'success',
          message: violationType ? 'Entry Approved (with Violation)' : 'Entry Approved'
        });

        await sendNotificationToStudent(studentProfile.userId,
          violationType ? 'Entry Approved (with Violation)' : 'Entry Approved',
          'Access granted successfully.');

        return res.json({
          success: true,
          message: responseMessage,
          allowed: responseAllowed,
          reasons: responseReasons,
          exitApprovalNeeded,
          log: logData
        });
      } else if (hasScheduleToday) {
        // Student HAS schedule - show violation modal for approval (initial scan)
        responseMessage = 'Entry confirmation required - student has schedule for today';
        responseReasons = ['Verify student and note any violations'];
        responseAllowed = false; // Guard will decide
        exitApprovalNeeded = true; // Show approval UI with violation fields
      } else {
        // Student has NO schedule - show denial modal and log attempt
        responseMessage = 'You are not allowed to enter. No schedule detected for today.';
        responseReasons = ['You are not allowed to enter. No schedule detected for today.'];
        responseAllowed = false; // Always deny
        exitApprovalNeeded = false; // Just show denial modal

        // For no-schedule students, create and return the denial log immediately
        const logId = uuidv4();
        const timestamp = now.toISOString();
        const dateKey = formatDateKey(now);

        const logData = {
          logId,
          studentId,
          studentName: `${studentProfile.firstName || ''} ${studentProfile.lastName || ''}`.trim(),
          scanType,
          gateId: gateId || studentProfile.assignedGate || 'Main Gate',
          gateName: gateInfo?.name || 'Unknown Gate',
          gateLocation: gateInfo?.location || 'Unknown Location',
          campusId: gateInfo?.campusId || studentProfile.campusId || 'unknown',
          campusName: campusInfo?.name || 'Unknown Campus',
          timestamp,
          allowed: false,
          reasons: responseReasons,
          scheduleSummary: null,
          createdBy: req.user?.userId || req.user?.userID || 'system'
        };

        // Log the denial attempt immediately
        await db.ref(`accessLogs/${dateKey}/${logId}`).set(logData);

        // Also record as violation
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
          violationType: 'no_schedule',
          violationNotes: 'Entry attempt without schedule - denied automatically'
        }, dateKey);

        // Send denial notification
        await createAlert({
          studentId: studentProfile.userId,
          studentName: logData.studentName,
          gateId: logData.gateId,
          campusId: logData.campusId,
          timestamp,
          severity: 'error',
          message: 'Entry Denied - No Schedule'
        });

        await sendNotificationToStudent(studentProfile.userId, 'Entry Denied - No Schedule', 'Access was denied. You have no scheduled classes for today.');

        return res.json({
          success: true,
          message: responseMessage,
          allowed: responseAllowed,
          reasons: responseReasons,
          exitApprovalNeeded,
          log: logData
        });
      }

      // For scheduled students, just return the approval UI data (no logging until approved)
      return res.json({
        success: true,
        message: responseMessage,
        allowed: responseAllowed,
        reasons: responseReasons,
        exitApprovalNeeded,
        log: {
          studentId,
          studentName: `${studentProfile.firstName || ''} ${studentProfile.lastName || ''}`.trim(),
          scanType,
          gateId: gateId || studentProfile.assignedGate || 'Main Gate',
          campusName: campusInfo?.name || 'Unknown Campus',
          scheduleSummary: activeSchedule ? formatScheduleSummary(activeSchedule) : null
        }
      });
    }

    // Handle guard decisions and auto-processing cases
    if (scanType === 'entry' && !hasScheduleToday) {
      allowed = false;
      reasons.push('No scheduled classes for today');
    } else if (scanType === 'entry' && hasScheduleToday && !guardDecision) {
      // Fallback: guard approving an entry
      allowed = true;
      reasons.push('Entry approved by guard');
    } else if (guardDecision === 'approve') {
      allowed = true;
      if (scanType === 'exit' && activeSchedule) {
        reasons.push('Exit approved by guard during class time');
      }
    } else if (guardDecision === 'deny') {
      allowed = false;
      if (scanType === 'exit' && activeSchedule) {
        reasons.push('Exit denied by guard during class time');
      }
    }

    // Handle explicit guard decisions (for exits)
    else if (guardDecision === 'approve') {
      allowed = true;
      if (scanType === 'exit' && activeSchedule) {
        reasons.push('Exit approved by guard during class time');
      }
    } else if (guardDecision === 'deny') {
      allowed = false;
      if (scanType === 'exit' && activeSchedule) {
        reasons.push('Exit denied by guard during class time');
      }
    }

    const violationRecorded = Boolean(violationType);
    if (violationRecorded) {
      // For exits with valid reasons, show as "Reason:" not "Violation noted:"
      const isValidExitReason = scanType === 'exit' && (
        violationType === 'Health Emergency' ||
        violationType === 'Family Emergency' ||
        violationType === 'Appointment' ||
        violationType === 'Authorized Early Dismissal' ||
        violationType === 'School Business' ||
        violationType === 'Other'
      );

      reasons.push(`${isValidExitReason ? 'Reason' : 'Violation noted'}: ${violationType}`);
    }

    const logId = uuidv4();
    const timestamp = now.toISOString();
    const dateKey = formatDateKey(now);

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

    // Only record violations for denied access OR actual policy violations
    // Don't record approved exits with valid reasons as violations
    const isActualViolation = !allowed || (violationType && violationType !== 'Health Emergency' && violationType !== 'Family Emergency' && violationType !== 'Appointment' && violationType !== 'Authorized Early Dismissal' && violationType !== 'School Business' && violationType !== 'Other' && scanType !== 'exit');

    if (isActualViolation) {
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

    // For approved exits, log reasons but don't treat as violation
    if (allowed && violationType && scanType === 'exit') {
      // Don't log this as violation, just note the reason in the log
    }

    // --- === UPDATED NOTIFICATION & ALERT LOGIC === ---

    let notifTitle = "";
    let notifBody = "";

    if (allowed) {
        notifTitle = (scanType === 'entry') ? "Entry Approved" : "Exit Recorded";
        notifBody = `Your ${scanType} at ${logData.gateName} was successful.`;
    } else {
        notifTitle = (scanType === 'entry') ? "Entry Denied" : "Exit Denied";
        notifBody = `Access was denied. Reason: ${reasons.join(', ')}`;
    }

    // Only create alerts for actual violations (not successful entries/exits)
    if (isActualViolation) {
        // Send violation alert to student app notifications
        await createAlert({
          studentId: studentProfile.userId,
          studentName: logData.studentName,
          gateId: logData.gateId,
          campusId: logData.campusId,
          timestamp: timestamp,
          severity: allowed ? 'warning' : 'error',
          message: allowed ? `Violation Warning: ${violationType || 'Policy Violation'}` : notifTitle
        });

        // Send push notification only for violations
        await sendNotificationToStudent(studentProfile.userId, notifTitle, notifBody);
    }

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
