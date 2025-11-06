// frontend/src/components/admin/ScheduleManagement.js
import React, { useState, useEffect } from 'react';
import { getSchedules, createSchedule, updateSchedule, deleteSchedule, getAllUsers } from '../../services/adminService';

function ScheduleManagement() {
  const [schedules, setSchedules] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  
  const [formData, setFormData] = useState({
    userId: '',
    subject: '',
    day: 'Monday',
    startTime: '',
    endTime: '',
    room: '',
    section: '',
    instructor: ''
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    fetchSchedules();
    fetchStudents();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await getSchedules();
      if (response.success) {
        setSchedules(response.schedules);
      }
    } catch (err) {
      setError(err.message || 'Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await getAllUsers('student', 'active');
      if (response.success) {
        setStudents(response.users);
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleCreateSchedule = () => {
    setModalMode('create');
    setFormData({
      userId: '',
      subject: '',
      day: 'Monday',
      startTime: '',
      endTime: '',
      room: '',
      section: '',
      instructor: ''
    });
    setShowModal(true);
  };

  const handleEditSchedule = (schedule) => {
    setModalMode('edit');
    setSelectedSchedule(schedule);
    setFormData({
      userId: schedule.userId,
      subject: schedule.subject,
      day: schedule.day,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      room: schedule.room || '',
      section: schedule.section || '',
      instructor: schedule.instructor || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (modalMode === 'create') {
        const response = await createSchedule(formData);
        if (response.success) {
          alert('Schedule created successfully!');
          fetchSchedules();
          setShowModal(false);
        }
      } else {
        const response = await updateSchedule(selectedSchedule.scheduleId, formData);
        if (response.success) {
          alert('Schedule updated successfully!');
          fetchSchedules();
          setShowModal(false);
        }
      }
    } catch (err) {
      alert(err.message || 'Operation failed');
    }
  };

  const handleDeleteSchedule = async (scheduleId, subject) => {
    if (window.confirm(`Are you sure you want to delete ${subject}?`)) {
      try {
        const response = await deleteSchedule(scheduleId);
        if (response.success) {
          alert('Schedule deleted successfully!');
          fetchSchedules();
        }
      } catch (err) {
        alert(err.message || 'Failed to delete schedule');
      }
    }
  };

  const getStudentName = (userId) => {
    const student = students.find(s => s.userId === userId);
    return student ? `${student.firstName} ${student.lastName}` : userId;
  };

  return (
    <div className="schedule-management-container">
      <div className="page-header">
        <div>
          <h2>Schedule Management</h2>
          <p>Manage student class timetables</p>
        </div>
        <button className="primary-button" onClick={handleCreateSchedule}>
          + Add New Schedule
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading schedules...</p>
        </div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Subject</th>
                <th>Day</th>
                <th>Time</th>
                <th>Room</th>
                <th>Section</th>
                <th>Instructor</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                    No schedules found
                  </td>
                </tr>
              ) : (
                schedules.map(schedule => (
                  <tr key={schedule.scheduleId}>
                    <td>{getStudentName(schedule.userId)}</td>
                    <td><strong>{schedule.subject}</strong></td>
                    <td>{schedule.day}</td>
                    <td>{schedule.startTime} - {schedule.endTime}</td>
                    <td>{schedule.room || 'N/A'}</td>
                    <td>{schedule.section || 'N/A'}</td>
                    <td>{schedule.instructor || 'N/A'}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="edit-button"
                          onClick={() => handleEditSchedule(schedule)}
                        >
                          Edit
                        </button>
                        <button 
                          className="delete-button"
                          onClick={() => handleDeleteSchedule(schedule.scheduleId, schedule.subject)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Schedule Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalMode === 'create' ? 'Add New Schedule' : 'Edit Schedule'}</h3>
              <button className="close-button" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Student *</label>
                <select
                  name="userId"
                  value={formData.userId}
                  onChange={handleInputChange}
                  required
                  disabled={modalMode === 'edit'}
                >
                  <option value="">Select Student</option>
                  {students.map(student => (
                    <option key={student.userId} value={student.userId}>
                      {student.firstName} {student.lastName} ({student.studentNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Subject *</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., IT 305 - Advanced Web Development"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Day *</label>
                  <select
                    name="day"
                    value={formData.day}
                    onChange={handleInputChange}
                    required
                  >
                    {days.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Start Time *</label>
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>End Time *</label>
                  <input
                    type="time"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Room</label>
                  <input
                    type="text"
                    name="room"
                    value={formData.room}
                    onChange={handleInputChange}
                    placeholder="e.g., Room 301"
                  />
                </div>

                <div className="form-group">
                  <label>Section</label>
                  <input
                    type="text"
                    name="section"
                    value={formData.section}
                    onChange={handleInputChange}
                    placeholder="e.g., 3H"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Instructor</label>
                <input
                  type="text"
                  name="instructor"
                  value={formData.instructor}
                  onChange={handleInputChange}
                  placeholder="e.g., Prof. Juan Dela Cruz"
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-button">
                  {modalMode === 'create' ? 'Create Schedule' : 'Update Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScheduleManagement;