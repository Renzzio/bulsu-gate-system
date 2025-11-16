// frontend/src/components/FacultyDashboard.js
import React, { useState, useEffect } from 'react';
import { getStudentsInFacultyDepartment, updateOwnProfile, changePassword } from '../services/authService';
import scheduleService from '../services/scheduleService';
import { Users, Calendar, LogOut, Eye, Clock, School, Search, Filter, User, Check, X, Edit, EyeOff } from 'lucide-react';
import bulsuLogo from '../bulsuLogo.png';
import './FacultyDashboard.css';

const facultySidebarItems = [
  { id: 'students', label: 'My Students', icon: Users },
  { id: 'profile', label: 'My Profile', icon: User }
];

function FacultyDashboard({ user, onLogout }) {
  const [activeSection, setActiveSection] = useState('students');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSchedule, setStudentSchedule] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [departmentSchedules, setDepartmentSchedules] = useState([]);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [loadingDepartmentSchedules, setLoadingDepartmentSchedules] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterYearLevel, setFilterYearLevel] = useState('');
  const [filterSection, setFilterSection] = useState('');

  // Profile management states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  });
  const [passwordFormData, setPasswordFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  // Password visibility toggles
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  useEffect(() => {
    if (activeSection === 'students') {
      loadStudentsInDepartment();
    }
  }, [activeSection]);

  // Initialize profile form data when user object becomes available
  useEffect(() => {
    if (user && !isEditingProfile) {
      setProfileFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || ''
      });
    }
  }, [user, isEditingProfile]);

  const loadStudentsInDepartment = async () => {
    try {
      setLoading(true);
      const response = await getStudentsInFacultyDepartment();
      if (response.success) {
        // The backend already filters students by department and campus
        setStudents(response.users);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewStudentSchedule = async (student) => {
    setSelectedStudent(student);
    setShowScheduleModal(true);
    setLoadingSchedule(true);

    try {
      const response = await scheduleService.getStudentSchedules(student.userId);
      if (response.success) {
        setStudentSchedule(response.schedules || []);
      } else {
        setStudentSchedule([]);
      }
    } catch (error) {
      console.error('Error loading student schedule:', error);
      setStudentSchedule([]);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const closeScheduleModal = () => {
    setSelectedStudent(null);
    setStudentSchedule([]);
    setShowScheduleModal(false);
  };

  const viewDepartmentSchedules = async () => {
    setShowDepartmentModal(true);
    setLoadingDepartmentSchedules(true);

    try {
      const allSchedules = [];
      // Fetch schedules for all students in the department
      for (const student of students) {
        try {
          const response = await scheduleService.getStudentSchedules(student.userId);
          if (response.success && response.schedules.length > 0) {
            const studentSchedules = response.schedules.map(schedule => ({
              ...schedule,
              studentName: `${student.firstName} ${student.lastName}`,
              studentId: student.userId,
              studentProgram: student.program || 'N/A',
              studentYear: student.yearLevel || 'N/A',
              studentSection: student.section || 'N/A'
            }));
            allSchedules.push(...studentSchedules);
          }
        } catch (error) {
          console.error(`Error loading schedule for student ${student.userId}:`, error);
          // Continue with other students even if one fails
        }
      }

      // Sort schedules by day and time
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      allSchedules.sort((a, b) => {
        const dayDiff = dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
        if (dayDiff !== 0) return dayDiff;
        return a.startTime.localeCompare(b.startTime);
      });

      setDepartmentSchedules(allSchedules);
    } catch (error) {
      console.error('Error loading department schedules:', error);
      setDepartmentSchedules([]);
    } finally {
      setLoadingDepartmentSchedules(false);
    }
  };

  const closeDepartmentModal = () => {
    setDepartmentSchedules([]);
    setShowDepartmentModal(false);
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Filter and search functions
  const getUniquePrograms = () => {
    const programs = students.map(student => student.program).filter(Boolean);
    return [...new Set(programs)].sort();
  };

  const getUniqueYearLevels = () => {
    const years = students.map(student => student.yearLevel).filter(Boolean);
    return [...new Set(years)].sort();
  };

  const getUniqueSections = () => {
    const sections = students.map(student => student.section).filter(Boolean);
    return [...new Set(sections)].sort();
  };

  const filteredStudents = students.filter(student => {
    // Search filter
    const matchesSearch = searchTerm === '' ||
      student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.userId.toLowerCase().includes(searchTerm.toLowerCase());

    // Program filter
    const matchesProgram = filterProgram === '' || student.program === filterProgram;

    // Year level filter
    const matchesYear = filterYearLevel === '' || student.yearLevel === filterYearLevel;

    // Section filter
    const matchesSection = filterSection === '' || student.section === filterSection;

    return matchesSearch && matchesProgram && matchesYear && matchesSection;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setFilterProgram('');
    setFilterYearLevel('');
    setFilterSection('');
  };

  // Profile management functions
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage('');

    try {
      const response = await updateOwnProfile(user.userId, profileFormData);
      if (response.success) {
        setProfileMessage('Profile updated successfully!');
        setIsEditingProfile(false);
        // Optionally update the parent user state if needed
        window.location.reload(); // Simple way to refresh and get updated user data
      } else {
        setProfileMessage(response.message || 'Failed to update profile');
      }
    } catch (error) {
      setProfileMessage(error.message || 'Error updating profile. Please try again.');
      console.error('Profile update error:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage('');

    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      setProfileMessage('New password and confirmation do not match');
      setProfileLoading(false);
      return;
    }

    try {
      const response = await changePassword(user.userId, {
        currentPassword: passwordFormData.currentPassword,
        newPassword: passwordFormData.newPassword,
        confirmPassword: passwordFormData.confirmPassword
      });
      if (response.success) {
        setProfileMessage('Password changed successfully!');
        setIsEditingPassword(false);
        setPasswordFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setProfileMessage(response.message || 'Failed to change password');
      }
    } catch (error) {
      setProfileMessage(error.message || 'Error changing password. Please try again.');
      console.error('Password change error:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  // Password visibility toggle functions
  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const cancelEdit = () => {
    setIsEditingProfile(false);
    setIsEditingPassword(false);
    setProfileFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || ''
    });
    setPasswordFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowPasswords({ current: false, new: false, confirm: false });
    setProfileMessage('');
  };

  const renderProfileSection = () => {
    return (
      <div className="profile-section">
        <div className="welcome-card">
          <h2><User size={18} /> My Profile</h2>
          <p>
            Manage your personal information and account settings.
          </p>
        </div>

        {/* Profile Information Display */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '2rem', marginBottom: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 style={{ margin: 0 }}>Profile Information</h3>
            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                style={{
                  backgroundColor: '#667eea',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Edit size={16} />
                Edit Profile
              </button>
            )}
          </div>

          {profileMessage && (
            <div style={{
              padding: '12px',
              marginBottom: '1rem',
              borderRadius: '6px',
              backgroundColor: profileMessage.includes('success') ? '#d4edda' : '#f8d7da',
              color: profileMessage.includes('success') ? '#155724' : '#721c24',
              border: `1px solid ${profileMessage.includes('success') ? '#c3e6cb' : '#f1b0b7'}`
            }}>
              {profileMessage}
            </div>
          )}

          <form onSubmit={handleProfileUpdate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>First Name</label>
                {isEditingProfile ? (
                  <input
                    type="text"
                    value={profileFormData.firstName}
                    onChange={(e) => setProfileFormData({...profileFormData, firstName: e.target.value})}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                ) : (
                  <div style={{ padding: '8px 12px', border: '1px solid #eee', borderRadius: '4px', backgroundColor: '#f8f9fa' }}>
                    {user.firstName}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Last Name</label>
                {isEditingProfile ? (
                  <input
                    type="text"
                    value={profileFormData.lastName}
                    onChange={(e) => setProfileFormData({...profileFormData, lastName: e.target.value})}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                ) : (
                  <div style={{ padding: '8px 12px', border: '1px solid #eee', borderRadius: '4px', backgroundColor: '#f8f9fa' }}>
                    {user.lastName}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Email</label>
                {isEditingProfile ? (
                  <input
                    type="email"
                    value={profileFormData.email}
                    onChange={(e) => setProfileFormData({...profileFormData, email: e.target.value})}
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                ) : (
                  <div style={{ padding: '8px 12px', border: '1px solid #eee', borderRadius: '4px', backgroundColor: '#f8f9fa' }}>
                    {user.email}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Department</label>
                <div style={{ padding: '8px 12px', border: '1px solid #eee', borderRadius: '4px', backgroundColor: '#f8f9fa' }}>
                  {user.department}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Campus</label>
                <div style={{ padding: '8px 12px', border: '1px solid #eee', borderRadius: '4px', backgroundColor: '#f8f9fa' }}>
                  {user.campusId}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Role</label>
                <div style={{ padding: '8px 12px', border: '1px solid #eee', borderRadius: '4px', backgroundColor: '#f8f9fa' }}>
                  {user.role?.toUpperCase()}
                </div>
              </div>
            </div>

            {isEditingProfile && (
              <div style={{ marginTop: '2rem', display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={profileLoading}
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: profileLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Check size={16} />
                  {profileLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={profileLoading}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: profileLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Password Change Section */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 style={{ margin: 0 }}>Change Password</h3>
            {!isEditingPassword && (
              <button
                onClick={() => setIsEditingPassword(true)}
                style={{
                  backgroundColor: '#fd7e14',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Edit size={16} />
                Change Password
              </button>
            )}
          </div>

          <form onSubmit={handlePasswordChange}>
            {isEditingPassword && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Current Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordFormData.currentPassword}
                      onChange={(e) => setPasswordFormData({...passwordFormData, currentPassword: e.target.value})}
                      required
                      style={{
                        width: '100%',
                        padding: '8px 40px 8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('current')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        color: '#666',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordFormData.newPassword}
                      onChange={(e) => setPasswordFormData({...passwordFormData, newPassword: e.target.value})}
                      required
                      minLength={6}
                      style={{
                        width: '100%',
                        padding: '8px 40px 8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('new')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        color: '#666',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Confirm New Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordFormData.confirmPassword}
                      onChange={(e) => setPasswordFormData({...passwordFormData, confirmPassword: e.target.value})}
                      required
                      minLength={6}
                      style={{
                        width: '100%',
                        padding: '8px 40px 8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirm')}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        color: '#666',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isEditingPassword && (
              <div style={{ marginTop: '2rem', display: 'flex', gap: '12px' }}>
                <button
                  type="submit"
                  disabled={profileLoading}
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: profileLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Check size={16} />
                  {profileLoading ? 'Changing...' : 'Change Password'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={profileLoading}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: profileLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <X size={16} />
                  Cancel
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  };

  const renderStudentsSection = () => {
    return (
      <div className="students-section">
        <div className="welcome-card">
          <h2><Users size={18} /> My Students</h2>
          <p>
            View and manage students in your department. Use filters and search to find specific students easily.
          </p>
        </div>

        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>Total Students</h3>
            <div className="stat-value">{students.length}</div>
          </div>
          <div className="stat-card">
            <h3>Filtered Results</h3>
            <div className="stat-value">{filteredStudents.length}</div>
          </div>
          <div className="stat-card">
            <h3>My Department</h3>
            <div className="stat-value" style={{ fontSize: '16px', fontWeight: '500' }}>{user.department || 'All Campus'}</div>
          </div>
          <div className="stat-card">
            <h3>Campus</h3>
            <div className="stat-value" style={{ fontSize: '16px', fontWeight: '500' }}>{user.campusId}</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="students-controls" style={{ marginBottom: '1rem', borderBottom: '2px solid #e1e8ed', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center' }}>
            {/* Search */}
            <div style={{ flex: '1', minWidth: '250px', position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
              <input
                type="text"
                placeholder="Search by name, ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 40px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Program Filter */}
            <div style={{ minWidth: '150px' }}>
              <select
                value={filterProgram}
                onChange={(e) => setFilterProgram(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">All Programs</option>
                {getUniquePrograms().map(program => (
                  <option key={program} value={program}>{program}</option>
                ))}
              </select>
            </div>

            {/* Year Level Filter */}
            <div style={{ minWidth: '120px' }}>
              <select
                value={filterYearLevel}
                onChange={(e) => setFilterYearLevel(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">All Years</option>
                {getUniqueYearLevels().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Section Filter */}
            <div style={{ minWidth: '100px' }}>
              <select
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="">All Sections</option>
                {getUniqueSections().map(section => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
            </div>

            {/* Clear Filters Button */}
            <button
              onClick={clearFilters}
              style={{
                padding: '10px 15px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                color: '#6c757d'
              }}
            >
              Clear
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading">Loading students...</div>
          </div>
        ) : students.length === 0 ? (
          <div className="no-students">
            No students found in your department.
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="no-students">
            No students match your search and filter criteria.
          </div>
        ) : (
          <table className="students-table" style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            tableLayout: 'fixed'
          }}>
            <thead style={{ backgroundColor: '#f8f9fa' }}>
              <tr>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6', width: '15%' }}>Student ID</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6', width: '20%' }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6', width: '20%' }}>Email</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6', width: '15%' }}>Program</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6', width: '10%' }}>Year</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6', width: '10%' }}>Section</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6', width: '10%' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(student => (
                <tr key={student.userId} style={{ borderBottom: '1px solid #e1e8ed', ':hover': { backgroundColor: '#f8f9fa' } }}>
                  <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '13px', wordWrap: 'break-word' }}>
                    <div style={{ fontWeight: '500' }}>{student.studentId || student.userId}</div>
                    <div style={{ fontSize: '11px', color: '#6c757d' }}>{student.userId}</div>
                  </td>
                  <td style={{ padding: '12px', wordWrap: 'break-word' }}>
                    <div style={{ fontWeight: '500', color: '#495057' }}>{student.firstName} {student.lastName}</div>
                  </td>
                  <td style={{ padding: '12px', fontSize: '14px', color: '#6c757d', wordWrap: 'break-word' }}>{student.email}</td>
                  <td style={{ padding: '12px', wordWrap: 'break-word' }}>{student.program || 'N/A'}</td>
                  <td style={{ padding: '12px', wordWrap: 'break-word' }}>{student.yearLevel || 'N/A'}</td>
                  <td style={{ padding: '12px', wordWrap: 'break-word' }}>{student.section || 'N/A'}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => viewStudentSchedule(student)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      <Eye size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      View Schedule
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  const renderSection = () => {
    if (activeSection === 'students') {
      return renderStudentsSection();
    }

    if (activeSection === 'profile') {
      return renderProfileSection();
    }

    if (activeSection === 'schedules') {
      return (
        <>
          <div className="welcome-card">
            <h2><Calendar size={18} /> Department Schedules</h2>
            <p>
              View class schedules for your department. Monitor course timings and student attendance patterns.
            </p>
          </div>

          <div className="dashboard-stats">
            <div className="stat-card">
              <h3>My Students</h3>
              <div className="stat-value">{students.length}</div>
            </div>
            <div className="stat-card">
              <h3>Total Classes</h3>
              <div className="stat-value">--</div>
            </div>
            <div className="stat-card">
              <h3>This Week</h3>
              <div className="stat-value">--</div>
            </div>
            <div className="stat-card">
              <h3>Department</h3>
              <div className="stat-value" style={{ fontSize: '16px', fontWeight: '500' }}>{user.department}</div>
            </div>
          </div>

          <div className="schedule-overview-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>DEPARTMENT SCHEDULE OVERVIEW</h3>
              <button
                className="view-department-btn"
                onClick={viewDepartmentSchedules}
              >
                <Eye size={16} />
                View All Schedules
              </button>
            </div>
            <div className="schedule-overview-content">
              <div className="overview-card">
                <h4>Today's Classes</h4>
                <div className="classes-count">
                  <span className="count-number">--</span>
                  <small>classes scheduled</small>
                </div>
              </div>
              <div className="overview-card">
                <h4>This Week</h4>
                <div className="week-schedule">
                  {daysOfWeek.map(day => (
                    <div key={day} className="day-summary">
                      <span className="day-name">{day.slice(0, 3)}</span>
                      <span className="day-classes">--</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      );
    }

    // Default to overview
    return (
      <>
        <div className="welcome-card">
          <h2>Welcome, Prof. {user.lastName}!</h2>
          <p>
            Monitor your department's class schedules and manage gate permissions for your courses.
          </p>
        </div>

        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>My Students</h3>
            <div className="stat-value">{students.length}</div>
          </div>
          <div className="stat-card">
            <h3>Classes Today</h3>
            <div className="stat-value">--</div>
          </div>
          <div className="stat-card">
            <h3>Present Today</h3>
            <div className="stat-value">--</div>
          </div>
          <div className="stat-card">
            <h3>Department</h3>
            <div className="stat-value" style={{ fontSize: '16px', fontWeight: '500' }}>{user.department}</div>
          </div>
        </div>

        <div className="schedule-overview-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>DEPARTMENT SCHEDULE OVERVIEW</h3>
            <button
              className="view-department-btn"
              onClick={viewDepartmentSchedules}
            >
              <Eye size={16} />
              View All Department Schedules
            </button>
          </div>
          <div className="schedule-overview-content">
            <div className="overview-card">
              <h4>Today's Classes</h4>
              <div className="classes-count">
                <span className="count-number">--</span>
                <small>classes scheduled</small>
              </div>
            </div>
            <div className="overview-card">
              <h4>This Week</h4>
              <div className="week-schedule">
                {daysOfWeek.map(day => (
                  <div key={day} className="day-summary">
                    <span className="day-name">{day.slice(0, 3)}</span>
                    <span className="day-classes">--</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="faculty-layout">
      {/* Sidebar */}
      <aside className="faculty-sidebar">
        <div className="logo">
          <img src={bulsuLogo} alt="BulSU Logo" />
          <span>BulSU Gate</span>
        </div>

        <nav>
          {facultySidebarItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                className={activeSection === item.id ? 'active' : ''}
                onClick={() => setActiveSection(item.id)}
              >
                <IconComponent size={16} />
                <span className="label">{item.label}</span>
              </button>
            );
          })}
        </nav>


      </aside>

      {/* Main Content */}
      <div className="faculty-main">
        {/* Topbar */}
        <header className="faculty-topbar">
          <div>
            <h1>{facultySidebarItems.find(item => item.id === activeSection)?.label || 'Faculty Dashboard'}</h1>
            <p>View and manage students in your department</p>
          </div>
          <div className="topbar-actions">
            <div className="topbar-user">
              <span>{user.firstName} {user.lastName}</span>
              <small>Faculty - {user.department}</small>
            </div>
            <button className="outline-btn" onClick={onLogout}>Logout</button>
          </div>
        </header>

        {/* Content Area */}
        <div className="faculty-content">
          {renderSection()}
        </div>
      </div>

      {/* Student Schedule Modal */}
      {showScheduleModal && selectedStudent && (
        <div className="schedule-modal-overlay" onClick={closeScheduleModal}>
          <div className="schedule-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="schedule-modal-header">
              <h3><Clock size={18} /> {selectedStudent.firstName} {selectedStudent.lastName}'s Schedule</h3>
              <button className="schedule-close-btn" onClick={closeScheduleModal}>×</button>
            </div>

            <div className="schedule-modal-body">
              {loadingSchedule ? (
                <div className="schedule-loading">Loading schedule...</div>
              ) : studentSchedule.length === 0 ? (
                <div className="schedule-empty">No schedule found for this student</div>
              ) : (
                <div className="schedule-list">
                  <table className="faculty-schedule-table">
                    <thead>
                      <tr>
                        <th>Day</th>
                        <th>Time</th>
                        <th>Subject</th>
                        <th>Room</th>
                        <th>Instructor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentSchedule.map(schedule => (
                        <tr key={schedule.scheduleId}>
                          <td>{schedule.dayOfWeek}</td>
                          <td>{schedule.startTime} - {schedule.endTime}</td>
                          <td>
                            <div style={{ fontWeight: 'bold' }}>{schedule.subjectCode}</div>
                            <div style={{ fontSize: '12px', color: '#666' }}>{schedule.subjectName}</div>
                          </td>
                          <td>{schedule.room}</td>
                          <td>{schedule.instructor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Department Schedules Modal */}
      {showDepartmentModal && (
        <div className="schedule-modal-overlay" onClick={closeDepartmentModal}>
          <div className="schedule-modal-content department-schedule-modal" onClick={(e) => e.stopPropagation()}>
            <div className="schedule-modal-header">
              <h3><School size={18} /> {user.department} Department - All Student Schedules</h3>
              <button className="schedule-close-btn" onClick={closeDepartmentModal}>×</button>
            </div>

            <div className="schedule-modal-body">
              {loadingDepartmentSchedules ? (
                <div className="schedule-loading">Loading department schedules...</div>
              ) : departmentSchedules.length === 0 ? (
                <div className="schedule-empty">No schedules found for department students</div>
              ) : (
                <div className="schedule-list">
                  <table className="faculty-schedule-table department-schedule-table">
                    <thead>
                      <tr>
                        <th>Day</th>
                        <th>Time</th>
                        <th>Subject</th>
                        <th>Room</th>
                        <th>Instructor</th>
                        <th>Student</th>
                        <th>Program</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departmentSchedules.map(schedule => (
                        <tr key={`${schedule.studentId}-${schedule.scheduleId}`}>
                          <td>{schedule.dayOfWeek}</td>
                          <td>{schedule.startTime} - {schedule.endTime}</td>
                          <td>
                            <div style={{ fontWeight: 'bold' }}>{schedule.subjectCode}</div>
                            <div style={{ fontSize: '12px', color: '#666' }}>{schedule.subjectName}</div>
                          </td>
                          <td>{schedule.room}</td>
                          <td>{schedule.instructor}</td>
                          <td>
                            <div style={{ fontWeight: 'bold', color: '#667eea' }}>{schedule.studentName}</div>
                            <div style={{ fontSize: '11px', color: '#666' }}>{schedule.studentId}</div>
                          </td>
                          <td>
                            <div>{schedule.studentProgram}</div>
                            <div style={{ fontSize: '11px', color: '#666' }}>Yr {schedule.studentYear}, {schedule.studentSection}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FacultyDashboard;
