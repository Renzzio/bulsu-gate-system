// frontend/src/components/UserManagement.js
import React, { useState, useEffect } from 'react';
import * as authService from '../services/authService';
import gateService from '../services/gateService';
import { QRCodeCanvas } from 'qrcode.react';
import {
  User, Mail, Phone, MapPin, Briefcase, BookOpen, Award, Clock,
  DoorOpen, FileText, ChevronDown, Plus, Search, Edit, X,
  GraduationCap, Shield, UserPlus, UserCog, UserCheck,
  UserX, UserSearch, Users, AlertCircle, Info, Check,
  AlertTriangle, Trash2, Eye, Filter, UserRound, Lock, Unlock, QrCode
} from 'lucide-react';
import './UserManagement.css';

function UserManagement({ role = 'admin' }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedCampus, setSelectedCampus] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCredentials, setShowCredentials] = useState(null);
  const [showQR, setShowQR] = useState(null);
  const [campuses, setCampuses] = useState([]);
  const [gates, setGates] = useState([]);

  // Department options for faculty and students
  const departmentOptions = [
    { label: 'College of Architecture and Fine Arts', value: 'CAFA' },
    { label: 'College of Arts and Letters', value: 'CAL' },
    { label: 'College of Business Education and Accountancy', value: 'CBEA' },
    { label: 'College of Criminal Justice Education', value: 'CCJE' },
    { label: 'College of Hospitality and Tourism Management', value: 'CHTM' },
    { label: 'College of Information and Communications Technology', value: 'CICT' },
    { label: 'College of Industrial Technology', value: 'CIT' },
    { label: 'College of Law', value: 'CLaw' },
    { label: 'College of Nursing', value: 'CON' },
    { label: 'College of Engineering', value: 'COE' },
    { label: 'College of Education', value: 'COED' },
    { label: 'College of Science', value: 'CS' },
    { label: 'College of Sports, Exercise and Recreation', value: 'CSER' },
    { label: 'College of Social Sciences and Philosophy', value: 'CSSP' }
  ];

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'student',
    campusId: '',
    // Common fields
    phoneNumber: '',
    address: '',
    // Faculty fields
    facultyDepartment: '',
    position: '',
    subjects: '',
    qualifications: '',
    // Student fields
    yearLevel: '',
    program: '',
    section: '',
    studentId: '',
    studentDepartment: '',

    // Guard fields (removed as requested)
    // shiftSchedule: '',
    // assignedGate: '',

    // Additional fields
    remarks: ''
  });

  // Fetch users on component mount or when role filter changes
  useEffect(() => {
    if (selectedRole) {
      fetchUsersByRole(selectedRole);
    } else {
      fetchAllUsers();
    }
  }, [selectedRole]);

  // Fetch campuses and gates on component mount
  useEffect(() => {
    fetchCampuses();
    fetchGates();
  }, []);

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await authService.getAllUsers();
      setUsers(response.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersByRole = async (userRole) => {
    try {
      setLoading(true);
      setError('');
      const response = await authService.getUsersByRole(userRole);
      setUsers(response.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetFormData = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      role: 'student',
      campusId: '',
      phoneNumber: '',
      address: '',
      facultyDepartment: '',
      position: '',
      subjects: '',
      qualifications: '',
      yearLevel: '',
      program: '',
      section: '',
      studentId: '',
      studentDepartment: '',
      remarks: ''
    });
  };

  const getFieldsForRole = (role) => {
    const commonFields = ['phoneNumber', 'address', 'remarks'];

    const roleFields = {
      faculty: ['department', 'position', 'subjects', 'qualifications', ...commonFields],
      staff: ['department', 'position', 'qualifications', ...commonFields],
      student: ['studentId', 'yearLevel', 'program', 'section', 'studentDepartment', ...commonFields],
      guard: [...commonFields],
      vip: ['remarks', ...commonFields],
      admin: ['remarks', ...commonFields]
    };

    return roleFields[role] || [];
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');

      // Validate form
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.role) {
        setError('All fields are required');
        return;
      }

      setLoading(true);

      if (editingUser) {
        // Update existing user
        await handleUpdateUser(editingUser.userId, formData);
        setShowForm(false);
    } else {
      // Create new user - map form fields to backend expected fields
      const userData = {
        ...formData,
        // Map facultyDepartment to department for faculty/staff
        ...(formData.role === 'faculty' || formData.role === 'staff') && {
          department: formData.facultyDepartment,
        }
      };
      // Remove the incorrectly named field
      delete userData.facultyDepartment;

        const response = await authService.createUser(userData);

        setSuccess(`User created! UserID: ${response.user.userID} | Username: ${response.user.username} | Password: ${response.user.password}`);
        setShowCredentials(response.user);
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          role: 'student'
        });
        setShowForm(false);

        // Refresh users list
        if (selectedRole) {
          fetchUsersByRole(selectedRole);
        } else {
          fetchAllUsers();
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (userId, updatedData) => {
    try {
      setError('');
      setLoading(true);

      // Map form fields to backend expected fields for faculty
      const mappedData = {
        ...updatedData,
        ...(updatedData.role === 'faculty' || updatedData.role === 'staff') && {
          department: updatedData.facultyDepartment,
        }
      };
      // Remove the incorrectly named field
      delete mappedData.facultyDepartment;

      await authService.updateUser(userId, mappedData);
      setSuccess('User updated successfully');
      setEditingUser(null);

      if (selectedRole) {
        fetchUsersByRole(selectedRole);
      } else {
        fetchAllUsers();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateUser = async (userId) => {
    if (!window.confirm('Are you sure you want to deactivate this user?')) {
      return;
    }

    try {
      setError('');
      setLoading(true);
      await authService.deactivateUser(userId);
      setSuccess('User deactivated successfully');
      
      if (selectedRole) {
        fetchUsersByRole(selectedRole);
      } else {
        fetchAllUsers();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateUser = async (userId) => {
    try {
      setError('');
      setLoading(true);
      await authService.activateUser(userId);
      setSuccess('User activated successfully');
      
      if (selectedRole) {
        fetchUsersByRole(selectedRole);
      } else {
        fetchAllUsers();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      campusId: user.campusId || '',
      phoneNumber: user.phoneNumber || '',
      address: user.address || '',
      // Map department back to facultyDepartment for editing
      facultyDepartment: user.department || '',
      position: user.position || '',
      subjects: user.subjects || '',
      qualifications: user.qualifications || '',
      // Student fields
      yearLevel: user.yearLevel || '',
      program: user.program || '',
      section: user.section || '',
      studentId: user.studentId || '',
      studentDepartment: user.studentDepartment || '',
      // Guard fields removed as requested
      // Additional fields
      remarks: user.remarks || ''
    });
    setShowForm(true);
  };

  const handleViewUser = (user) => {
    setEditingUser(user);
    setShowCredentials(user);
  };

  const handleGenerateQR = (user) => {
    setShowQR(user);
  };

  const filteredUsers = users.filter(user => {
    // Search filter
    const matchesSearch = searchTerm === '' ||
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase());

    // Role filter
    const matchesRole = selectedRole === '' || user.role === selectedRole;

    // Campus filter
    const matchesCampus = selectedCampus === '' || user.campusId === selectedCampus;

    return matchesSearch && matchesRole && matchesCampus;
  });

  const getRoleColor = (role) => {
    const colors = {
      admin: '#ff6b6b',
      faculty: '#4ecdc4',
      staff: '#45b7d1',
      guard: '#f7b731',
      vip: '#5f27cd'
    };
    return colors[role] || '#95a5a6';
  };

  const getStatusColor = (status) => {
    return status === 'active' ? '#27ae60' : '#e74c3c';
  };

  const fetchCampuses = async () => {
    try {
      const response = await gateService.getCampuses();
      if (response.success) {
        setCampuses(response.campuses || []);
      }
    } catch (err) {
      console.error('Campuses fetch error:', err);
    }
  };

  const fetchGates = async () => {
    try {
      const response = await gateService.getGates();
      if (response.success) {
        setGates(response.gates || []);
      }
    } catch (err) {
      console.error('Gates fetch error:', err);
    }
  };

  return (
    <div className="user-management">
      <div className="um-header">
        <h2><Users size={20} /> User Management System</h2>
        <p>Manage all users in the system - Create, Edit, Deactivate, and Delete</p>
      </div>

      {/* User Information Display Modal */}
      {showCredentials && (
        <div className="modal-overlay" onClick={() => setShowCredentials(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <User size={28} color="var(--bulsu-red)" />
              <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: 'var(--text-dark)' }}>User Information</h3>
            </div>
            <p className="credential-info">
              Complete user information and details.
            </p>
            <div className="credentials-box">
              {/* Personal Information Section */}
              <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <User size={18} color="var(--bulsu-red)" />
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)', letterSpacing: '0.3px' }}>Personal Information</h4>
                </div>
                <div className="credential-item">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
                    <User size={14} color="var(--text-muted)" />
                    First Name
                  </label>
                  <div className="credential-value" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", fontSize: '14px' }}>{showCredentials.firstName}</div>
                </div>
                <div className="credential-item">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
                    <User size={14} color="var(--text-muted)" />
                    Last Name
                  </label>
                  <div className="credential-value" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", fontSize: '14px' }}>{showCredentials.lastName}</div>
                </div>
                <div className="credential-item">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
                    <Mail size={14} color="var(--text-muted)" />
                    Email
                  </label>
                  <div className="credential-value" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", fontSize: '14px' }}>{showCredentials.email}</div>
                </div>
                {showCredentials.phoneNumber && (
                  <div className="credential-item">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
                      <Phone size={14} color="var(--text-muted)" />
                      Phone Number
                    </label>
                    <div className="credential-value" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", fontSize: '14px' }}>{showCredentials.phoneNumber}</div>
                  </div>
                )}
                {showCredentials.address && (
                  <div className="credential-item">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
                      <MapPin size={14} color="var(--text-muted)" />
                      Address
                    </label>
                    <div className="credential-value" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", fontSize: '14px' }}>{showCredentials.address}</div>
                  </div>
                )}
              </div>

              {/* Role & Status Section */}
              <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Briefcase size={18} color="var(--bulsu-red)" />
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)', letterSpacing: '0.3px' }}>Role & Status</h4>
                </div>
                <div className="credential-item">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
                    <Briefcase size={14} color="var(--text-muted)" />
                    Role
                  </label>
                  <div className="credential-value" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", fontSize: '14px' }}>{showCredentials.role.toUpperCase()}</div>
                </div>
                {showCredentials.status && (
                  <div className="credential-item">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
                      <ChevronDown size={14} color="var(--text-muted)" />
                      Status
                    </label>
                    <div className="credential-value" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", fontSize: '14px' }}>{showCredentials.status}</div>
                  </div>
                )}
              </div>

              {/* Role-Specific Information */}
              {showCredentials.role === 'student' && (
                <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <BookOpen size={18} color="var(--bulsu-red)" />
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)', letterSpacing: '0.3px' }}>Student Information</h4>
                  </div>
                  {showCredentials.studentId && (
                    <div className="credential-item">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
                        <FileText size={14} color="var(--text-muted)" />
                        Student ID
                      </label>
                      <div className="credential-value" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", fontSize: '14px' }}>{showCredentials.studentId}</div>
                    </div>
                  )}
                  {showCredentials.yearLevel && (
                    <div className="credential-item">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
                        <Award size={14} color="var(--text-muted)" />
                        Year Level
                      </label>
                      <div className="credential-value" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", fontSize: '14px' }}>{showCredentials.yearLevel}</div>
                    </div>
                  )}
                  {showCredentials.program && (
                    <div className="credential-item">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
                        <BookOpen size={14} color="var(--text-muted)" />
                        Program
                      </label>
                      <div className="credential-value" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", fontSize: '14px' }}>{showCredentials.program}</div>
                    </div>
                  )}
                  {showCredentials.section && (
                    <div className="credential-item">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
                        <FileText size={14} color="var(--text-muted)" />
                        Section
                      </label>
                      <div className="credential-value" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", fontSize: '14px' }}>{showCredentials.section}</div>
                    </div>
                  )}
                  {showCredentials.studentDepartment && (
                    <div className="credential-item">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
                        <BookOpen size={14} color="var(--text-muted)" />
                        Department
                      </label>
                      <div className="credential-value" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", fontSize: '14px' }}>{showCredentials.studentDepartment}</div>
                    </div>
                  )}
                </div>
              )}

              {showCredentials.role === 'faculty' && (
                <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Briefcase size={18} color="var(--bulsu-red)" />
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)', letterSpacing: '0.3px' }}>Faculty Information</h4>
                  </div>
                  {showCredentials.department && (
                    <div className="credential-item">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
                        <Briefcase size={14} color="var(--text-muted)" />
                        Department
                      </label>
                      <div className="credential-value" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", fontSize: '14px' }}>{showCredentials.department}</div>
                    </div>
                  )}
                  {showCredentials.position && (
                    <div className="credential-item">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
                        <Award size={14} color="var(--text-muted)" />
                        Position
                      </label>
                      <div className="credential-value" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", fontSize: '14px' }}>{showCredentials.position}</div>
                    </div>
                  )}
                  {showCredentials.subjects && (
                    <div className="credential-item">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
                        <BookOpen size={14} color="var(--text-muted)" />
                        Subjects Handled
                      </label>
                      <div className="credential-value" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", fontSize: '14px' }}>{showCredentials.subjects}</div>
                    </div>
                  )}
                  {showCredentials.qualifications && (
                    <div className="credential-item">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
                        <Award size={14} color="var(--text-muted)" />
                        Qualifications
                      </label>
                      <div className="credential-value" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", fontSize: '14px' }}>{showCredentials.qualifications}</div>
                    </div>
                  )}
                </div>
              )}

              {showCredentials.role === 'guard' && (
                <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Shield size={18} color="var(--bulsu-red)" />
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)', letterSpacing: '0.3px' }}>Security Personnel</h4>
                  </div>
                  <div className="credential-item">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
                      <Shield size={14} color="var(--text-muted)" />
                      Role Type
                    </label>
                    <div className="credential-value" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", fontSize: '14px' }}>Campus Security Guard</div>
                  </div>
                  {showCredentials.campusId && (
                    <div className="credential-item">
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
                        <MapPin size={14} color="var(--text-muted)" />
                        Campus Assignment
                      </label>
                      <div className="credential-value" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", fontSize: '14px' }}>
                        {campuses.find(campus => campus.campusId === showCredentials.campusId)?.name || showCredentials.campusId}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Additional Information */}
              {showCredentials.remarks && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <FileText size={18} color="var(--bulsu-red)" />
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: 'var(--text-dark)', letterSpacing: '0.3px' }}>Remarks</h4>
                  </div>
                  <div className="credential-item">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" }}>
                      <FileText size={14} color="var(--text-muted)" />
                      Notes
                    </label>
                    <div className="credential-value" style={{ fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", fontSize: '14px' }}>{showCredentials.remarks}</div>
                  </div>
                </div>
              )}
            </div>
            <button className="btn-close" onClick={() => setShowCredentials(null)}>Close</button>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQR && (
        <div className="modal-overlay" onClick={() => setShowQR(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <QrCode size={28} color="var(--bulsu-red)" />
              <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: 'var(--text-dark)' }}>QR Code</h3>
            </div>
            <p className="credential-info">
              QR code containing the user's unique ID.
            </p>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <QRCodeCanvas
                value={showQR.userId}
                size={256}
                level="H"
                includeMargin={true}
                style={{ marginBottom: '20px' }}
              />
              <div style={{ marginBottom: '16px', fontFamily: 'monospace', fontSize: '14px', color: 'var(--text-muted)' }}>
                User ID: {showQR.userId}
              </div>
              <div style={{ marginBottom: '16px' }}>
                <strong>{showQR.firstName} {showQR.lastName}</strong>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => {
                  const canvas = document.querySelector('canvas');
                  if (canvas) {
                    const link = document.createElement('a');
                    link.download = `qr-${showQR.userId}.png`;
                    link.href = canvas.toDataURL();
                    link.click();
                  }
                }}
                style={{ marginRight: '10px' }}
              >
                Download QR Code
              </button>
            </div>
            <button className="btn-close" onClick={() => setShowQR(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Control Panel */}
      <div className="um-controls">
        <div className="control-group">
          <button 
            className="btn btn-primary"
            onClick={() => {
              setEditingUser(null);
              resetFormData();
              setShowForm(true);
            }}
          >
            <Plus size={16} style={{ marginRight: '4px' }} /> Add New User
          </button>
        </div>

        <div className="control-group">
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
            <input
              type="text"
              placeholder="Search by name, email, or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              style={{ paddingLeft: '40px' }}
            />
          </div>
        </div>

        <div className="control-group">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="filter-select"
          >
            <option value="">All Roles</option>
            <option value="student">Students</option>
            <option value="admin">Admins</option>
            <option value="faculty">Faculty/Staff</option>
            <option value="guard">Guards</option>
            <option value="vip">VIP</option>
          </select>
        </div>

        <div className="control-group">
          <select
            value={selectedCampus}
            onChange={(e) => setSelectedCampus(e.target.value)}
            className="filter-select"
          >
            <option value="">All Campuses</option>
            {campuses.map(campus => (
              <option key={campus.campusId} value={campus.campusId}>
                {campus.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Create User Form */}
      {showForm && (
        <div className="modal-overlay" onClick={() => {
          setShowForm(false);
          setEditingUser(null);
          resetFormData();
        }}>
          <div className="modal-content modal-form" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {editingUser ? (
                  <>
                    <Edit size={16} /> Edit User
                  </>
                ) : (
                  'Create New User'
                )}
              </h3>
              <button className="modal-close-btn" onClick={() => {
                setShowForm(false);
                setEditingUser(null);
                resetFormData();
              }}>✕</button>
            </div>

            {/* Alert Messages inside modal */}
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleCreateUser}>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter first name"
                  />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter email address"
                  />
                </div>
                <div className="form-group">
                  <label>Role *</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty/Staff</option>
                    <option value="guard">Guard</option>
                    <option value="vip">VIP</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Campus *</label>
                  <select
                    name="campusId"
                    value={formData.campusId}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Campus</option>
                    {campuses.map(campus => (
                      <option key={campus.campusId} value={campus.campusId}>
                        {campus.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  {/* Placeholder for future use or to balance the row */}
                </div>
              </div>

              {/* Common Fields */}
              <div className="form-row">
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter address"
                  />
                </div>
              </div>

              {/* Faculty/Staff Specific Fields */}
              {(formData.role === 'faculty' || formData.role === 'staff') && (
                <>
                  <div className="form-section-title"><GraduationCap size={16} /> Faculty Information</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Department *</label>
                      <select
                        name="facultyDepartment"
                        value={formData.facultyDepartment}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Department</option>
                        {departmentOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Position *</label>
                      <input
                        type="text"
                        name="position"
                        value={formData.position}
                        onChange={handleInputChange}
                        placeholder="e.g., Associate Professor"
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Subjects Handled</label>
                      <input
                        type="text"
                        name="subjects"
                        value={formData.subjects}
                        onChange={handleInputChange}
                        placeholder="e.g., Data Structures, Web Development"
                      />
                    </div>
                    <div className="form-group">
                      <label>Qualifications</label>
                      <input
                        type="text"
                        name="qualifications"
                        value={formData.qualifications}
                        onChange={handleInputChange}
                        placeholder="e.g., M.S. Computer Science"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Student Specific Fields */}
              {formData.role === 'student' && (
                <>
                  <div className="form-section-title"><GraduationCap size={16} /> Student Information</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Student ID *</label>
                      <input
                        type="text"
                        name="studentId"
                        value={formData.studentId}
                        onChange={handleInputChange}
                        placeholder="e.g., 2024-001"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Year Level *</label>
                      <select
                        name="yearLevel"
                        value={formData.yearLevel}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Year Level</option>
                        <option value="1st Year">1st Year</option>
                        <option value="2nd Year">2nd Year</option>
                        <option value="3rd Year">3rd Year</option>
                        <option value="4th Year">4th Year</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Program *</label>
                      <input
                        type="text"
                        name="program"
                        value={formData.program}
                        onChange={handleInputChange}
                        placeholder="e.g., BS Computer Science"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Section *</label>
                      <input
                        type="text"
                        name="section"
                        value={formData.section}
                        onChange={handleInputChange}
                        placeholder="e.g., A, B, C"
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Department *</label>
                      <select
                        name="studentDepartment"
                        value={formData.studentDepartment}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Department</option>
                        {departmentOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      {/* Placeholder for future use or to balance the row */}
                    </div>
                  </div>
                </>
              )}





              {/* Remarks Field (for all roles) */}
              <div className="form-group">
                <label>Remarks/Notes</label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  placeholder="Additional notes or remarks"
                  rows="3"
                />
              </div>

              <p className="form-note" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {editingUser ? (
                  <>
                    <FileText size={16} /> Update user information
                  </>
                ) : (
                  <>
                    <Info size={16} /> Login credentials will be auto-generated and displayed after creation.
                  </>
                )}
              </p>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowForm(false);
                    setEditingUser(null);
                    resetFormData();
                  }}
                >
                  <X size={16} /> Cancel
                </button>
                <button type="submit" className="btn btn-success" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {loading ? (
                    editingUser ? 'Updating...' : 'Creating...'
                  ) : (
                    editingUser ? (
                      <>
                        <Check size={16} /> Update User
                      </>
                    ) : (
                      <>
                        <Plus size={16} /> Create User
                      </>
                    )
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="um-table-container">
        {loading && !showForm ? (
          <div className="loading">Loading users...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="no-users">No users found</div>
        ) : (
          <table className="um-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Department</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.userId}>
                  <td>
                    <strong>{user.firstName} {user.lastName}</strong>
                  </td>
                  <td>{user.username}</td>
                  <td>{user.email}</td>
                  <td>
                    {user.role === 'faculty' || user.role === 'staff' ?
                      (user.department || 'N/A') :
                      user.role === 'student' ?
                      (user.studentDepartment || 'N/A') :
                      '-'
                    }
                  </td>
                  <td>
                    <span
                      className="role-badge"
                      style={{ backgroundColor: getRoleColor(user.role) }}
                    >
                      {user.role.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${user.status}`}
                      style={{
                        backgroundColor: getStatusColor(user.status)
                      }}
                    >
                      {user.status.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons" style={{ display: 'flex', gap: '4px', justifyContent: 'flex-start' }}>
                      <button
                        className="btn-action btn-view"
                        onClick={() => handleViewUser(user)}
                        title="View user details"
                        style={{ padding: '6px 8px', fontSize: '12px' }}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        className="btn-action btn-edit"
                        onClick={() => handleEditUser(user)}
                        title="Edit user"
                        style={{ padding: '6px 8px', fontSize: '12px' }}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        className="btn-action btn-qr"
                        onClick={() => handleGenerateQR(user)}
                        title="Generate QR code"
                        style={{ padding: '6px 8px', fontSize: '12px' }}
                      >
                        <QrCode size={14} />
                      </button>
                      {user.status === 'active' ? (
                        <button
                          className="btn-action btn-deactivate"
                          onClick={() => handleDeactivateUser(user.userId)}
                          title="Deactivate user"
                          style={{ padding: '6px 8px', fontSize: '12px' }}
                        >
                          <Lock size={14} />
                        </button>
                      ) : (
                        <button
                          className="btn-action btn-activate"
                          onClick={() => handleActivateUser(user.userId)}
                          title="Activate user"
                          style={{ padding: '6px 8px', fontSize: '12px' }}
                        >
                          <Unlock size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="um-footer">
        <p>Total Users: <strong>{filteredUsers.length}</strong></p>
      </div>
    </div>
  );
}

export default UserManagement;
