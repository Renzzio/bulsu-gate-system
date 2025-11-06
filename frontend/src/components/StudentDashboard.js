// frontend/src/components/StudentDashboard.js
import React from 'react';

function StudentDashboard({ user, onLogout }) {
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo">🎓 BulSU Gate System</div>
          <div className="header-title">
            <h1>Student Portal</h1>
            <p>{user.program} - {user.section}</p>
          </div>
        </div>
        <div className="header-right">
          <div className="user-info">
            <p>{user.firstName} {user.lastName}</p>
            <span className="user-role">{user.role}</span>
          </div>
          <button className="logout-button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="welcome-card">
          <h2>Welcome, {user.firstName}!</h2>
          <p>
            Student Number: <strong>{user.studentNumber}</strong> | 
            Year Level: <strong>{user.yearLevel}</strong>
          </p>
          <p style={{ marginTop: '10px' }}>
            View your class schedule, generate gate passes, and check your access permissions.
          </p>
        </div>

        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>Gate Pass Status</h3>
            <div className="stat-value" style={{ fontSize: '1.5rem', color: '#28a745' }}>
              ✓ Allowed
            </div>
          </div>
          <div className="stat-card">
            <h3>Today's Classes</h3>
            <div className="stat-value">4</div>
          </div>
          <div className="stat-card">
            <h3>Campus Entries</h3>
            <div className="stat-value">2</div>
          </div>
          <div className="stat-card">
            <h3>This Month</h3>
            <div className="stat-value">42</div>
          </div>
        </div>

        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            <button className="action-button">
              📅 View Schedule
            </button>
            <button className="action-button">
              🎫 Generate QR Code
            </button>
            <button className="action-button">
              📜 Access History
            </button>
            <button className="action-button">
              ✉️ Request Exit Pass
            </button>
            <button className="action-button">
              👤 My Profile
            </button>
            <button className="action-button">
              📱 Notifications
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default StudentDashboard;