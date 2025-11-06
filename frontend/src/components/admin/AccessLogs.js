// frontend/src/components/admin/AccessLogs.js
import React, { useState, useEffect } from 'react';
import { getAccessLogs } from '../../services/adminService';

function AccessLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    type: '',
    startDate: '',
    endDate: '',
    limit: 100
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const response = await getAccessLogs(filters);
      if (response.success) {
        setLogs(response.logs);
      }
    } catch (err) {
      setError(err.message || 'Failed to load access logs');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const handleApplyFilters = () => {
    fetchLogs();
  };

  const handleExport = () => {
    const csvContent = [
      ['Timestamp', 'User ID', 'Name', 'Type', 'Gate', 'Status'],
      ...logs.map(log => [
        new Date(log.timestamp).toLocaleString(),
        log.userId,
        log.userName || 'N/A',
        log.type,
        log.gate || 'N/A',
        log.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `access_logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDateTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="access-logs-container">
      <div className="page-header">
        <div>
          <h2>Access Logs</h2>
          <p>Complete historical data for auditing purposes</p>
        </div>
        <button className="secondary-button" onClick={handleExport}>
          📊 Export to CSV
        </button>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <label>Type:</label>
          <select name="type" value={filters.type} onChange={handleFilterChange} className="filter-select">
            <option value="">All Types</option>
            <option value="entry">Entry</option>
            <option value="exit">Exit</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Start Date:</label>
          <input
            type="date"
            name="startDate"
            value={filters.startDate}
            onChange={handleFilterChange}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>End Date:</label>
          <input
            type="date"
            name="endDate"
            value={filters.endDate}
            onChange={handleFilterChange}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>Limit:</label>
          <select name="limit" value={filters.limit} onChange={handleFilterChange} className="filter-select">
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="500">500</option>
          </select>
        </div>

        <button className="primary-button" onClick={handleApplyFilters}>
          Apply Filters
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading access logs...</p>
        </div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="table-container">
          <div className="table-info">
            <p>Showing {logs.length} log entries</p>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>User ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Gate</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                    No access logs found
                  </td>
                </tr>
              ) : (
                logs.map((log, index) => (
                  <tr key={log.logId || index}>
                    <td>{formatDateTime(log.timestamp)}</td>
                    <td>{log.userId}</td>
                    <td>{log.userName || 'Unknown'}</td>
                    <td>
                      <span className={`type-badge ${log.type}`}>
                        {log.type === 'entry' ? '🚪 Entry' : '🚶 Exit'}
                      </span>
                    </td>
                    <td>{log.gate || 'Main Gate'}</td>
                    <td>
                      <span className={`status-badge ${log.status}`}>
                        {log.status}
                      </span>
                    </td>
                    <td>
                      <small>{log.details || 'No additional details'}</small>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AccessLogs;