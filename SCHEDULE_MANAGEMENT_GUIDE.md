# Schedule Management Module Documentation

## Overview

The Schedule Management Module is a comprehensive system for managing student class schedules within the BulSU Gate Restriction System. It provides complete CRUD operations, validation, conflict detection, and utilities for checking student schedules during gate access validation.

## Features

### Backend Features

1. **Schedule CRUD Operations**
   - Create new schedules for students
   - Read/retrieve all schedules for a specific student
   - Update existing schedule details
   - Delete schedules with validation

2. **Validation System**
   - Required field validation (studentId, subject code/name, day, times, room, instructor)
   - Time format validation (HH:mm in 24-hour format)
   - Day of week validation (Monday-Sunday)
   - Time ordering validation (start time must be before end time)
   - Schedule overlap detection (prevents conflicting schedules on same day)

3. **Utility Functions**
   - `hasScheduleToday()` - Check if student has active schedule now
   - `getActiveScheduleNow()` - Get the current active schedule details
   - `getSchedulesByDay()` - Get all schedules for a specific day
   - `getNextSchedule()` - Get the next upcoming schedule
   - Time conversion utilities for comparison operations

4. **Database Structure**
   - Path: `/schedules/{studentId}/{scheduleId}`
   - Each schedule contains: scheduleId, studentId, subjectCode, subjectName, dayOfWeek, startTime, endTime, room, instructor, section, createdAt, createdBy, updatedAt, updatedBy

### Frontend Features

1. **Schedule Management Interface**
   - Student selection dropdown (auto-loads all students)
   - Schedule listing table with full details
   - Filter by day of week
   - Search by subject code or name
   - Reset filters functionality

2. **Add Schedule Modal**
   - Form with all required fields
   - Real-time validation with error messages
   - Time input validation
   - Submit with loading state

3. **Edit Schedule Modal**
   - Pre-populated form with current schedule data
   - Same validation as add form
   - Update with confirmation

4. **Schedule Actions**
   - Edit: Open modal with schedule details
   - Delete: Confirm and remove schedule
   - View details in table rows

5. **Responsive Design**
   - Mobile-friendly table with collapsible columns
   - Touch-friendly buttons and modals
   - Adaptive grid layouts

## API Endpoints

### GET /api/schedules/:studentId
Retrieve all schedules for a specific student.

**Parameters:**
- `studentId` (path) - The student's unique ID

**Response:**
```json
{
  "success": true,
  "schedules": [
    {
      "scheduleId": "uuid",
      "studentId": "STUD001",
      "subjectCode": "COMP101",
      "subjectName": "Introduction to Programming",
      "dayOfWeek": "Monday",
      "startTime": "08:00",
      "endTime": "10:00",
      "room": "A101",
      "instructor": "Dr. John Doe",
      "section": "A",
      "createdAt": "2025-01-14T10:30:00.000Z",
      "createdBy": "admin_user"
    }
  ],
  "count": 5
}
```

**Status:** 200 OK

---

### POST /api/schedules/add
Add a new schedule for a student.

**Authentication:** Required (Admin or Faculty role)

**Request Body:**
```json
{
  "studentId": "STUD001",
  "subjectCode": "COMP101",
  "subjectName": "Introduction to Programming",
  "dayOfWeek": "Monday",
  "startTime": "08:00",
  "endTime": "10:00",
  "room": "A101",
  "instructor": "Dr. John Doe",
  "section": "A"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Schedule added successfully",
  "schedule": {
    "scheduleId": "uuid",
    "studentId": "STUD001",
    "subjectCode": "COMP101",
    "subjectName": "Introduction to Programming",
    "dayOfWeek": "Monday",
    "startTime": "08:00",
    "endTime": "10:00",
    "room": "A101",
    "instructor": "Dr. John Doe",
    "section": "A",
    "createdAt": "2025-01-14T10:30:00.000Z",
    "createdBy": "admin_user"
  }
}
```

**Status:** 201 Created

---

### PATCH /api/schedules/:studentId/:scheduleId
Update an existing schedule.

**Authentication:** Required (Admin or Faculty role)

**Parameters:**
- `studentId` (path) - The student's unique ID
- `scheduleId` (path) - The schedule's unique ID

**Request Body:** (All fields optional)
```json
{
  "subjectCode": "COMP101",
  "subjectName": "Introduction to Programming",
  "dayOfWeek": "Tuesday",
  "startTime": "09:00",
  "endTime": "11:00",
  "room": "A102",
  "instructor": "Dr. Jane Smith",
  "section": "B"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Schedule updated successfully",
  "schedule": { /* updated schedule object */ }
}
```

**Status:** 200 OK

---

### DELETE /api/schedules/:studentId/:scheduleId
Delete a schedule.

**Authentication:** Required (Admin only)

**Parameters:**
- `studentId` (path) - The student's unique ID
- `scheduleId` (path) - The schedule's unique ID

**Response:**
```json
{
  "success": true,
  "message": "Schedule deleted successfully"
}
```

**Status:** 200 OK

---

## Database Schema

### Schedules Collection
Location: `/schedules/{studentId}/{scheduleId}`

```javascript
{
  scheduleId: string (UUID),           // Unique schedule identifier
  studentId: string,                    // Reference to student
  subjectCode: string,                  // e.g., "COMP101"
  subjectName: string,                  // e.g., "Introduction to Programming"
  dayOfWeek: string,                    // "Monday", "Tuesday", ..., "Sunday"
  startTime: string,                    // "HH:mm" format (24-hour)
  endTime: string,                      // "HH:mm" format (24-hour)
  room: string,                         // e.g., "A101" or "Building A Room 101"
  instructor: string,                   // Instructor name
  section: string | null,               // Optional: "A", "B", "1", etc.
  createdAt: ISO8601 timestamp,         // When schedule was created
  createdBy: string,                    // User ID who created
  updatedAt: ISO8601 timestamp,         // When last updated
  updatedBy: string                     // User ID who last updated
}
```

## Utility Functions

### hasScheduleToday(studentId, currentDateTime?)

Check if a student has an active schedule right now.

**Parameters:**
- `studentId` (string) - The student's ID
- `currentDateTime` (Date, optional) - Current time for testing. Uses actual time if not provided.

**Returns:** Promise<boolean>

**Example:**
```javascript
const hasClass = await hasScheduleToday('STUD001');
// or with test time:
const testTime = new Date('2025-01-14T10:00:00');
const hasClass = await hasScheduleToday('STUD001', testTime);
```

**Logic:**
1. Gets current day of week and time
2. Queries all student's schedules
3. Filters by matching day of week
4. Checks if current time falls within any schedule's time range
5. Returns true if match found, false otherwise

---

### getActiveScheduleNow(studentId, currentDateTime?)

Get the active schedule object for a student right now.

**Parameters:**
- `studentId` (string) - The student's ID
- `currentDateTime` (Date, optional) - Current time for testing

**Returns:** Promise<Object|null>

**Returns Object:**
```javascript
{
  scheduleId: string,
  studentId: string,
  subjectCode: string,
  subjectName: string,
  dayOfWeek: string,
  startTime: string,
  endTime: string,
  room: string,
  instructor: string,
  section: string | null,
  createdAt: string,
  createdBy: string
}
```

---

### getSchedulesByDay(studentId, dayOfWeek)

Get all schedules for a specific day.

**Parameters:**
- `studentId` (string) - The student's ID
- `dayOfWeek` (string) - Day name: "Monday", "Tuesday", etc.

**Returns:** Promise<Array>

**Returns Array:** Array of schedule objects sorted by start time

---

### getNextSchedule(studentId, currentDateTime?)

Get the next upcoming schedule for a student.

**Parameters:**
- `studentId` (string) - The student's ID
- `currentDateTime` (Date, optional) - Current time for testing

**Returns:** Promise<Object|null>

**Returns Object:** Next schedule object (same structure as getActiveScheduleNow)

---

## Validation Rules

### Required Fields
- `studentId` - Must not be empty
- `subjectCode` - Must not be empty
- `subjectName` - Must not be empty
- `dayOfWeek` - Must not be empty and valid
- `startTime` - Must not be empty and valid format
- `endTime` - Must not be empty and valid format
- `room` - Must not be empty
- `instructor` - Must not be empty

### Field Formats
- **Time Format:** HH:mm (24-hour, e.g., "14:30")
  - Valid: "00:00" to "23:59"
  - Invalid: "24:00", "14:60", "2:30"

- **Day of Week:** Exact match required
  - Valid: "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
  - Invalid: "Mon", "MONDAY", "monday"

### Business Rules
1. **Time Ordering:** startTime must be before endTime
   - If startTime = endTime: ❌ Invalid
   - If startTime > endTime: ❌ Invalid

2. **Overlap Detection:** No two schedules for same student on same day can overlap
   - Same day overlapping times: ❌ Invalid
   - Different days: ✅ OK
   - Back-to-back times (end = next start): ✅ OK (allowed)

## Frontend Components

### ScheduleManagement.js
Main container component managing overall schedule interface.

**Props:**
- `user` (object) - Current logged-in user object

**State:**
- `schedules` - Array of schedule objects
- `students` - Array of available students
- `selectedStudent` - Currently selected student ID
- `loading` - Loading state flag
- `error` - Error message
- `success` - Success message
- `showAddModal` - Add schedule modal visibility
- `showEditModal` - Edit schedule modal visibility
- `editingSchedule` - Schedule being edited
- `filterDay` - Filter by day of week
- `searchSubject` - Search by subject

**Functions:**
- `loadStudents()` - Load all student users
- `loadSchedules()` - Load schedules for selected student
- `handleAddSchedule()` - Create new schedule
- `handleEditSchedule()` - Update schedule
- `handleDeleteSchedule()` - Delete schedule
- `handleEditClick()` - Open edit modal

---

### AddScheduleModal.js
Modal form for adding new schedules.

**Props:**
- `onClose` (function) - Close modal callback
- `onSubmit` (function) - Submit form callback
- `studentId` (string) - Student ID for new schedule

**Features:**
- Form validation with inline error messages
- Time input type for easy time selection
- Day of week dropdown
- Loading state during submission

---

### EditScheduleModal.js
Modal form for editing existing schedules.

**Props:**
- `schedule` (object) - Schedule to edit
- `onClose` (function) - Close modal callback
- `onSubmit` (function) - Submit form callback

**Features:**
- Pre-populated form fields
- Same validation as AddScheduleModal
- Shows current schedule data

---

### ScheduleTable.js
Table component for displaying schedules.

**Props:**
- `schedules` (array) - Array of schedules to display
- `onEdit` (function) - Edit button callback
- `onDelete` (function) - Delete button callback

**Features:**
- Responsive table layout
- Column hiding on mobile
- Action buttons (Edit, Delete)
- Time formatting

---

## Services

### scheduleService.js
API client for schedule operations.

**Exported Functions:**
```javascript
export const getStudentSchedules(studentId) // GET /:studentId
export const addSchedule(scheduleData) // POST /add
export const updateSchedule(studentId, scheduleId, scheduleData) // PATCH
export const deleteSchedule(studentId, scheduleId) // DELETE
```

All functions:
- Return Promise
- Handle authentication automatically (via token interceptor)
- Throw error objects with `success`, `message`, and optional `errors` properties

---

## Error Handling

### Common Errors

**400 - Bad Request**
```json
{
  "success": false,
  "message": "Missing required fields: startTime, endTime",
  "errors": ["startTime is required", "endTime is required"]
}
```

**400 - Validation Error**
```json
{
  "success": false,
  "message": "Invalid time format. Use HH:mm (24-hour format)",
  "errors": ["Row 5: Invalid time format: 14:70"]
}
```

**400 - Overlap Conflict**
```json
{
  "success": false,
  "message": "Schedule overlaps with existing schedule on the same day"
}
```

**404 - Not Found**
```json
{
  "success": false,
  "message": "Schedule not found"
}
```

**401 - Unauthorized**
```json
{
  "success": false,
  "message": "Unauthorized access"
}
```

**500 - Server Error**
```json
{
  "success": false,
  "message": "Server error while adding schedule"
}
```

## Testing

### Manual Testing Steps

1. **Add a Schedule:**
   - Navigate to Schedule Management
   - Select a student from dropdown
   - Click "Add Schedule"
   - Fill in all required fields
   - Click "Add Schedule" button
   - Verify success message and schedule appears in table

2. **Edit a Schedule:**
   - Click edit (✏️) button on any schedule
   - Modify fields
   - Click "Save Changes"
   - Verify update message and table updated

3. **Delete a Schedule:**
   - Click delete (🗑️) button on any schedule
   - Confirm deletion in dialog
   - Verify delete message and schedule removed from table

4. **Filter and Search:**
   - Use day filter dropdown to show schedules for specific day
   - Use subject search to filter by code or name
   - Verify filtered results displayed correctly
   - Click "Reset Filters" to restore all schedules

5. **Validation Testing:**
   - Try adding schedule with empty fields - should show errors
   - Try end time before start time - should show error
   - Try invalid time format - should show error
   - Try overlapping times on same day - should show error

6. **Permission Testing:**
   - Login as student (if allowed) - should not see add button
   - Login as faculty - should be able to add/edit schedules
   - Login as admin - should have full access

### Test Data

Student ID: STUD001
Subject Code: COMP101
Subject Name: Introduction to Programming
Day: Monday
Start Time: 08:00
End Time: 10:00
Room: A101
Instructor: Dr. John Doe
Section: A

## Integration Points

### Gate Access Module
The `hasScheduleToday()` utility is used to verify if a student has an active class schedule before allowing gate access:

```javascript
// In gate controller (example)
const hasClass = await hasScheduleToday(studentId);
if (!hasClass) {
  return res.status(403).json({
    success: false,
    message: "Access denied. No active schedule at this time."
  });
}
```

### User Management Integration
- Students are loaded from the User Management system
- Only users with role 'student' appear in the student selector
- Schedule creator ID stored as `createdBy` field (links to user who created it)

### Authentication Integration
- All schedule routes protected with JWT token authentication
- Role-based access: Admin (full access), Faculty (add/edit), Student (view only)
- Token automatically injected in API requests via interceptor

## Performance Considerations

1. **Database Queries:**
   - Schedules organized by studentId for efficient retrieval
   - Limited to one student at a time in UI to reduce data transfer

2. **Frontend Optimization:**
   - Schedules sorted by day and time on backend
   - Filtering done on frontend after loading (small dataset)
   - Modal forms lazy-load when needed

3. **Caching Opportunities:**
   - Could cache student list (rarely changes)
   - Could cache schedules with refresh button
   - Student's current schedule could be cached with TTL

## Future Enhancements

1. **Excel Import/Export**
   - Bulk import schedules from Excel file
   - Export schedule to Excel or PDF
   - Schedule template download

2. **Calendar View**
   - Visual calendar display of schedules
   - Drag-and-drop rescheduling
   - Week/month view options

3. **Notifications**
   - Email reminders for upcoming classes
   - Notification for schedule changes
   - Alert on schedule conflicts

4. **Advanced Filtering**
   - Filter by instructor
   - Filter by room location
   - Filter by section
   - Multi-select filters

5. **Schedule Templates**
   - Save recurring schedule patterns
   - Batch create schedules from template
   - Academic calendar integration

6. **Analytics**
   - Student attendance rate by schedule
   - Schedule utilization reports
   - Peak hours analysis

7. **Sync Integration**
   - Google Calendar sync
   - Outlook calendar sync
   - iCalendar (.ics) export

## Troubleshooting

### Issue: "No schedules found" message
**Solution:** Ensure you've selected a student from the dropdown first. Schedules load automatically when a student is selected.

### Issue: Cannot add schedule - button is disabled
**Solution:** Make sure you:
1. Have selected a student
2. Are logged in as admin or faculty role
3. System is not in loading state

### Issue: "Schedule overlaps with existing schedule" error
**Solution:** The times you entered conflict with an existing schedule on that day. Try:
- Selecting a different day
- Choosing a non-overlapping time
- Editing the existing schedule instead

### Issue: Time validation error
**Solution:** Ensure times are in HH:mm format (24-hour):
- Valid: "14:30", "08:00", "23:45"
- Invalid: "2:30pm", "14-30", "14.30"

### Issue: Changes not saving
**Solution:** Check:
1. Network connection is active
2. Browser console for errors (F12)
3. Token hasn't expired (try refreshing page)
4. All required fields are filled

## Support

For issues or questions:
1. Check this documentation first
2. Review server logs in backend terminal
3. Check browser console (F12) for client-side errors
4. Contact system administrator

---

**Last Updated:** November 14, 2025
**Version:** 1.0.0
**Status:** ✅ Complete Implementation
