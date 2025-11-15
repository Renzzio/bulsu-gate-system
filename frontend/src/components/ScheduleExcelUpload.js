// frontend/src/components/ScheduleExcelUpload.js
import React, { useState, useRef, useEffect } from 'react';
import scheduleService from '../services/scheduleService';
import gateService from '../services/gateService';
import './ScheduleExcelUpload.css';

const ScheduleExcelUpload = ({ students = [], campuses = [], onSuccess, onError }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [filterCampus, setFilterCampus] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const fileInputRef = useRef(null);

  const validateFile = (file) => {
    if (!file) return false;

    // Validate file extension
    const validExtensions = ['.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

    if (!hasValidExtension) {
      setUploadStatus({
        type: 'error',
        message: 'Please select a valid Excel file (.xlsx or .xls)'
      });
      return false;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setUploadStatus({
        type: 'error',
        message: 'File size must be less than 5MB'
      });
      return false;
    }

    return true;
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !validateFile(file)) return;

    await uploadSchedules(file);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!validateFile(file)) return;

    await uploadSchedules(file);
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

  const uploadSchedules = async (file) => {
    if (selectedStudents.length === 0) {
      setUploadStatus({
        type: 'error',
        message: 'Please select at least one student before uploading the Excel file.'
      });
      return;
    }

    setUploading(true);
    setUploadStatus(null);
    const results = { successful: [], failed: [], totalRows: 0 };

    try {
      // Upload schedules for each selected student
      for (const studentId of selectedStudents) {
        const formData = new FormData();
        formData.append('file', file);

        try {
          const response = await scheduleService.importSchedulesFromExcel(studentId, formData);
          if (response.success) {
            const studentResults = response.results;
            results.successful.push(...studentResults.successful);
            results.failed.push(...studentResults.failed);
            results.totalRows += studentResults.totalRows;
          } else {
            results.failed.push({
              row: 'N/A',
              errors: [`Failed for student ${studentId}: ${response.message}`]
            });
          }
        } catch (error) {
          results.failed.push({
            row: 'N/A',
            errors: [`Failed for student ${studentId}: ${error.message}`]
          });
        }
      }

      if (results.successful.length > 0) {
        setUploadStatus({
          type: 'success',
          message: `Import completed for ${selectedStudents.length} student${selectedStudents.length > 1 ? 's' : ''}`,
          details: {
            successful: results.successful.length,
            failed: results.failed.length,
            total: results.totalRows
          }
        });

        if (onSuccess) {
          onSuccess(results);
        }
      } else {
        setUploadStatus({
          type: 'error',
          message: 'All imports failed'
        });
        if (onError) {
          onError({ message: 'All imports failed' });
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus({
        type: 'error',
        message: error.message || 'Failed to upload schedules'
      });
      if (onError) {
        onError(error);
      }
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    // Create an Excel template using XLSX library
    const XLSX = require('xlsx');
    
    const headers = ['subjectCode', 'subjectName', 'dayOfWeek', 'startTime', 'endTime', 'room', 'instructor', 'section'];
    const sampleData = [
      ['COMP101', 'Introduction to Programming', 'Monday', '08:00', '10:00', 'A101', 'Dr. John Doe', 'A'],
      ['MATH201', 'Calculus II', 'Tuesday', '10:30', '12:30', 'A102', 'Dr. Jane Smith', 'B'],
      ['PHYS101', 'Physics I', 'Wednesday', '14:00', '16:00', 'A103', 'Dr. Bob Johnson', 'A']
    ];

    // Create worksheet data
    const worksheetData = [headers, ...sampleData];
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    
    // Set column widths for better readability
    const columnWidths = [15, 30, 15, 12, 12, 12, 20, 10];
    worksheet['!cols'] = columnWidths.map(width => ({ wch: width }));
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Schedules');
    XLSX.writeFile(workbook, 'schedule-template.xlsx');
  };

  return (
    <div className="excel-upload-container">
      {/* Student Selection Section for Excel Upload */}
      <div className="student-select-panel" style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
        <h4 style={{ marginBottom: '15px', color: '#333' }}>Select Students for Excel Import</h4>

        {/* Student Filters */}
        <div className="form-row" style={{ marginBottom: '15px' }}>
          <div className="form-group" style={{ flex: '1', marginRight: '10px' }}>
            <label htmlFor="excel-campus-filter">Filter by Campus:</label>
            <select
              id="excel-campus-filter"
              value={filterCampus}
              onChange={(e) => setFilterCampus(e.target.value)}
              disabled={uploading}
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
            <label htmlFor="excel-department-filter">Filter by Department:</label>
            <select
              id="excel-department-filter"
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              disabled={uploading}
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
            <label htmlFor="excel-student-search">Search Students:</label>
            <input
              id="excel-student-search"
              type="text"
              placeholder="Name or Student ID..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              disabled={uploading}
            />
          </div>
        </div>

        {/* Selection Actions */}
        <div style={{ marginBottom: '15px', display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSelectAllStudents}
            disabled={uploading || getFilteredStudents().length === 0}
          >
            Select All Filtered
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClearSelection}
            disabled={uploading || selectedStudents.length === 0}
          >
            Clear Selection
          </button>
          <span style={{ alignSelf: 'center', fontSize: '14px', fontWeight: 'bold' }}>
            {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''} selected
          </span>
        </div>

        {/* Student List */}
        <div className="student-list" style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '10px', backgroundColor: 'white' }}>
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
                  transition: 'all 0.2s',
                  opacity: uploading ? 0.6 : 1
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(student.userId)}
                  onChange={() => handleStudentToggle(student.userId)}
                  disabled={uploading}
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
      <div 
        className="upload-box"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          disabled={uploading}
          className="file-input"
          aria-label="Upload Excel file"
        />
        
        <div className="upload-content">
          <div className="upload-icon">📊</div>
          <h3>Upload Excel File</h3>
          <p>Drag and drop your Excel file or click to browse</p>
          <p className="file-info">Supported formats: .xlsx, .xls (Max 5MB)</p>
          
          <div className="upload-buttons">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Select File'}
            </button>
            
            <button
              type="button"
              className="btn btn-secondary"
              onClick={downloadTemplate}
              disabled={uploading}
            >
              📥 Download Template (.xlsx)
            </button>
          </div>
        </div>
      </div>

      {uploadStatus && (
        <div className={`upload-status ${uploadStatus.type}`}>
          <div className="status-icon">
            {uploadStatus.type === 'success' ? '✅' : '❌'}
          </div>
          <div className="status-content">
            <p className="status-message">{uploadStatus.message}</p>
            {uploadStatus.details && (
              <div className="status-details">
                <span className="detail-item">
                  ✅ {uploadStatus.details.successful} schedules imported
                </span>
                {uploadStatus.details.failed > 0 && (
                  <span className="detail-item failed">
                    ❌ {uploadStatus.details.failed} rows failed
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="excel-instructions">
        <h4>Excel Format Instructions:</h4>
        <ul>
          <li><strong>Column A (subjectCode):</strong> e.g., COMP101</li>
          <li><strong>Column B (subjectName):</strong> e.g., Introduction to Programming</li>
          <li><strong>Column C (dayOfWeek):</strong> Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, or Sunday</li>
          <li><strong>Column D (startTime):</strong> Time in HH:mm format (24-hour), e.g., 08:00</li>
          <li><strong>Column E (endTime):</strong> Time in HH:mm format (24-hour), e.g., 10:00</li>
          <li><strong>Column F (room):</strong> e.g., A101</li>
          <li><strong>Column G (instructor):</strong> e.g., Dr. John Doe</li>
          <li><strong>Column H (section):</strong> Optional - e.g., A, B, 1, 2</li>
        </ul>
      </div>
    </div>
  );
};

export default ScheduleExcelUpload;
