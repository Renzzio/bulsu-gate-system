import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';

const ScheduleFeedbackModal = ({ isOpen, onClose, results, scheduleData }) => {
  if (!isOpen || !results) return null;

  const { successful = [], failed = [] } = results;
  const total = successful.length + failed.length;
  const isCompleteSuccess = successful.length > 0 && failed.length === 0;
  const isPartialSuccess = successful.length > 0 && failed.length > 0;
  const isCompleteFailure = successful.length === 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div className="modal-header" style={{
          borderBottom: '2px solid #e9ecef',
          backgroundColor: isCompleteFailure ? '#fff8f8' : isPartialSuccess ? '#fffbf8' : '#f8fff8',
        }}>
          <h3 style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: 0,
            color: isCompleteFailure ? '#e74c3c' : isPartialSuccess ? '#f39c12' : '#27ae60'
          }}>
            {isCompleteFailure ? <XCircle size={24} /> :
             isPartialSuccess ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
            {isCompleteFailure ? 'Schedule Assignment Failed' :
             isPartialSuccess ? 'Schedule Assignment Completed' : 'Schedule Assignment Successful'}
          </h3>
          <button
            className="modal-close-btn"
            onClick={onClose}
            style={{ fontSize: '24px', padding: '4px', lineHeight: '1' }}
          >
            ×
          </button>
        </div>

        <div style={{
          padding: '20px',
          overflowY: 'auto',
          flex: 1,
          backgroundColor: '#fff'
        }}>
          {/* Schedule Summary */}
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #e9ecef'
          }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#495057' }}>
              {scheduleData.subjectCode === 'Excel Import' ? 'Excel Import Results' : `${scheduleData.subjectCode} - ${scheduleData.subjectName}`}
            </h4>
            {scheduleData.subjectCode === 'Excel Import' ? (
              <div style={{ fontSize: '14px', color: '#6c757d' }}>
                <div><strong>Import Type:</strong> Bulk Excel Import</div>
                <div><strong>Format:</strong> Multiple schedules from Excel file</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px', color: '#6c757d' }}>
                <div><strong>Day:</strong> {scheduleData.dayOfWeek}</div>
                <div><strong>Time:</strong> {scheduleData.startTime} - {scheduleData.endTime}</div>
                <div><strong>Room:</strong> {scheduleData.room}</div>
                <div><strong>Instructor:</strong> {scheduleData.instructor}</div>
                {scheduleData.section && <div><strong>Section:</strong> {scheduleData.section}</div>}
              </div>
            )}
          </div>

          {/* Results Summary */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px'
            }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#495057' }}>
                Total Students Processed: {total}
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#27ae60',
                  fontWeight: '600'
                }}>
                  <CheckCircle size={18} />
                  {successful.length} Successful
                </div>
                {failed.length > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#e74c3c',
                    fontWeight: '600'
                  }}>
                    <XCircle size={18} />
                    {failed.length} Failed
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Successful Students */}
          {successful.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 0 12px 0',
                color: '#27ae60',
                fontSize: '16px'
              }}>
                <CheckCircle size={20} />
                Students Who Received Schedules ({successful.length})
              </h4>
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                border: '1px solid #d4edda',
                borderRadius: '6px',
                backgroundColor: '#f8fff8'
              }}>
                {successful.map(student => (
                  <div
                    key={student.userId}
                    style={{
                      padding: '10px 12px',
                      borderBottom: '1px solid #e9ecef',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <CheckCircle size={16} color="#27ae60" />
                    <div>
                      <div style={{ fontWeight: '500', color: '#495057' }}>
                        {student.firstName} {student.lastName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>
                        ID: {student.userId}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed Students */}
          {failed.length > 0 && (
            <div>
              <h4 style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 0 12px 0',
                color: '#e74c3c',
                fontSize: '16px'
              }}>
                <XCircle size={20} />
                Students with Schedule Conflicts ({failed.length})
              </h4>
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                border: '1px solid #f5c6cb',
                borderRadius: '6px',
                backgroundColor: '#fff8f8'
              }}>
                {failed.map(({ student, error }) => (
                  <div
                    key={student.userId}
                    style={{
                      padding: '10px 12px',
                      borderBottom: '1px solid #e9ecef',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <XCircle size={16} color="#e74c3c" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', color: '#495057' }}>
                        {student.firstName} {student.lastName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>
                        ID: {student.userId}
                      </div>
                      {error && error !== 'Failed to add schedule' && (
                        <div style={{
                          fontSize: '11px',
                          color: '#e74c3c',
                          marginTop: '4px',
                          fontStyle: 'italic'
                        }}>
                          Error: {error}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{
          padding: '16px 20px',
          borderTop: '1px solid #e9ecef',
          backgroundColor: '#f8f9fa',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <button
            className="btn btn-primary"
            onClick={onClose}
            style={{ minWidth: '100px', paddingLeft: '32px' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleFeedbackModal;
