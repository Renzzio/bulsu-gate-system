// frontend/src/components/Sidebar.js
import React from 'react';
import './Sidebar.css';
import bulsuLogo from '../bulsuLogo.png';

function Sidebar({ activeSection, onSelectSection, onLogout, user }) {
  const menuItems = [
    { id: 'dashboard', label: '📊 Dashboard', icon: '📊' },
    { id: 'users', label: '👥 User Management', icon: '👥' },
    { id: 'schedules', label: '📅 Schedule Management', icon: '📅' },
    { id: 'student', label: '🎓 Manage Students', icon: '🎓' },
    { id: 'admin', label: '🔑 Manage Admins', icon: '🔑' },
    { id: 'faculty', label: '👨‍🏫 Manage Faculty/Staff', icon: '👨‍🏫' },
    { id: 'guard', label: '🚨 Manage Guards', icon: '🚨' },
    { id: 'vip', label: '⭐ Manage VIP', icon: '⭐' },
    { id: 'logs', label: '📋 Activity Logs', icon: '📋' },
    { id: 'settings', label: '⚙️ System Settings', icon: '⚙️' },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <img src={bulsuLogo} alt="BulSU Logo" className="sidebar-logo" />
        <h2>BulSU Gate Restriction System</h2>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeSection === item.id ? 'active' : ''}`}
            onClick={() => onSelectSection(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="profile-avatar">
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </div>
          <div className="profile-info">
            <p className="profile-name">{user?.firstName} {user?.lastName}</p>
            <p className="profile-role">{user?.role}</p>
          </div>
        </div>
        <button className="logout-btn" onClick={onLogout}>
          🚪 Logout
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
