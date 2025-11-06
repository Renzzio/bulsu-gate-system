// frontend/src/components/admin/ViolationReports.js
import React, { useState, useEffect } from 'react';
import { getViolations } from '../../services/adminService';

function ViolationReports() {
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchViolations();
  }, [filterStatus]);

  const fetchViolations = async () => {
    try {
      setLoading(true);
      const response = await getViolations({ status: filterStatus });
      if (response.success) {
        setViolations(response.violations);
      }
    } catch (err) {
      setError(err.message || 'Failed to load violations');
    } finally {
      setLoading(false);
    }
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

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  return (
    <div className="violation-reports-container">
      <div className="page-header">
        <div>
          <h2>Violation Reports</h2>
          <p>Monitor and manage access violations</p>
        </div>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <label>Filter by Status:</label>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)} 
            className="filter-select"
          >
            <option value="">All Violations</option>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading violations...</p>
        </div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <>
          <div className="violations-summary">
            <div className="summary-card">
              <h4>Total Violations</h4>
              <div className="summary-value">{violations.length}</div>
            </div>
            <div className="summary-card">
              <h4>Active</h4>
              <div className="summary-value" style={{ color: '#dc3545' }}>
                {violations.filter(v => v.status === 'active').length}
              </div>
            </div>
            <div className="summary-card">
              <h4>Resolved</h4>
              <div className="summary-value" style={{ color: '#28a745' }}>
                {violations.filter(v => v.status === 'resolved').length}
              </div>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>User</th>
                  <th>Violation Type</th>
                  <th>Severity</th>
                  <th>Gate</th>
                  <th>Status</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {violations.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                      No violations found
                    </td>
                  </tr>
                ) : (
                  violations.map((violation, index) => (
                    <tr key={violation.violationId || index}>
                      <td>{formatDateTime(violation.timestamp)}</td>
                      <td>
                        <div>
                          <strong>{violation.userName || 'Unknown'}</strong>
                          <br />
                          <small>{violation.userId}</small>
                        </div>
                      </td>
                      <td>{violation.type || 'Unauthorized Access'}</td>
                      <td>
                        <span 
                          className="severity-badge"
                          style={{ 
                            backgroundColor: getSeverityColor(violation.severity),
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '0.85rem',
                            fontWeight: '600'
                          }}
                        >
                          {violation.severity?.toUpperCase() || 'MEDIUM'}
                        </span>
                      </td>
                      <td>{violation.gate || 'Main Gate'}</td>
                      <td>
                        <span className={`status-badge ${violation.status}`}>
                          {violation.status}
                        </span>
                      </td>
                      <td>
                        <small>{violation.details || 'No additional details'}</small>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default ViolationReports;