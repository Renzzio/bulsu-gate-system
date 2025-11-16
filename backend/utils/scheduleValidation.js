// backend/utils/scheduleValidation.js

/**
 * Validate schedule data structure and required fields
 */
const validateScheduleData = (data) => {
  const requiredFields = [
    'studentId',
    'subjectCode',
    'subjectName',
    'dayOfWeek',
    'startTime',
    'endTime',
    'room',
    'instructor'
  ];

  const errors = [];

  // Check required fields
  for (const field of requiredFields) {
    if (!data[field]) {
      errors.push(`${field} is required`);
    }
  }

  // Validate field types
  if (data.studentId && typeof data.studentId !== 'string') {
    errors.push('studentId must be a string');
  }

  if (data.subjectCode && typeof data.subjectCode !== 'string') {
    errors.push('subjectCode must be a string');
  }

  if (data.subjectName && typeof data.subjectName !== 'string') {
    errors.push('subjectName must be a string');
  }

  if (data.dayOfWeek && typeof data.dayOfWeek !== 'string') {
    errors.push('dayOfWeek must be a string');
  }

  if (data.startTime && typeof data.startTime !== 'string') {
    errors.push('startTime must be a string');
  }

  if (data.endTime && typeof data.endTime !== 'string') {
    errors.push('endTime must be a string');
  }

  if (data.room && typeof data.room !== 'string') {
    errors.push('room must be a string');
  }

  if (data.instructor && typeof data.instructor !== 'string') {
    errors.push('instructor must be a string');
  }

  if (data.section && typeof data.section !== 'string') {
    errors.push('section must be a string');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate day of week
 */
const validateDayOfWeek = (dayOfWeek) => {
  const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  if (!validDays.includes(dayOfWeek)) {
    return {
      isValid: false,
      error: `Invalid day: ${dayOfWeek}. Must be one of: ${validDays.join(', ')}`
    };
  }

  return { isValid: true };
};

/**
 * Validate time format (HH:mm in 24-hour format)
 */
const validateTimeFormat = (time) => {
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;

  if (!timeRegex.test(time)) {
    return {
      isValid: false,
      error: `Invalid time format: ${time}. Use HH:mm (24-hour format, e.g., 14:30)`
    };
  }

  return { isValid: true };
};

/**
 * Validate that start time is before end time
 */
const validateTimeOrdering = (startTime, endTime) => {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  if (startMinutes >= endMinutes) {
    return {
      isValid: false,
      error: `Start time (${startTime}) must be before end time (${endTime})`
    };
  }

  return { isValid: true };
};

/**
 * Check if two time ranges overlap
 */
const checkTimeOverlap = (start1, end1, start2, end2) => {
  const start1Minutes = timeToMinutes(start1);
  const end1Minutes = timeToMinutes(end1);
  const start2Minutes = timeToMinutes(start2);
  const end2Minutes = timeToMinutes(end2);

  return start1Minutes < end2Minutes && end1Minutes > start2Minutes;
};

/**
 * Validate Excel row data
 */
const validateExcelRow = (rowData, rowNumber) => {
  const errors = [];

  // Check required fields
  const requiredFields = ['subjectCode', 'subjectName', 'dayOfWeek', 'startTime', 'endTime', 'room', 'instructor'];
  
  for (const field of requiredFields) {
    if (!rowData[field] || rowData[field].toString().trim() === '') {
      errors.push(`Row ${rowNumber}: ${field} is required`);
    }
  }

  // Validate day of week
  if (rowData.dayOfWeek) {
    const dayValidation = validateDayOfWeek(rowData.dayOfWeek.toString().trim());
    if (!dayValidation.isValid) {
      errors.push(`Row ${rowNumber}: ${dayValidation.error}`);
    }
  }

  // Validate time formats
  if (rowData.startTime) {
    const startTimeValidation = validateTimeFormat(rowData.startTime.toString().trim());
    if (!startTimeValidation.isValid) {
      errors.push(`Row ${rowNumber}: ${startTimeValidation.error}`);
    }
  }

  if (rowData.endTime) {
    const endTimeValidation = validateTimeFormat(rowData.endTime.toString().trim());
    if (!endTimeValidation.isValid) {
      errors.push(`Row ${rowNumber}: ${endTimeValidation.error}`);
    }
  }

  // Validate time ordering
  if (rowData.startTime && rowData.endTime) {
    const orderingValidation = validateTimeOrdering(
      rowData.startTime.toString().trim(),
      rowData.endTime.toString().trim()
    );
    if (!orderingValidation.isValid) {
      errors.push(`Row ${rowNumber}: ${orderingValidation.error}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Convert time string (HH:mm) to minutes since midnight
 */
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Format validation errors for API response
 */
const formatValidationErrors = (errors) => {
  return {
    success: false,
    message: 'Validation failed',
    errors: errors,
    errorCount: errors.length
  };
};

module.exports = {
  validateScheduleData,
  validateDayOfWeek,
  validateTimeFormat,
  validateTimeOrdering,
  checkTimeOverlap,
  validateExcelRow,
  timeToMinutes,
  formatValidationErrors
};
