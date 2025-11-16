// frontend/src/components/ScheduleManagement.js
import React, { useState, useEffect } from 'react';
import scheduleService from '../services/scheduleService';
import { getUsersByRole, getAllUsers } from '../services/authService';
import gateService from '../services/gateService';
import { FileSpreadsheet, Calendar, List, Edit3, Trash2 } from 'lucide-react';
import './ScheduleManagement.css';
import AddScheduleModal from './AddScheduleModal';
import EditScheduleModal from './EditScheduleModal';
import ScheduleTable from './ScheduleTable';
import ScheduleExcelUpload from './ScheduleExcelUpload';



const ScheduleManagement = ({ user }) => {
  const [schedules, setSchedules] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [filterDay, setFilterDay] = useState('');
  const [searchSubject, setSearchSubject] = useState('');

  // New: Student list view with calendar
  const [showStudentSchedules, setShowStudentSchedules] = useState(false);
  const [viewingStudent, setViewingStudent] = useState(null);
  const [studentFilterCampus, setStudentFilterCampus] = useState('');
  const [studentFilterDepartment, setStudentFilterDepartment] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  // Campus and department filters for viewing schedules
  const [campuses, setCampuses] = useState([]);
  const [filterCampus, setFilterCampus] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];



  // Load all students and campuses on component mount
  useEffect(() => {
    loadStudents();
    loadCampuses();
  }, []);

  // Load schedules when selected student changes
  useEffect(() => {
    if (selectedStudent) {
      loadSchedules(selectedStudent);
    }
  }, [selectedStudent]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await getUsersByRole('student');
      if (response.success) {
        setStudents(response.users || []);
        // Auto-select first student if available
        if (response.users && response.users.length > 0) {
          setSelectedStudent(response.users[0].userId);
        }
      }
    } catch (err) {
      console.error('Error loading students:', err);
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const loadCampuses = async () => {
    try {
      const response = await gateService.getCampuses();
      if (response.success) {
        setCampuses(response.campuses || []);
      }
    } catch (err) {
      console.error('Campuses fetch error:', err);
    }
  };

  const loadSchedules = async (studentId) => {
    try {
      setLoading(true);
      setError('');
      const response = await scheduleService.getStudentSchedules(studentId);
      if (response.success) {
        setSchedules(response.schedules || []);
      } else {
        setSchedules([]);
      }
    } catch (err) {
      console.error('Error loading schedules:', err);
      setError(err.message || 'Failed to load schedules');
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async (scheduleData) => {
    try {
      const response = await scheduleService.addSchedule(scheduleData);
      if (response.success) {
        setSuccess(`Schedule added successfully for ${students.find(s => s.userId === scheduleData.studentId)?.firstName} ${students.find(s => s.userId === scheduleData.studentId)?.lastName}`);
        setShowAddModal(false);
        // Refresh schedules for the student we just added a schedule for, if we're viewing their calendar
        if (showStudentSchedules && viewingStudent?.userId === scheduleData.studentId) {
          loadSchedules(scheduleData.studentId);
        }
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error(response.message || 'Failed to add schedule');
      }
    } catch (err) {
      setError(err.message || 'Failed to add schedule');
      console.error('Error adding schedule:', err);
    }
  };

  const handleEditSchedule = async (scheduleData) => {
    try {
      // Use viewingStudent ID if in modal, otherwise use selectedStudent
      const studentId = showStudentSchedules ? viewingStudent.userId : selectedStudent;
      const response = await scheduleService.updateSchedule(
        studentId,
        editingSchedule.scheduleId,
        scheduleData
      );
      if (response.success) {
        setSuccess('Schedule updated successfully');
        setShowEditModal(false);
        setEditingSchedule(null);
        loadSchedules(studentId);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message || 'Failed to update schedule');
      console.error('Error updating schedule:', err);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    try {
      // Use viewingStudent ID if in modal, otherwise use selectedStudent
      const studentId = showStudentSchedules ? viewingStudent.userId : selectedStudent;
      const response = await scheduleService.deleteSchedule(studentId, scheduleId);
      if (response.success) {
        setSuccess('Schedule deleted successfully');
        loadSchedules(studentId);
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      setError(err.message || 'Failed to delete schedule');
      console.error('Error deleting schedule:', err);
    }
  };

  const handleEditClick = (schedule) => {
    setEditingSchedule(schedule);
    setShowEditModal(true);
  };

  const handleExcelUploadSuccess = (results) => {
    setShowExcelUpload(false);
    setSuccess(`Successfully imported ${results.successful.length} schedules`);
    loadSchedules(selectedStudent);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleExcelUploadError = (err) => {
    setError(err.message || 'Failed to import schedules');
    setTimeout(() => setError(''), 5000);
  };

  // Get unique departments from students
  const getUniqueDepartments = () => {
    const departments = students.map(student => student.studentDepartment).filter(Boolean);
    return [...new Set(departments)].sort();
  };

  // Filter students based on campus and department for filtering schedules view
  const getFilteredStudentsForView = () => {
    return students.filter(student => {
      const matchesCampus = filterCampus === '' || student.campusId === filterCampus;
      const matchesDepartment = filterDepartment === '' || student.studentDepartment === filterDepartment;
      return matchesCampus && matchesDepartment;
    });
  };

  // Filter students for the student list view
  const getFilteredStudents = () => {
    return students.filter(student => {
      const matchesCampus = studentFilterCampus === '' || student.campusId === studentFilterCampus;
      const matchesDepartment = studentFilterDepartment === '' || student.studentDepartment === studentFilterDepartment;
      const matchesSearch = studentSearch === '' ||
        student.firstName.toLowerCase().includes(studentSearch.toLowerCase()) ||
        student.lastName.toLowerCase().includes(studentSearch.toLowerCase()) ||
        student.userId.toLowerCase().includes(studentSearch.toLowerCase());
      return matchesCampus && matchesDepartment && matchesSearch;
    });
  };

  const handleViewStudentSchedule = (student) => {
    setViewingStudent(student);
    setShowStudentSchedules(true);
    loadSchedules(student.userId);
  };

  const handleCloseStudentSchedule = () => {
    setViewingStudent(null);
    setShowStudentSchedules(false);
    setSchedules([]);
  };

  // Filter schedules based on day and subject
  const filteredSchedules = schedules.filter(schedule => {
    const matchesDay = filterDay === '' || schedule.dayOfWeek === filterDay;
    const matchesSubject = searchSubject === '' ||
      schedule.subjectName.toLowerCase().includes(searchSubject.toLowerCase()) ||
      schedule.subjectCode.toLowerCase().includes(searchSubject.toLowerCase());
    return matchesDay && matchesSubject;
  });

  return (
    <div className="schedule-management">


      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Student List Filters */}
      <div className="schedule-filters student-filters">
        <div className="filter-group">
          <label htmlFor="student-campus-filter">Filter by Campus:</label>
          <select
            id="student-campus-filter"
            value={studentFilterCampus}
            onChange={(e) => setStudentFilterCampus(e.target.value)}
          >
            <option value="">All Campuses</option>
            {campuses.map(campus => (
              <option key={campus.campusId} value={campus.campusId}>
                {campus.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="student-department-filter">Filter by Department:</label>
          <select
            id="student-department-filter"
            value={studentFilterDepartment}
            onChange={(e) => setStudentFilterDepartment(e.target.value)}
          >
            <option value="">All Departments</option>
            {getUniqueDepartments().map(dept => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="student-search">Search Students:</label>
          <input
            id="student-search"
            type="text"
            placeholder="Name, Student ID..."
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
          />
        </div>

        <button
          className="btn btn-secondary"
          onClick={() => {
            setStudentFilterCampus('');
            setStudentFilterDepartment('');
            setStudentSearch('');
          }}
        >
          Reset Filters
        </button>
      </div>

      {/* Action Buttons */}
      <div className="schedule-controls">
        <button
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          + Add Schedule
        </button>

        <button
          className="btn btn-secondary"
          onClick={() => setShowExcelUpload(true)}
        >
          <FileSpreadsheet size={16} /> Import Excel
        </button>
      </div>

      {/* Student List Table */}
      <div className="students-container">
        <div className="students-info">
        </div>

        {loading ? (
          <div className="loading">Loading students...</div>
        ) : getFilteredStudents().length === 0 ? (
          <div className="no-data">No students match the selected filters</div>
        ) : (
        <table className="students-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Program</th>
                <th>Department</th>
                <th>Campus</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getFilteredStudents().map(student => (
                <tr key={student.userId}>
                  <td>{student.firstName} {student.lastName}</td>
                  <td>{student.program}</td>
                  <td>{student.studentDepartment}</td>
                  <td>{campuses.find(c => c.campusId === student.campusId)?.name || student.campusId}</td>
                  <td>
                    <button
                      className="btn btn-primary btn-small"
                      onClick={() => handleViewStudentSchedule(student)}
                      title="View student schedule"
                    >
                      <Calendar size={14} /> View Schedule
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 2500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{ zIndex: 2501 }}>
            <AddScheduleModal
              onClose={() => setShowAddModal(false)}
              onSubmit={handleAddSchedule}
              students={students}
              campuses={campuses}
            />
          </div>
        </div>
      )}

      {showEditModal && editingSchedule && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{ zIndex: 2001 }}>
            <EditScheduleModal
              schedule={editingSchedule}
              onClose={() => {
                setShowEditModal(false);
                setEditingSchedule(null);
              }}
              onSubmit={handleEditSchedule}
            />
          </div>
        </div>
      )}

      {showExcelUpload && (
        <div className="modal-overlay" onClick={() => setShowExcelUpload(false)}>
          <div className="modal-form excel-upload-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Import Schedules from Excel</h3>
              <button className="close-btn" onClick={() => setShowExcelUpload(false)}>×</button>
            </div>
            <div className="excel-modal-content">
              <ScheduleExcelUpload
                students={students}
                campuses={campuses}
                onSuccess={handleExcelUploadSuccess}
                onError={handleExcelUploadError}
              />
            </div>
          </div>
        </div>
      )}

      {/* Student Schedule Calendar Modal */}
      {showStudentSchedules && viewingStudent && (
        <div
          className="modal-overlay"
          onClick={handleCloseStudentSchedule}
          style={{
            padding: '20px',
            backgroundColor: 'rgba(0,0,0,0.6)',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000
          }}
        >
          <div
            className="schedule-calendar-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '95vw',
              maxWidth: '1400px',
              height: '90vh',
              maxHeight: '900px',
              backgroundColor: '#fff',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              zIndex: 1001
            }}
          >
            <div className="modal-header" style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e9ecef',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8f9fa',
              borderRadius: '12px 12px 0 0'
            }}>
              <h3 style={{
                margin: 0,
                color: '#495057',
                fontSize: '24px',
                fontWeight: '600'
              }}>
                <Calendar size={20} style={{ marginRight: '8px' }} /> Weekly Schedule - {viewingStudent.firstName} {viewingStudent.lastName} ({viewingStudent.userId})
              </h3>
              <button
                className="close-btn"
                onClick={handleCloseStudentSchedule}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#6c757d',
                  padding: '0',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                ×
              </button>
            </div>

            <div className="calendar-content" style={{
              flex: 1,
              padding: '24px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Weekly Schedule View */}
              <div className="schedule-calendar" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="calendar-header" style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}>
                  <h4 style={{ margin: 0, color: '#495057', fontSize: '20px', fontWeight: '600' }}>
                    <List size={18} style={{ marginRight: '8px' }} /> Weekly Schedule Overview
                  </h4>
                </div>

                <div className="calendar-grid" style={{
                  flex: 1,
                  overflowY: 'auto',
                  border: '2px solid #e9ecef',
                  borderRadius: '10px',
                  backgroundColor: '#fff',
                  boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.05)',
                  marginBottom: '20px'
                }}>
                  <table className="calendar-table" style={{
                    width: '100%',
                    borderCollapse: 'separate',
                    borderSpacing: '1px',
                    backgroundColor: '#e9ecef'
                  }}>
                    <thead style={{
                      backgroundColor: '#f8f9fa',
                      borderBottom: '2px solid #dee2e6',
                      position: 'sticky',
                      top: '0',
                      zIndex: '10'
                    }}>
                      <tr>
                        <th style={{
                          width: '120px',
                          padding: '12px 8px',
                          textAlign: 'center',
                          fontWeight: '600',
                          color: '#495057',
                          borderRight: '2px solid #dee2e6'
                        }}>Time</th>
                        {daysOfWeek.map(day => (
                          <th key={day} style={{
                            padding: '12px 8px',
                            textAlign: 'center',
                            fontWeight: '600',
                            color: '#495057',
                            backgroundColor: day === 'Saturday' || day === 'Sunday' ? '#f8f9fa' : '#fff',
                            borderRight: day !== 'Sunday' ? '1px solid #dee2e6' : 'none'
                          }}>{day.substring(0, 3)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Generate time slots from 7:00 AM to 10:00 PM in 30-minute increments */}
                      {Array.from({ length: 28 }, (_, i) => {
                        const hour = 7 + Math.floor(i / 2);
                        const minute = (i % 2) * 30;
                        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                        const timeDisplay = `${hour > 12 ? hour - 12 : hour}:${minute.toString().padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
                        const isHourStart = minute === 0;

                        return (
                          <tr key={timeString} style={{
                            borderBottom: isHourStart ? '1px solid #e9ecef' : '1px solid #f8f9fa',
                            height: '60px'
                          }}>
                            <td className="time-cell" style={{
                              padding: '8px',
                              textAlign: 'center',
                              fontSize: '12px',
                              fontWeight: isHourStart ? '600' : '400',
                              color: isHourStart ? '#495057' : '#6c757d',
                              backgroundColor: '#f8f9fa',
                              borderRight: '2px solid #dee2e6',
                              position: 'sticky',
                              left: '0',
                              zIndex: '5'
                            }}>{timeDisplay}</td>
                            {daysOfWeek.map(day => {
                              const daySchedules = schedules.filter(s =>
                                s.dayOfWeek === day &&
                                s.startTime <= timeString &&
                                s.endTime > timeString
                              );

                              return (
                                <td key={`${day}-${timeString}`} className="day-cell" style={{
                                  padding: '4px 6px',
                                  verticalAlign: 'top',
                                  borderRight: day !== 'Sunday' ? '1px solid #dee2e6' : 'none',
                                  backgroundColor: day === 'Saturday' || day === 'Sunday' ? '#fafafa' : 'transparent',
                                  position: 'relative',
                                  minHeight: '60px'
                                }}>
                                  {daySchedules.map(schedule => {
                                    const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
                                    const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
                                    const duration = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
                                    const isLongClass = duration > 60;

                                    return (
                                      <div
                                        key={schedule.scheduleId}
                                        className="schedule-item"
                                        onClick={() => handleEditClick(schedule)}
                                        style={{
                                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                          border: '1px solid rgba(255,255,255,0.3)',
                                          borderRadius: '6px',
                                          padding: '6px 8px',
                                          margin: '2px 0',
                                          fontSize: '11px',
                                          color: 'white',
                                          cursor: 'pointer',
                                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                          minHeight: isLongClass ? 'auto' : '36px',
                                          display: 'flex',
                                          flexDirection: isLongClass ? 'column' : 'row',
                                          justifyContent: 'center',
                                          alignItems: 'center',
                                          textAlign: 'center',
                                          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.target.style.transform = 'scale(1.02)';
                                          e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.transform = 'scale(1)';
                                          e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                        }}
                                        title={`${schedule.subjectCode} - ${schedule.subjectName}\n${schedule.startTime}-${schedule.endTime}\nRoom: ${schedule.room}\nInstructor: ${schedule.instructor}`}
                                      >
                                        <div style={{
                                          fontWeight: 'bold',
                                          fontSize: '12px',
                                          marginBottom: isLongClass ? '2px' : '0',
                                          whiteSpace: isLongClass ? 'normal' : 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          maxWidth: '100%'
                                        }}>
                                          {schedule.subjectCode}
                                        </div>
                                        {isLongClass && (
                                          <div style={{
                                            fontSize: '10px',
                                            opacity: '0.9',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: '100%'
                                          }}>
                                            {schedule.subjectName.length > 18
                                              ? `${schedule.subjectName.substring(0, 18)}...`
                                              : schedule.subjectName}
                                          </div>
                                        )}
                                        <div style={{
                                          fontSize: isLongClass ? '9px' : '10px',
                                          opacity: '0.8',
                                          marginTop: isLongClass ? '2px' : '0',
                                          whiteSpace: 'nowrap',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          maxWidth: '100%'
                                        }}>
                                          {schedule.room}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Schedule List View as Alternative */}
                <div className="schedule-list-view" style={{ marginTop: '20px' }}>
                  <h4>Schedule List</h4>
                  {loading ? (
                    <div className="loading">Loading schedules...</div>
                  ) : schedules.length === 0 ? (
                    <div className="no-data">No schedules found for this student</div>
                  ) : (
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      <table className="schedule-list-table">
                        <thead>
                          <tr>
                            <th>Day</th>
                            <th>Time</th>
                            <th>Subject</th>
                            <th>Room</th>
                            <th>Instructor</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {schedules.map(schedule => (
                            <tr key={schedule.scheduleId}>
                              <td>{schedule.dayOfWeek}</td>
                              <td>{schedule.startTime} - {schedule.endTime}</td>
                              <td>
                                <div style={{ fontWeight: 'bold' }}>{schedule.subjectCode}</div>
                                <div style={{ fontSize: '12px', color: '#666' }}>{schedule.subjectName}</div>
                              </td>
                              <td>{schedule.room}</td>
                              <td>{schedule.instructor}</td>
                              <td>
                                <button
                                  className="btn btn-secondary btn-small"
                                  onClick={() => handleEditClick(schedule)}
                                  title="Edit schedule"
                                >
                                  <Edit3 size={12} /> Edit
                                </button>
                                <button
                                  className="btn btn-danger btn-small"
                                  onClick={() => handleDeleteSchedule(schedule.scheduleId)}
                                  title="Delete schedule"
                                >
                                  <Trash2 size={12} /> Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleManagement;
