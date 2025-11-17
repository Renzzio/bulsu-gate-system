// frontend/src/components/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import UserManagement from './UserManagement';
import ScheduleManagement from './ScheduleManagement';
import dashboardService from '../services/dashboardService';
import gateService from '../services/gateService';
import visitorService from '../services/visitorService';
import { exportToCSV, exportToExcel, printData } from '../utils/exportUtils';
import { Download, FileSpreadsheet, Printer, Filter, Calendar, Eye, Edit, Trash2, QrCode, Users as UsersIcon, AlertTriangle } from 'lucide-react';
import bulsuLogo from '../bulsuLogo.png';
import './AdminDashboard.css';

const sidebarItems = [
  { id: 'overview', label: 'Admin Dashboard', icon: 'space_dashboard' },
  { id: 'users', label: 'User Management', icon: 'group' },
  { id: 'schedules', label: 'Schedules', icon: 'event_note' },
  { id: 'visitors', label: 'Visitors', icon: 'people' },
  { id: 'campuses', label: 'Campuses & Gates', icon: 'location_on' },
  { id: 'accessLogs', label: 'Access Logs', icon: 'assignment' },
  { id: 'violations', label: 'Violations', icon: 'warning' }
];

function AdminDashboard({ user, onLogout }) {
  const [activeSection, setActiveSection] = useState('overview');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessLogsData, setAccessLogsData] = useState([]);
  const [violationsData, setViolationsData] = useState([]);
  const [campusesData, setCampusesData] = useState([]);
  const [gatesData, setGatesData] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [violationsLoading, setViolationsLoading] = useState(false);
  const [campusesLoading, setCampusesLoading] = useState(false);
  
  // Date range and filter states for access logs
  const [logStartDate, setLogStartDate] = useState('');
  const [logEndDate, setLogEndDate] = useState('');
  const [useLogDateRange, setUseLogDateRange] = useState(false);
  const [scanTypeFilter, setScanTypeFilter] = useState('all'); // 'all', 'entry', 'exit'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'approved', 'denied'

  // Date range and filter states for violations (similar to access logs)
  const [violationStartDate, setViolationStartDate] = useState('');
  const [violationEndDate, setViolationEndDate] = useState('');
  const [useViolationDateRange, setUseViolationDateRange] = useState(false);
  const [violationScanTypeFilter, setViolationScanTypeFilter] = useState('all'); // 'all', 'entry', 'exit'

  // Campus filtering states for logs and violations
  const [selectedCampus, setSelectedCampus] = useState('');
  const [campusLogs, setCampusLogs] = useState([]);
  const [campusViolations, setCampusViolations] = useState([]);

  // Visitor management states
  const [visitorsData, setVisitorsData] = useState([]);
  const [visitorsLoading, setVisitorsLoading] = useState(false);
  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [editingVisitor, setEditingVisitor] = useState(null);
  const [selectedVisitorCampus, setSelectedVisitorCampus] = useState('');
  const [generatedQR, setGeneratedQR] = useState(null);
  const [visitorFormData, setVisitorFormData] = useState({
    name: '',
    contact: '',
    email: '',
    address: '',
    purpose: '',
    visitTo: '',
    additionalNotes: '',
    campusId: ''
  });

  // Campus CRUD modals
  const [showCampusModal, setShowCampusModal] = useState(false);
  const [editingCampus, setEditingCampus] = useState(null);
  const [campusFormData, setCampusFormData] = useState({
    name: '',
    location: '',
    address: '',
    contactPerson: '',
    contactNumber: ''
  });

  // Gate CRUD modals
  const [showGateModal, setShowGateModal] = useState(false);
  const [editingGate, setEditingGate] = useState(null);
  const [gateFormData, setGateFormData] = useState({
    name: '',
    description: '',
    campusId: '',
    type: 'normal',
    ipAddress: '',
    location: ''
  });

  // Fetch campus-scoped data when campus is selected
  useEffect(() => {
    const fetchCampusData = async () => {
      if (selectedCampus) {
        setLogsLoading(true);
        setViolationsLoading(true);

        try {
          // Fetch campus-specific logs and violations
          const [logsResponse, violationsResponse] = await Promise.all([
            gateService.getCampusScopedLogs(selectedCampus),
            gateService.getCampusScopedViolations(selectedCampus)
          ]);

          if (logsResponse.success) {
            setCampusLogs(logsResponse.logs || []);
          }
          if (violationsResponse.success) {
            setCampusViolations(violationsResponse.violations || []);
          }
        } catch (error) {
          console.error('Campus data fetch error:', error);
        } finally {
          setLogsLoading(false);
          setViolationsLoading(false);
        }
      } else {
        setCampusLogs([]);
        setCampusViolations([]);
      }
    };

    fetchCampusData();
  }, [selectedCampus]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await dashboardService.getOverview();
        if (response.success) {
          setDashboardData(response.data);
        } else {
          setError('Failed to load dashboard data');
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError('Error loading dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Real-time updates every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);



  // Fetch access logs when access logs section is active
  useEffect(() => {
    if (activeSection === 'accessLogs') {
      fetchAccessLogs();
    }
  }, [activeSection, useLogDateRange, logStartDate, logEndDate]);

  // Force refresh access logs data when switching to access logs section
  useEffect(() => {
    if (activeSection === 'accessLogs') {
      // Small delay to ensure data is fresh
      const timer = setTimeout(() => {
        if (activeSection === 'accessLogs') {
          fetchAccessLogs();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeSection]);

  // Fetch violations when violations section is active
  useEffect(() => {
    if (activeSection === 'violations') {
      fetchViolations();
    }
  }, [activeSection, useViolationDateRange, violationStartDate, violationEndDate, violationScanTypeFilter]);

  // Force refresh violations data when switching to violations section
  useEffect(() => {
    if (activeSection === 'violations') {
      // Small delay to ensure data is fresh
      const timer = setTimeout(() => {
        if (activeSection === 'violations') {
          fetchViolations();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeSection]);

  // Fetch campuses and gates when campuses section is active
  useEffect(() => {
    if (activeSection === 'campuses') {
      fetchCampuses();
      fetchAllGates();
    }
  }, [activeSection]);

  // Force refresh campuses data when switching to campuses section
  useEffect(() => {
    if (activeSection === 'campuses') {
      // Small delay to ensure data is fresh
      const timer = setTimeout(() => {
        if (activeSection === 'campuses') {
          fetchCampuses();
          fetchAllGates();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeSection]);

  // Fetch campuses when access logs or violations sections are active (needed for campus filtering)
  useEffect(() => {
    if (activeSection === 'accessLogs' || activeSection === 'violations' || activeSection === 'visitors') {
      if (campusesData.length === 0) {
        console.log('AdminDashboard: Fetching campuses for access logs/violations/visitors filtering');
        fetchCampuses();
      }
    }
  }, [activeSection]);

  // Fetch visitors when visitors section is active
  useEffect(() => {
    if (activeSection === 'visitors') {
      fetchVisitors();
    }
  }, [activeSection, selectedVisitorCampus]);

  // Force refresh visitors data when switching to visitors section
  useEffect(() => {
    if (activeSection === 'visitors') {
      const timer = setTimeout(() => {
        if (activeSection === 'visitors') {
          fetchVisitors();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeSection]);

  const fetchVisitors = async () => {
    try {
      setVisitorsLoading(true);
      const response = await visitorService.getAllVisitors(selectedVisitorCampus || undefined);
      if (response.success) {
        setVisitorsData(response.visitors || []);
      }
    } catch (err) {
      console.error('Visitors fetch error:', err);
      setVisitorsData([]);
    } finally {
      setVisitorsLoading(false);
    }
  };



  const fetchAccessLogs = async () => {
    try {
      setLogsLoading(true);
      // Always fetch month range to get enough data for filtering
      const response = await gateService.getAccessLogs('month');
      if (response.success) {
        setAccessLogsData(response.logs || []);
      }
    } catch (err) {
      console.error('Access logs fetch error:', err);
      // Fallback to dashboard data if available
      if (dashboardData?.accessLogs) {
        setAccessLogsData(dashboardData.accessLogs);
      }
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchViolations = async () => {
    try {
      setViolationsLoading(true);
      // Fetch month range to get enough data
      const response = await gateService.getViolations('month');
      if (response.success) {
        setViolationsData(response.violations || []);
      }
    } catch (err) {
      console.error('Violations fetch error:', err);
    } finally {
      setViolationsLoading(false);
    }
  };

  const fetchCampuses = async () => {
    try {
      setCampusesLoading(true);
      const response = await gateService.getCampuses();
      if (response.success) {
        setCampusesData(response.campuses || []);
      }
    } catch (err) {
      console.error('Campuses fetch error:', err);
      setCampusesData([]);
    } finally {
      setCampusesLoading(false);
    }
  };

  const fetchAllGates = async () => {
    try {
      const response = await gateService.getGates();
      if (response.success) {
        setGatesData(response.gates || []);
      }
    } catch (err) {
      console.error('Gates fetch error:', err);
      setGatesData([]);
    }
  };

  // Filter access logs based on date range, scan type, status, and campus
  const getFilteredAccessLogs = () => {
    let filtered = [...accessLogsData];

    // Filter by campus if selected
    if (selectedCampus) {
      filtered = filtered.filter(log => {
        const gateData = gatesData.find(gate => gate.gateId === log.gateId);
        return gateData?.campusId === selectedCampus;
      });
    }

    // Filter by date range
    if (useLogDateRange && logStartDate && logEndDate) {
      const start = new Date(logStartDate);
      const end = new Date(logEndDate);
      end.setHours(23, 59, 59, 999); // Include entire end date

      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= start && logDate <= end;
      });
    }

    // Filter by scan type
    if (scanTypeFilter !== 'all') {
      filtered = filtered.filter(log => log.scanType === scanTypeFilter);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      const isApproved = statusFilter === 'approved';
      filtered = filtered.filter(log => log.allowed === isApproved);
    }

    return filtered;
  };

  // Filter violations based on date range, scan type, and campus
  const getFilteredViolations = () => {
    let filtered = [...violationsData];

    // Filter by campus if selected
    if (selectedCampus) {
      filtered = filtered.filter(violation => {
        const gateData = gatesData.find(gate => gate.gateId === violation.gateId);
        return gateData?.campusId === selectedCampus;
      });
    }

    // Filter by date range
    if (useViolationDateRange && violationStartDate && violationEndDate) {
      const start = new Date(violationStartDate);
      const end = new Date(violationEndDate);
      end.setHours(23, 59, 59, 999); // Include entire end date

      filtered = filtered.filter(violation => {
        const violationDate = new Date(violation.timestamp);
        return violationDate >= start && violationDate <= end;
      });
    }

    // Filter by scan type
    if (violationScanTypeFilter !== 'all') {
      filtered = filtered.filter(violation => violation.scanType === violationScanTypeFilter);
    }

    return filtered;
  };

  const overviewStats = dashboardData ? [
    { label: 'Total Students', value: dashboardData.counts.students.toLocaleString(), trend: `${dashboardData.counts.entriesToday} entries today` },
    { label: 'Faculty & Staff', value: dashboardData.counts.staff.toLocaleString(), trend: `${dashboardData.counts.guards} guards active` },
    { label: 'Active Gates', value: dashboardData.counts.activeGates.toString(), trend: 'Operational' },
    { label: 'Violations Today', value: dashboardData.counts.violationsToday.toString(), trend: `${dashboardData.counts.deniedToday} denied` }
  ] : [];



  const handleExportLogsCSV = () => {
    const filteredLogs = getFilteredAccessLogs();
    if (filteredLogs.length === 0) {
      alert('No access logs to export');
      return;
    }
    const headers = ['Log ID', 'User ID', 'User Name', 'User Type', 'Action', 'Gate', 'Campus', 'Status', 'Timestamp'];
    const data = filteredLogs.map(log => {
      const gateData = gatesData.find(gate => gate.gateId === log.gateId);
      const campusName = gateData?.campusName || 'Unknown';
      return [
        log.logId || log.id || 'N/A',
        log.userId || log.studentId || 'N/A',
        log.userName || log.studentName || 'N/A',
        log.userType || 'student',
        log.scanType === 'entry' ? 'Entry' : 'Exit',
        log.gateId || 'N/A',
        campusName,
        log.allowed ? 'Approved' : 'Denied',
        new Date(log.timestamp).toLocaleString()
      ];
    });
    const dateRange = useLogDateRange && logStartDate && logEndDate
      ? `${logStartDate}_to_${logEndDate}`
      : new Date().toISOString().split('T')[0];
    exportToCSV(data, `access-logs-${dateRange}`, headers);
  };

  const handleExportLogsExcel = () => {
    const filteredLogs = getFilteredAccessLogs();
    if (filteredLogs.length === 0) {
      alert('No access logs to export');
      return;
    }
    const headers = ['Log ID', 'User ID', 'User Name', 'User Type', 'Action', 'Gate', 'Campus', 'Status', 'Timestamp'];
    const data = filteredLogs.map(log => {
      const gateData = gatesData.find(gate => gate.gateId === log.gateId);
      const campusName = gateData?.campusName || 'Unknown';
      return [
        log.logId || log.id || 'N/A',
        log.userId || log.studentId || 'N/A',
        log.userName || log.studentName || 'N/A',
        log.userType || 'student',
        log.scanType === 'entry' ? 'Entry' : 'Exit',
        log.gateId || 'N/A',
        campusName,
        log.allowed ? 'Approved' : 'Denied',
        new Date(log.timestamp).toLocaleString()
      ];
    });
    const dateRange = useLogDateRange && logStartDate && logEndDate
      ? `${logStartDate}_to_${logEndDate}`
      : new Date().toISOString().split('T')[0];
    exportToExcel(data, `access-logs-${dateRange}`, 'Access Logs', headers);
  };

  const handlePrintLogs = () => {
    const filteredLogs = getFilteredAccessLogs();
    if (filteredLogs.length === 0) {
      alert('No access logs to print');
      return;
    }
    const headers = ['Log ID', 'User ID', 'User Name', 'User Type', 'Action', 'Gate', 'Campus', 'Status', 'Timestamp'];
    const data = filteredLogs.map(log => {
      const gateData = gatesData.find(gate => gate.gateId === log.gateId);
      const campusName = gateData?.campusName || 'Unknown';
      return [
        log.logId || log.id || 'N/A',
        log.userId || log.studentId || 'N/A',
        log.userName || log.studentName || 'N/A',
        log.userType || 'student',
        log.scanType === 'entry' ? 'Entry' : 'Exit',
        log.gateId || 'N/A',
        campusName,
        log.allowed ? 'Approved' : 'Denied',
        new Date(log.timestamp).toLocaleString()
      ];
    });
    const title = useLogDateRange && logStartDate && logEndDate
      ? `Access Logs (${logStartDate} to ${logEndDate})`
      : 'Access Logs';
    printData(title, data, headers);
  };

  const handlePrintViolations = () => {
    const filteredViolations = getFilteredViolations();
    if (filteredViolations.length === 0) {
      alert('No violations to print');
      return;
    }
    const headers = ['Violation ID', 'User Name', 'Violation Type', 'Action', 'Gate', 'Campus', 'Description', 'Timestamp'];
    const data = filteredViolations.map(violation => {
      // Find gate name by looking up gate's details
      const gateData = gatesData.find(gate => gate.gateId === violation.gateId);
      const gateName = gateData?.name || violation.gateId || 'Unknown Gate';
      const campusName = gateData?.campusName || 'Unknown';

      return [
        violation.violationId || 'N/A',
        violation.visitorName || violation.studentName || 'N/A',
        violation.violationType || 'Unknown',
        violation.scanType === 'entry' ? 'Entry' : 'Exit',
        gateName,
        campusName,
        violation.violationNotes || 'No description',
        new Date(violation.timestamp).toLocaleString()
      ];
    });
    const title = useViolationDateRange && violationStartDate && violationEndDate
      ? `Violations Report (${violationStartDate} to ${violationEndDate})`
      : 'Violations Report';
    printData(title, data, headers);
  };

  // Campus CRUD handlers
  const handleAddCampus = () => {
    setCampusFormData({
      name: '',
      location: '',
      address: '',
      contactPerson: '',
      contactNumber: ''
    });
    setEditingCampus(null);
    setShowCampusModal(true);
  };

  const handleEditCampus = (campus) => {
    setCampusFormData({
      name: campus.name || '',
      location: campus.location || '',
      address: campus.address || '',
      contactPerson: campus.contactPerson || '',
      contactNumber: campus.contactNumber || ''
    });
    setEditingCampus(campus);
    setShowCampusModal(true);
  };

  const handleDeleteCampus = (campus) => {
    if (!window.confirm(`Are you sure you want to delete campus "${campus.name}"? This action cannot be undone.`)) {
      return;
    }

    const performDelete = async () => {
      try {
        const response = await gateService.deleteCampus(campus.campusId);
        if (response.success) {
          setError('');
          alert('Campus deleted successfully!');
          fetchCampuses();
          fetchAllGates(); // Refresh gates as well in case some were deleted
        } else {
          setError(response.message || 'Failed to delete campus');
        }
      } catch (error) {
        console.error('Delete campus error:', error);
        setError('Failed to delete campus');
      }
    };

    performDelete();
  };

  const handleCampusFormSubmit = async (e) => {
    e.preventDefault();

    if (!campusFormData.name || !campusFormData.location) {
      alert('Campus name and location are required');
      return;
    }

    try {
      if (editingCampus) {
        // Update campus
        const response = await gateService.updateCampus(editingCampus.campusId, campusFormData);
        if (response.success) {
          alert('Campus updated successfully!');
          fetchCampuses();
          setShowCampusModal(false);
        }
      } else {
        // Create campus
        const response = await gateService.createCampus(campusFormData);
        if (response.success) {
          alert('Campus created successfully!');
          fetchCampuses();
          setShowCampusModal(false);
        }
      }
    } catch (error) {
      console.error('Campus form submit error:', error);
      alert('Failed to save campus');
    }
  };

  // Gate CRUD handlers
  const handleAddGate = () => {
    setGateFormData({
      name: '',
      description: '',
      campusId: '',
      type: 'normal',
      ipAddress: '',
      location: ''
    });
    setEditingGate(null);
    setShowGateModal(true);
  };

  const handleEditGate = (gate) => {
    setGateFormData({
      name: gate.name || '',
      description: gate.description || '',
      campusId: gate.campusId || '',
      type: gate.type || 'normal',
      ipAddress: gate.ipAddress || '',
      location: gate.location || ''
    });
    setEditingGate(gate);
    setShowGateModal(true);
  };

  const handleDeleteGate = (gate) => {
    if (!window.confirm(`Are you sure you want to delete gate "${gate.name}"? This action cannot be undone.`)) {
      return;
    }

    const performDelete = async () => {
      try {
        const response = await gateService.deleteGate(gate.gateId);
        if (response.success) {
          setError('');
          alert('Gate deleted successfully!');
          fetchAllGates();
        } else {
          setError(response.message || 'Failed to delete gate');
        }
      } catch (error) {
        console.error('Delete gate error:', error);
        setError('Failed to delete gate');
      }
    };

    performDelete();
  };

  const handleGateFormSubmit = async (e) => {
    e.preventDefault();

    if (!gateFormData.name || !gateFormData.campusId) {
      alert('Gate name and campus are required');
      return;
    }

    try {
      if (editingGate) {
        // Update gate
        const response = await gateService.updateGate(editingGate.gateId, gateFormData);
        if (response.success) {
          alert('Gate updated successfully!');
          fetchAllGates();
          setShowGateModal(false);
        }
      } else {
        // Create gate
        const response = await gateService.createGate(gateFormData);
        if (response.success) {
          alert('Gate created successfully!');
          fetchAllGates();
          setShowGateModal(false);
        }
      }
    } catch (error) {
      console.error('Gate form submit error:', error);
      alert('Failed to save gate');
    }
  };

  const resetCampusForm = () => {
    setCampusFormData({
      name: '',
      location: '',
      address: '',
      contactPerson: '',
      contactNumber: ''
    });
  };

  const resetGateForm = () => {
    setGateFormData({
      name: '',
      description: '',
      campusId: '',
      type: 'normal',
      ipAddress: '',
      location: ''
    });
  };

  // Visitor CRUD handlers
  const handleAddVisitor = () => {
    setVisitorFormData({
      name: '',
      contact: '',
      email: '',
      address: '',
      purpose: '',
      visitTo: '',
      additionalNotes: '',
      campusId: ''
    });
    setEditingVisitor(null);
    setShowVisitorModal(true);
  };

  const handleEditVisitor = (visitor) => {
    setVisitorFormData({
      name: visitor.name || '',
      contact: visitor.contact || '',
      email: visitor.email || '',
      address: visitor.address || '',
      purpose: visitor.purpose || '',
      visitTo: visitor.visitTo || '',
      additionalNotes: visitor.additionalNotes || '',
      campusId: visitor.campusId || ''
    });
    setEditingVisitor(visitor);
    setShowVisitorModal(true);
  };

  // Handler for viewing visitor QR code
  const handleViewVisitorQR = (visitor) => {
    setGeneratedQR(visitor.visitorId);
  };

  const handleDeleteVisitor = (visitor) => {
    if (!window.confirm(`Are you sure you want to delete visitor "${visitor.name}"? This action cannot be undone.`)) {
      return;
    }

    const performDelete = async () => {
      try {
        const response = await visitorService.deleteVisitor(visitor.id);
        if (response.success) {
          alert('Visitor deleted successfully!');
          fetchVisitors();
        } else {
          alert('Failed to delete visitor');
        }
      } catch (error) {
        console.error('Delete visitor error:', error);
        alert('Failed to delete visitor');
      }
    };

    performDelete();
  };

  const handleVisitorFormSubmit = async (e) => {
    e.preventDefault();

    if (!visitorFormData.name || !visitorFormData.contact || !visitorFormData.campusId) {
      alert('Visitor name, contact, and campus are required');
      return;
    }

    try {
      if (editingVisitor) {
        // Update visitor
        const response = await visitorService.updateVisitor(editingVisitor.id, visitorFormData);
        if (response.success) {
          alert('Visitor updated successfully!');
          fetchVisitors();
          setShowVisitorModal(false);
        } else {
          alert('Failed to update visitor');
        }
      } else {
        // Create visitor
        const response = await visitorService.createVisitor({
          name: visitorFormData.name,
          contact: visitorFormData.contact,
          email: visitorFormData.email || null,
          address: visitorFormData.address,
          purpose: visitorFormData.purpose,
          visitTo: visitorFormData.visitTo || null,
          additionalNotes: visitorFormData.additionalNotes || null,
          campusId: visitorFormData.campusId
        });
        if (response.success) {
          // Refresh the visitors list
          await fetchVisitors();
          // Set generated QR to show modal
          setGeneratedQR(response.visitor.visitorId);
          setShowVisitorModal(false);
        } else {
          alert('Failed to create visitor');
        }
      }
    } catch (error) {
      console.error('Visitor form submit error:', error);
      alert('Failed to save visitor');
    }
  };

  const renderSection = () => {
    if (activeSection === 'users') {
      return <UserManagement role={user.role} />;
    }
    if (activeSection === 'schedules') {
      return <ScheduleManagement user={user} />;
    }



    if (activeSection === 'accessLogs') {
      // Use getFilteredAccessLogs which handles both campus-specific and additional filters
      const filteredLogs = getFilteredAccessLogs();

      return (
        <div className="logs-section">
          <div className="logs-header">
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary"
                onClick={handleExportLogsCSV}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Export to CSV"
              >
                <Download size={16} />
                CSV
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleExportLogsExcel}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Export to Excel"
              >
                <FileSpreadsheet size={16} />
                Excel
              </button>
              <button
                className="btn btn-secondary"
                onClick={handlePrintLogs}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Print Logs"
              >
                <Printer size={16} />
                Print
              </button>
            </div>
          </div>

          {/* Filters Section */}
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            background: '#f8f9fa',
            borderRadius: '8px',
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={16} color="#666" />
              <strong style={{ fontSize: '14px' }}>Filters:</strong>
            </div>

            {/* Date Range Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={useLogDateRange}
                  onChange={(e) => {
                    setUseLogDateRange(e.target.checked);
                    if (!e.target.checked) {
                      setLogStartDate('');
                      setLogEndDate('');
                    }
                  }}
                />
                <Calendar size={16} />
                Date Range:
              </label>
              {useLogDateRange && (
                <>
                  <input
                    type="date"
                    value={logStartDate}
                    onChange={(e) => setLogStartDate(e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={logEndDate}
                    onChange={(e) => setLogEndDate(e.target.value)}
                    min={logStartDate}
                    style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                  />
                </>
              )}
            </div>

            {/* Action Filter */}
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '14px' }}>Action:</label>
                <select
                  value={scanTypeFilter}
                  onChange={(e) => setScanTypeFilter(e.target.value)}
                  style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="all">All</option>
                  <option value="entry">Entry</option>
                  <option value="exit">Exit</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '14px' }}>Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                >
                  <option value="all">All</option>
                  <option value="approved">Approved</option>
                  <option value="denied">Denied</option>
                </select>
              </div>
            </>

            {/* Campus Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '14px' }}>Campus:</label>
              <select
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
                style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
              >
                <option value="">All Campuses</option>
                {campusesData.map(campus => (
                  <option key={campus.campusId} value={campus.campusId}>
                    {campus.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Results Count */}
            <div style={{ marginLeft: 'auto', fontSize: '14px', color: '#666' }}>
              Showing {filteredLogs.length} of {selectedCampus ? filteredLogs.length : accessLogsData.length} logs
            </div>
          </div>

          <div className="um-table-container">
            {logsLoading ? (
              <div className="loading">{selectedCampus ? `Loading ${campusesData.find(c => c.campusId === selectedCampus)?.name} logs...` : 'Loading access logs...'}</div>
            ) : (
              <table className="um-table" style={{ borderRadius: '8px', overflow: 'hidden', borderCollapse: 'separate', borderSpacing: '0' }}>
                <thead>
                  <tr>
                    <th>Log ID</th>
                    <th>User Name</th>
                    <th>User Type</th>
                    <th>Action</th>
                    <th>Gate</th>
                    <th>Campus</th>
                    <th>Status</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log, index) => {
                      // Find campus name by looking up gate's campus
                      const gateData = gatesData.find(gate => gate.gateId === log.gateId);
                      const campusName = gateData?.campusName || 'Unknown';

                      return (
                        <tr key={log.logId || log.id || index}>
                          <td>{log.logId || log.id || 'N/A'}</td>
                          <td>{log.userName || log.studentName || 'N/A'}</td>
                          <td>{log.userType || 'student'}</td>
                          <td>{log.scanType === 'entry' ? 'Entry' : 'Exit'}</td>
                          <td>{gateData?.name || log.gateId || 'Unknown'}</td>
                          <td>{campusName}</td>
                          <td>
                            <span className={`tag ${log.allowed ? 'success' : 'danger'}`}>
                              {log.allowed ? 'Approved' : 'Denied'}
                            </span>
                          </td>
                          <td>{new Date(log.timestamp).toLocaleString()}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
                        {selectedCampus ? `No access logs found for ${campusesData.find(c => c.campusId === selectedCampus)?.name}` : 'No access logs found matching the selected filters'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      );
    }

    if (activeSection === 'violations') {
      // Use getFilteredViolations for advanced filtering
      const filteredViolations = getFilteredViolations();

      return (
        <div className="logs-section">
          <div className="logs-header">

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary"
                onClick={handlePrintViolations}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Print Violations Report"
              >
                <Printer size={16} />
                Print Report
              </button>
            </div>
          </div>

          {/* Filters Section */}
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            background: '#f8f9fa',
            borderRadius: '8px',
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={16} color="#666" />
              <strong style={{ fontSize: '14px' }}>Filters:</strong>
            </div>

            {/* Date Range Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={useViolationDateRange}
                  onChange={(e) => {
                    setUseViolationDateRange(e.target.checked);
                    if (!e.target.checked) {
                      setViolationStartDate('');
                      setViolationEndDate('');
                    }
                  }}
                />
                <Calendar size={16} />
                Date Range:
              </label>
              {useViolationDateRange && (
                <>
                  <input
                    type="date"
                    value={violationStartDate}
                    onChange={(e) => setViolationStartDate(e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={violationEndDate}
                    onChange={(e) => setViolationEndDate(e.target.value)}
                    min={violationStartDate}
                    style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
                  />
                </>
              )}
            </div>

            {/* Action Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '14px' }}>Action:</label>
              <select
                value={violationScanTypeFilter}
                onChange={(e) => setViolationScanTypeFilter(e.target.value)}
                style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
              >
                <option value="all">All</option>
                <option value="entry">Entry</option>
                <option value="exit">Exit</option>
              </select>
            </div>

            {/* Campus Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '14px' }}>Campus:</label>
              <select
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
                style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
              >
                <option value="">All Campuses</option>
                {campusesData.map(campus => (
                  <option key={campus.campusId} value={campus.campusId}>
                    {campus.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Results Count */}
            <div style={{ marginLeft: 'auto', fontSize: '14px', color: '#666' }}>
              Showing {filteredViolations.length} of {selectedCampus ? filteredViolations.length : violationsData.length} violations
            </div>
          </div>

          <div className="um-table-container">
            {violationsLoading ? (
              <div className="loading">{selectedCampus ? `Loading ${campusesData.find(c => c.campusId === selectedCampus)?.name} violations...` : 'Loading violations...'}</div>
            ) : (
              <table className="um-table">
                <thead>
                  <tr>
                    <th>Violation ID</th>
                    <th>User Name</th>
                    <th>Violation Type</th>
                    <th>Action</th>
                    <th>Gate</th>
                    <th>Campus</th>
                    <th>Description</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredViolations.length > 0 ? (
                    filteredViolations.map((violation, index) => {
                      // Find gate name by looking up gate's details
                      const gateData = gatesData.find(gate => gate.gateId === violation.gateId);
                      const gateName = gateData?.name || violation.gateId || 'Unknown Gate';
                      const campusName = gateData?.campusName || 'Unknown';

                      return (
                        <tr key={violation.violationId || index}>
                          <td>{violation.violationId || 'N/A'}</td>
                          <td>{violation.visitorName || violation.studentName || 'N/A'}</td>
                          <td>
                            <span className="violation-type">
                              {violation.violationType || 'Unknown'}
                            </span>
                          </td>
                          <td>{violation.scanType === 'entry' ? 'Entry' : 'Exit'}</td>
                          <td>{gateName}</td>
                          <td>{campusName}</td>
                          <td>{violation.violationNotes || 'No description'}</td>
                          <td>{new Date(violation.timestamp).toLocaleString()}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
                        {selectedCampus ? `No violations found for ${campusesData.find(c => c.campusId === selectedCampus)?.name} matching the selected filters` : 'No violations found matching the selected filters'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      );
    }

    if (activeSection === 'visitors') {
      return (
        <div className="visitors-section">
          <div className="visitors-header">
    
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary"
                onClick={handleAddVisitor}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>
                Add Visitor
              </button>
            </div>
          </div>

          {/* Filters Section */}
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            background: '#f8f9fa',
            borderRadius: '8px',
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={16} color="#666" />
              <strong style={{ fontSize: '14px' }}>Filters:</strong>
            </div>

            {/* Campus Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '14px' }}>Campus:</label>
              <select
                value={selectedVisitorCampus}
                onChange={(e) => setSelectedVisitorCampus(e.target.value)}
                style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
              >
                <option value="">All Campuses</option>
                {campusesData.map(campus => (
                  <option key={campus.campusId} value={campus.campusId}>
                    {campus.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Results Count */}
            <div style={{ marginLeft: 'auto', fontSize: '14px', color: '#666' }}>
              Showing {visitorsData.length} visitors
            </div>
          </div>

          <div className="visitors-summary">
          </div>

          <div className="admin-table-card">
            <div className="table-header">
              <h3>Registered Visitors</h3>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Visitor ID</th>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Email</th>
                    <th>Purpose</th>
                    <th>Campus</th>
                    <th>Status</th>
                    <th>Usage</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visitorsLoading ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                        Loading visitors...
                      </td>
                    </tr>
                  ) : visitorsData.length > 0 ? (
                    visitorsData.map((visitor) => {
                      const campusName = campusesData.find(c => c.campusId === visitor.campusId)?.name || 'Unknown';
                      const isUsed = visitor.usageCount > 0;
                      const canUse = visitor.usageCount < visitor.maxUses;

                      return (
                        <tr key={visitor.id}>
                          <td>{visitor.visitorId}</td>
                          <td>{visitor.name}</td>
                          <td>{visitor.contact}</td>
                          <td>{visitor.email || 'N/A'}</td>
                          <td>{visitor.purpose}</td>
                          <td>
                            <span className="tag" style={{ backgroundColor: '#17a2b8', color: 'white' }}>
                              {campusName}
                            </span>
                          </td>
                          <td>
                            <span className={`tag ${visitor.status === 'active' ? 'success' : 'danger'}`}>
                              {visitor.status}
                            </span>
                          </td>
                          <td>
                            <span style={{ color: isUsed ? '#28a745' : '#6c757d' }}>
                              {visitor.usageCount}/{visitor.maxUses}
                            </span>
                            {isUsed && (
                              <small style={{ display: 'block', color: '#6c757d' }}>
                                Last: {visitor.lastUsed ? new Date(visitor.lastUsed).toLocaleDateString() : 'N/A'}
                              </small>
                            )}
                          </td>
                          <td>
                            {new Date(visitor.createdDate).toLocaleDateString()}
                          </td>
                          <td>
                            <div className="actions">
                              <button id="visitor-view-btn" className="view" title="View QR Code" onClick={() => handleViewVisitorQR(visitor)}>
                                <QrCode size={16} />
                              </button>
                              <button id="visitor-edit-btn" className="edit" title="Edit Visitor" onClick={() => handleEditVisitor(visitor)}>
                                <Edit size={16} />
                              </button>
                              <button id="visitor-delete-btn" className="delete" title="Delete Visitor" onClick={() => handleDeleteVisitor(visitor)}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
                        {selectedVisitorCampus ? `No visitors found for ${campusesData.find(c => c.campusId === selectedVisitorCampus)?.name}` : 'No visitors found'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === 'campuses') {
      return (
        <div className="campuses-section">


          <div className="campuses-content">
            {/* Campuses Table */}
            <div className="admin-table-card">
              <div className="table-header">
                <h3>Campus Locations</h3>
                <button
                  className="btn btn-primary"
                  onClick={handleAddCampus}
                >
                  + Add Campus
                </button>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Campus ID</th>
                      <th>Name</th>
                      <th>Location</th>
                      <th>Address</th>
                      <th>Contact Person</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campusesData.map(campus => (
                      <tr key={campus.id}>
                        <td>{campus.campusId}</td>
                        <td>{campus.name}</td>
                        <td>{campus.location}</td>
                        <td>{campus.address || 'N/A'}</td>
                        <td>{campus.contactPerson || 'N/A'}</td>
                        <td>
                          <span className={`tag ${campus.status === 'active' ? 'success' : 'danger'}`}>
                            {campus.status}
                          </span>
                        </td>
                          <td>
                            <div className="actions">
                              <button id="campus-edit-btn" className="edit" title="Edit Campus" onClick={() => handleEditCampus(campus)}>
                                <Edit size={16} />
                              </button>
                              <button id="campus-delete-btn" className="delete" title="Delete Campus" onClick={() => handleDeleteCampus(campus)}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Gates Table */}
            <div className="admin-table-card">
              <div className="table-header">
                <h3>Gate Access Points</h3>
                <button
                  className="primary-btn"
                  onClick={handleAddGate}
                >
                  + Add Gate
                </button>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Gate ID</th>
                      <th>Name</th>
                      <th>Description</th>
                      <th>Campus</th>
                      <th>Type</th>
                      <th>IP Address</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gatesData.map(gate => (
                      <tr key={gate.id}>
                        <td>{gate.gateId}</td>
                        <td>{gate.name}</td>
                        <td>{gate.description || 'N/A'}</td>
                        <td>{gate.campusName || 'Unknown'}</td>
                        <td>{gate.type || 'normal'}</td>
                        <td>{gate.ipAddress || 'N/A'}</td>
                        <td>
                          <span className={`tag ${gate.status === 'active' ? 'success' : 'danger'}`}>
                            {gate.status}
                          </span>
                        </td>
                        <td>
                          <div className="actions">
                            <button id="gate-edit-btn" className="edit" title="Edit Gate" onClick={() => handleEditGate(gate)}>
                              <Edit size={16} />
                            </button>
                            <button id="gate-delete-btn" className="delete" title="Delete Gate" onClick={() => handleDeleteGate(gate)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeSection === 'settings') {
      return (
        <div className="section-placeholder">
          <h2>System Settings</h2>
          <p>Feature under construction. Check back soon.</p>
        </div>
      );
    }

    if (loading) {
      return <div className="section-placeholder"><p>Loading dashboard...</p></div>;
    }

    if (error) {
      return <div className="section-placeholder"><p>{error}</p></div>;
    }

    // Process real Firebase data for charts
    const processFirebaseData = () => {
      const today = new Date().toISOString().split('T')[0];
      const allDates = [];
      for (let i = 6; i >= 0; i--) { // Last 7 days including today
        const date = new Date();
        date.setDate(date.getDate() - i);
        allDates.push(date.toISOString().split('T')[0]);
      }

      // Process entry trend data
      const entryTrendMap = {};
      const violationTrendMap = {};
      allDates.forEach(date => {
        entryTrendMap[date] = 0;
        violationTrendMap[date] = 0;
      });

      // Process access logs for entries from weekly data
      if (dashboardData?.weeklyAccessLogs) {
        Object.keys(dashboardData.weeklyAccessLogs).forEach(date => {
          if (allDates.includes(date)) {
            const dateLogs = Object.values(dashboardData.weeklyAccessLogs[date]);
            dateLogs.forEach(log => {
              if (log.allowed === true && log.scanType === 'entry') {
                entryTrendMap[date]++;
              }
            });
          }
        });
      }

      // Process violations from weekly data
      if (dashboardData?.weeklyViolations) {
        Object.keys(dashboardData.weeklyViolations).forEach(date => {
          if (allDates.includes(date)) {
            const dateViolations = Object.values(dashboardData.weeklyViolations[date]);
            violationTrendMap[date] += dateViolations.length;
          }
        });
      }

      // Convert to chart data
      const entryTrendData = allDates.map(date => ({
        name: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        entries: entryTrendMap[date] || 0
      }));

      const violationTrendData = allDates.map(date => ({
        name: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: violationTrendMap[date] || 0
      }));

      // Process peak times for today using weekly data
      const peakTimesMap = {};
      const todayLogs = dashboardData?.weeklyAccessLogs?.[today] || {};
      Object.values(todayLogs).forEach(log => {
        if (log.allowed === true && log.scanType === 'entry') {
          const timestamp = new Date(log.timestamp);
          const hour = timestamp.getHours();
          const hourLabel = hour === 0 ? '12:00 AM' :
                           hour < 12 ? `${hour}:00 AM` :
                           hour === 12 ? '12:00 PM' :
                           `${hour - 12}:00 PM`;
          peakTimesMap[hourLabel] = (peakTimesMap[hourLabel] || 0) + 1;
        }
      });

      // Create hour labels for full day
      const hourLabels = ['7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
                         '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'];

      const peakTimesData = hourLabels.map(label => ({
        time: label,
        entries: peakTimesMap[label] || 0
      }));

      return {
        entryTrendData,
        violationTrendData,
        peakTimesData
      };
    };

    const { entryTrendData, violationTrendData, peakTimesData } = processFirebaseData();

    const getTopAlerts = () => {
      const allAlerts = dashboardData?.alerts ? Object.values(dashboardData.alerts) : [];
      return allAlerts
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) // Most recent first
        .slice(0, 10); // Show top 10 alerts
    };

    return (
      <div className="dashboard-analytics">
        {/* Header */}


        {/* Top Statistics Cards */}
        <div className="stats-grid">
          <div className="stat-card primary">
            <div className="stat-icon">
              <UsersIcon size={24} color="white" />
            </div>
            <div className="stat-content">
              <div className="stat-value">{dashboardData?.counts.entriesToday || 0}</div>
              <div className="stat-label">Total Entries Today</div>
            </div>
          </div>

          <div className="stat-card danger">
            <div className="stat-icon">
              <AlertTriangle size={24} color="white" />
            </div>
            <div className="stat-content">
              <div className="stat-value">{dashboardData?.counts.violationsToday || 0}</div>
              <div className="stat-label">Total Violations Today</div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="charts-grid">
          {/* Entry Trend Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Entry Trend Over Time</h3>
              <p>Daily entry statistics for the last 7 days</p>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={entryTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="entries"
                    stroke="#007bff"
                    strokeWidth={3}
                    name="Entries"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Violation Trend Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Violation Trend Over Time</h3>
              <p>Daily violation statistics for the last 7 days</p>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={violationTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#dc3545"
                    strokeWidth={3}
                    name="Violations"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Peak Entry Times Chart */}
          <div className="chart-card">
            <div className="chart-header">
              <h3>Peak Entry Times</h3>
              <p>Entry activity by hour (typical weekday)</p>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={peakTimesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="entries" fill="#28a745" name="Entries" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Real-time Alerts Feed */}
          <div className="alerts-table-card" style={{ gridColumn: 'span 4', height: '500px' }}>
            <div className="chart-header">
              <h3>Real-time Alerts Feed</h3>
              <p>Live security alerts and violations</p>
            </div>
            <div className="alerts-table-container" style={{ height: '420px', overflow: 'auto' }}>
              <table className="um-table" style={{ borderRadius: '8px', overflow: 'hidden', borderCollapse: 'separate', borderSpacing: '0' }}>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Person</th>
                    <th>Campus</th>
                    <th>Gate</th>
                    <th>Violation Type</th>
                    <th>Time</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {getTopAlerts().length > 0 ? (
                    getTopAlerts().map((alert, idx) => (
                      <tr key={idx} style={{ backgroundColor: alert.severity === 'critical' ? '#fff5f5' : alert.severity === 'warning' ? '#fffbf0' : 'inherit' }}>
                        <td>
                          <span className="alert-type">{alert.type || 'Alert'}</span>
                        </td>
                        <td>
                          <span>{alert.violator || 'Unknown'}</span>
                        </td>
                        <td>
                          <span>{alert.campus || 'Unknown'}</span>
                        </td>
                        <td>
                          <span>{alert.gate || 'Gate'}</span>
                        </td>
                        <td>
                          <span className="violation-type">{alert.violationType || 'N/A'}</span>
                        </td>
                        <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {new Date(alert.timestamp).toLocaleString()}
                        </td>
                        <td style={{ fontSize: '12px', maxWidth: '200px', wordWrap: 'break-word' }}>
                          {alert.message || 'No additional details'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
                        <div className="no-alerts">
                          <AlertTriangle size={32} color="#666" />
                          <div>No recent alerts found</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Last Updated Indicator */}
        <div className="last-updated">
          <small>Last updated: {new Date().toLocaleTimeString()}</small>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="logo">
          <img src={bulsuLogo} alt="BulSU Logo" />
        </div>
        <nav>
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              className={activeSection === item.id ? 'active' : ''}
              onClick={() => setActiveSection(item.id)}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1>{sidebarItems.find(item => item.id === activeSection)?.label || 'Admin Dashboard'}</h1>
            <p>{activeSection === 'overview' ? 'Dashboard overview and statistics' : 'Module management'}</p>
          </div>
          <div className="topbar-actions">
            <div className="topbar-user">
              <strong>{user.firstName} {user.lastName}</strong>
              <span>{user.role?.toUpperCase()}</span>
            </div>
            <button className="btn btn-secondary" onClick={onLogout}>Logout</button>
          </div>
        </header>

        <main className="admin-content">
          {renderSection()}
        </main>
      </div>

      {/* Campus Modal */}
      {showCampusModal && (
        <div className="modal-overlay" onClick={() => setShowCampusModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCampus ? 'Edit Campus' : 'Add New Campus'}</h3>
              <button className="modal-close-btn" onClick={() => setShowCampusModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCampusFormSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="campusName">Campus Name *</label>
                  <input
                    id="campusName"
                    type="text"
                    value={campusFormData.name}
                    onChange={(e) => setCampusFormData({...campusFormData, name: e.target.value})}
                    required
                    placeholder="Enter campus name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="campusLocation">Location *</label>
                  <input
                    id="campusLocation"
                    type="text"
                    value={campusFormData.location}
                    onChange={(e) => setCampusFormData({...campusFormData, location: e.target.value})}
                    required
                    placeholder="e.g., San Jose, Bulacan"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="campusAddress">Address</label>
                  <textarea
                    id="campusAddress"
                    value={campusFormData.address}
                    onChange={(e) => setCampusFormData({...campusFormData, address: e.target.value})}
                    placeholder="Full campus address"
                    rows="3"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="contactPerson">Contact Person</label>
                    <input
                      id="contactPerson"
                      type="text"
                      value={campusFormData.contactPerson}
                      onChange={(e) => setCampusFormData({...campusFormData, contactPerson: e.target.value})}
                      placeholder="Contact person name"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="contactNumber">Contact Number</label>
                    <input
                      id="contactNumber"
                      type="number"
                      value={campusFormData.contactNumber}
                      onChange={(e) => setCampusFormData({...campusFormData, contactNumber: e.target.value})}
                      placeholder="Contact phone number"
                    />
                  </div>
                </div>
              </div>
              <div style={{ padding: '20px', borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary">
                  {editingCampus ? 'Update Campus' : 'Create Campus'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gate Modal */}
      {showGateModal && (
        <div className="modal-overlay" onClick={() => setShowGateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingGate ? 'Edit Gate' : 'Add New Gate'}</h3>
              <button className="modal-close-btn" onClick={() => setShowGateModal(false)}>✕</button>
            </div>
            <form onSubmit={handleGateFormSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="gateName">Gate Name *</label>
                    <input
                      id="gateName"
                      type="text"
                      value={gateFormData.name}
                      onChange={(e) => setGateFormData({...gateFormData, name: e.target.value})}
                      required
                      placeholder="e.g., Main Entrance"
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="gateCampus">Campus *</label>
                    <select
                      id="gateCampus"
                      value={gateFormData.campusId}
                      onChange={(e) => setGateFormData({...gateFormData, campusId: e.target.value})}
                      required
                    >
                      <option value="">Select Campus</option>
                      {campusesData.map(campus => (
                        <option key={campus.campusId} value={campus.campusId}>
                          {campus.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="gateDescription">Description</label>
                  <textarea
                    id="gateDescription"
                    value={gateFormData.description}
                    onChange={(e) => setGateFormData({...gateFormData, description: e.target.value})}
                    placeholder="Brief description of the gate"
                    rows="2"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="gateType">Gate Type</label>
                  <select
                    id="gateType"
                    value={gateFormData.type}
                    onChange={(e) => setGateFormData({...gateFormData, type: e.target.value})}
                  >
                    <option value="normal">Normal Gate</option>
                    <option value="entrance">Entrance Only</option>
                    <option value="exit">Exit Only</option>
                    <option value="emergency">Emergency Gate</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="gateLocation">Location Details</label>
                  <input
                    id="gateLocation"
                    type="text"
                    value={gateFormData.location}
                    onChange={(e) => setGateFormData({...gateFormData, location: e.target.value})}
                    placeholder="Specific location details"
                  />
                </div>
              </div>
              <div style={{ padding: '20px', borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn btn-primary">
                  {editingGate ? 'Update Gate' : 'Create Gate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

// Visitor Modal
{showVisitorModal && (
  <div className="modal-overlay" onClick={() => setShowVisitorModal(false)}>
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h3>{editingVisitor ? 'Edit Visitor' : 'Create Visitor Access'}</h3>
        <button className="modal-close-btn" onClick={() => setShowVisitorModal(false)}>×</button>
      </div>
      <form onSubmit={handleVisitorFormSubmit}>
        <div className="modal-body">
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Full Name *</label>
            <input
              type="text"
              name="name"
              required
              value={visitorFormData.name}
              onChange={(e) => setVisitorFormData({...visitorFormData, name: e.target.value})}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Phone Number *</label>
              <input
                type="number"
                name="contact"
                required
                value={visitorFormData.contact}
                onChange={(e) => setVisitorFormData({...visitorFormData, contact: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Email (Optional)</label>
              <input
                type="email"
                name="email"
                value={visitorFormData.email}
                onChange={(e) => setVisitorFormData({...visitorFormData, email: e.target.value})}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Address *</label>
            <textarea
              name="address"
              required
              value={visitorFormData.address}
              onChange={(e) => setVisitorFormData({...visitorFormData, address: e.target.value})}
              placeholder="Street address, city, province, ZIP code"
              rows={2}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Campus *</label>
            <select
              name="campusId"
              required
              value={visitorFormData.campusId}
              onChange={(e) => setVisitorFormData({...visitorFormData, campusId: e.target.value})}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">Select Campus</option>
              {campusesData.map(campus => (
                <option key={campus.campusId} value={campus.campusId}>
                  {campus.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Purpose of Visit *</label>
            <select
              name="purpose"
              required
              value={visitorFormData.purpose}
              onChange={(e) => setVisitorFormData({...visitorFormData, purpose: e.target.value})}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              <option value="">Select Purpose</option>
              <option value="Meeting">Meeting</option>
              <option value="Interview">Interview</option>
              <option value="Delivery">Delivery</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Event">Event/Ceremony</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Visiting Person/Office</label>
            <input
              type="text"
              name="visitTo"
              value={visitorFormData.visitTo}
              onChange={(e) => setVisitorFormData({...visitorFormData, visitTo: e.target.value})}
              placeholder="e.g., Dr. Smith, Admissions Office"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Additional Notes</label>
            <textarea
              name="additionalNotes"
              value={visitorFormData.additionalNotes}
              onChange={(e) => setVisitorFormData({...visitorFormData, additionalNotes: e.target.value})}
              placeholder="Any additional information..."
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>
        </div>
        <div className="modal-footer" style={{ paddingTop: '5px',borderTop: '1px solid #e0e0e0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="submit"
            className="primary-btn"
          >
            {editingVisitor ? 'Update Visitor' : 'Create Visitor Pass'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}

{/* QR Code Display Modal */}
      {generatedQR && (
        <QRDisplayModal
          qrData={generatedQR}
          onClose={() => setGeneratedQR(null)}
        />
      )}
    </div>
  );
}

// QR Code Image Component using qrcode.react
function QRCodeImage({ qrData }) {
  return (
    <QRCodeCanvas
      value={qrData}
      size={256}
      level="M"
      includeMargin={true}
      style={{
        maxWidth: '250px',
        maxHeight: '250px',
        border: '4px solid #333',
        borderRadius: '8px',
        padding: '8px'
      }}
    />
  );
}

function QRDisplayModal({ qrData, onClose }) {
  const handleSaveQR = () => {
    try {
      // Get the canvas from the displayed QR code
      const displayCanvas = document.querySelector('#admin-visitor-qr-code canvas');

      if (displayCanvas) {
        // Create a new canvas for the download image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Set canvas size
        canvas.width = 512;
        canvas.height = 512;

        // Fill with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 512, 512);

        // Draw the QR code from the display
        ctx.drawImage(displayCanvas, 0, 0, 512, 512);

        // Convert to data URL and download
        const qrImageUrl = canvas.toDataURL('image/png');

        const downloadLink = document.createElement('a');
        downloadLink.href = qrImageUrl;
        downloadLink.download = `visitor-qr-${qrData.split('-')[1]}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      } else {
        alert('QR code not found. Please try again.');
      }
    } catch (error) {
      console.error('Error generating QR code for download:', error);
      alert('Failed to generate QR code image. Please try again.');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1001
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '450px',
        width: '90vw',
        textAlign: 'center'
      }}>
        <h3 style={{ marginTop: 0 }}>Visitor QR Code</h3>
        <p style={{ margin: '8px 0 24px 0', color: '#6c757d' }}>
          Valid for one entry and one exit today only
        </p>

        <div style={{
          backgroundColor: '#f8f9fa',
          borderRadius: '12px',
          padding: '24px',
          margin: '0 0 20px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid #007bff',
          boxShadow: '0 4px 12px rgba(0,123,255,0.2)'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              backgroundColor: 'white',
              padding: '16px',
              borderRadius: '8px',
              border: '2px solid #dee2e6',
              display: 'inline-block'
            }}>
              <div id="admin-visitor-qr-code">
                <QRCodeImage qrData={qrData} />
              </div>
            </div>

           
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <p style={{
            fontFamily: 'monospace',
            fontSize: '12px',
            margin: '0',
            color: '#28a745',
            backgroundColor: '#d4edda',
            border: '1px solid #c3e6cb',
            padding: '8px',
            borderRadius: '4px',
            textAlign: 'center'
          }}>
            VALID FOR TODAY ONLY • ONE ENTRY + ONE EXIT
          </p>
          <p style={{ fontSize: '12px', color: '#6c757d', margin: '8px 0 0 0', textAlign: 'center' }}>
            Take a photo with your phone for quick gate access
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            style={{
              padding: '10px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onClick={onClose}
          >
            Close
          </button>
          <button
            style={{
              padding: '10px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onClick={handleSaveQR}
          >
            Save QR Code
          </button>
          <button
            style={{
              padding: '10px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
            onClick={() => window.print()}
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
