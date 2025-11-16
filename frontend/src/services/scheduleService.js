// frontend/src/services/scheduleService.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/schedules';

// Create axios instance with default headers
const scheduleAPI = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
scheduleAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
scheduleAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Get all schedules for a specific student
 * GET /api/schedules/:studentId
 */
export const getStudentSchedules = async (studentId) => {
  try {
    const response = await scheduleAPI.get(`/${studentId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

/**
 * Add a new schedule
 * POST /api/schedules/add
 */
export const addSchedule = async (scheduleData) => {
  try {
    const response = await scheduleAPI.post('/add', scheduleData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

/**
 * Update an existing schedule
 * PATCH /api/schedules/:studentId/:scheduleId
 */
export const updateSchedule = async (studentId, scheduleId, scheduleData) => {
  try {
    const response = await scheduleAPI.patch(`/${studentId}/${scheduleId}`, scheduleData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

/**
 * Delete a schedule
 * DELETE /api/schedules/:studentId/:scheduleId
 */
export const deleteSchedule = async (studentId, scheduleId) => {
  try {
    const response = await scheduleAPI.delete(`/${studentId}/${scheduleId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

/**
 * Import schedules from Excel file
 * POST /api/schedules/:studentId/import
 */
export const importSchedulesFromExcel = async (studentId, formData) => {
  try {
    // Use plain axios without the default headers for FormData
    // This allows axios to properly set multipart/form-data with boundary
    const token = localStorage.getItem('token');
    const response = await axios.post(
      `${API_BASE_URL}/${studentId}/import`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          // Don't set Content-Type - let axios handle it for FormData
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

const scheduleService = {
  getStudentSchedules,
  addSchedule,
  updateSchedule,
  deleteSchedule,
  importSchedulesFromExcel
};

export default scheduleService;
