// frontend/src/services/adminService.js
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/admin';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests automatically
axiosInstance.interceptors.request.use(
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

// User Management Services
export const getAllUsers = async (role = null, status = null) => {
  try {
    let url = '/users';
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (status) params.append('status', status);
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error fetching users' };
  }
};

export const getUserById = async (userId) => {
  try {
    const response = await axiosInstance.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error fetching user' };
  }
};

export const createUser = async (userData) => {
  try {
    const response = await axiosInstance.post('/users', userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error creating user' };
  }
};

export const updateUser = async (userId, userData) => {
  try {
    const response = await axiosInstance.put(`/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error updating user' };
  }
};

export const deleteUser = async (userId) => {
  try {
    const response = await axiosInstance.delete(`/users/${userId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error deleting user' };
  }
};

// Dashboard Services
export const getDashboardStats = async () => {
  try {
    const response = await axiosInstance.get('/dashboard/stats');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error fetching dashboard stats' };
  }
};

export const getAccessLogs = async (filters = {}) => {
  try {
    const params = new URLSearchParams(filters);
    const response = await axiosInstance.get(`/access-logs?${params.toString()}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error fetching access logs' };
  }
};

export const getViolations = async (filters = {}) => {
  try {
    const params = new URLSearchParams(filters);
    const response = await axiosInstance.get(`/violations?${params.toString()}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error fetching violations' };
  }
};

// Schedule Services
export const getSchedules = async (filters = {}) => {
  try {
    const params = new URLSearchParams(filters);
    const response = await axiosInstance.get(`/schedules?${params.toString()}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error fetching schedules' };
  }
};

export const createSchedule = async (scheduleData) => {
  try {
    const response = await axiosInstance.post('/schedules', scheduleData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error creating schedule' };
  }
};

export const updateSchedule = async (scheduleId, scheduleData) => {
  try {
    const response = await axiosInstance.put(`/schedules/${scheduleId}`, scheduleData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error updating schedule' };
  }
};

export const deleteSchedule = async (scheduleId) => {
  try {
    const response = await axiosInstance.delete(`/schedules/${scheduleId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error deleting schedule' };
  }
};

// Report Services
export const generateReport = async (type, startDate = null, endDate = null) => {
  try {
    let url = `/reports/${type}`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;
    
    const response = await axiosInstance.get(url);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Error generating report' };
  }
};