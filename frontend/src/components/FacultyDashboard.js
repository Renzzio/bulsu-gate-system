// frontend/src/components/FacultyDashboard.js
import React, { useState, useEffect } from 'react';
import { getUsersByRole } from '../services/authService';
import scheduleService from '../services/scheduleService';
import { Users, Calendar, BarChart3, Settings, LogOut, Eye, BookOpen, GraduationCap, FileText, Clock, School } from 'lucide-react';
import './FacultyDashboard.css';

const facultySidebarItems = [
  { id: 'overview', label: 'Dashboard', icon: Users },
  { id: 'students', label: 'My Students', icon: Users },
  { id: 'schedules', label: 'Schedules', icon: Calendar },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings }
];

function FacultyDashboard({ user, onLogout }) {
  const [activeSection, setActiveSection] = useState('overview');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSchedule, setStudentSchedule] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [departmentSchedules, setDepartmentSchedules] = useState([]);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [loadingDepartmentSchedules, setLoadingDepartmentSchedules] = useState(false);

  useEffect(() => {
    loadStudentsInDepartment();
  }, []);

  const loadStudentsInDepartment = async () => {
    try {
      setLoading(true);
      const response = await getUsersByRole('student');
      if (response.success) {
        // Filter students by campus (same as faculty) and department-relevant programs
        const departmentStudents = response.users.filter(student => {
          // Check if student is in same campus as faculty
          const isSameCampus = student.campusId === user.campusId;

          // For CICT faculty, include IT-related programs
          const isCictProgram = student.program && (
            student.program.includes('BSIT') ||
            student.program.includes('BSCS') ||
            student.program.includes('BSIS') ||
            student.program.includes('Information')
          );

          // For Psychology faculty, include Psychology programs
          const isPsychologyProgram = student.program && (
            student.program.includes('Psychology')
          );

          // For Engineering faculty, include Engineering programs
          const isEngineeringProgram = student.program && (
            student.program.includes('Engineering')
          );

          // Add more department mappings as needed
          return isSameCampus && (
            (user.department === 'CICT' && isCictProgram) ||
            (user.department === 'Psychology' && isPsychologyProgram) ||
            (user.department === 'Engineering' && isEngineeringProgram) ||
            // For other departments, show all campus students
            true
          );
        });
        setStudents(departmentStudents);
      }
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewStudentSchedule = async (student) => {
    setSelectedStudent(student);
    setShowScheduleModal(true);
    setLoadingSchedule(true);

    try {
      const response = await scheduleService.getStudentSchedules(student.userId);
      if (response.success) {
        setStudentSchedule(response.schedules || []);
      } else {
        setStudentSchedule([]);
      }
    } catch (error) {
      console.error('Error loading student schedule:', error);
      setStudentSchedule([]);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const closeScheduleModal = () => {
    setSelectedStudent(null);
    setStudentSchedule([]);
    setShowScheduleModal(false);
  };

  const viewDepartmentSchedules = async () => {
    setShowDepartmentModal(true);
    setLoadingDepartmentSchedules(true);

    try {
      const allSchedules = [];
      // Fetch schedules for all students in the department
      for (const student of students) {
        try {
          const response = await scheduleService.getStudentSchedules(student.userId);
          if (response.success && response.schedules.length > 0) {
            const studentSchedules = response.schedules.map(schedule => ({
              ...schedule,
              studentName: `${student.firstName} ${student.lastName}`,
              studentId: student.userId,
              studentProgram: student.program || 'N/A',
              studentYear: student.yearLevel || 'N/A',
              studentSection: student.section || 'N/A'
            }));
            allSchedules.push(...studentSchedules);
          }
        } catch (error) {
          console.error(`Error loading schedule for student ${student.userId}:`, error);
          // Continue with other students even if one fails
        }
      }

      // Sort schedules by day and time
      const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      allSchedules.sort((a, b) => {
        const dayDiff = dayOrder.indexOf(a.dayOfWeek) - dayOrder.indexOf(b.dayOfWeek);
        if (dayDiff !== 0) return dayDiff;
        return a.startTime.localeCompare(b.startTime);
      });

      setDepartmentSchedules(allSchedules);
    } catch (error) {
      console.error('Error loading department schedules:', error);
      setDepartmentSchedules([]);
    } finally {
      setLoadingDepartmentSchedules(false);
    }
  };

  const closeDepartmentModal = () => {
    setDepartmentSchedules([]);
    setShowDepartmentModal(false);
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const renderSection = () => {
    if (activeSection === 'students') {
      return (
        <>
          <div className="welcome-card">
            <h2><Users size={18} /> My Department Students</h2>
            <p>
              View and monitor your department students. Check their schedules and attendance records.
            </p>
          </div>

          <div className="dashboard-stats">
            <div className="stat-card">
              <h3>Total Students</h3>
              <div className="stat-value">{students.length}</div>
            </div>
            <div className="stat-card">
              <h3>Active Today</h3>
              <div className="stat-value">--</div>
            </div>
            <div className="stat-card">
              <h3>Department</h3>
              <div className="stat-value" style={{ fontSize: '16px', fontWeight: '500' }}>{user.department}</div>
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="loading">Loading students...</div>
            </div>
          ) : students.length === 0 ? (
            <div className="no-students">
              <p>No students found in {user.department} department</p>
            </div>
          ) : (
            <div className="students-grid">
              {students.map(student => (
                <div key={student.userId} className="student-card">
                  <div className="student-info">
                    <div className="student-name">
                      <strong>{student.firstName} {student.lastName}</strong>
                    </div>
                    <div className="student-id">ID: {student.userId}</div>
                    <div className="student-details">
                      {student.program && <span className="detail"><BookOpen size={12} /> {student.program}</span>}
                      {student.yearLevel && <span className="detail"><GraduationCap size={12} /> Yr {student.yearLevel}</span>}
                      {student.section && <span className="detail"><FileText size={12} /> {student.section}</span>}
                    </div>
                  </div>
                  <div className="student-actions">
                    <button
                      className="view-schedule-btn"
                      onClick={() => viewStudentSchedule(student)}
                    >
                      <Clock size={14} /> View Schedule
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      );
    }

    if (activeSection === 'schedules') {
      return (
        <>
          <div className="welcome-card">
            <h2><Calendar size={18} /> Department Schedules</h2>
            <p>
              View class schedules for your department. Monitor course timings and student attendance patterns.
            </p>
          </div>

          <div className="dashboard-stats">
            <div className="stat-card">
              <h3>My Students</h3>
              <div className="stat-value">{students.length}</div>
            </div>
            <div className="stat-card">
              <h3>Total Classes</h3>
              <div className="stat-value">--</div>
            </div>
            <div className="stat-card">
              <h3>This Week</h3>
              <div className="stat-value">--</div>
            </div>
            <div className="stat-card">
              <h3>Department</h3>
              <div className="stat-value" style={{ fontSize: '16px', fontWeight: '500' }}>{user.department}</div>
            </div>
          </div>

          <div className="schedule-overview-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>DEPARTMENT SCHEDULE OVERVIEW</h3>
              <button
                className="view-department-btn"
                onClick={viewDepartmentSchedules}
              >
                <Eye size={16} />
                View All Schedules
              </button>
            </div>
            <div className="schedule-overview-content">
              <div className="overview-card">
                <h4>Today's Classes</h4>
                <div className="classes-count">
                  <span className="count-number">--</span>
                  <small>classes scheduled</small>
                </div>
              </div>
              <div className="overview-card">
                <h4>This Week</h4>
                <div className="week-schedule">
                  {daysOfWeek.map(day => (
                    <div key={day} className="day-summary">
                      <span className="day-name">{day.slice(0, 3)}</span>
                      <span className="day-classes">--</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      );
    }

    if (activeSection === 'reports') {
      return (
        <>
          <div className="welcome-card">
            <h2><BarChart3 size={18} /> Department Reports</h2>
            <p>
              Generate attendance reports, monitor student performance, and analyze department statistics.
            </p>
          </div>

          <div className="dashboard-stats">
            <div className="stat-card">
              <h3>Total Reports</h3>
              <div className="stat-value">--</div>
            </div>
            <div className="stat-card">
              <h3>This Month</h3>
              <div className="stat-value">--</div>
            </div>
            <div className="stat-card">
              <h3>Student Avg</h3>
              <div className="stat-value">-- %</div>
            </div>
            <div className="stat-card">
              <h3>Success Rate</h3>
              <div className="stat-value">-- %</div>
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '3rem', background: '#f8f9fa', borderRadius: '12px' }}>
            <BarChart3 size={48} color="#667eea" />
            <h3 style={{ marginTop: '1rem' }}>Reports Feature</h3>
            <p>Advanced reporting and analytics coming soon!</p>
          </div>
        </>
      );
    }

    if (activeSection === 'settings') {
      return (
        <>
          <div className="welcome-card">
            <h2><Settings size={18} /> Faculty Settings</h2>
            <p>
              Configure your preferences, notification settings, and department preferences.
            </p>
          </div>

          <div className="dashboard-stats">
            <div className="stat-card">
              <h3>Profile Status</h3>
              <div className="stat-value">Active</div>
            </div>
            <div className="stat-card">
              <h3>Last Login</h3>
              <div className="stat-value">Today</div>
            </div>
            <div className="stat-card">
              <h3>Department</h3>
              <div className="stat-value" style={{ fontSize: '16px', fontWeight: '500' }}>{user.department}</div>
            </div>
            <div className="stat-card">
              <h3>Access Level</h3>
              <div className="stat-value" style={{ fontSize: '16px', fontWeight: '500' }}>Faculty</div>
            </div>
          </div>

          <div style={{ textAlign: 'center', padding: '3rem', background: '#f8f9fa', borderRadius: '12px' }}>
            <Settings size={48} color="#667eea" />
            <h3 style={{ marginTop: '1rem' }}>Settings Panel</h3>
            <p>User preferences and configuration coming soon!</p>
          </div>
        </>
      );
    }

    // Default to overview
    return (
      <>
        <div className="welcome-card">
          <h2>Welcome, Prof. {user.lastName}!</h2>
          <p>
            Monitor your students' attendance and movement records. View class schedules
            and manage gate permissions for your courses.
          </p>
        </div>

        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>My Students</h3>
            <div className="stat-value">{students.length}</div>
          </div>
          <div className="stat-card">
            <h3>Classes Today</h3>
            <div className="stat-value">--</div>
          </div>
          <div className="stat-card">
            <h3>Present Today</h3>
            <div className="stat-value">--</div>
          </div>
          <div className="stat-card">
            <h3>Department</h3>
            <div className="stat-value" style={{ fontSize: '16px', fontWeight: '500' }}>{user.department}</div>
          </div>
        </div>

        <div className="schedule-overview-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>DEPARTMENT SCHEDULE OVERVIEW</h3>
            <button
              className="view-department-btn"
              onClick={viewDepartmentSchedules}
            >
              <Eye size={16} />
              View All Department Schedules
            </button>
          </div>
          <div className="schedule-overview-content">
            <div className="overview-card">
              <h4>Today's Classes</h4>
              <div className="classes-count">
                <span className="count-number">--</span>
                <small>classes scheduled</small>
              </div>
            </div>
            <div className="overview-card">
              <h4>This Week</h4>
              <div className="week-schedule">
                {daysOfWeek.map(day => (
                  <div key={day} className="day-summary">
                    <span className="day-name">{day.slice(0, 3)}</span>
                    <span className="day-classes">--</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="students-section">
          <h3>MY DEPARTMENT STUDENTS</h3>

          {loading ? (
            <div className="loading-container">
              <div className="loading">Loading students...</div>
            </div>
          ) : students.length === 0 ? (
            <div className="no-students">
              <p>No students found in {user.department} department</p>
            </div>
          ) : (
            <div className="students-grid">
              {students.slice(0, 6).map(student => (
                <div key={student.userId} className="student-card student-card-compact">
                  <div className="student-info">
                    <div className="student-name">
                      <strong>{student.firstName} {student.lastName}</strong>
                    </div>
                    <div className="student-details">
                      {student.program && <span className="detail"><BookOpen size={12} /> {student.program}</span>}
                      {student.yearLevel && <span className="detail"><GraduationCap size={12} /> Yr {student.yearLevel}</span>}
                    </div>
                  </div>
                  <div className="student-actions">
                    <button
                      className="view-schedule-btn"
                      onClick={() => viewStudentSchedule(student)}
                    >
                      <Clock size={14} /> View Schedule
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="faculty-layout">
      {/* Sidebar */}
      <aside className="faculty-sidebar">
        <div className="logo">
          <div className="emblem">🎓</div>
          <span>BulSU Gate</span>
        </div>

        <nav>
          {facultySidebarItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                className={activeSection === item.id ? 'active' : ''}
                onClick={() => setActiveSection(item.id)}
              >
                <IconComponent size={16} />
                <span className="label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button className="logout-btn" onClick={onLogout}>
          <LogOut size={16} />
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <div className="faculty-main">
        {/* Topbar */}
        <header className="faculty-topbar">
          <div>
            <h1>{facultySidebarItems.find(item => item.id === activeSection)?.label || 'Faculty Dashboard'}</h1>
            <p>{activeSection === 'overview' ? 'Dashboard overview and statistics' : 'Manage department resources'}</p>
          </div>
          <div className="topbar-actions">
            <div className="topbar-user">
              <span>{user.firstName} {user.lastName}</span>
              <small>Faculty - {user.department}</small>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="faculty-content">
          {renderSection()}
        </div>
      </div>

      {/* Student Schedule Modal */}
      {showScheduleModal && selectedStudent && (
        <div className="schedule-modal-overlay" onClick={closeScheduleModal}>
          <div className="schedule-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="schedule-modal-header">
              <h3><Clock size={18} /> {selectedStudent.firstName} {selectedStudent.lastName}'s Schedule</h3>
              <button className="schedule-close-btn" onClick={closeScheduleModal}>×</button>
            </div>

            <div className="schedule-modal-body">
              {loadingSchedule ? (
                <div className="schedule-loading">Loading schedule...</div>
              ) : studentSchedule.length === 0 ? (
                <div className="schedule-empty">No schedule found for this student</div>
              ) : (
                <div className="schedule-list">
                  <table className="faculty-schedule-table">
                    <thead>
                      <tr>
                        <th>Day</th>
                        <th>Time</th>
                        <th>Subject</th>
                        <th>Room</th>
                        <th>Instructor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentSchedule.map(schedule => (
                        <tr key={schedule.scheduleId}>
                          <td>{schedule.dayOfWeek}</td>
                          <td>{schedule.startTime} - {schedule.endTime}</td>
                          <td>
                            <div style={{ fontWeight: 'bold' }}>{schedule.subjectCode}</div>
                            <div style={{ fontSize: '12px', color: '#666' }}>{schedule.subjectName}</div>
                          </td>
                          <td>{schedule.room}</td>
                          <td>{schedule.instructor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Department Schedules Modal */}
      {showDepartmentModal && (
        <div className="schedule-modal-overlay" onClick={closeDepartmentModal}>
          <div className="schedule-modal-content department-schedule-modal" onClick={(e) => e.stopPropagation()}>
            <div className="schedule-modal-header">
              <h3><School size={18} /> {user.department} Department - All Student Schedules</h3>
              <button className="schedule-close-btn" onClick={closeDepartmentModal}>×</button>
            </div>

            <div className="schedule-modal-body">
              {loadingDepartmentSchedules ? (
                <div className="schedule-loading">Loading department schedules...</div>
              ) : departmentSchedules.length === 0 ? (
                <div className="schedule-empty">No schedules found for department students</div>
              ) : (
                <div className="schedule-list">
                  <table className="faculty-schedule-table department-schedule-table">
                    <thead>
                      <tr>
                        <th>Day</th>
                        <th>Time</th>
                        <th>Subject</th>
                        <th>Room</th>
                        <th>Instructor</th>
                        <th>Student</th>
                        <th>Program</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departmentSchedules.map(schedule => (
                        <tr key={`${schedule.studentId}-${schedule.scheduleId}`}>
                          <td>{schedule.dayOfWeek}</td>
                          <td>{schedule.startTime} - {schedule.endTime}</td>
                          <td>
                            <div style={{ fontWeight: 'bold' }}>{schedule.subjectCode}</div>
                            <div style={{ fontSize: '12px', color: '#666' }}>{schedule.subjectName}</div>
                          </td>
                          <td>{schedule.room}</td>
                          <td>{schedule.instructor}</td>
                          <td>
                            <div style={{ fontWeight: 'bold', color: '#667eea' }}>{schedule.studentName}</div>
                            <div style={{ fontSize: '11px', color: '#666' }}>{schedule.studentId}</div>
                          </td>
                          <td>
                            <div>{schedule.studentProgram}</div>
                            <div style={{ fontSize: '11px', color: '#666' }}>Yr {schedule.studentYear}, {schedule.studentSection}</div>
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
      )}
    </div>
  );
}

export default FacultyDashboard;
