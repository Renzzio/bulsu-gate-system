// backend/controllers/scheduleController.js
const { db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

/**
 * Get all schedules for a specific student
 * GET /api/schedules/:studentId
 */
const getStudentSchedules = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required'
      });
    }

    const schedulesRef = db.ref(`schedules/${studentId}`);
    const snapshot = await schedulesRef.once('value');

    if (!snapshot.exists()) {
      return res.json({
        success: true,
        schedules: [],
        message: 'No schedules found for this student'
      });
    }

    const schedules = [];
    snapshot.forEach((childSnapshot) => {
      schedules.push({
        scheduleId: childSnapshot.key,
        ...childSnapshot.val()
      });
    });

    // Sort schedules by day and time
    schedules.sort((a, b) => {
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const dayDiff = dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.localeCompare(b.startTime);
    });

    res.json({
      success: true,
      schedules: schedules,
      count: schedules.length
    });
  } catch (error) {
    console.error('Get student schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching schedules'
    });
  }
};

/**
 * Add a new schedule for a student
 * POST /api/schedules/add
 */
const addSchedule = async (req, res) => {
  try {
    const {
      studentId,
      subjectCode,
      subjectName,
      dayOfWeek,
      startTime,
      endTime,
      room,
      instructor,
      section,
      campusId
    } = req.body;

    // Validation
    if (!studentId || !subjectCode || !subjectName || !dayOfWeek || !startTime || !endTime || !room || !instructor) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: studentId, subjectCode, subjectName, dayOfWeek, startTime, endTime, room, instructor'
      });
    }

    // Validate day of week
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    if (!validDays.includes(dayOfWeek)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid day of week'
      });
    }

    // Validate time format and ordering
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid time format. Use HH:mm (24-hour format)'
      });
    }

    if (startTime >= endTime) {
      return res.status(400).json({
        success: false,
        message: 'Start time must be before end time'
      });
    }

    // Check for overlapping schedules on the same day
    const schedulesRef = db.ref(`schedules/${studentId}`);
    const snapshot = await schedulesRef.once('value');

    if (snapshot.exists()) {
      const hasOverlap = Object.values(snapshot.val()).some(schedule => {
        return schedule.dayOfWeek === dayOfWeek &&
               timeOverlaps(startTime, endTime, schedule.startTime, schedule.endTime);
      });

      if (hasOverlap) {
        return res.status(400).json({
          success: false,
          message: 'Schedule overlaps with existing schedule on the same day'
        });
      }
    }

    // Create new schedule
    const scheduleId = uuidv4();
    const newSchedule = {
      scheduleId,
      studentId,
      subjectCode,
      subjectName,
      dayOfWeek,
      startTime,
      endTime,
      room,
      instructor,
      section: section || null,
      campusId: campusId || null, // Associate schedule with student's campus
      createdAt: new Date().toISOString(),
      createdBy: req.user?.userId || 'system'
    };

    await db.ref(`schedules/${studentId}/${scheduleId}`).set(newSchedule);

    res.status(201).json({
      success: true,
      message: 'Schedule added successfully',
      schedule: newSchedule
    });
  } catch (error) {
    console.error('Add schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding schedule'
    });
  }
};

/**
 * Update an existing schedule
 * PATCH /api/schedules/:studentId/:scheduleId
 */
const updateSchedule = async (req, res) => {
  try {
    const { studentId, scheduleId } = req.params;
    const updateData = req.body;

    if (!studentId || !scheduleId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and Schedule ID are required'
      });
    }

    // Get existing schedule
    const scheduleRef = db.ref(`schedules/${studentId}/${scheduleId}`);
    const snapshot = await scheduleRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    const existingSchedule = snapshot.val();
    const updatedSchedule = { ...existingSchedule, ...updateData };

    // Validate updated fields if they exist
    if (updateData.dayOfWeek || updateData.startTime || updateData.endTime) {
      const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const dayOfWeek = updateData.dayOfWeek || existingSchedule.dayOfWeek;
      const startTime = updateData.startTime || existingSchedule.startTime;
      const endTime = updateData.endTime || existingSchedule.endTime;

      if (updateData.dayOfWeek && !validDays.includes(dayOfWeek)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid day of week'
        });
      }

      // Validate time format
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if ((updateData.startTime && !timeRegex.test(startTime)) || (updateData.endTime && !timeRegex.test(endTime))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid time format. Use HH:mm (24-hour format)'
        });
      }

      if (startTime >= endTime) {
        return res.status(400).json({
          success: false,
          message: 'Start time must be before end time'
        });
      }

      // Check for overlapping schedules (excluding current schedule)
      const schedulesRef = db.ref(`schedules/${studentId}`);
      const allSchedulesSnapshot = await schedulesRef.once('value');

      if (allSchedulesSnapshot.exists()) {
        const hasOverlap = Object.entries(allSchedulesSnapshot.val()).some(([id, schedule]) => {
          return id !== scheduleId &&
                 schedule.dayOfWeek === dayOfWeek &&
                 timeOverlaps(startTime, endTime, schedule.startTime, schedule.endTime);
        });

        if (hasOverlap) {
          return res.status(400).json({
            success: false,
            message: 'Schedule overlaps with existing schedule on the same day'
          });
        }
      }
    }

    // Update the schedule
    updatedSchedule.updatedAt = new Date().toISOString();
    updatedSchedule.updatedBy = req.user?.userId || 'system';

    await scheduleRef.update(updatedSchedule);

    res.json({
      success: true,
      message: 'Schedule updated successfully',
      schedule: updatedSchedule
    });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating schedule'
    });
  }
};

/**
 * Delete a schedule
 * DELETE /api/schedules/:studentId/:scheduleId
 */
const deleteSchedule = async (req, res) => {
  try {
    const { studentId, scheduleId } = req.params;

    if (!studentId || !scheduleId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and Schedule ID are required'
      });
    }

    const scheduleRef = db.ref(`schedules/${studentId}/${scheduleId}`);
    const snapshot = await scheduleRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    await scheduleRef.remove();

    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    console.error('Delete schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting schedule'
    });
  }
};

/**
 * Import schedules from Excel file
 * POST /api/schedules/:studentId/import
 */
const importSchedulesFromExcel = async (req, res) => {
  try {
    const { studentId } = req.params;
    const file = req.file;

    console.log('Import request received:', {
      studentId,
      hasFile: !!file,
      fileName: file?.originalname,
      fileSize: file?.size,
      mimetype: file?.mimetype
    });

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required'
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Excel file is required'
      });
    }

    // Parse Excel file
    const XLSX = require('xlsx');
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Excel file contains no data'
      });
    }

    // Validate and process each row
    const { validateExcelRow } = require('../utils/scheduleValidation');
    const importResults = {
      successful: [],
      failed: [],
      totalRows: data.length
    };

    // Get existing schedules for overlap detection
    const schedulesRef = db.ref(`schedules/${studentId}`);
    const existingSnapshot = await schedulesRef.once('value');
    const existingSchedules = existingSnapshot.exists() ? Object.values(existingSnapshot.val()) : [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const normalizedRow = normalizeExcelRow(row);
      const rowNumber = i + 2; // Row numbers start at 2 (1 is header)

      // Validate row data
      const validation = validateExcelRow(normalizedRow, rowNumber);
      if (!validation.isValid) {
        importResults.failed.push({
          row: rowNumber,
          errors: validation.errors
        });
        continue;
      }

      // Check for overlaps with existing schedules
      const newStartTime = normalizedRow.startTime;
      const newEndTime = normalizedRow.endTime;
      const newDay = normalizedRow.dayOfWeek;

      const hasOverlap = existingSchedules.some(schedule => {
        return schedule.dayOfWeek === newDay &&
               timeOverlaps(newStartTime, newEndTime, schedule.startTime, schedule.endTime);
      });

      if (hasOverlap) {
        importResults.failed.push({
          row: rowNumber,
          errors: [`Schedule overlaps with existing schedule on ${newDay}`]
        });
        continue;
      }

      // Create schedule
      const scheduleId = require('uuid').v4();
      const newSchedule = {
        scheduleId,
        studentId,
        subjectCode: normalizedRow.subjectCode,
        subjectName: normalizedRow.subjectName,
        dayOfWeek: newDay,
        startTime: newStartTime,
        endTime: newEndTime,
        room: normalizedRow.room,
        instructor: normalizedRow.instructor,
        section: normalizedRow.section || null,
        createdAt: new Date().toISOString(),
        createdBy: req.user?.userId || 'system'
      };

      try {
        await db.ref(`schedules/${studentId}/${scheduleId}`).set(newSchedule);
        importResults.successful.push({
          row: rowNumber,
          scheduleId,
          subjectCode: newSchedule.subjectCode,
          dayOfWeek: newSchedule.dayOfWeek
        });
        // Add to existing schedules for overlap detection on subsequent rows
        existingSchedules.push(newSchedule);
      } catch (error) {
        importResults.failed.push({
          row: rowNumber,
          errors: [`Database error: ${error.message}`]
        });
      }
    }

    res.json({
      success: true,
      message: `Import completed: ${importResults.successful.length} successful, ${importResults.failed.length} failed`,
      results: importResults
    });
  } catch (error) {
    console.error('Import schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while importing schedules',
      error: error.message
    });
  }
};

/**
 * Helper function to check if two time ranges overlap
 */
const timeOverlaps = (start1, end1, start2, end2) => {
  return start1 < end2 && end1 > start2;
};

/**
 * Normalize Excel row values by trimming strings and converting Excel time formats
 */
const normalizeExcelRow = (row) => {
  const safeString = (value) => (value ?? '').toString().trim();
  const getField = (field) => {
    if (!row || typeof row !== 'object') return '';
    const matchKey = Object.keys(row).find(
      (key) => key.trim().toLowerCase() === field.toLowerCase()
    );
    return matchKey !== undefined ? row[matchKey] : '';
  };

  return {
    subjectCode: safeString(getField('subjectCode')),
    subjectName: safeString(getField('subjectName')),
    dayOfWeek: safeString(getField('dayOfWeek')),
    startTime: formatExcelTime(getField('startTime')),
    endTime: formatExcelTime(getField('endTime')),
    room: safeString(getField('room')),
    instructor: safeString(getField('instructor')),
    section: safeString(getField('section'))
  };
};

/**
 * Convert Excel time values (strings like "8:00" or numbers) to HH:mm strings
 */
const formatExcelTime = (value) => {
  if (value === undefined || value === null) return '';

  // Numeric Excel times are fractions of a day
  if (typeof value === 'number') {
    const totalMinutes = Math.round(value * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  const trimmed = value.toString().trim();
  if (trimmed === '') return '';

  // Ensure leading zero for times like 8:00 -> 08:00
  const [hoursPart, minutesPart] = trimmed.split(':');
  if (!minutesPart) {
    return trimmed;
  }
  const hours = hoursPart.padStart(2, '0');
  const minutes = minutesPart.padStart(2, '0');
  return `${hours}:${minutes}`;
};

module.exports = {
  getStudentSchedules,
  addSchedule,
  updateSchedule,
  deleteSchedule,
  importSchedulesFromExcel
};
