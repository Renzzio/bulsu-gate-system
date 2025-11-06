// frontend/src/components/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import UserManagement from './admin/UserManagement';
import DashboardStats from './admin/DashboardStats';
import AccessLogs from './admin/AccessLogs';
import ViolationReports from './admin/ViolationReports';
import ScheduleManagement from './admin/ScheduleManagement';
import ReportsModule from './admin/ReportsModule';

function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'users', label: 'User Management', icon: '👥' },
    { id: 'schedules', label: 'Schedules', icon: '📅' },
    { id: 'logs', label: 'Access Logs', icon: '📋' },
    { id: 'violations', label: 'Violations', icon: '⚠️' },
    { id: 'reports', label: 'Reports', icon: '📈' }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardStats />;
      case 'users':
        return <UserManagement />;
      case 'schedules':
        return <ScheduleManagement />;
      case 'logs':
        return <AccessLogs />;
      case 'violations':
        return <ViolationReports />;
      case 'reports':
        return <ReportsModule />;
      default:
        return <DashboardStats />;
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="logo">BulSU Gate System</div>
          <div className="header-title">
 
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

      <div className="admin-layout">
        <aside className="admin-sidebar">
          <nav className="sidebar-nav">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="nav-icon">{tab.icon}</span>
                <span className="nav-label">{tab.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="admin-content">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default AdminDashboard;