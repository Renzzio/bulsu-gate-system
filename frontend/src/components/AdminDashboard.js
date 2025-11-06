// frontend/src/components/AdminDashboard.js
import React from 'react';

function AdminDashboard({ user, onLogout }) {
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo">🎓 BulSU Gate System</div>
          <div className="header-title">
            <h1>Admin Dashboard</h1>
            <p>System Administration Panel</p>
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
            You have full access to the Gate Restriction System. Manage users, 
            monitor gate activities, and configure system settings.
          </p>
        </div>

        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>Total Students</h3>
            <div className="stat-value">1,247</div>
          </div>
          <div className="stat-card">
            <h3>Active Gates</h3>
            <div className="stat-value">4</div>
          </div>
          <div className="stat-card">
            <h3>Today's Entries</h3>
            <div className="stat-value">823</div>
          </div>
          <div className="stat-card">
            <h3>Violations</h3>
            <div className="stat-value">12</div>
          </div>
        </div>

        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            <button className="action-button">
              👥 Manage Users
            </button>
            <button className="action-button">
              📅 Manage Schedules
            </button>
            <button className="action-button">
              🚪 Gate Configuration
            </button>
            <button className="action-button">
              📊 View Reports
            </button>
            <button className="action-button">
              ⚠️ View Violations
            </button>
            <button className="action-button">
              ⚙️ System Settings
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;