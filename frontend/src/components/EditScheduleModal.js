import React, { useState, useEffect } from 'react';
import './ScheduleModal.css';

const EditScheduleModal = ({ schedule, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    subjectCode: '',
    subjectName: '',
    dayOfWeek: '',
    startTime: '',
    endTime: '',
    room: '',
    instructor: '',
    section: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Initialize form with schedule data
  useEffect(() => {
    if (schedule) {
      setFormData({
        subjectCode: schedule.subjectCode || '',
        subjectName: schedule.subjectName || '',
        dayOfWeek: schedule.dayOfWeek || '',
        startTime: schedule.startTime || '',
        endTime: schedule.endTime || '',
        room: schedule.room || '',
        instructor: schedule.instructor || '',
        section: schedule.section || ''
      });
    }
  }, [schedule]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.subjectCode.trim()) {
      newErrors.subjectCode = 'Subject code is required';
    }
    if (!formData.subjectName.trim()) {
      newErrors.subjectName = 'Subject name is required';
    }
    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }
    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    }
    if (!formData.room.trim()) {
      newErrors.room = 'Room is required';
    }
    if (!formData.instructor.trim()) {
      newErrors.instructor = 'Instructor is required';
    }

    // Validate time ordering
    if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
      newErrors.endTime = 'End time must be after start time';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Schedule</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="subjectCode">Subject Code *</label>
              <input
                id="subjectCode"
                type="text"
                name="subjectCode"
                placeholder="e.g., COMP101"
                value={formData.subjectCode}
                onChange={handleChange}
                className={errors.subjectCode ? 'error' : ''}
              />
              {errors.subjectCode && <span className="error-text">{errors.subjectCode}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="subjectName">Subject Name *</label>
              <input
                id="subjectName"
                type="text"
                name="subjectName"
                placeholder="e.g., Introduction to Programming"
                value={formData.subjectName}
                onChange={handleChange}
                className={errors.subjectName ? 'error' : ''}
              />
              {errors.subjectName && <span className="error-text">{errors.subjectName}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dayOfWeek">Day of Week *</label>
              <select
                id="dayOfWeek"
                name="dayOfWeek"
                value={formData.dayOfWeek}
                onChange={handleChange}
              >
                <option value="">-- Select Day --</option>
                {daysOfWeek.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="section">Section</label>
              <input
                id="section"
                type="text"
                name="section"
                placeholder="e.g., A or 1"
                value={formData.section}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startTime">Start Time (HH:mm) *</label>
              <input
                id="startTime"
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                className={errors.startTime ? 'error' : ''}
              />
              {errors.startTime && <span className="error-text">{errors.startTime}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="endTime">End Time (HH:mm) *</label>
              <input
                id="endTime"
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                className={errors.endTime ? 'error' : ''}
              />
              {errors.endTime && <span className="error-text">{errors.endTime}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="room">Room *</label>
              <input
                id="room"
                type="text"
                name="room"
                placeholder="e.g., A101 or Building A Room 101"
                value={formData.room}
                onChange={handleChange}
                className={errors.room ? 'error' : ''}
              />
              {errors.room && <span className="error-text">{errors.room}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="instructor">Instructor *</label>
              <input
                id="instructor"
                type="text"
                name="instructor"
                placeholder="e.g., Dr. John Doe"
                value={formData.instructor}
                onChange={handleChange}
                className={errors.instructor ? 'error' : ''}
              />
              {errors.instructor && <span className="error-text">{errors.instructor}</span>}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditScheduleModal;
