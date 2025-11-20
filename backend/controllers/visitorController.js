// backend/controllers/visitorController.js
const { db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

// Generate unique visitor ID
const generateVisitorId = () => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substr(2, 9);
  return `VIS-${timestamp}-${randomString}`;
};

// Get all visitors (today - filtered by user's campus)
const getTodaysVisitors = async (req, res) => {
  try {
    const visitorsRef = db.ref('visitors');
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Get user's campus ID
    const userCampusId = req.user?.campusId;
    if (!userCampusId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot fetch visitors - user campus not found'
      });
    }

    // Get visitors created today
    const snapshot = await visitorsRef
      .orderByChild('createdDate')
      .equalTo(today)
      .once('value');

    const visitors = [];
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const visitor = childSnapshot.val();

        // Filter by campus: only show visitors from the same campus
        if (visitor.campusId === userCampusId) {
          visitors.push({
            id: childSnapshot.key,
            ...visitor
          });
        }
      });
    }

    res.json({
      success: true,
      visitors: visitors
    });
  } catch (error) {
    console.error('Get today\'s visitors error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching visitors'
    });
  }
};

// Create new visitor
const createVisitor = async (req, res) => {
  try {
    const {
      name,
      contact,
      email,
      address,
      purpose,
      visitTo,
      additionalNotes,
      campusId
    } = req.body;

    // Validation
    if (!name || !contact || !address || !purpose) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, contact, address, and purpose'
      });
    }

    // Get campus ID - for admin users, allow specifying campus, for guards use their assigned campus
    let finalCampusId = campusId;
    if (!finalCampusId) {
      finalCampusId = req.user?.campusId;
    }

    if (!finalCampusId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create visitor - campus not specified and user campus not found'
      });
    }

    // Generate visitor ID and QR data
    const visitorId = generateVisitorId();
    const todaysDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Create visitor object
    const newVisitor = {
      visitorId,
      name,
      contact,
      email: email || null,
      address,
      purpose,
      visitTo: visitTo || null,
      additionalNotes: additionalNotes || null,
      campusId: finalCampusId, // Include campus information
      createdDate: todaysDate,
      createdAt: new Date().toISOString(),
      status: 'active',
      usageCount: 0,
      maxUses: 2,
      usageHistory: []
    };

    // Add visitor to database
    const visitorsRef = db.ref('visitors');
    const newVisitorRef = visitorsRef.push();
    await newVisitorRef.set(newVisitor);

    res.status(201).json({
      success: true,
      message: 'Visitor created successfully',
      visitor: {
        id: newVisitorRef.key,
        ...newVisitor
      }
    });
  } catch (error) {
    console.error('Create visitor error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating visitor'
    });
  }
};

// Update visitor usage count
const updateVisitorUsage = async (req, res) => {
  try {
    const { visitorId } = req.params;
    const { actionType, gateId } = req.body; // actionType: 'entry' or 'exit'

    // Find visitor by visitorId
    const visitorsRef = db.ref('visitors');
    const snapshot = await visitorsRef
      .orderByChild('visitorId')
      .equalTo(visitorId)
      .once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }

    // Get the visitor data
    let visitorKey, visitorData;
    snapshot.forEach((childSnapshot) => {
      visitorKey = childSnapshot.key;
      visitorData = childSnapshot.val();
    });

    // Check if QR is already expired or overused
    if (visitorData.usageCount >= visitorData.maxUses) {
      await recordVisitorViolation({
        visitorId: visitorData.visitorId,
        visitorName: visitorData.name,
        actionType,
        gateId,
        violationType: 'USAGE_LIMIT_EXCEEDED',
        violationNotes: 'Visitor QR code has reached maximum uses (entry and exit completed)',
        createdBy: req.user?.userId || req.user?.userID || 'system'
      });

      return res.status(400).json({
        success: false,
        message: 'QR code has reached maximum uses (entry and exit completed)',
        code: 'MAX_USES_EXCEEDED'
      });
    }

    // For visitors, allow one entry and one exit
    // Check if the specific action has already been used today
    const hasEntryAlready = (visitorData.usageHistory || []).some(use => use.actionType === 'entry');
    const hasExitAlready = (visitorData.usageHistory || []).some(use => use.actionType === 'exit');

    // Validate scan logic for visitors
    if (actionType === 'entry' && hasEntryAlready) {
      await recordVisitorViolation({
        visitorId: visitorData.visitorId,
        visitorName: visitorData.name,
        actionType,
        gateId,
        violationType: 'DUPLICATE_ENTRY',
        violationNotes: 'Entry already recorded for this visitor today',
        createdBy: req.user?.userId || req.user?.userID || 'system'
      });

      return res.status(400).json({
        success: false,
        message: 'Entry already recorded for this visitor today',
        code: 'ENTRY_ALREADY_USED'
      });
    }

    if (actionType === 'exit' && hasExitAlready) {
      await recordVisitorViolation({
        visitorId: visitorData.visitorId,
        visitorName: visitorData.name,
        actionType,
        gateId,
        violationType: 'DUPLICATE_EXIT',
        violationNotes: 'Exit already recorded for this visitor today',
        createdBy: req.user?.userId || req.user?.userID || 'system'
      });

      return res.status(400).json({
        success: false,
        message: 'Exit already recorded for this visitor today',
        code: 'EXIT_ALREADY_USED'
      });
    }

    if (actionType === 'exit' && !hasEntryAlready) {
      await recordVisitorViolation({
        visitorId: visitorData.visitorId,
        visitorName: visitorData.name,
        actionType,
        gateId,
        violationType: 'EXIT_WITHOUT_ENTRY',
        violationNotes: 'Cannot record exit without prior entry for this visitor',
        createdBy: req.user?.userId || req.user?.userID || 'system'
      });

      return res.status(400).json({
        success: false,
        message: 'Cannot record exit without prior entry for this visitor',
        code: 'EXIT_WITHOUT_ENTRY'
      });
    }

    // Update usage count and history
    const newUsageCount = visitorData.usageCount + 1;
    const usageRecord = {
      actionType,
      timestamp: new Date().toISOString(),
      gateId: gateId || null
    };

    const updatedUsageHistory = [...(visitorData.usageHistory || []), usageRecord];

    // Update visitor
    const visitorRef = db.ref(`visitors/${visitorKey}`);
    await visitorRef.update({
      usageCount: newUsageCount,
      usageHistory: updatedUsageHistory,
      lastUsed: new Date().toISOString()
    });

    // Log the access attempt
    const logId = uuidv4();
    const now = new Date();
    const timestamp = now.toISOString();
    const dateKey = formatDateKey(now);

    const logData = {
      logId,
      userType: 'visitor',
      userId: visitorData.visitorId,
      userName: visitorData.name,
      scanType: actionType,
      gateId: gateId || 'Main Gate',
      timestamp,
      allowed: true,
      reasons: [],
      campusId: visitorData.campusId,
      campusName: req.user?.campusName || 'Unknown Campus', // Assuming user object has campusName
      visitorInfo: {
        purpose: visitorData.purpose,
        visitTo: visitorData.visitTo
      },
      createdBy: req.user?.userId || req.user?.userID || 'system'
    };

    await db.ref(`accessLogs/${dateKey}/${logId}`).set(logData);

    res.json({
      success: true,
      message: `${actionType === 'entry' ? 'Entry' : 'Exit'} recorded successfully for visitor ${visitorData.name}`,
      visitor: {
        ...visitorData,
        usageCount: newUsageCount,
        usageHistory: updatedUsageHistory
      }
    });
  } catch (error) {
    console.error('Update visitor usage error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating visitor usage'
    });
  }
};

// Get visitor by QR code
const getVisitorByQrcode = async (req, res) => {
  try {
    const { qrCode } = req.params;

    // The qrCode should be the visitorId (USR-{timestamp}-{random})
    const visitorsRef = db.ref('visitors');
    const snapshot = await visitorsRef
      .orderByChild('visitorId')
      .equalTo(qrCode)
      .once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }

    let visitorData;
    snapshot.forEach((childSnapshot) => {
      visitorData = {
        id: childSnapshot.key,
        ...childSnapshot.val()
      };
    });

    res.json({
      success: true,
      visitor: visitorData
    });
  } catch (error) {
    console.error('Get visitor by QR error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching visitor'
    });
  }
};

// Delete visitor (admin only)
const deleteVisitor = async (req, res) => {
  try {
    const { visitorId } = req.params;

    const visitorRef = db.ref(`visitors/${visitorId}`);
    const snapshot = await visitorRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }

    await visitorRef.remove();

    res.json({
      success: true,
      message: 'Visitor deleted successfully'
    });
  } catch (error) {
    console.error('Delete visitor error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting visitor'
    });
  }
};

// Record visitor violation to violations collection and access logs
const recordVisitorViolation = async (violationData) => {
  try {
    const { visitorId, visitorName, actionType, gateId, violationType, violationNotes, createdBy } = violationData;
    const logId = uuidv4();
    const now = new Date();
    const timestamp = now.toISOString();
    const dateKey = formatDateKey(now);

    // Record access log with allowed: false
    const logData = {
      logId,
      userType: 'visitor',
      userId: visitorId,
      userName: visitorName,
      scanType: actionType,
      gateId: gateId || 'Main Gate',
      timestamp,
      allowed: false,
      reasons: [violationNotes],
      visitorInfo: {},
      createdBy: createdBy || 'system'
    };

    await db.ref(`accessLogs/${dateKey}/${logId}`).set(logData);

    // Record violation
    const violationRecord = {
      violationId: logId,
      visitorId,
      visitorName,
      scanType: actionType,
      gateId: gateId || 'Main Gate',
      timestamp,
      violationType,
      violationNotes,
      userType: 'visitor',
      createdBy: createdBy || 'system'
    };

    await db.ref(`violations/${dateKey}/${logId}`).set(violationRecord);

    // Create alert
    const alertId = uuidv4();
    await db.ref(`alerts/${alertId}`).set({
      alertId,
      userType: 'visitor',
      visitorId,
      visitorName,
      gateId: gateId || 'Main Gate',
      timestamp,
      severity: 'warning',
      message: `Visitor violation: ${violationNotes}`,
      createdBy: createdBy || 'system'
    });

  } catch (error) {
    console.error('Error recording visitor violation:', error);
    throw error;
  }
};

// Helper function to format date for access logs
const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get all visitors (for admin/guards - with campus filtering)
const getAllVisitors = async (req, res) => {
  try {
    const visitorsRef = db.ref('visitors');
    const { campusId } = req.query; // Optional filter
    const userRole = req.user?.role;
    const userCampusId = req.user?.campusId;

    const snapshot = await visitorsRef.once('value');

    const visitors = [];
    if (snapshot.exists()) {
      snapshot.forEach((childSnapshot) => {
        const visitor = childSnapshot.val();

        // For guards/security personnel, only show visitors from their own campus
        if (!req.user ||
            ['admin'].includes(userRole) ||
            (['guard', 'security', 'security_guard', 'security_officer'].includes(userRole) && visitor.campusId === userCampusId)) {

          // Additional filtering if campusId is specified (for admin use)
          if (!campusId || visitor.campusId === campusId) {
            visitors.push({
              id: childSnapshot.key,
              ...visitor
            });
          }
        }
      });
    }

    // Sort by creation date (newest first)
    visitors.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      visitors: visitors
    });
  } catch (error) {
    console.error('Get all visitors error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching visitors'
    });
  }
};

// Get visitor by ID (for admin)
const getVisitorById = async (req, res) => {
  try {
    const { visitorId } = req.params;

    const visitorRef = db.ref(`visitors/${visitorId}`);
    const snapshot = await visitorRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }

    res.json({
      success: true,
      visitor: {
        id: visitorId,
        ...snapshot.val()
      }
    });
  } catch (error) {
    console.error('Get visitor by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching visitor'
    });
  }
};

// Update visitor (admin only)
const updateVisitor = async (req, res) => {
  try {
    const { visitorId } = req.params;
    const updateData = req.body;

    // Get existing visitor data first for validation
    const visitorRef = db.ref(`visitors/${visitorId}`);
    const snapshot = await visitorRef.once('value');

    if (!snapshot.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Visitor not found'
      });
    }

    // Validate update data
    const allowedFields = ['name', 'contact', 'email', 'address', 'purpose', 'visitTo', 'additionalNotes', 'campusId'];
    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    if (Object.keys(filteredData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    // Add update timestamp
    filteredData.updatedAt = new Date().toISOString();

    // Update visitor
    await visitorRef.update(filteredData);

    // Return updated visitor
    const updatedSnapshot = await visitorRef.once('value');
    const updatedVisitor = {
      id: visitorId,
      ...updatedSnapshot.val()
    };

    res.json({
      success: true,
      message: 'Visitor updated successfully',
      visitor: updatedVisitor
    });
  } catch (error) {
    console.error('Update visitor error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating visitor'
    });
  }
};

module.exports = {
  getTodaysVisitors,
  getAllVisitors,
  getVisitorById,
  createVisitor,
  updateVisitor,
  updateVisitorUsage,
  getVisitorByQrcode,
  deleteVisitor
};
