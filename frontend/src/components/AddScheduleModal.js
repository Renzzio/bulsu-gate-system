// frontend/src/components/AddScheduleModal.js
import React, { useState, useEffect } from 'react';
import * as authService from '../services/authService';
import gateService from '../services/gateService';
import './ScheduleModal.css';

const AddScheduleModal = ({ onClose, onSubmit, students, campuses }) => {
  const [formData, setFormData] = useState({
    subjectCode: '',
    subjectName: '',
    dayOfWeek: 'Monday',
    startTime: '',
    endTime: '',
    room: '',
    instructor: '',
    section: ''
    
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Student selection and filtering
  const [filterCampus, setFilterCampus] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [allFaculty, setAllFaculty] = useState([]);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Load faculty data and campuses on component mount
  useEffect(() => {
    loadFaculty();
    if (students.length > 0 && selectedStudents.length === 0) {
      // Auto-select the first student from filtered list for convenience
      const filtered = getFilteredStudents();
      if (filtered.length > 0) {
        setSelectedStudents([filtered[0].userId]);
      }
    }
  }, [students]);

  const loadFaculty = async () => {
    try {
      const facultyResponse = await authService.getUsersByRole('faculty');
      if (facultyResponse.success && facultyResponse.users) {
        setAllFaculty(facultyResponse.users);
        setFaculty(facultyResponse.users); // Initially show all faculty
      }
    } catch (error) {
      console.error('Error loading faculty data:', error);
    }
  };

  // Get filtered students based on campus, department, and search
  const getFilteredStudents = () => {
    return students.filter(student => {
      const matchesCampus = filterCampus === '' || student.campusId === filterCampus;
      const matchesDepartment = filterDepartment === '' || student.studentDepartment === filterDepartment;
      const matchesSearch = studentSearch === '' ||
        student.firstName.toLowerCase().includes(studentSearch.toLowerCase()) ||
        student.lastName.toLowerCase().includes(studentSearch.toLowerCase()) ||
        student.userId.toLowerCase().includes(studentSearch.toLowerCase());

      return matchesCampus && matchesDepartment && matchesSearch;
    });
  };

  // Get unique departments for filter dropdown
  const getUniqueDepartments = () => {
    const departments = students.map(student => student.studentDepartment).filter(Boolean);
    return [...new Set(departments)].sort();
  };

  const handleStudentToggle = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleSelectAllStudents = () => {
    const filtered = getFilteredStudents();
    const allIds = filtered.map(s => s.userId);
    setSelectedStudents(allIds);
  };

  const handleClearSelection = () => {
    setSelectedStudents([]);
  };

  // Update faculty list when selected students change (for better instructor suggestions)
  useEffect(() => {
    if (selectedStudents.length > 0) {
      const selectedStudentObjects = students.filter(s => selectedStudents.includes(s.userId));
      const departments = selectedStudentObjects.map(s => s.studentDepartment).filter(Boolean);
      const uniqueDepts = [...new Set(departments)];

      if (uniqueDepts.length > 0) {
        const filteredFaculty = allFaculty.filter(fac =>
          fac.department && uniqueDepts.some(dept =>
            fac.department.toLowerCase().includes(dept.toLowerCase())
          )
        );
        setFaculty(filteredFaculty.length > 0 ? filteredFaculty : allFaculty);
      } else {
        setFaculty(allFaculty);
      }
    } else {
      setFaculty(allFaculty);
    }
  }, [selectedStudents, students, allFaculty]);

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

    if (selectedStudents.length === 0) {
      setErrors({ students: 'Please select at least one student' });
      return;
    }

    setLoading(true);
    try {
      // Submit schedule for each selected student
      for (const studentId of selectedStudents) {
        const selectedStudentObj = students.find(s => s.userId === studentId);
        const scheduleData = {
          ...formData,
          studentId,
          campusId: selectedStudentObj?.campusId
        };
        await onSubmit(scheduleData);
      }
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
          <h3>Add New Schedule</h3>
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
              <select
                id="instructor"
                name="instructor"
                value={formData.instructor}
                onChange={handleChange}
                className={errors.instructor ? 'error' : ''}
              >
                <option value="">-- Select Instructor --</option>
                {faculty.map(fac => (
                  <option key={fac.userId} value={`${fac.firstName} ${fac.lastName}`}>
                    {fac.firstName} {fac.lastName} - {fac.position || 'Faculty'} ({fac.department})
                  </option>
                ))}
              </select>
              {errors.instructor && <span className="error-text">{errors.instructor}</span>}
              {faculty.length === 0 && (
                <input
                  type="text"
                  name="instructor"
                  placeholder="Enter instructor name manually"
                  value={formData.instructor}
                  onChange={handleChange}
                  style={{ marginTop: '8px', width: '100%', padding: '8px', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                />
              )}
            </div>
          </div>

          {/* Student Selection Section */}
          <div className="student-selection-section" style={{ marginTop: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
            <h4 style={{ marginBottom: '15px', color: '#333' }}>Select Students for this Schedule</h4>
            {errors.students && <span className="error-text" style={{ display: 'block', marginBottom: '10px' }}>{errors.students}</span>}

            {/* Student Filters */}
            <div className="form-row" style={{ marginBottom: '15px' }}>
              <div className="form-group" style={{ flex: '1', marginRight: '10px' }}>
                <label htmlFor="student-campus-filter">Filter by Campus:</label>
                <select
                  id="student-campus-filter"
                  value={filterCampus}
                  onChange={(e) => setFilterCampus(e.target.value)}
                >
                  <option value="">All Campuses</option>
                  {campuses.map(campus => (
                    <option key={campus.campusId} value={campus.campusId}>
                      {campus.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ flex: '1', marginRight: '10px' }}>
                <label htmlFor="student-department-filter">Filter by Department:</label>
                <select
                  id="student-department-filter"
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                >
                  <option value="">All Departments</option>
                  {getUniqueDepartments().map(dept => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ flex: '1' }}>
                <label htmlFor="student-search">Search Students:</label>
                <input
                  id="student-search"
                  type="text"
                  placeholder="Name or Student ID..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Selection Actions */}
            <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={handleSelectAllStudents}>
                Select All Filtered
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleClearSelection}>
                Clear Selection
              </button>
              <span style={{ alignSelf: 'center', fontSize: '14px' }}>
                {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} selected
              </span>
            </div>

            {/* Student List */}
            <div className="student-list" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '10px' }}>
              {getFilteredStudents().length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666', margin: '20px 0' }}>No students found matching filters</p>
              ) : (
                getFilteredStudents().map(student => (
                  <label
                    key={student.userId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px',
                      margin: '2px 0',
                      backgroundColor: selectedStudents.includes(student.userId) ? '#e3f2fd' : 'transparent',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      border: '1px solid transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.userId)}
                      onChange={() => handleStudentToggle(student.userId)}
                      style={{ marginRight: '10px' }}
                    />
                    <div>
                      <strong>{student.firstName} {student.lastName}</strong> ({student.userId})
                      <br />
                      <small style={{ color: '#666' }}>
                        {student.studentDepartment} - {campuses.find(c => c.campusId === student.campusId)?.name || student.campusId}
                      </small>
                    </div>
                  </label>
                ))
              )}
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
              {loading ? 'Adding...' : 'Add Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddScheduleModal;
