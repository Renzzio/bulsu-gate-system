import React, { useState, useEffect } from 'react';
import scheduleService from '../services/scheduleService';
import { Calendar, CreditCard, History, LogOut, User, BookOpen, GraduationCap, FileText, Clock, Eye, Bell } from 'lucide-react';
import './StudentDashboard.css';

function StudentDashboard({ user, onLogout }) {
  const [activeSection, setActiveSection] = useState('overview');
  const [studentSchedule, setStudentSchedule] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  useEffect(() => {
    if (activeSection === 'schedule') {
      loadStudentSchedule();
    }
  }, [activeSection]);

  const loadStudentSchedule = async () => {
    setLoadingSchedule(true);
    try {
      const response = await scheduleService.getStudentSchedules(user.userId);
      if (response.success) {
        setStudentSchedule(response.schedules || []);
      }
    } catch (error) {
      console.error('Error loading student schedule:', error);
      setStudentSchedule([]);
    } finally {
      setLoadingSchedule(false);
    }
  };

  const viewSchedule = () => {
    setActiveSection('schedule');
    setShowScheduleModal(true);
    loadStudentSchedule();
  };

  const closeScheduleModal = () => {
    setShowScheduleModal(false);
  };

  const actions = [
    {
      icon: Calendar,
      label: 'View Schedule',
      action: viewSchedule,
      description: 'Check your class schedule and timing'
    },
    {
      icon: CreditCard,
      label: 'Generate QR Code',
      action: () => alert('QR Code generation coming soon!'),
      description: 'Create your gate entry pass'
    },
    {
      icon: History,
      label: 'Access History',
      action: () => setActiveSection('history'),
      description: 'Review your gate access records'
    },
    {
      icon: User,
      label: 'My Profile',
      action: () => setActiveSection('profile'),
      description: 'View and edit your information'
    },
    {
      icon: Bell,
      label: 'Notifications',
      action: () => setActiveSection('notifications'),
      description: 'Check important announcements'
    }
  ];

  const stats = [
    {
      label: 'Gate Pass Status',
      value: 'Allowed',
      color: '#28a745'
    },
    {
      label: 'Today\'s Classes',
      value: '4',
      color: '#007bff'
    },
    {
      label: 'Campus Entries',
      value: '2',
      color: '#ff9800'
    },
    {
      label: 'This Month',
      value: '42',
      color: '#9c27b0'
    }
  ];

  return (
    <div className="student-layout">
      <aside className="student-sidebar">
        <div className="logo">
          <div className="emblem">🎓</div>
          <span>BulSU Gate</span>
        </div>

        <nav>
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className={activeSection === action.label.toLowerCase().replace(/\s+/g, '') ? 'active' : ''}
            >
              <action.icon size={16} />
              {action.label}
            </button>
          ))}
        </nav>

        <button className="logout-btn" onClick={onLogout}>
          <LogOut size={16} />
          Logout
        </button>
      </aside>

      <div className="student-main">
        <header className="student-topbar">
          <div>
            <h1>Student Portal - {user.program}</h1>
            <p>{user.program} {user.section} • Year {user.yearLevel}</p>
          </div>
          <div className="topbar-actions">
            <div className="topbar-user">
              <span>{user.firstName} {user.lastName}</span>
              <small>Student</small>
            </div>
          </div>
        </header>

        <main className="student-content">
          <div className="welcome-card">
            <h2>Welcome, {user.firstName}!</h2>
            <p>
              Student Number: <strong>{user.studentNumber}</strong> |
              Year Level: <strong>{user.yearLevel}</strong>
            </p>
            <p style={{ marginTop: '10px' }}>
              View your class schedule, generate gate passes, and check your access permissions.
            </p>
          </div>

          <div className="dashboard-stats">
            {stats.map((stat, index) => (
              <div key={index} className="stat-card">
                <h3>{stat.label}</h3>
                <div className="stat-value" style={{ color: stat.color }}>
                  {stat.label === 'Gate Pass Status' ? `✓ ${stat.value}` : stat.value}
                </div>
              </div>
            ))}
          </div>

          <div className="quick-actions">
            <h3>Quick Actions</h3>
            <div className="action-buttons">
              {actions.map((action, index) => (
                <button
                  key={index}
                  className="action-button"
                  onClick={action.action}
                  disabled={action.action.toString().includes('alert')}
                >
                  <action.icon size={18} />
                  <div>
                    <div className="action-title">{action.label}</div>
                    <div className="action-desc">{action.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Additional content based on active section */}
          {activeSection === 'history' && (
            <div className="section-content">
              <h3>Access History</h3>
              <p>Coming soon...</p>
            </div>
          )}

          {activeSection === 'profile' && (
            <div className="section-content">
              <h3>My Profile</h3>
              <div className="profile-info">
                <div className="detail"><BookOpen size={12} /> <strong>Programs:</strong> {user.program}</div>
                <div className="detail"><GraduationCap size={12} /> <strong>Year Level:</strong> {user.yearLevel}</div>
                <div className="detail"><FileText size={12} /> <strong>Section:</strong> {user.section}</div>
                <div className="detail"><User size={12} /> <strong>Student Number:</strong> {user.studentNumber}</div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="section-content">
              <h3>Notifications</h3>
              <p>Coming soon...</p>
            </div>
          )}
        </main>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="schedule-modal-overlay" onClick={closeScheduleModal}>
          <div className="schedule-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="schedule-modal-header">
              <h3><Clock size={18} /> My Class Schedule</h3>
              <button className="schedule-close-btn" onClick={closeScheduleModal}>×</button>
            </div>

            <div className="schedule-modal-body">
              {loadingSchedule ? (
                <div className="schedule-loading">Loading schedule...</div>
              ) : studentSchedule.length === 0 ? (
                <div className="schedule-empty">No schedule found</div>
              ) : (
                <div className="schedule-list">
                  <table className="student-schedule-table">
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
    </div>
  );
}

export default StudentDashboard;
