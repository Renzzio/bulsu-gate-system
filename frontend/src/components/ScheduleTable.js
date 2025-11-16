// frontend/src/components/ScheduleTable.js
import React from 'react';
import './ScheduleTable.css';

const ScheduleTable = ({ schedules, onEdit, onDelete }) => {
  const formatTime = (time) => {
    if (!time) return 'N/A';
    return time; // Time is already in HH:mm format
  };

  return (
    <div className="schedule-table-container">
      <table className="schedule-table">
        <thead>
          <tr>
            <th>Subject Code</th>
            <th>Subject Name</th>
            <th>Day</th>
            <th>Time</th>
            <th>Room</th>
            <th>Instructor</th>
            <th>Section</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {schedules.map(schedule => (
            <tr key={schedule.scheduleId} className="schedule-row">
              <td className="subject-code">{schedule.subjectCode}</td>
              <td className="subject-name">{schedule.subjectName}</td>
              <td className="day-cell">{schedule.dayOfWeek}</td>
              <td className="time-cell">
                {formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}
              </td>
              <td className="room-cell">{schedule.room}</td>
              <td className="instructor-cell">{schedule.instructor}</td>
              <td className="section-cell">{schedule.section || '-'}</td>
              <td className="actions-cell">
                <button
                  className="action-btn edit-btn"
                  onClick={() => onEdit(schedule)}
                  title="Edit schedule"
                >
                  ✏️
                </button>
                <button
                  className="action-btn delete-btn"
                  onClick={() => onDelete(schedule.scheduleId)}
                  title="Delete schedule"
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ScheduleTable;
