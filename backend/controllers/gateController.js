// backend/controllers/gateController.js
const { db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const {
  getSchedulesByDay,
  getActiveScheduleNow
} = require('../utils/scheduleUtils');

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

    // Fetch student profile information (if available)
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

    // For exits, always allow - students should be able to leave anytime
    // Remove the active class restriction for exits

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
      studentId,
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

    if (!allowed || violationRecorded) {
      await createAlert({
        studentId,
        studentName: logData.studentName,
        gateId: logData.gateId,
        campusId: logData.campusId,
        timestamp,
        severity: violationRecorded ? 'warning' : 'info',
        message: violationRecorded ?
          `Violation recorded: ${violationType}` :
          `Access denied for ${studentId}: ${reasons.join(', ')}`
      });
    }

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
};

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
  // First try matching userID field
  const usersRef = db.ref('users');
  const byGeneratedId = await usersRef.orderByChild('userID').equalTo(studentId).once('value');
  if (byGeneratedId.exists()) {
    const records = byGeneratedId.val();
    const key = Object.keys(records)[0];
    return records[key];
  }

  // Fallback to exact node key (studentId)
  const direct = await db.ref(`users/${studentId}`).once('value');
  if (direct.exists()) {
    return direct.val();
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
  await db.ref(`alerts/${alertId}`).set({
    alertId,
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

module.exports = {
  scanStudent,
  getAccessLogs,
  getAccessLogsForUser,
  getViolations,
  getViolationsForUser,
  getReports,
  getReportsForUser
};
