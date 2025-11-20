// frontend/src/services/visitorService.js
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class VisitorService {
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle response errors for better error messages
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Visitor API Error:', error);

        if (error.response?.status === 401) {
          const token = localStorage.getItem('token');
          if (!token) {
            alert('You must login first to access visitor management! Please visit the login page.');
          } else {
            alert('Your login session has expired. Please login again.');
          }
          localStorage.removeItem('token');
          window.location.href = '/login';
        }

        if (error.response?.status === 403) {
          const errorData = error.response.data;
          if (errorData.message && errorData.message.includes('role')) {
            const yourRole = errorData.message.match(/Your role: ([a-zA-Z_]+)/)?.[1] || 'unknown';
            const requiredRoles = errorData.message.match(/Required roles: (.+)/)?.[1] || '';

            alert(`Access Denied!\n\nYour role: ${yourRole}\n\nRequired roles: ${requiredRoles}\n\nPlease contact an administrator to give you access.`);
          } else {
            alert('You don\'t have permission to manage visitors. This feature requires security clearance.');
          }
          console.error('Access forbidden - role check failed:', errorData);
        }

        return Promise.reject(error.response?.data || error.message);
      }
    );
  }

  // Get today's visitors
  async getTodaysVisitors() {
    try {
      const response = await this.api.get('/api/visitors');
      return response.data;
    } catch (error) {
      console.error('Error fetching today\'s visitors:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get all visitors for guards (with optional campus filtering)
  async getAllVisitorsForGuards(campusId = null) {
    try {
      const params = campusId ? { campusId } : {};
      const response = await this.api.get('/api/visitors/all', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching all visitors for guards:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get all visitors (admin only - with optional campus filtering)
  async getAllVisitors(campusId = null) {
    try {
      const params = campusId ? { campusId } : {};
      const response = await this.api.get('/api/visitors/admin/all', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching all visitors:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get visitor by ID (admin only)
  async getVisitorById(visitorId) {
    try {
      const response = await this.api.get(`/api/visitors/${visitorId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching visitor by ID:', error);
      throw error.response?.data || error.message;
    }
  }

  // Update visitor (admin only)
  async updateVisitor(visitorId, updateData) {
    try {
      const response = await this.api.put(`/api/visitors/${visitorId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating visitor:', error);
      throw error.response?.data || error.message;
    }
  }

  // Delete visitor (admin only)
  async deleteVisitor(visitorId) {
    try {
      const response = await this.api.delete(`/api/visitors/${visitorId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting visitor:', error);
      throw error.response?.data || error.message;
    }
  }

  // Create new visitor
  async createVisitor(visitorData) {
    try {
      const response = await this.api.post('/api/visitors', visitorData);
      return response.data;
    } catch (error) {
      console.error('Error creating visitor:', error);
      throw error.response?.data || error.message;
    }
  }

  // Get visitor by QR code
  async getVisitorByQrcode(qrCode) {
    try {
      const response = await this.api.get(`/api/visitors/qr/${qrCode}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching visitor by QR:', error);
      throw error.response?.data || error.message;
    }
  }

  // Update visitor usage (entry/exit)
  async updateVisitorUsage(visitorId, actionType, gateId = null) {
    try {
      const response = await this.api.patch(`/api/visitors/${visitorId}/usage`, {
        actionType,
        gateId
      });
      return response.data;
    } catch (error) {
      console.error('Error updating visitor usage:', error);
      throw error.response?.data || error.message;
    }
  }

  // Process visitor QR scan (get visitor + update usage)
  async processVisitorScan(qrCode, scanType, gateId = null) {
    try {
      // Check if QR code looks valid (basic validation)
      if (!qrCode || qrCode.length < 10) {
        return {
          success: false,
          message: 'Invalid QR code format',
          code: 'INVALID_QR_FORMAT',
          allowed: false,
          visitor: null
        };
      }

      // Get visitor data first to show basic info even on errors
      const visitorResponse = await this.getVisitorByQrcode(qrCode);
      const visitor = visitorResponse.success ? visitorResponse.visitor : null;

      // Update usage (backend will validate and record violations if any)
      try {
        const updateResponse = await this.updateVisitorUsage(qrCode, scanType, gateId);

        return {
          success: true,
          message: `${scanType === 'entry' ? 'Entry' : 'Exit'} granted for visitor ${updateResponse.visitor?.name || 'visitor'}`,
          visitor: updateResponse.visitor,
          actionType: scanType,
          allowed: true,
          code: null
        };
      } catch (error) {
        // Backend returned validation error - this is expected for violations
        console.log('Backend validation error:', error);

        return {
          success: false,
          message: error.message || 'Scan failed - violation recorded',
          code: error.code || 'UNKNOWN_ERROR',
          allowed: false,
          visitor: visitor,
          violationRecorded: true
        };
      }

    } catch (error) {
      console.error('Error processing visitor scan:', error);

      // Network/server errors (not validation errors)
      return {
        success: false,
        message: error.message || 'Server error while processing scan',
        code: 'NETWORK_ERROR',
        allowed: false,
        visitor: null
      };
    }
  }
}

export default new VisitorService();
