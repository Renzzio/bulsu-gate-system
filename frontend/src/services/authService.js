// frontend/src/services/authService.js
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/auth';
const USERS_API_URL = 'http://localhost:5000/api/users';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Create users axios instance
const usersAxiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests automatically
const setupInterceptors = (instance) => {
  instance.interceptors.request.use(
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
};

setupInterceptors(axiosInstance);
setupInterceptors(usersAxiosInstance);

// ============ AUTH SERVICES ============

// Login service
export const login = async (username, password) => {
  try {
    const response = await axiosInstance.post('/login', {
      username,
      password
    });

    if (response.data.success && response.data.token) {
      localStorage.setItem('token', response.data.token);
    }

    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw new Error(error.response.data.message);
    }
    throw new Error('Network error. Please try again.');
  }
};

// Verify token service
export const verifyToken = async () => {
  try {
    const response = await axiosInstance.get('/verify');
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw new Error(error.response.data.message);
    }
    throw new Error('Session expired. Please login again.');
  }
};

// Logout service
export const logout = async () => {
  try {
    await axiosInstance.post('/logout');
    localStorage.removeItem('token');
  } catch (error) {
    console.error('Logout error:', error);
    localStorage.removeItem('token');
  }
};

// ============ USER MANAGEMENT SERVICES ============

// Get all users
export const getAllUsers = async () => {
  try {
    const response = await usersAxiosInstance.get('/');
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw new Error(error.response.data.message);
    }
    throw new Error('Network error. Please try again.');
  }
};

// Get users by role
export const getUsersByRole = async (role) => {
  try {
    const response = await usersAxiosInstance.get(`/role/${role}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw new Error(error.response.data.message);
    }
    throw new Error('Network error. Please try again.');
  }
};

// Create new user with auto-generated credentials
export const createUser = async (userData) => {
  try {
    const response = await usersAxiosInstance.post('/', userData);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw new Error(error.response.data.message);
    }
    throw new Error('Network error. Please try again.');
  }
};

// Update user
export const updateUser = async (userId, userData) => {
  try {
    const response = await usersAxiosInstance.put(`/${userId}`, userData);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw new Error(error.response.data.message);
    }
    throw new Error('Network error. Please try again.');
  }
};

// Update own profile
export const updateOwnProfile = async (userId, userData) => {
  try {
    const response = await usersAxiosInstance.put(`/${userId}/profile`, userData);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw new Error(error.response.data.message);
    }
    throw new Error('Network error. Please try again.');
  }
};

// Deactivate user
export const deactivateUser = async (userId) => {
  try {
    const response = await usersAxiosInstance.patch(`/${userId}/deactivate`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw new Error(error.response.data.message);
    }
    throw new Error('Network error. Please try again.');
  }
};

// Activate user
export const activateUser = async (userId) => {
  try {
    const response = await usersAxiosInstance.patch(`/${userId}/activate`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw new Error(error.response.data.message);
    }
    throw new Error('Network error. Please try again.');
  }
};

// Reset user password
export const resetUserPassword = async (userId) => {
  try {
    const response = await usersAxiosInstance.patch(`/${userId}/reset-password`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw new Error(error.response.data.message);
    }
    throw new Error('Network error. Please try again.');
  }
};

// Delete user
export const deleteUser = async (userId) => {
  try {
    const response = await usersAxiosInstance.delete(`/${userId}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw new Error(error.response.data.message);
    }
    throw new Error('Network error. Please try again.');
  }
};

// Change user password
export const changePassword = async (userId, passwordData) => {
  try {
    const response = await usersAxiosInstance.patch(`/${userId}/change-password`, passwordData);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw new Error(error.response.data.message);
    }
    throw new Error('Network error. Please try again.');
  }
};

// Get students in faculty's department (for faculty users only)
export const getStudentsInFacultyDepartment = async () => {
  try {
    const response = await usersAxiosInstance.get('/faculty/students-department');
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw new Error(error.response.data.message);
    }
    throw new Error('Network error. Please try again.');
  }
};
