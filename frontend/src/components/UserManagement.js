// frontend/src/components/UserManagement.js
import React, { useState, useEffect, useRef } from 'react';
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
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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

        setShowCreateModal(true);
        setShowForm(false);
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          role: 'student'
        });

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
      setShowUpdateModal(true);
      setShowForm(false);
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

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      setError('');
      setLoading(true);
      await authService.deleteUser(userId);
      setShowDeleteModal(true);

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
      guard: '#f7b731'
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

      {/* Update Success Modal */}
      {showUpdateModal && (
        <div className="modal-overlay" onClick={() => setShowUpdateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', color: '#ffffffff', marginBottom: '-5px' }}>
              </h3>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{
                backgroundColor: '#e8f5e8',
                border: '2px solid #27ae60',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '20px',
                display: 'inline-block'
              }}>
                <Check size={48} color="#27ae60" />
              </div>

              <p style={{
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--text-dark)',
                marginBottom: '8px'
              }}>
                User updated successfully!
              </p>

              <p style={{
                fontSize: '14px',
                color: 'var(--text-muted)',
                marginBottom: '24px'
              }}>
                The user information has been updated in the system.
              </p>

              <button
                className="btn btn-primary"
                onClick={() => setShowUpdateModal(false)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
              >
                <Check size={16} />
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Success Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', color: '#ffffffff', marginBottom: '-5px' }}>
              </h3>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{
                backgroundColor: '#e8f5e8',
                border: '2px solid #27ae60',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '20px',
                display: 'inline-block'
              }}>
                <UserPlus size={48} color="#27ae60" />
              </div>

              <p style={{
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--text-dark)',
                marginBottom: '8px'
              }}>
                User created successfully!
              </p>

              <p style={{
                fontSize: '14px',
                color: 'var(--text-muted)',
                marginBottom: '24px'
              }}>
                The new user has been added to the system.
              </p>

              <button
                className="btn btn-primary"
                onClick={() => setShowCreateModal(false)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
              >
                <Check size={16} />
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Success Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', color: '#ffffffff', marginBottom: '-5px' }}>
              </h3>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{
                backgroundColor: '#ffeaea',
                border: '2px solid #e74c3c',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '20px',
                display: 'inline-block'
              }}>
                <Trash2 size={48} color="#e74c3c" />
              </div>

              <p style={{
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--text-dark)',
                marginBottom: '8px'
              }}>
                User deleted successfully!
              </p>

              <p style={{
                fontSize: '14px',
                color: 'var(--text-muted)',
                marginBottom: '24px'
              }}>
                The user account has been permanently removed from the system.
              </p>

              <button
                className="btn btn-primary"
                onClick={() => setShowDeleteModal(false)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 auto' }}
              >
                <Check size={16} />
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Information Display Modal */}
      {showCredentials && (
        <div className="modal-overlay" onClick={() => setShowCredentials(null)}>
          <div className="modal-content modal-form" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflow: 'hidden' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={16} />
                View User Details
              </h3>
              <button className="modal-close-btn" onClick={() => setShowCredentials(null)}>✕</button>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', maxHeight: 'calc(90vh - 80px)' }}>
              {/* Personal Information */}
              <div className="form-section-title"><User size={16} /> Personal Information</div>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0', color: '#333' }}>
                    {showCredentials.firstName}
                  </div>
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0', color: '#333' }}>
                    {showCredentials.lastName}
                  </div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0', color: '#333', wordBreak: 'break-all' }}>
                    {showCredentials.email}
                  </div>
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0', color: '#333' }}>
                    {showCredentials.username}
                  </div>
                </div>
              </div>
              <div className="form-row">
                {showCredentials.phoneNumber && (
                  <div className="form-group">
                    <label>Phone Number</label>
                    <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0', color: '#333' }}>
                      {showCredentials.phoneNumber}
                    </div>
                  </div>
                )}
                {showCredentials.address && (
                  <div className="form-group">
                    <label>Address</label>
                    <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0', color: '#333' }}>
                      {showCredentials.address}
                    </div>
                  </div>
                )}
              </div>

              {/* Role & Status */}
              <div className="form-section-title"><Briefcase size={16} /> Role & Status</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Role</label>
                  <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0', color: '#333' }}>
                    {showCredentials.role.toUpperCase()}
                  </div>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0', color: '#333' }}>
                    {showCredentials.status ? showCredentials.status : 'N/A'}
                  </div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Campus</label>
                  <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0', color: '#333' }}>
                    {showCredentials.campusId ? (campuses.find(campus => campus.campusId === showCredentials.campusId)?.name || showCredentials.campusId) : 'N/A'}
                  </div>
                </div>
                <div className="form-group">
                  {/* Placeholder for spacing */}
                </div>
              </div>

              {/* Role-Specific Information */}
              {showCredentials.role === 'student' && (
                <>
                  <div className="form-section-title"><GraduationCap size={16} /> Student Information</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Student ID</label>
                      <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0', color: '#333' }}>
                        {showCredentials.studentId || 'N/A'}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Year Level</label>
                      <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0', color: '#333' }}>
                        {showCredentials.yearLevel || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Program</label>
                      <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0', color: '#333' }}>
                        {showCredentials.program || 'N/A'}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Section</label>
                      <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0', color: '#333' }}>
                        {showCredentials.section || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Department</label>
                      <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0', color: '#333' }}>
                        {showCredentials.studentDepartment || 'N/A'}
                      </div>
                    </div>
                    <div className="form-group">
                      {/* Placeholder for spacing */}
                    </div>
                  </div>
                </>
              )}

              {(showCredentials.role === 'faculty' || showCredentials.role === 'staff') && (
                <>
                  <div className="form-section-title"><Briefcase size={16} /> Faculty Information</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Department</label>
                      <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0', color: '#333' }}>
                        {showCredentials.department || 'N/A'}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Position</label>
                      <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0', color: '#333' }}>
                        {showCredentials.position || 'N/A'}
                      </div>
                    </div>
                  </div>
                  {showCredentials.subjects && (
                    <div className="form-row">
                      <div className="form-group">
                        <label>Subjects Handled</label>
                        <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0', color: '#333' }}>
                          {showCredentials.subjects}
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Qualifications</label>
                        <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0', color: '#333' }}>
                          {showCredentials.qualifications || 'N/A'}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {showCredentials.role === 'guard' && (
                <>
                  <div className="form-section-title"><Shield size={16} /> Security Personnel</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Role Type</label>
                      <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0', color: '#333' }}>
                        Campus Security Guard
                      </div>
                    </div>
                    <div className="form-group">
                      {/* Placeholder for spacing */}
                    </div>
                  </div>
                </>
              )}

              {/* Remarks */}
              {showCredentials.remarks && (
                <>
                  <div className="form-section-title"><FileText size={16} /> Additional Information</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Remarks/Notes</label>
                      <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e0e0e0', color: '#333' }}>
                        {showCredentials.remarks}
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="form-actions">
                
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQR && (
        <div className="modal-overlay" onClick={() => setShowQR(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QrCode size={20} />
                QR Code Generator
              </h3>
              <button className="modal-close-btn" onClick={() => setShowQR(null)}>✕</button>
            </div>

            <div style={{ padding: '24px', textAlign: 'center' }}>
              <p style={{ marginBottom: '24px', color: 'var(--text-muted)', fontSize: '14px' }}>
                QR code containing the user's unique ID for gate access.
              </p>

              <div style={{
                backgroundColor: '#f8f9fa',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #e0e0e0'
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px'
                }}>
                  <QRCodeCanvas
                    value={showQR.userId}
                    size={256}
                    level="H"
                    includeMargin={true}
                  />


                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  User ID: <strong>{showQR.userId}</strong>
                </div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-dark)' }}>
                  {showQR.firstName} {showQR.lastName}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {showQR.role.toUpperCase()} • {showQR.campusId ? 'Campus Assigned' : 'No Campus Assigned'}
                </div>
              </div>

              <div className="form-actions" style={{ justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    // Use timeout to ensure QR code is rendered
                    setTimeout(() => {
                      const canvas = document.querySelector('canvas');
                      if (canvas) {
                        const link = document.createElement('a');
                        link.download = `qr-${showQR.userId}.png`;
                        link.href = canvas.toDataURL('image/png');
                        link.click();
                      }
                    }, 100);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <QrCode size={16} />
                  Save QR Code
                </button>

         
              </div>
            </div>
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
                    disabled={!!editingUser}
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty/Staff</option>
                    <option value="guard">Guard</option>
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
                    type="number"
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

              <div className="form-actions">

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
                <th>Campus</th>
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
                    {user.campusId ? (campuses.find(campus => campus.campusId === user.campusId)?.name || user.campusId) : 'N/A'}
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
                      <button
                        className="btn-action btn-delete"
                        title="Delete User"
                        onClick={() => handleDeleteUser(user.userId)}
                        style={{ padding: '6px 8px', fontSize: '12px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                      
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
