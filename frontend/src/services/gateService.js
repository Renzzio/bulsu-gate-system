import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/gate';

const gateAPI = axios.create({
  baseURL: API_BASE_URL
});

gateAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const scanStudent = async (payload) => {
  try {
    const response = await gateAPI.post('/scan', payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

const getAccessLogs = async (range = 'day') => {
  try {
    const response = await gateAPI.get('/logs', { params: { range } });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

const getViolations = async (range = 'day') => {
  try {
    const response = await gateAPI.get('/violations', { params: { range } });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

const getCampusScopedLogs = async (campusId = null, dateRange = 'today') => {
  try {
    const response = await gateAPI.post('/logs/campus', { campusId, dateRange });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

const getCampusScopedViolations = async (campusId = null, dateRange = 'today') => {
  try {
    const response = await gateAPI.post('/violations/campus', { campusId, dateRange });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

const getReports = async (range = 'day') => {
  try {
    const response = await gateAPI.get('/reports', { params: { range } });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

// Campus Management
const createCampus = async (campusData) => {
  try {
    const response = await gateAPI.post('/campuses', campusData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

const getCampuses = async () => {
  try {
    const response = await gateAPI.get('/campuses');
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

const updateCampus = async (campusId, updateData) => {
  try {
    const response = await gateAPI.put(`/campuses/${campusId}`, updateData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

const deleteCampus = async (campusId) => {
  try {
    const response = await gateAPI.delete(`/campuses/${campusId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

// Gate Management
const createGate = async (gateData) => {
  try {
    const response = await gateAPI.post('/gates', gateData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

const getGates = async (campusId = null) => {
  try {
    const params = campusId ? { campusId } : {};
    const response = await gateAPI.get('/gates', { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

const updateGate = async (gateId, updateData) => {
  try {
    const response = await gateAPI.put(`/gates/${gateId}`, updateData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

const deleteGate = async (gateId) => {
  try {
    const response = await gateAPI.delete(`/gates/${gateId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

const getGatesByCampus = async (campusId) => {
  try {
    const response = await gateAPI.get(`/gates/campus/${campusId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: error.message };
  }
};

export default {
  scanStudent,
  getAccessLogs,
  getViolations,
  getCampusScopedLogs,
  getCampusScopedViolations,
  getReports,
  createCampus,
  getCampuses,
  updateCampus,
  deleteCampus,
  createGate,
  getGates,
  updateGate,
  deleteGate,
  getGatesByCampus
};
