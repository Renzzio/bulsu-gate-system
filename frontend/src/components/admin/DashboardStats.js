// frontend/src/components/admin/DashboardStats.js
import React, { useState, useEffect } from 'react';
import { getDashboardStats } from '../../services/adminService';

function DashboardStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await getDashboardStats();
      if (response.success) {
        setStats(response.stats);
      }
    } catch (err) {
      setError(err.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading statistics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p className="error-message">{error}</p>
        <button onClick={fetchStats} className="retry-button">Retry</button>
      </div>
    );
  }

  return (
    <div className="dashboard-stats-container">
      <div className="page-header">
        <h2>Dashboard Overview</h2>
        <p>Real-time statistics and system monitoring</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-icon">👨‍🎓</span>
            <h3>Total Students</h3>
          </div>
          <div className="stat-value">{stats?.totalStudents || 0}</div>
          <div className="stat-footer">Active student accounts</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-icon">👨‍🏫</span>
            <h3>Faculty Members</h3>
          </div>
          <div className="stat-value">{stats?.totalFaculty || 0}</div>
          <div className="stat-footer">Active faculty accounts</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-icon">👮</span>
            <h3>Security Personnel</h3>
          </div>
          <div className="stat-value">{stats?.totalSecurity || 0}</div>
          <div className="stat-footer">Active security accounts</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-icon">✅</span>
            <h3>Active Users</h3>
          </div>
          <div className="stat-value">{stats?.activeUsers || 0}</div>
          <div className="stat-footer">Total active accounts</div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-header">
            <span className="stat-icon">🚪</span>
            <h3>Today's Entries</h3>
          </div>
          <div className="stat-value">{stats?.todayEntries || 0}</div>
          <div className="stat-footer">Campus entries today</div>
        </div>

        <div className="stat-card highlight">
          <div className="stat-header">
            <span className="stat-icon">🚶</span>
            <h3>Today's Exits</h3>
          </div>
          <div className="stat-value">{stats?.todayExits || 0}</div>
          <div className="stat-footer">Campus exits today</div>
        </div>

        <div className="stat-card warning">
          <div className="stat-header">
            <span className="stat-icon">⚠️</span>
            <h3>Active Violations</h3>
          </div>
          <div className="stat-value">{stats?.activeViolations || 0}</div>
          <div className="stat-footer">Unresolved violations</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-icon">📊</span>
            <h3>Total Violations</h3>
          </div>
          <div className="stat-value">{stats?.totalViolations || 0}</div>
          <div className="stat-footer">All time violations</div>
        </div>
      </div>

      <div className="quick-actions-section">
        <h3>Quick Actions</h3>
        <div className="action-grid">
          <button className="action-card">
            <span className="action-icon">👥</span>
            <span className="action-text">Add New User</span>
          </button>
          <button className="action-card">
            <span className="action-icon">📅</span>
            <span className="action-text">Upload Schedule</span>
          </button>
          <button className="action-card">
            <span className="action-icon">📊</span>
            <span className="action-text">Generate Report</span>
          </button>
          <button className="action-card">
            <span className="action-icon">⚙️</span>
            <span className="action-text">System Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default DashboardStats;