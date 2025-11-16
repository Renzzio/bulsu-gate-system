import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import GateControlInterface from './GateControlInterface';
import visitorService from '../services/visitorService';
import gateService from '../services/gateService';
import authService, { updateOwnProfile, changePassword } from '../services/authService';
import { Eye, EyeOff, Edit, Check, X } from 'lucide-react';
import bulsuLogo from '../bulsuLogo.png';
import './SecurityDashboard.css';
const UserPlusIcon = <span className="material-symbols-outlined">person_add</span>;
const ClockIcon = <span className="material-symbols-outlined">schedule</span>;
const UserCheckIcon = <span className="material-symbols-outlined">check_circle</span>;
const UsersIcon = <span className="material-symbols-outlined">group</span>;
const QrCodeIcon = <span className="material-symbols-outlined">qr_code</span>;
const UserIcon = <span className="material-symbols-outlined">person</span>;

const sidebarItems = [
  { id: 'scanner', label: 'Gate Scanner', icon: 'qr_code_scanner' },
  { id: 'visitors', label: 'Visitor Management', icon: 'group' },
  { id: 'profile', label: 'My Profile', icon: 'person' },
];

function SecurityDashboard({ user, onLogout }) {
  const [activeSection, setActiveSection] = useState('scanner');

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
  const [campusesData, setCampusesData] = useState([]);

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();

  // Fetch campuses on component mount for profile display
  useEffect(() => {
    const fetchCampuses = async () => {
      try {
        const response = await gateService.getCampuses();
        if (response.success) {
          setCampusesData(response.campuses || []);
        }
      } catch (error) {
        console.error('Error fetching campuses for profile:', error);
      }
    };

    fetchCampuses();
  }, []);

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

  const renderSection = () => {
    if (activeSection === 'visitors') {
      return <VisitorManagement user={user} />;
    }

    if (activeSection === 'profile') {
      return renderProfileSection();
    }

    return <div className="gate-control-area"><GateControlInterface user={user} onLogout={onLogout} /></div>;
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
        

        {/* Profile Information Display */}
        <div className='welcome-card'>
        <div style={{ background: 'white', borderRadius: '8px', padding: '2rem', marginBottom: '2rem',  }}>
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
              border: `1px solid ${profileMessage.includes('success') ? '#c3e6cb' : '#f5c6cb'}`
            }}>
              {profileMessage}
            </div>
          )}

          <form onSubmit={handleProfileUpdate}>
            {/* Responsive Grid Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {/* Name Fields Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>First Name</label>
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={profileFormData.firstName}
                      onChange={(e) => setProfileFormData({...profileFormData, firstName: e.target.value})}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        transition: 'border-color 0.2s ease'
                      }}
                    />
                  ) : (
                    <div style={{
                      padding: '12px 16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      backgroundColor: '#f9fafb',
                      fontSize: '14px',
                      color: '#6b7280'
                    }}>
                      {user.firstName}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Last Name</label>
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={profileFormData.lastName}
                      onChange={(e) => setProfileFormData({...profileFormData, lastName: e.target.value})}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        transition: 'border-color 0.2s ease'
                      }}
                    />
                  ) : (
                    <div style={{
                      padding: '12px 16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      backgroundColor: '#f9fafb',
                      fontSize: '14px',
                      color: '#6b7280'
                    }}>
                      {user.lastName}
                    </div>
                  )}
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Email Address</label>
                {isEditingProfile ? (
                  <input
                    type="email"
                    value={profileFormData.email}
                    onChange={(e) => setProfileFormData({...profileFormData, email: e.target.value})}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      transition: 'border-color 0.2s ease'
                    }}
                  />
                ) : (
                  <div style={{
                    padding: '12px 16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: '#f9fafb',
                    fontSize: '14px',
                    color: '#6b7280',
                    wordBreak: 'break-all'
            
                  }}>
                    {user.email}
                  </div>
                )}
              </div>

              {/* Campus and Role Fields Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Campus</label>
                  <div style={{
                    padding: '12px 16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: '#f9fafb',
                    fontSize: '14px',
                    color: '#6b7280'
                  }}>
                    {campusesData.find(c => c.campusId === user.campusId)?.name || user.campusId}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>Role</label>
                  <div style={{
                    padding: '12px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(196, 30, 58, 0.05)',
                    fontSize: '14px',
                    color: 'var(--bulsu-red)',
                    fontWeight: '500',
                    textAlign: 'center'
                  }}>
                    {user.role?.toUpperCase()}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {isEditingProfile && (
              <div style={{
                marginTop: '2.5rem',
                display: 'flex',
                gap: '12px',
                justifyContent: 'right',
              }}>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={profileLoading}
                  style={{
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: profileLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease',
                    opacity: profileLoading ? 0.7 : 1
                  }}
                >
                  <X size={16} />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={profileLoading}
                  style={{
                    backgroundColor: 'var(--bulsu-red)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: profileLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(196, 30, 58, 0.3)',
                    opacity: profileLoading ? 0.7 : 1
                  }}
                >
                  <Check size={16} />
                  {profileLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </form>
        </div>
        </div>

        {/* Password Change Section */}
        <div className='welcome-card'>
        <div style={{ background: 'white', borderRadius: '8px', padding: '2rem',  }}>
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
              <div style={{ marginTop: '2rem', display: 'flex', gap: '12px', justifyContent: 'right' }}>
                
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
                <button
                  type="submit"
                  disabled={profileLoading}
                  style={{
                    backgroundColor: 'var(--bulsu-red)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: profileLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 2px 8px rgba(196, 30, 58, 0.3)'
                  }}
                >
                  <Check size={16} />
                  {profileLoading ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
      </div>
    );
  };

  return (
    <>
      <div className="security-layout">
        <aside className="security-sidebar">
          <div className="logo">
            <img src={bulsuLogo} alt="BulSU Logo" />
            <span>BulSU Gate</span>
          </div>
          <nav className="security-nav">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                className={activeSection === item.id ? 'active' : ''}
                onClick={() => setActiveSection(item.id)}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="label">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">
            <p>{user.firstName} {user.lastName}</p>
            <small>{user.role?.toUpperCase()}</small>
          </div>
        </aside>

        <div className="security-main">
          <header className="security-topbar">
            <div>
              <h1>{sidebarItems.find(item => item.id === activeSection)?.label || 'Gate Scanner'}</h1>
              <p>{activeSection === 'scanner'
                ? 'Dashboard overview and statistics'
                : activeSection === 'visitors' ? 'Module management' : 'Account settings'}</p>
            </div>
            <div className="topbar-actions">
              <div className="topbar-user">
                <strong>{user.firstName} {user.lastName}</strong>
                <span>{user.role?.toUpperCase()}</span>
              </div>
              <button className="btn btn-secondary" onClick={onLogout}>Logout</button>
            </div>
          </header>

          <main className="security-content">
            {renderSection()}
          </main>
        </div>
      </div>
    </>
  );
}

function VisitorManagement({ user }) {
  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [visitors, setVisitors] = useState([]);
  const [filteredVisitors, setFilteredVisitors] = useState([]);
  const [campusesData, setCampusesData] = useState([]);
  const [generatedQR, setGeneratedQR] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch campuses on component mount
  useEffect(() => {
    const fetchCampuses = async () => {
      try {
        const response = await gateService.getCampuses();
        if (response.success) {
          setCampusesData(response.campuses || []);
        }
      } catch (error) {
        console.error('Error fetching campuses:', error);
      }
    };

    fetchCampuses();
  }, []);

  // Fetch visitors for the guard's campus
  useEffect(() => {
    const fetchVisitors = async () => {
      try {
        setLoading(true);
        const response = await visitorService.getAllVisitorsForGuards();
        if (response.success) {
          setVisitors(response.visitors || []);
        }
      } catch (error) {
        console.error('Error fetching visitors:', error);
        setError('Failed to load visitors');
      } finally {
        setLoading(false);
      }
    };

    fetchVisitors();
  }, []);

  // Search and filter visitors
  useEffect(() => {
    const filtered = visitors.filter(visitor =>
      visitor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      visitor.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (visitor.email && visitor.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      visitor.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (visitor.visitTo && visitor.visitTo.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredVisitors(filtered);
  }, [visitors, searchTerm]);

  // No statistics calculation needed since dashboard cards were removed

  // Check authentication and role
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Verify current user authentication
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('NOT_LOGGED_IN');
        }

        // Check if user has required role for visitor management
        const allowedRoles = ['admin', 'guard', 'security', 'security_guard', 'security_officer'];
        if (!allowedRoles.includes(user.role)) {
          setError(`Access denied. Your role "${user.role}" doesn't have permission to manage visitors. Required roles: ${allowedRoles.join(', ')}`);
          return;
        }
      } catch (error) {
        if (error.message === 'NOT_LOGGED_IN') {
          setError('You must login first to access visitor management. Please visit the login page.');
        } else {
          setError('Authentication failed. Please try logging in again.');
        }
      }
    };

    checkAuth();
  }, [user.role]);

  const handleCreateVisitor = async (visitorData) => {
    try {
      const response = await visitorService.createVisitor({
        name: visitorData.name,
        contact: visitorData.contact,
        email: visitorData.email || null,
        address: visitorData.address,
        purpose: visitorData.purpose,
        visitTo: visitorData.visitTo || null,
        additionalNotes: visitorData.additionalNotes || null
      });

      if (response.success) {
        // Refresh the visitors list
        const refreshResponse = await visitorService.getAllVisitorsForGuards();
        if (refreshResponse.success) {
          setVisitors(refreshResponse.visitors || []);
        }
        setGeneratedQR(response.visitor.visitorId);
      }
      setShowVisitorModal(false);
    } catch (error) {
      console.error('Error creating visitor:', error);
      setError(error.message || 'Failed to create visitor');
    }
  };

  return (
    <div className="visitor-dashboard">
      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '6px',
          marginBottom: '16px',
          border: '1px solid #f5c6cb'
        }}>
          {error}
          <span
            style={{ float: 'right', cursor: 'pointer', fontWeight: 'bold' }}
            onClick={() => setError(null)}
          >
            ×
          </span>
        </div>
      )}

      {/* Stats Section - Full table width */}
      <div style={{
        marginBottom: '16px',
        maxWidth: '1200px',
        marginLeft: 'auto',
        marginRight: 'auto',
        width: '100%'
      }}>
       
      </div>

      {/* Search and Action Controls - Full table width */}
      <div style={{
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '1200px',
        marginLeft: 'auto',
        marginRight: 'auto',
        width: '100%'
      }}>
        

        <button
          className="primary-btn"
          onClick={() => setShowVisitorModal(true)}
          disabled={loading}
          style={{
            flexShrink: 0,
            height: '40px',
            marginBottom: 0
          }}
        >
          {UserPlusIcon}
          Create New Visitor Pass
        </button>
      </div>

      {loading ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '2px dashed #e9ecef'
        }}>
          {ClockIcon}
          <h3>Loading Visitor Data...</h3>
          <p>Please wait while we fetch today's visitor information.</p>
        </div>
      ) : visitors.length === 0 ? (
        <div className="visitor-empty-state">
          <span className="material-symbols-outlined" style={{ fontSize: '80px' }}>check_circle</span>
          <h3>No Visitor Passes Found</h3>
          <p>
            Visitor management is an essential part of campus security.
            Create temporary QR codes for campus visitors, delivery personnel, and other guests
            requiring limited access to university facilities.
          </p>

          <div style={{
            marginTop: 'var(--spacing-2xl)',
            padding: 'var(--spacing-lg)',
            backgroundColor: 'rgba(196, 30, 58, 0.05)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid rgba(196, 30, 58, 0.1)'
          }}>
            <h4 style={{
              margin: 0,
              color: 'var(--bulsu-red)',
              fontSize: 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-semibold)'
            }}>
              Why Visitor Management Matters
            </h4>
            <p style={{
              margin: '8px 0 0 0',
              color: 'var(--text-muted)',
              fontSize: 'var(--font-size-sm)',
              lineHeight: 1.5
            }}>
              Proper visitor tracking ensures campus security, provides access control,
              and helps with emergency response coordination.
            </p>
          </div>
        </div>
      ) : (
        <div className="visitors-table-container" style={{ marginTop: '0' }}>
          {/* Visitors Table - Centered with proper padding */}
          <div className="visitors-table" style={{ marginTop: '0' }}>
            <table>
              <thead>
                <tr>
                  <th>Visitor Details</th>
                  <th>Contact Info</th>
                  <th>Campus</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisitors.map((visitor, index) => {
                  const usageCount = visitor.usageCount;
                  const isActive = usageCount < visitor.maxUses;
                  const expiringSoon = usageCount === visitor.maxUses - 1 && isActive;

                  let badgeClass = 'visitor-usage-badge ';
                  if (expiringSoon) badgeClass += 'expiring-soon';
                  else if (!isActive) badgeClass += 'expired';
                  else if (isActive) badgeClass += 'active';

                  let badgeText = `${usageCount}/${visitor.maxUses} uses`;
                  if (expiringSoon) badgeText = `⚠️ Last Entry`;
                  else if (!isActive) badgeText = `✓ Completed`;
                  else if (isActive) badgeText = `📱 Active`;

                  const campusName = campusesData.find(c => c.campusId === visitor.campusId)?.name || 'Unknown';

                  return (
                    <tr key={visitor.id || index}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ fontWeight: '600', fontSize: 'var(--font-size-base)' }}>
                            {visitor.name}
                          </div>
                          {visitor.visitTo && (
                            <div style={{
                              fontSize: '12px',
                              color: '#6c757d',
                              marginTop: '2px'
                            }}>
                              Visiting: {visitor.visitTo}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ paddingTop: 'var(--spacing-lg)' }}>
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                          {visitor.contact}
                        </div>
                        {visitor.email && (
                          <div style={{ fontSize: '12px', color: '#6c757d' }}>
                            Email: {visitor.email}
                          </div>
                        )}
                        <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>
                          From: {visitor.address.length > 25
                            ? `${visitor.address.substring(0, 25)}...`
                            : visitor.address}
                        </div>
                      </td>
                      <td>
                        <span className="tag" style={{ backgroundColor: '#17a2b8', color: 'white' }}>
                          {campusName}
                        </span>
                      </td>
                      <td>
                        <div style={{ marginBottom: '8px' }}>
                          <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                            {visitor.purpose}
                          </div>
                        </div>
                        {(visitor.additionalNotes?.length > 0) && (
                          <div style={{ fontSize: '12px', color: '#6c757d' }}>
                            {visitor.additionalNotes.length > 40
                              ? `${visitor.additionalNotes.substring(0, 40)}...`
                              : visitor.additionalNotes}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={badgeClass} style={{ fontSize: '11px' }}>
                          {badgeText}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>
                          {new Date(visitor.createdAt).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6c757d' }}>
                          {new Date(visitor.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>
                      <td>
                        <div className="visitor-actions">
                          <button
                            className="visitor-action-btn primary"
                            onClick={() => setGeneratedQR(visitor.visitorId)}
                            title="View QR Code"
                          >
                            {QrCodeIcon}
                            Show QR
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showVisitorModal && (
        <VisitorModal
          onClose={() => setShowVisitorModal(false)}
          onCreateVisitor={handleCreateVisitor}
        />
      )}

      {generatedQR && (
        <QRDisplayModal
          qrData={generatedQR}
          onClose={() => setGeneratedQR(null)}
        />
      )}
    </div>
  );
}

function VisitorModal({ onClose, onCreateVisitor }) {
  const [formData, setFormData] = useState({
    name: '',
    phoneNumber: '',
    contact: '', // keeping for backward compatibility
    email: '',
    address: '',
    purpose: '',
    visitTo: '',
    additionalNotes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreateVisitor(formData);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.3s ease'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--card-border)',
        width: '500px',
        maxWidth: '90vw',
        maxHeight: '90vh',
        overflow: 'auto',
        animation: 'slideUp 0.3s ease'
      }}>
        {/* Modal Header - Bulsu Themed */}
        <div style={{
          background: 'linear-gradient(135deg, var(--bulsu-red) 0%, var(--bulsu-dark-red) 100%)',
          color: 'white',
          padding: 'var(--spacing-xl) var(--spacing-2xl)',
          borderTopLeftRadius: 'var(--radius-lg)',
          borderTopRightRadius: 'var(--radius-lg)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-semibold)',
            letterSpacing: '0.5px'
          }}>
            <span className="material-symbols-outlined" style={{
              fontSize: 'var(--font-size-xl)',
              marginRight: 'var(--spacing-sm)',
              verticalAlign: 'middle'
            }}>
              person_add
            </span>
            Create Visitor Access
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.8)',
              cursor: 'pointer',
              padding: 'var(--spacing-xs)',
              borderRadius: 'var(--radius-full)',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              fontSize: 'var(--font-size-xl)'
            }}
            onMouseOver={(e) => e.target.style.color = 'white'}
            onMouseOut={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.8)'}
          >
            ✕
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: 'var(--spacing-2xl)' }}>
          <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', textAlign: 'left' }}>Full Name *</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
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
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', textAlign: 'left' }}>Phone Number *</label>
              <input
                type="tel"
                name="contact"
                required
                value={formData.contact}
                onChange={handleChange}
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
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', textAlign: 'left' }}>Email (Optional)</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
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
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', textAlign: 'left' }}>Address *</label>
            <textarea
              name="address"
              required
              value={formData.address}
              onChange={handleChange}
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
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', textAlign: 'left' }}>Purpose of Visit *</label>
            <select
              name="purpose"
              required
              value={formData.purpose}
              onChange={handleChange}
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
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', textAlign: 'left' }}>Visiting Person/Office</label>
            <input
              type="text"
              name="visitTo"
              value={formData.visitTo}
              onChange={handleChange}
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
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500', textAlign: 'left' }}>Additional Notes</label>
            <textarea
              name="additionalNotes"
              value={formData.additionalNotes}
              onChange={handleChange}
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

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: 'var(--spacing-xl)' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: 'var(--spacing-md) var(--spacing-lg)',
                backgroundColor: 'var(--neutral-500)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                transition: 'all 0.2s ease',
                minWidth: '100px'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: 'var(--spacing-md) var(--spacing-lg)',
                backgroundColor: 'var(--bulsu-red)',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                transition: 'all 0.2s ease',
                boxShadow: 'var(--shadow-sm)',
                minWidth: '160px'
              }}
            >
              <span className="material-symbols-outlined" style={{
                fontSize: 'var(--font-size-base)',
                marginRight: 'var(--spacing-xs)',
                verticalAlign: 'middle'
              }}>
                person_add
              </span>
              Create Visitor Pass
            </button>
          </div>
          </form>
        </div>
      </div>
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
      const displayCanvas = document.querySelector('#visitor-qr-code canvas');

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
              <div id="visitor-qr-code">
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
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={handleSaveQR}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>phone_android</span>
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
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onClick={() => window.print()}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>print</span>
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



export default SecurityDashboard;
