# User Management System - Implementation Guide

## Overview
A complete user management system has been implemented for the BulSU Gate System with auto-generated credentials, role-based access control, and a modern sidebar navigation.

## Features Implemented

### 1. **Backend API Endpoints** (`backend/controllers/userController.js`)

#### User Management Operations:
- **GET** `/api/users` - Get all users (Admin only)
- **GET** `/api/users/role/:role` - Get users by role (Admin only)
- **POST** `/api/users` - Create new user with auto-generated credentials (Admin only)
- **PUT** `/api/users/:userId` - Update user details (Admin only)
- **PATCH** `/api/users/:userId/deactivate` - Deactivate user (Admin only)
- **PATCH** `/api/users/:userId/activate` - Activate user (Admin only)
- **PATCH** `/api/users/:userId/reset-password` - Reset password and generate new one (Admin only)
- **DELETE** `/api/users/:userId` - Delete user (Admin only)

### 2. **Auto-Generated Credentials**
When creating a new user, the system automatically generates:
- **UserID**: Auto-generated unique ID (e.g., `UABC123`)
- **Username**: Same as UserID for login
- **Password**: UserID + @2025 (e.g., `UABC123@2025`)
- All credentials are displayed once and must be saved securely

### 3. **User Roles**
- **Admin**: Full system access
- **Faculty/Staff**: Faculty and staff members
- **Guard**: Security gate guards
- **VIP**: VIP access users

### 4. **Frontend Components**

#### Sidebar Component (`frontend/src/components/Sidebar.js`)
- Navigation menu with role-based sections
- User profile display
- Quick access to all management features
- Logout button

#### User Management Component (`frontend/src/components/UserManagement.js`)
- **Create Users**: Form to add new users with auto-generated credentials
- **View Users**: Table with all user information
- **Filter Users**: Filter by role or search by name/email/username
- **Manage Users**: 
  - Deactivate/Activate users
  - Reset passwords
  - Delete users
- **Credentials Display**: Modal showing new credentials after user creation

#### Updated Admin Dashboard (`frontend/src/components/AdminDashboard.js`)
- Integrated sidebar navigation
- Dynamic content rendering based on selected section
- Dashboard statistics
- Quick action buttons

## Usage Instructions

### Creating a New User

1. **Login** as Admin
2. Click **"👥 User Management"** in the sidebar or dashboard quick actions
3. Click **"➕ Add New User"** button
4. Fill in the form:
   - First Name (required)
   - Last Name (required)
   - Email (required)
   - Role (Admin, Faculty/Staff, Guard, or VIP)
5. Click **"✅ Create User"**
6. **Important**: Save the auto-generated username and password immediately
7. Share credentials with the new user securely

### Managing Users

#### Deactivate User
- Click **"🔒"** button next to user
- User will no longer be able to login
- Account can be reactivated later

#### Activate User
- Click **"🔓"** button next to inactive user
- User can login again

#### Reset Password
- Click **"🔑"** button next to user
- New password is generated automatically
- Share the new password with user

#### Delete User
- Click **"🗑️"** button next to user
- Confirm deletion (cannot be undone)

#### Search & Filter
- Use the search box to find users by name, email, or username
- Use the role filter dropdown to view users by role

## Database Structure

### User Object in Firebase
```javascript
{
  userId: "unique-id",
  userID: "UABC123",
  username: "UABC123",
  password: "bcrypt-hashed-password",
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@bulsu.edu.ph",
  role: "faculty", // admin, faculty, staff, guard, vip, student
  status: "active", // active, inactive, suspended
  phoneNumber: "09123456789",
  address: "123 Sample St.",
  createdAt: "2024-01-15T10:30:00.000Z",
  lastLogin: "2024-01-15T14:20:00.000Z",
  updatedAt: "2024-01-15T11:00:00.000Z"
}
```

## Security Features

1. **Password Hashing**: All passwords are hashed using bcryptjs
2. **JWT Authentication**: Secure token-based authentication
3. **Role-Based Access Control**: Only admins can manage users
4. **Token Expiration**: JWT tokens expire after 8 hours
5. **Auto-Generated Passwords**: Strong, random passwords on user creation

## API Response Examples

### Create User Success Response
```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "userId": "auto-generated-id",
    "username": "user_a1b2c3d4",
    "password": "generated-password-123",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "faculty",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message describing what went wrong"
}
```

## Testing the System

1. **Test Creating Users**:
   ```bash
   # Backend server should be running on port 5000
   # Frontend should be running on port 3000
   ```

2. **Default Admin Credentials** (from seedUsers.js):
   - UserID: `admin`
   - Username: `admin`
   - Password: `admin123`
   - Role: `admin`

3. **Test User Creation**:
   - Login as admin with username `admin`
   - Navigate to User Management
   - Create a test faculty user
   - Note the auto-generated credentials (e.g., UserID: UABC123, Username: UABC123, Password: UABC123@2025)
   - Login with the new credentials to verify (Username: UABC123, Password: UABC123@2025)

## File Structure

```
backend/
├── controllers/
│   └── userController.js          (NEW)
├── routes/
│   └── userRoutes.js              (NEW)
└── server.js                      (UPDATED)

frontend/src/components/
├── AdminDashboard.js              (UPDATED)
├── AdminDashboard.css             (NEW)
├── Sidebar.js                     (NEW)
├── Sidebar.css                    (NEW)
├── UserManagement.js              (NEW)
└── UserManagement.css             (NEW)

frontend/src/services/
└── authService.js                 (UPDATED)
```

## Next Steps / Future Enhancements

1. **Role-Specific Management**: Separate pages for managing each user type
2. **Bulk User Import**: CSV upload for creating multiple users
3. **Activity Logs**: Track user creation, modifications, and deletions
4. **Email Notifications**: Send credentials via email to new users
5. **Advanced Filtering**: Filter by date range, status, department
6. **User Profiles**: Edit user information (department, ID number, etc.)
7. **Export Reports**: Export user lists to CSV/PDF

## Troubleshooting

### Issues with API Calls
- Ensure backend server is running on port 5000
- Check browser console for error messages
- Verify JWT token is valid in localStorage

### Credentials Not Showing
- Modal automatically closes after 5 seconds
- Check browser console for the generated credentials
- Can always reset password to get new credentials

### Permission Denied Errors
- Verify user is logged in as admin
- Check browser developer tools for token expiration
- Logout and login again if needed

## Support
For issues or questions regarding the user management system, check:
1. Backend logs in terminal
2. Browser console (F12)
3. Network tab in Developer Tools
