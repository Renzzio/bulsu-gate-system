// frontend/src/components/FacultyDashboard.js
import React from 'react';

function FacultyDashboard({ user, onLogout }) {
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo">🎓 BulSU Gate System</div>
          <div className="header-title">
            <h1>Faculty Portal</h1>
            <p>{user.department} Department</p>
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
          <h2>Welcome, Prof. {user.lastName}!</h2>
          <p>
            Monitor your students' attendance and movement records. View class schedules 
            and manage gate permissions for your courses.
          </p>
        </div>

        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>My Classes</h3>
            <div className="stat-value">6</div>
          </div>
          <div className="stat-card">
            <h3>Total Students</h3>
            <div className="stat-value">180</div>
          </div>
          <div className="stat-card">
            <h3>Present Today</h3>
            <div className="stat-value">167</div>
          </div>
          <div className="stat-card">
            <h3>Absences</h3>
            <div className="stat-value">13</div>
          </div>
        </div>

        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="action-buttons">
            <button className="action-button">
              📚 View My Classes
            </button>
            <button className="action-button">
              👨‍🎓 Student Attendance
            </button>
            <button className="action-button">
              📅 Class Schedule
            </button>
            <button className="action-button">
              📊 Movement Reports
            </button>
            <button className="action-button">
              ✅ Approve Exit Pass
            </button>
            <button className="action-button">
              📝 View Records
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default FacultyDashboard;