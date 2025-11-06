// frontend/src/services/authService.js
import axios from 'axios';

const API_URL = 'http://localhost:5000/api/auth';

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