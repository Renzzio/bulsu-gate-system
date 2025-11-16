// backend/controllers/dashboardController.js
const { db } = require('../config/firebase');

// Get campus-scoped access logs
const getCampusScopedLogs = async (req, res) => {
  try {
    const { campusId } = req.body || {};

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    let logs = [];

    // Get logs for today
    const logsSnapshot = await db.ref(`accessLogs/${todayKey}`).once('value');

    if (logsSnapshot.exists()) {
      const logsData = logsSnapshot.val();
      logs = Object.keys(logsData).map(key => ({ id: key, ...logsData[key] }));

      // Filter by campus if specified
      if (campusId) {
        // Get gates for this campus to filter logs
        const gatesSnapshot = await db.ref('gates').orderByChild('campusId').equalTo(campusId).once('value');
        if (gatesSnapshot.exists()) {
          const campusGates = Object.keys(gatesSnapshot.val());
          logs = logs.filter(log => campusGates.includes(log.gateId));
        } else {
          logs = []; // No gates means no logs for this campus
        }
      }
    }

    // Sort by timestamp (most recent first)
    logs.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

    res.json({
      success: true,
      campusId: campusId || null,
      logs
    });
  } catch (error) {
    console.error('Get campus scoped logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching campus logs'
    });
  }
};

// Get campus-scoped violations
const getCampusScopedViolations = async (req, res) => {
  try {
    const { campusId } = req.body || {};

    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    let violations = [];

    // Get violations for today
    const violationsSnapshot = await db.ref(`violations/${todayKey}`).once('value');

    if (violationsSnapshot.exists()) {
      const violationsData = violationsSnapshot.val();
      violations = Object.keys(violationsData).map(key => ({ id: key, ...violationsData[key] }));

      // Filter violations by campus if specified
      if (campusId) {
        violations = violations.filter(v => v.campusId === campusId);
      }
    }

    // Sort by timestamp (most recent first)
    violations.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

    res.json({
      success: true,
      campusId: campusId || null,
      violations
    });
  } catch (error) {
    console.error('Get campus scoped violations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching campus violations'
    });
  }
};

const getAdminOverview = async (req, res) => {
  try {
    const usersSnapshot = await db.ref('users').once('value');
    let totalStudents = 0;
    let totalStaff = 0;
    let totalGuards = 0;
    const activeGates = new Set();

    if (usersSnapshot.exists()) {
      const users = usersSnapshot.val();
      Object.values(users).forEach((user) => {
        switch (user.role) {
          case 'student':
            totalStudents += 1;
            break;
          case 'guard':
          case 'security_guard':
          case 'security_officer':
            totalGuards += 1;
            if (user.assignedGate) {
              activeGates.add(user.assignedGate);
            }
            break;
          default:
            totalStaff += 1;
            break;
        }
      });
    }

    const todayKey = formatDateKey(new Date());
    const logsSnapshot = await db.ref(`accessLogs/${todayKey}`).once('value');
    let entriesToday = 0;
    let exitsToday = 0;
    let deniedToday = 0;
    let accessLogs = [];

    if (logsSnapshot.exists()) {
      const logs = logsSnapshot.val();
      const logsArray = Object.keys(logs).map((key) => ({ id: key, ...logs[key] }));

      // Calculate counts and prepare access logs
      logsArray.forEach((log) => {
        if (log.scanType === 'entry') entriesToday += 1;
        if (log.scanType === 'exit') exitsToday += 1;
        if (!log.allowed) deniedToday += 1;
      });

      // Get last 10 logs sorted by timestamp
      accessLogs = logsArray
        .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
        .slice(0, 10);
    }

    const violationsSnapshot = await db.ref(`violations/${todayKey}`).once('value');
    const violationsToday = violationsSnapshot.exists() ? Object.keys(violationsSnapshot.val()).length : 0;

    const alertsSnapshot = await db.ref('alerts').orderByKey().limitToLast(5).once('value');
    let alerts = [];
    if (alertsSnapshot.exists()) {
      const alertsData = alertsSnapshot.val();
      alerts = Object.keys(alertsData)
        .map((key) => ({ alertId: key, ...alertsData[key] }))
        .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    }

    res.json({
      success: true,
      data: {
        counts: {
          students: totalStudents,
          staff: totalStaff,
          guards: totalGuards,
          activeGates: activeGates.size || totalGuards,
          entriesToday,
          exitsToday,
          deniedToday,
          violationsToday
        },
        alerts,
        accessLogs
      }
    });
  } catch (error) {
    console.error('getAdminOverview error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while loading dashboard overview'
    });
  }
};

// Campus and Gate Management Functions
const createCampus = async (req, res) => {
  try {
    const { name, location, address, contactPerson, contactNumber } = req.body;

    if (!name || !location) {
      return res.status(400).json({
        success: false,
        message: 'Campus name and location are required'
      });
    }

    const campusId = `CAMP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const campusData = {
      campusId,
      name,
      location,
      address: address || '',
      contactPerson: contactPerson || '',
      contactNumber: contactNumber || '',
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: req.user?.userId || 'system'
    };

    await db.ref(`campuses/${campusId}`).set(campusData);

    res.status(201).json({
      success: true,
      message: 'Campus created successfully',
      campus: campusData
    });
  } catch (error) {
    console.error('Create campus error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating campus'
    });
  }
};

const getCampuses = async (req, res) => {
  try {
    const snapshot = await db.ref('campuses').once('value');
    const campuses = [];

    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.keys(data).forEach(key => {
        campuses.push({ id: key, ...data[key] });
      });
    }

    res.json({
      success: true,
      campuses
    });
  } catch (error) {
    console.error('Get campuses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching campuses'
    });
  }
};

const updateCampus = async (req, res) => {
  try {
    const { campusId } = req.params;
    const updateData = req.body;

    delete updateData.campusId; // Prevent ID changes
    updateData.updatedAt = new Date().toISOString();
    updateData.updatedBy = req.user?.userId || 'system';

    const campusRef = db.ref(`campuses/${campusId}`);
    await campusRef.update(updateData);

    const updatedSnapshot = await campusRef.once('value');
    const updatedCampus = { id: campusId, ...updatedSnapshot.val() };

    res.json({
      success: true,
      message: 'Campus updated successfully',
      campus: updatedCampus
    });
  } catch (error) {
    console.error('Update campus error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating campus'
    });
  }
};

const deleteCampus = async (req, res) => {
  try {
    const { campusId } = req.params;

    // Check if campus has gates
    const gatesSnapshot = await db.ref('gates').orderByChild('campusId').equalTo(campusId).once('value');
    if (gatesSnapshot.exists()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete campus that has active gates. Please delete all gates first.'
      });
    }

    await db.ref(`campuses/${campusId}`).remove();

    res.json({
      success: true,
      message: 'Campus deleted successfully'
    });
  } catch (error) {
    console.error('Delete campus error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting campus'
    });
  }
};

const createGate = async (req, res) => {
  try {
    const { name, description, campusId, type = 'normal', ipAddress = '', location = '' } = req.body;

    if (!name || !campusId) {
      return res.status(400).json({
        success: false,
        message: 'Gate name and campus are required'
      });
    }

    // Verify campus exists
    const campusSnapshot = await db.ref(`campuses/${campusId}`).once('value');
    if (!campusSnapshot.exists()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid campus selected'
      });
    }

    const gateId = `GATE-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const gateData = {
      gateId,
      name,
      description: description || '',
      campusId,
      type, // 'normal', 'main', 'entrance', 'exit', 'service'
      ipAddress,
      location,
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: req.user?.userId || 'system'
    };

    await db.ref(`gates/${gateId}`).set(gateData);

    res.status(201).json({
      success: true,
      message: 'Gate created successfully',
      gate: gateData
    });
  } catch (error) {
    console.error('Create gate error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating gate'
    });
  }
};

const getGates = async (req, res) => {
  try {
    const { campusId } = req.query;
    let snapshot;

    if (campusId) {
      snapshot = await db.ref('gates').orderByChild('campusId').equalTo(campusId).once('value');
    } else {
      snapshot = await db.ref('gates').once('value');
    }

    const gates = [];
    const campusesSnapshot = await db.ref('campuses').once('value');
    const campuses = campusesSnapshot.exists() ? campusesSnapshot.val() : {};

    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.keys(data).forEach(key => {
        const gate = { id: key, ...data[key] };
        const campus = campuses[gate.campusId];
        gate.campusName = campus ? campus.name : 'Unknown';
        gates.push(gate);
      });
    }

    res.json({
      success: true,
      gates
    });
  } catch (error) {
    console.error('Get gates error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching gates'
    });
  }
};

const updateGate = async (req, res) => {
  try {
    const { gateId } = req.params;
    const updateData = req.body;

    // If changing campus, verify new campus exists
    if (updateData.campusId) {
      const campusSnapshot = await db.ref(`campuses/${updateData.campusId}`).once('value');
      if (!campusSnapshot.exists()) {
        return res.status(400).json({
          success: false,
          message: 'Invalid campus selected'
        });
      }
    }

    delete updateData.gateId; // Prevent ID changes
    updateData.updatedAt = new Date().toISOString();
    updateData.updatedBy = req.user?.userId || 'system';

    const gateRef = db.ref(`gates/${gateId}`);
    await gateRef.update(updateData);

    const updatedSnapshot = await gateRef.once('value');
    const updatedGate = { id: gateId, ...updatedSnapshot.val() };

    res.json({
      success: true,
      message: 'Gate updated successfully',
      gate: updatedGate
    });
  } catch (error) {
    console.error('Update gate error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating gate'
    });
  }
};

const deleteGate = async (req, res) => {
  try {
    const { gateId } = req.params;

    // Check if gate is assigned to users
    const usersSnapshot = await db.ref('users').orderByChild('assignedGate').equalTo(gateId).once('value');
    if (usersSnapshot.exists()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete gate that is assigned to users. Please reassign users first.'
      });
    }

    await db.ref(`gates/${gateId}`).remove();

    res.json({
      success: true,
      message: 'Gate deleted successfully'
    });
  } catch (error) {
    console.error('Delete gate error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting gate'
    });
  }
};

const getGatesByCampus = async (req, res) => {
  try {
    const { campusId } = req.params;

    const snapshot = await db.ref('gates').orderByChild('campusId').equalTo(campusId).once('value');
    const gates = [];

    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.keys(data).forEach(key => {
        gates.push({ id: key, ...data[key] });
      });
    }

    res.json({
      success: true,
      campusId,
      gates
    });
  } catch (error) {
    console.error('Get gates by campus error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching gates by campus'
    });
  }
};

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

module.exports = {
  getAdminOverview,
  createCampus,
  getCampuses,
  updateCampus,
  deleteCampus,
  createGate,
  getGates,
  updateGate,
  deleteGate,
  getGatesByCampus,
  getCampusScopedLogs,
  getCampusScopedViolations
};
