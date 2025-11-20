// frontend/src/services/dashboardService.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL ? `${process.env.REACT_APP_API_BASE_URL}/api` : 'http://localhost:5000/api';

const dashboardService = {
  getOverview: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/dashboard/overview`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Dashboard overview error:', error);
      throw error;
    }
  },

  getCampuses: async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/campuses`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Get campuses error:', error);
      throw error;
    }
  }
};

export default dashboardService;
