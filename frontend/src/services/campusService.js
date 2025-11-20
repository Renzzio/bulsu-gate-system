// frontend/src/services/campusService.js
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL ? `${process.env.REACT_APP_API_BASE_URL}/api` : 'http://localhost:5000/api';

/**
 * Get campus information by ID
 */
export const getCampusById = async (campusId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const url = new URL(`${API_BASE_URL}/campuses/${campusId}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch campus information');
    }

    return data;
  } catch (error) {
    console.error('getCampusById error:', error);
    throw error;
  }
};

/**
 * Get all campuses
 */
export const getAllCampuses = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const url = new URL(`${API_BASE_URL}/campuses`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch campuses');
    }

    return data;
  } catch (error) {
    console.error('getAllCampuses error:', error);
    throw error;
  }
};
