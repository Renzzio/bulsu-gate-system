// frontend/src/components/admin/ReportsModule.js
import React, { useState } from 'react';
import { generateReport } from '../../services/adminService';

function ReportsModule() {
  const [reportType, setReportType] = useState('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await generateReport(reportType, startDate, endDate);
      if (response.success) {
        setReportData(response.report);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!reportData) return;

    const csvContent = [
      ['Timestamp', 'User ID', 'Name', 'Type', 'Gate', 'Status'],
      ...reportData.data.map(log => [
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
    link.download = `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
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
    <div className="reports-module-container">
      <div className="page-header">
        <div>
          <h2>Reports Module</h2>
          <p>Generate daily, weekly, or monthly gate activity reports</p>
        </div>
      </div>

      <div className="report-generator">
        <div className="generator-controls">
          <div className="form-group">
            <label>Report Type</label>
            <select 
              value={reportType} 
              onChange={(e) => setReportType(e.target.value)}
              className="filter-select"
            >
              <option value="daily">Daily Report</option>
              <option value="weekly">Weekly Report</option>
              <option value="monthly">Monthly Report</option>
            </select>
          </div>

          <div className="form-group">
            <label>Start Date (Optional)</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="filter-input"
            />
          </div>

          <div className="form-group">
            <label>End Date (Optional)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="filter-input"
            />
          </div>

          <button 
            className="primary-button" 
            onClick={handleGenerateReport}
            disabled={loading}
          >
            {loading ? 'Generating...' : '📊 Generate Report'}
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {reportData && (
          <div className="report-container">
            <div className="report-actions">
              <button className="secondary-button" onClick={handlePrint}>
                🖨️ Print Report
              </button>
              <button className="secondary-button" onClick={handleDownload}>
                📥 Download CSV
              </button>
            </div>

            <div className="report-summary">
              <h3>{reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</h3>
              <p className="report-date-range">
                Period: {formatDateTime(reportData.summary.dateRange.start)} - {formatDateTime(reportData.summary.dateRange.end)}
              </p>

              <div className="summary-stats">
                <div className="summary-item">
                  <div className="summary-label">Total Entries</div>
                  <div className="summary-value">{reportData.summary.totalEntries}</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Total Exits</div>
                  <div className="summary-value">{reportData.summary.totalExits}</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Unique Users</div>
                  <div className="summary-value">{reportData.summary.uniqueUsers}</div>
                </div>
                <div className="summary-item">
                  <div className="summary-label">Total Activities</div>
                  <div className="summary-value">{reportData.data.length}</div>
                </div>
              </div>
            </div>

            <div className="report-table">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>User ID</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Gate</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.data.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                        No data available for this period
                      </td>
                    </tr>
                  ) : (
                    reportData.data.map((log, index) => (
                      <tr key={index}>
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
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @media print {
          .page-header,
          .generator-controls,
          .report-actions,
          .admin-sidebar {
            display: none !important;
          }
          
          .report-container {
            padding: 20px;
          }
          
          .report-summary h3 {
            color: #9D0A0A;
            margin-bottom: 10px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
          }
          
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          
          th {
            background-color: #f8f9fa;
          }
        }
      `}</style>
    </div>
  );
}

export default ReportsModule;