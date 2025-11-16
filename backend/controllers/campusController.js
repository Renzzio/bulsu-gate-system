// backend/controllers/campusController.js
const { db } = require('../config/firebase');

/**
 * Get campus information by ID
 */
const getCampusById = async (req, res) => {
  try {
    const { campusId } = req.params;

    if (!campusId) {
      return res.status(400).json({
        success: false,
        message: 'Campus ID is required'
      });
    }

    const campusSnapshot = await db.ref(`campuses/${campusId}`).once('value');
    if (!campusSnapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Campus not found'
      });
    }

    const campus = campusSnapshot.val();
    res.json({
      success: true,
      campus: campus
    });
  } catch (error) {
    console.error('getCampusById error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching campus information'
    });
  }
};

/**
 * Get all campuses
 */
const getAllCampuses = async (req, res) => {
  try {
    const campusesSnapshot = await db.ref('campuses').once('value');
    if (!campusesSnapshot.exists()) {
      return res.json({
        success: true,
        campuses: []
      });
    }

    const campuses = [];
    campusesSnapshot.forEach(childSnapshot => {
      campuses.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });

    res.json({
      success: true,
      campuses: campuses
    });
  } catch (error) {
    console.error('getAllCampuses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching campuses'
    });
  }
};

module.exports = {
  getCampusById,
  getAllCampuses
};
