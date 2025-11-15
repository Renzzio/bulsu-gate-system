// frontend/src/components/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import UserManagement from './UserManagement';
import ScheduleManagement from './ScheduleManagement';
import dashboardService from '../services/dashboardService';
import gateService from '../services/gateService';
import visitorService from '../services/visitorService';
import { exportToCSV, exportToExcel, printData } from '../utils/exportUtils';
import { Download, FileSpreadsheet, Printer, Filter, Calendar, Eye, Edit, Trash2, QrCode } from 'lucide-react';
import './AdminDashboard.css';

const sidebarItems = [
  { id: 'overview', label: 'Admin Dashboard', icon: 'space_dashboard' },
  { id: 'users', label: 'User Management', icon: 'group' },
  { id: 'schedules', label: 'Schedules', icon: 'event_note' },
  { id: 'visitors', label: 'Visitors', icon: 'people' },
  { id: 'campuses', label: 'Campuses & Gates', icon: 'location_on' },
  { id: 'reports', label: 'Reports', icon: 'query_stats' },
  { id: 'accessLogs', label: 'Access Logs', icon: 'assignment' },
  { id: 'violations', label: 'Violations', icon: 'warning' }
];

function AdminDashboard({ user, onLogout }) {
  const [activeSection, setActiveSection] = useState('overview');
  const [reportRange, setReportRange] = useState('day');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportsData, setReportsData] = useState(null);
  const [accessLogsData, setAccessLogsData] = useState([]);
  const [violationsData, setViolationsData] = useState([]);
  const [campusesData, setCampusesData] = useState([]);
  const [gatesData, setGatesData] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [violationsLoading, setViolationsLoading] = useState(false);
  const [campusesLoading, setCampusesLoading] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);
  
  // Date range states for reports
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [useReportDateRange, setUseReportDateRange] = useState(false);
  
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
  }, []);

  // Fetch reports data when reports section is active
  useEffect(() => {
    if (activeSection === 'reports') {
      fetchReportsData();
    }
  }, [activeSection, reportRange, useReportDateRange, reportStartDate, reportEndDate]);

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

  const fetchReportsData = async () => {
    try {
      setReportsLoading(true);
      
      // If using custom date range, fetch access logs and calculate report
      if (useReportDateRange && reportStartDate && reportEndDate) {
        const response = await gateService.getAccessLogs('month');
        if (response.success && response.logs) {
          const start = new Date(reportStartDate);
          const end = new Date(reportEndDate);
          end.setHours(23, 59, 59, 999);
          
          // Filter logs by date range
          const filteredLogs = response.logs.filter(log => {
            const logDate = new Date(log.timestamp);
            return logDate >= start && logDate <= end;
          });
          
          // Calculate report from filtered logs
          const report = filteredLogs.reduce((acc, log) => {
            acc.total += 1;
            if (log.scanType === 'entry') acc.entries += 1;
            if (log.scanType === 'exit') acc.exits += 1;
            if (!log.allowed) acc.denied += 1;
            return acc;
          }, { total: 0, entries: 0, exits: 0, denied: 0 });
          
          // Get violations count (we'll approximate from denied entries)
          report.violations = report.denied;
          
          setReportsData({ success: true, report });
        }
      } else {
        // Use preset range
        const response = await gateService.getReports(reportRange);
        if (response.success) {
          setReportsData(response);
        } else {
          console.error('Reports fetch failed:', response);
        }
      }
    } catch (err) {
      console.error('Reports fetch error:', err);
      // If API fails, keep using dashboard data as fallback
    } finally {
      setReportsLoading(false);
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

  // Filter access logs based on date range, scan type, and status
  const getFilteredAccessLogs = () => {
    // Use campus-specific data if campus is selected, otherwise use global data
    let filtered = [...(selectedCampus ? campusLogs : accessLogsData)];

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

  // Filter violations based on date range and scan type
  const getFilteredViolations = () => {
    // Use campus-specific data if campus is selected, otherwise use global data
    let filtered = [...(selectedCampus ? campusViolations : violationsData)];

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

  const reportSummary = reportsData?.report ? [
    { label: 'Entries', value: reportsData.report.entries || 0, color: 'var(--accent-blue)' },
    { label: 'Exits', value: reportsData.report.exits || 0, color: 'var(--accent-cyan)' },
    { label: 'Denied', value: reportsData.report.denied || 0, color: 'var(--accent-red)' },
    { label: 'Violations', value: reportsData.report.violations || 0, color: '#FF9800' }
  ] : dashboardData ? [
    { label: 'Entries', value: dashboardData.counts.entriesToday, color: 'var(--accent-blue)' },
    { label: 'Exits', value: dashboardData.counts.exitsToday, color: 'var(--accent-cyan)' },
    { label: 'Denied', value: dashboardData.counts.deniedToday, color: 'var(--accent-red)' },
    { label: 'Violations', value: dashboardData.counts.violationsToday, color: '#FF9800' }
  ] : [];

  // Export functions
  const handleExportReportsCSV = () => {
    const headers = ['Metric', 'Value', 'Period'];
    const period = useReportDateRange && reportStartDate && reportEndDate
      ? `${reportStartDate} to ${reportEndDate}`
      : reportRange.charAt(0).toUpperCase() + reportRange.slice(1);
    const data = reportSummary.map(report => [
      report.label,
      report.value,
      period
    ]);
    const filename = useReportDateRange && reportStartDate && reportEndDate
      ? `gate-reports-${reportStartDate}_to_${reportEndDate}`
      : `gate-reports-${reportRange}-${new Date().toISOString().split('T')[0]}`;
    exportToCSV(data, filename, headers);
  };

  const handleExportReportsExcel = () => {
    const headers = ['Metric', 'Value', 'Period'];
    const period = useReportDateRange && reportStartDate && reportEndDate
      ? `${reportStartDate} to ${reportEndDate}`
      : reportRange.charAt(0).toUpperCase() + reportRange.slice(1);
    const data = reportSummary.map(report => [
      report.label,
      report.value,
      period
    ]);
    const filename = useReportDateRange && reportStartDate && reportEndDate
      ? `gate-reports-${reportStartDate}_to_${reportEndDate}`
      : `gate-reports-${reportRange}-${new Date().toISOString().split('T')[0]}`;
    exportToExcel(data, filename, 'Reports', headers);
  };

  const handlePrintReports = () => {
    const headers = ['Metric', 'Value', 'Period'];
    const period = useReportDateRange && reportStartDate && reportEndDate
      ? `${reportStartDate} to ${reportEndDate}`
      : reportRange.charAt(0).toUpperCase() + reportRange.slice(1);
    const data = reportSummary.map(report => [
      report.label,
      report.value,
      period
    ]);
    const title = useReportDateRange && reportStartDate && reportEndDate
      ? `Gate Movement Reports (${reportStartDate} to ${reportEndDate})`
      : `Gate Movement Reports - ${period}`;
    printData(title, data, headers);
  };

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

    if (activeSection === 'reports') {
      return (
        <div className="reports-section">
          <div className="reports-header">
            <div>
              <h2>Gate Movement Reports</h2>
              <p>Generate summaries of gate entries/exits across time ranges.</p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={useReportDateRange}
                    onChange={(e) => {
                      setUseReportDateRange(e.target.checked);
                      if (!e.target.checked) {
                        setReportStartDate('');
                        setReportEndDate('');
                      }
                    }}
                  />
                  <Calendar size={16} />
                  Custom Date Range
                </label>
                {useReportDateRange && (
                  <>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                    <span>to</span>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      min={reportStartDate}
                      style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </>
                )}
                {!useReportDateRange && (
                  <select value={reportRange} onChange={(e) => setReportRange(e.target.value)}>
                    <option value="day">Daily</option>
                    <option value="week">Weekly</option>
                    <option value="month">Monthly</option>
                  </select>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="outline-btn" 
                  onClick={handleExportReportsCSV}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="Export to CSV"
                >
                  <Download size={16} />
                  CSV
                </button>
                <button 
                  className="outline-btn" 
                  onClick={handleExportReportsExcel}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="Export to Excel"
                >
                  <FileSpreadsheet size={16} />
                  Excel
                </button>
                <button 
                  className="outline-btn" 
                  onClick={handlePrintReports}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="Print Report"
                >
                  <Printer size={16} />
                  Print
                </button>
              </div>
            </div>
          </div>

          {reportsLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>Loading reports...</div>
          ) : (
            <>
              <div className="reports-grid">
                {reportSummary.map((report) => {
                  const periodLabel = useReportDateRange && reportStartDate && reportEndDate
                    ? `${reportStartDate} to ${reportEndDate}`
                    : reportRange;
                  return (
                    <div key={report.label} className="report-card">
                      <span>{report.label} ({periodLabel})</span>
                      <strong>{report.value}</strong>
                      <div className="report-bar">
                        <div style={{ width: `${Math.min(report.value / 10, 100)}%`, backgroundColor: report.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="chart-card">
                <div>
                  <h3>Gate Utilization Summary</h3>
                  <p>Distribution of entries vs exits for the selected period.</p>
                </div>
                <div className="mini-chart">
                  {reportSummary.map((report) => (
                    <div key={report.label}>
                      <span style={{ background: report.color }} />
                      {report.label}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      );
    }

    if (activeSection === 'accessLogs') {
      // Use getFilteredAccessLogs which handles both campus-specific and additional filters
      const filteredLogs = getFilteredAccessLogs();

      return (
        <div className="logs-section">
          <div className="logs-header">
            <div>
              <h2>Access Logs {selectedCampus && `(${campusesData.find(c => c.campusId === selectedCampus)?.name || 'Unknown Campus'})`}</h2>
              <p>Historical gate transactions for auditing purposes.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="outline-btn"
                onClick={handleExportLogsCSV}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Export to CSV"
              >
                <Download size={16} />
                CSV
              </button>
              <button
                className="outline-btn"
                onClick={handleExportLogsExcel}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                title="Export to Excel"
              >
                <FileSpreadsheet size={16} />
                Excel
              </button>
              <button
                className="outline-btn"
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

          <div className="logs-table">
            {logsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                {selectedCampus ? `Loading ${campusesData.find(c => c.campusId === selectedCampus)?.name} logs...` : 'Loading access logs...'}
              </div>
            ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Log ID</th>
                      <th>User ID</th>
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
                            <td>{log.userId || log.studentId || 'N/A'}</td>
                            <td>{log.userName || log.studentName || 'N/A'}</td>
                            <td>{log.userType || 'student'}</td>
                            <td>{log.scanType === 'entry' ? 'Entry' : 'Exit'}</td>
                            <td>{log.gateId || 'Gate'}</td>
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
                        <td colSpan="9" style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
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
            <div>
              <h2>Violations Center {selectedCampus && `(${campusesData.find(c => c.campusId === selectedCampus)?.name || 'Unknown Campus'})`}</h2>
              <p>Security violations and policy breaches across the campus.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="outline-btn"
                onClick={() => window.print()}
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

          <div className="violations-summary">
            <div className="violation-stats">
              <div className="stat-card">
                <h3>{filteredViolations.length}</h3>
                <p>Total Violations</p>
              </div>
              <div className="stat-card">
                <h3>{filteredViolations.filter(v => v.userType === 'student').length}</h3>
                <p>Student Violations</p>
              </div>
              <div className="stat-card">
                <h3>{filteredViolations.filter(v => v.userType === 'visitor').length}</h3>
                <p>Visitor Violations</p>
              </div>
            </div>
          </div>

          <div className="logs-table">
            {violationsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                {selectedCampus ? `Loading ${campusesData.find(c => c.campusId === selectedCampus)?.name} violations...` : 'Loading violations...'}
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Violation ID</th>
                    <th>User ID</th>
                    <th>User Name</th>
                    <th>User Type</th>
                    <th>Violation Type</th>
                    <th>Action</th>
                    <th>Gate</th>
                    <th>Description</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredViolations.length > 0 ? (
                    filteredViolations.map((violation, index) => (
                      <tr key={violation.violationId || index}>
                        <td>{violation.violationId || 'N/A'}</td>
                        <td>{violation.visitorId || violation.studentId || 'N/A'}</td>
                        <td>{violation.visitorName || violation.studentName || 'N/A'}</td>
                        <td>{violation.userType || 'unknown'}</td>
                        <td>
                          <span className="violation-type">
                            {violation.violationType || 'Unknown'}
                          </span>
                        </td>
                        <td>{violation.scanType === 'entry' ? 'Entry' : 'Exit'}</td>
                        <td>{violation.gateId || 'Gate'}</td>
                        <td>{violation.violationNotes || 'No description'}</td>
                        <td>{new Date(violation.timestamp).toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
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
            <div>
              <h2>Visitor Management {selectedVisitorCampus && `(${campusesData.find(c => c.campusId === selectedVisitorCampus)?.name || 'Unknown Campus'})`}</h2>
              <p>Manage visitor registrations and access credentials across campuses.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="primary-btn"
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
                              <button className="view" title="View QR Code" onClick={() => handleViewVisitorQR(visitor)}>
                                <QrCode size={16} />
                              </button>
                              <button className="edit" title="Edit Visitor" onClick={() => handleEditVisitor(visitor)}>
                                <Edit size={16} />
                              </button>
                              <button className="delete" title="Delete Visitor" onClick={() => handleDeleteVisitor(visitor)}>
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
          <div className="campuses-header">
            <div>
              <h2>Campuses & Gates Management</h2>
              <p>Manage campus locations and their associated gate access points.</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="primary-btn"
                onClick={() => setActiveSection('campuses')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>location_on</span>
                Manage Campuses
              </button>
              <button
                className="primary-btn"
                onClick={() => setActiveSection('gates')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>gate</span>
                Manage Gates
              </button>
            </div>
          </div>

          <div className="campuses-content">
            {/* Campuses Summary */}
            <div className="campus-stats">
              <div className="stat-card">
                <h3>{campusesData.length}</h3>
                <p>Total Campuses</p>
              </div>
              <div className="stat-card">
                <h3>{gatesData.length}</h3>
                <p>Total Gates</p>
              </div>
              <div className="stat-card">
                <h3>{campusesData.filter(c => c.status === 'active').length}</h3>
                <p>Active Campuses</p>
              </div>
            </div>

            {/* Campuses Table */}
            <div className="admin-table-card">
              <div className="table-header">
                <h3>Campus Locations</h3>
                <button
                  className="primary-btn"
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
                              <button className="view" title="View Gates" onClick={() => alert('View gates coming soon!')}>
                                <Eye size={16} />
                              </button>
                              <button className="edit" title="Edit Campus" onClick={() => handleEditCampus(campus)}>
                                <Edit size={16} />
                              </button>
                              <button className="delete" title="Delete Campus" onClick={() => handleDeleteCampus(campus)}>
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
                            <button className="edit" title="Edit Gate" onClick={() => handleEditGate(gate)}>
                              <Edit size={16} />
                            </button>
                            <button className="delete" title="Delete Gate" onClick={() => handleDeleteGate(gate)}>
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

    return (
      <>
        <div className="admin-cards">
          {overviewStats.map((stat) => (
            <div key={stat.label} className="card">
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <small>{stat.trend}</small>
            </div>
          ))}
        </div>

        <div className="overview-grid">
          <div className="chart-card">
            <div>
              <h3>Gate Flow Snapshot</h3>
              <p>Entries vs exits across campus today.</p>
            </div>
            <div className="mini-chart">
              <div><span className="dot entries" />{dashboardData?.counts.entriesToday || 0} Entries</div>
              <div><span className="dot exits" />{dashboardData?.counts.exitsToday || 0} Exits</div>
              <div><span className="dot denied" />{dashboardData?.counts.deniedToday || 0} Denied</div>
            </div>
          </div>

          <div className="chart-card">
            <div>
              <h3>Live Alerts</h3>
              <p>Recent violations and alerts triggered at the gates.</p>
            </div>
            <ul className="alert-list">
              {dashboardData?.alerts && dashboardData.alerts.length > 0 ? (
                dashboardData.alerts.slice(0, 3).map((alert, idx) => (
                  <li key={idx}>
                    <strong>{alert.type || 'Alert'}</strong>
                    <span>{new Date(alert.timestamp).toLocaleTimeString()} · {alert.gate || 'Gate'}</span>
                  </li>
                ))
              ) : (
                <li><span>No recent alerts</span></li>
              )}
            </ul>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="logo">
          <div className="emblem">🎓</div>
          <span>BulSU Gate System</span>
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
            <button className="outline-btn" onClick={onLogout}>Logout</button>
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
              <button className="modal-close" onClick={() => setShowCampusModal(false)}>×</button>
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
                      type="tel"
                      value={campusFormData.contactNumber}
                      onChange={(e) => setCampusFormData({...campusFormData, contactNumber: e.target.value})}
                      placeholder="Contact phone number"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="outline-btn" onClick={() => setShowCampusModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
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
              <button className="modal-close" onClick={() => setShowGateModal(false)}>×</button>
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
                <div className="form-row">
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
                    <label htmlFor="gateIpAddress">IP Address</label>
                    <input
                      id="gateIpAddress"
                      type="text"
                      value={gateFormData.ipAddress}
                      onChange={(e) => setGateFormData({...gateFormData, ipAddress: e.target.value})}
                      placeholder="192.168.1.100"
                    />
                  </div>
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
              <div className="modal-footer">
                <button type="button" className="outline-btn" onClick={() => setShowGateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  {editingGate ? 'Update Gate' : 'Create Gate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visitor Modal */}
      {showVisitorModal && (
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '500px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>
              {editingVisitor ? 'Edit Visitor' : 'Create Visitor Access'}
            </h3>

            <form onSubmit={handleVisitorFormSubmit}>
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
                    type="tel"
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

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowVisitorModal(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
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

            <div style={{
              backgroundColor: '#007bff',
              color: 'white',
              padding: '8px 24px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '600',
              textAlign: 'center',
              letterSpacing: '0.5px'
            }}>
              SCAN TO GAIN ENTRY
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

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
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
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
