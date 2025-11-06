// frontend/src/components/SecurityDashboard.js
import React from 'react';

function SecurityDashboard({ user, onLogout }) {
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo">🎓 BulSU Gate System</div>
          <div className="header-title">
            <h1>Security Portal</h1>
            <p>{user.gateAssignment}</p>
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
            Monitor and control gate access. Scan student IDs to verify permissions 
            and log all entry and exit activities in real-time.
          </p>
        </div>

        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>Today's Entries</h3>
            <div className="stat-value">412</div>
          </div>
          <div className="stat-card">
            <h3>Today's Exits</h3>
            <div className="stat-value">398</div>
          </div>
          <div className="stat-card">
            <h3>Current Inside</h3>
            <div className="stat-value">14</div>
          </div>
          <div className="stat-card">
            <h3>Denied Access</h3>
            <div className="stat-value">8</div>
          </div>
        </div>

        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            <button className="action-button">
              📷 Scan QR Code
            </button>
            <button className="action-button">
              🔍 Verify Student ID
            </button>
            <button className="action-button">
              📋 Access Logs
            </button>
            <button className="action-button">
              ⚠️ Report Violation
            </button>
            <button className="action-button">
              👥 Current Campus List
            </button>
            <button className="action-button">
              📊 Daily Summary
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default SecurityDashboard;