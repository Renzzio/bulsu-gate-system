// backend/utils/scheduleUtils.js
const { db } = require('../config/firebase');

/**
 * Get current day of week in format expected by schedule (Monday, Tuesday, etc.)
 */
const getCurrentDayOfWeek = () => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date();
  return days[today.getDay()];
};

/**
 * Get current time in HH:mm format
 */
const getCurrentTime = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/**
 * Convert time string to minutes for comparison
 */
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Check if student has an active schedule right now
 * Returns true if student has a schedule matching today's day and current time falls within schedule time
 * 
 * @param {string} studentId - The student's ID
 * @param {Date} currentDateTime - Optional current datetime for testing, uses actual time if not provided
 * @returns {Promise<boolean>} - True if student has active schedule now, false otherwise
 */
const hasScheduleToday = async (studentId, currentDateTime = null) => {
  try {
    if (!studentId) {
      console.warn('hasScheduleToday: studentId is required');
      return false;
    }

    // Get current time and day
    const now = currentDateTime || new Date();
    const currentTime = currentDateTime ? 
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` :
      getCurrentTime();
    
    const currentDay = currentDateTime ? 
      ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()] :
      getCurrentDayOfWeek();

    // Query student's schedules
    const schedulesRef = db.ref(`schedules/${studentId}`);
    const snapshot = await schedulesRef.once('value');

    if (!snapshot.exists()) {
      return false; // No schedules found
    }

    const schedules = snapshot.val();
    const currentTimeMinutes = timeToMinutes(currentTime);

    // Check if any schedule matches today and current time
    for (const schedule of Object.values(schedules)) {
      // Check if schedule is for today
      if (schedule.dayOfWeek !== currentDay) {
        continue;
      }

      // Check if current time falls within schedule time
      const startMinutes = timeToMinutes(schedule.startTime);
      const endMinutes = timeToMinutes(schedule.endTime);

      if (currentTimeMinutes >= startMinutes && currentTimeMinutes <= endMinutes) {
        return true; // Found active schedule
      }
    }

    return false; // No active schedule found
  } catch (error) {
    console.error('hasScheduleToday error:', error);
    return false;
  }
};

/**
 * Get active schedule for a student right now
 * Returns the schedule object if found, null otherwise
 * 
 * @param {string} studentId - The student's ID
 * @param {Date} currentDateTime - Optional current datetime for testing
 * @returns {Promise<Object|null>} - The active schedule or null
 */
const getActiveScheduleNow = async (studentId, currentDateTime = null) => {
  try {
    if (!studentId) {
      return null;
    }

    const now = currentDateTime || new Date();
    const currentTime = currentDateTime ? 
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` :
      getCurrentTime();
    
    const currentDay = currentDateTime ? 
      ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()] :
      getCurrentDayOfWeek();

    const schedulesRef = db.ref(`schedules/${studentId}`);
    const snapshot = await schedulesRef.once('value');

    if (!snapshot.exists()) {
      return null;
    }

    const schedules = snapshot.val();
    const currentTimeMinutes = timeToMinutes(currentTime);

    for (const [scheduleId, schedule] of Object.entries(schedules)) {
      if (schedule.dayOfWeek !== currentDay) {
        continue;
      }

      const startMinutes = timeToMinutes(schedule.startTime);
      const endMinutes = timeToMinutes(schedule.endTime);

      if (currentTimeMinutes >= startMinutes && currentTimeMinutes <= endMinutes) {
        return {
          scheduleId,
          ...schedule
        };
      }
    }

    return null;
  } catch (error) {
    console.error('getActiveScheduleNow error:', error);
    return null;
  }
};

/**
 * Get all schedules for a specific day
 * 
 * @param {string} studentId - The student's ID
 * @param {string} dayOfWeek - The day of week (e.g., 'Monday', 'Tuesday')
 * @returns {Promise<Array>} - Array of schedules for that day
 */
const getSchedulesByDay = async (studentId, dayOfWeek) => {
  try {
    if (!studentId || !dayOfWeek) {
      return [];
    }

    const schedulesRef = db.ref(`schedules/${studentId}`);
    const snapshot = await schedulesRef.once('value');

    if (!snapshot.exists()) {
      return [];
    }

    const schedules = snapshot.val();
    const daySchedules = [];

    for (const [scheduleId, schedule] of Object.entries(schedules)) {
      if (schedule.dayOfWeek === dayOfWeek) {
        daySchedules.push({
          scheduleId,
          ...schedule
        });
      }
    }

    // Sort by start time
    daySchedules.sort((a, b) => a.startTime.localeCompare(b.startTime));

    return daySchedules;
  } catch (error) {
    console.error('getSchedulesByDay error:', error);
    return [];
  }
};

/**
 * Get next schedule for a student
 * 
 * @param {string} studentId - The student's ID
 * @param {Date} currentDateTime - Optional current datetime for testing
 * @returns {Promise<Object|null>} - The next schedule or null if none found
 */
const getNextSchedule = async (studentId, currentDateTime = null) => {
  try {
    if (!studentId) {
      return null;
    }

    const now = currentDateTime || new Date();
    const currentTime = currentDateTime ? 
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}` :
      getCurrentTime();
    
    const currentDay = currentDateTime ? 
      ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()] :
      getCurrentDayOfWeek();

    const schedulesRef = db.ref(`schedules/${studentId}`);
    const snapshot = await schedulesRef.once('value');

    if (!snapshot.exists()) {
      return null;
    }

    const schedules = snapshot.val();
    const currentTimeMinutes = timeToMinutes(currentTime);
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const currentDayIndex = dayOrder.indexOf(currentDay);

    let nextSchedule = null;
    let nextScheduleTime = Infinity;

    // Check today's schedules first
    for (const [scheduleId, schedule] of Object.entries(schedules)) {
      if (schedule.dayOfWeek === currentDay) {
        const startMinutes = timeToMinutes(schedule.startTime);
        if (startMinutes > currentTimeMinutes && startMinutes < nextScheduleTime) {
          nextSchedule = { scheduleId, ...schedule };
          nextScheduleTime = startMinutes;
        }
      }
    }

    // If no schedule found for today, check upcoming days
    if (!nextSchedule) {
      for (let i = 1; i <= 6; i++) {
        const dayIndex = (currentDayIndex + i) % 7;
        const dayOfWeek = dayOrder[dayIndex];

        for (const [scheduleId, schedule] of Object.entries(schedules)) {
          if (schedule.dayOfWeek === dayOfWeek) {
            return { scheduleId, ...schedule };
          }
        }
      }
    }

    return nextSchedule;
  } catch (error) {
    console.error('getNextSchedule error:', error);
    return null;
  }
};

module.exports = {
  hasScheduleToday,
  getActiveScheduleNow,
  getSchedulesByDay,
  getNextSchedule,
  getCurrentDayOfWeek,
  getCurrentTime,
  timeToMinutes
};
