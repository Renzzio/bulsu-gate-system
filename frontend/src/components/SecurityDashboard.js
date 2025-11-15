import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import GateControlInterface from './GateControlInterface';
import visitorService from '../services/visitorService';
import authService from '../services/authService';
import { QrCode, UserPlus, LogOut, Shield, UserCheck, Users, AlertTriangle, Clock } from 'lucide-react';
import './SecurityDashboard.css';

const sidebarItems = [
  { id: 'scanner', label: 'Gate Scanner', icon: QrCode },
  { id: 'visitors', label: 'Visitor Management', icon: UserPlus },
];

function SecurityDashboard({ user, onLogout }) {
  const [activeSection, setActiveSection] = useState('scanner');

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();

  const renderSection = () => {
    if (activeSection === 'visitors') {
      return <VisitorManagement user={user} />;
    }

    return <GateControlInterface user={user} onLogout={onLogout} />;
  };

  return (
    <>
      <div className="security-layout">
        <aside className="security-sidebar">
          <div className="logo">
            <div className="emblem">🎓</div>
            <span>BulSU Gate</span>
          </div>
          <nav className="security-nav">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                className={activeSection === item.id ? 'active' : ''}
                onClick={() => setActiveSection(item.id)}
              >
                <item.icon size={16} />
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
                ? 'Scan QR codes and manage gate access'
                : 'Create temporary access for visitors'}</p>
            </div>
            <div className="user-chip">
              <div className="avatar">{initials || 'GU'}</div>
              <div>
                <p>{user.firstName} {user.lastName}</p>
                <small>On Duty</small>
              </div>
              <button className="logout-button" onClick={onLogout}>
                Logout
              </button>
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
  const [generatedQR, setGeneratedQR] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [visitorStats, setVisitorStats] = useState({
    totalToday: 0,
    activeVisitors: 0,
    expiredPasses: 0,
    visitsUsedToday: 0
  });

  // Search and filter visitors
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredVisitors(visitors);
    } else {
      const filtered = visitors.filter(visitor =>
        visitor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visitor.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (visitor.email && visitor.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        visitor.purpose.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (visitor.visitTo && visitor.visitTo.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredVisitors(filtered);
    }
  }, [visitors, searchTerm]);

  // Calculate statistics
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const stats = visitors.reduce((acc, visitor) => {
      const isToday = visitor.createdDate === today;
      const isActive = visitor.usageCount < visitor.maxUses && isToday;

      if (isToday) {
        acc.totalToday += 1;
        acc.visitsUsedToday += visitor.usageCount;
        if (isActive) {
          acc.activeVisitors += 1;
        } else if (!isActive && visitor.usageCount > 0) {
          acc.expiredPasses += 1;
        } else if (!isActive) {
          acc.expiredPasses += 1;
        }
      }
      return acc;
    }, { totalToday: 0, activeVisitors: 0, expiredPasses: 0, visitsUsedToday: 0 });

    setVisitorStats(stats);
  }, [visitors]);

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

        // Fetch today's visitors
        fetchTodaysVisitors();
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

  const fetchTodaysVisitors = async () => {
    try {
      setLoading(true);
      const response = await visitorService.getTodaysVisitors();
      if (response.success) {
        setVisitors(response.visitors);
      }
    } catch (error) {
      console.error('Error fetching visitors:', error);
      setError('Failed to load visitors');
    } finally {
      setLoading(false);
    }
  };

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
        await fetchTodaysVisitors();
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

      {/* Header Section with Title and CTA */}
      <div className="visitor-header-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ marginBottom: '8px' }}>Visitor Management Dashboard</h2>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>
              Create and manage temporary access passes for university visitors
            </p>
          </div>
          <button
            className="primary-btn"
            onClick={() => setShowVisitorModal(true)}
            disabled={loading}
          >
            <UserPlus size={16} />
            Create New Visitor Pass
          </button>
        </div>

        {/* Quick Stats Cards */}
        <div className="visitor-stats">
          <div className="visitor-stat-card">
            <h3>{visitorStats.totalToday}</h3>
            <p>Total Today</p>
          </div>
          <div className="visitor-stat-card">
            <h3>{visitorStats.activeVisitors}</h3>
            <p>Active Passes</p>
          </div>
          <div className="visitor-stat-card">
            <h3>{visitorStats.expiredPasses}</h3>
            <p>Expired Today</p>
          </div>
          <div className="visitor-stat-card">
            <h3>{visitorStats.visitsUsedToday}</h3>
            <p>Total Visits</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '2px dashed #e9ecef'
        }}>
          <Clock size={56} style={{ marginBottom: '20px', color: '#ccc' }} />
          <h3>Loading Visitor Data...</h3>
          <p>Please wait while we fetch today's visitor information.</p>
        </div>
      ) : visitors.length === 0 ? (
        <div className="visitor-empty-state">
          <UserCheck size={80} className="empty-icon" />
          <h3>No Visitor Passes Created Today</h3>
          <p>
            Visitor management is an essential part of campus security.
            Create temporary QR codes for campus visitors, delivery personnel, and other guests
            requiring limited access to university facilities.
          </p>

          <div className="visitor-cta-buttons">
            <button
              className="visitor-cta-button"
              onClick={() => setShowVisitorModal(true)}
            >
              <UserPlus size={20} />
              Create First Visitor Pass
            </button>
            <button
              className="visitor-cta-button secondary"
              onClick={() => setError(null)}
            >
              <Shield size={20} />
              Learn More About Security
            </button>
          </div>

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
        <div>
          {/* Search */}
          <div className="visitor-search">
            <Users size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search visitors by name, contact, purpose, or person being visited..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Visitors Table - Full Width */}
          <div className="visitors-table">
            <table>
              <thead>
                <tr>
                  <th>Visitor Details</th>
                  <th>Contact Info</th>
                  <th>Purpose & Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredVisitors.map((visitor, index) => {
                  const usedToday = visitor.usageCount;
                  const isToday = visitor.createdDate === new Date().toISOString().split('T')[0];
                  const isActive = usedToday < visitor.maxUses && isToday;
                  const isExpired = usedToday >= visitor.maxUses && isToday;
                  const expiringSoon = usedToday === visitor.maxUses - 1 && isToday;

                  let badgeClass = 'visitor-usage-badge ';
                  if (expiringSoon) badgeClass += 'expiring-soon';
                  else if (isExpired) badgeClass += 'expired';
                  else if (isActive) badgeClass += 'active';

                  let badgeText = `${usedToday}/${visitor.maxUses} uses`;
                  if (expiringSoon) badgeText = `⚠️ Last Entry`;
                  else if (isExpired) badgeText = `✓ Completed`;
                  else if (isActive) badgeText = `📱 Active`;

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
                        <div style={{ marginBottom: '8px' }}>
                          <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                            {visitor.purpose}
                          </div>
                          <span className={badgeClass} style={{ fontSize: '11px' }}>
                            {badgeText}
                          </span>
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
                        <div style={{ fontSize: '14px', fontWeight: '500' }}>
                          {new Date(visitor.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div style={{ fontSize: '11px', color: '#6c757d' }}>
                          Today
                        </div>
                      </td>
                      <td>
                        <div className="visitor-actions">
                          <button
                            className="visitor-action-btn primary"
                            onClick={() => setGeneratedQR(visitor.visitorId)}
                            title="View QR Code"
                          >
                            <QrCode size={14} />
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
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Create Visitor Access</h3>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Full Name *</label>
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
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Phone Number *</label>
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
              <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Email (Optional)</label>
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
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Address *</label>
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
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Purpose of Visit *</label>
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
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Visiting Person/Office</label>
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
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Additional Notes</label>
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

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
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
              Create Visitor Pass
            </button>
          </div>
        </form>
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
