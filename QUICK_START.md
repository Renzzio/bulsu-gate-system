# Quick Start Guide - User Management System

## Installation & Setup

### 1. Backend Setup (Already Done)
```powershell
cd c:\Users\Renz Diaz\Downloads\bulsu-gate-system\backend
npm install
```

### 2. Start Backend Server
```powershell
npm start
# Server runs on http://localhost:5000
```

### 3. Frontend Setup
```powershell
cd c:\Users\Renz Diaz\Downloads\bulsu-gate-system\frontend
npm install
npm start
# Frontend runs on http://localhost:3000
```

## Using the System

### Step 1: Login
1. Go to http://localhost:3000
2. Use default admin credentials:
   - Username: `admin`
   - Password: `admin123`

### Step 2: Navigate to User Management
1. Click **"👥 User Management"** in the sidebar (left panel)
2. Or click **"👥 Manage Users"** in Quick Actions on dashboard

### Step 3: Create a New User
1. Click **"➕ Add New User"** button
2. Fill the form:
   ```
   First Name: John
   Last Name: Doe
   Email: john.doe@bulsu.edu.ph
   Role: Faculty/Staff
   ```
3. Click **"✅ Create User"**
4. **Copy and save the auto-generated credentials**:
   - Username: `user_a1b2c3d4` (example)
   - Password: `generated-password` (example)

### Step 4: Share Credentials with User
Give the new user the username and password to login.

## User Roles

| Role | Description |
|------|-------------|
| **Admin** | Full system access, manage all users |
| **Faculty/Staff** | Faculty and staff members |
| **Guard** | Security gate personnel |
| **VIP** | Special access users |

## Common Tasks

### Managing Existing Users

| Action | Icon | Description |
|--------|------|-------------|
| Deactivate | 🔒 | Prevent user from logging in |
| Activate | 🔓 | Allow inactive user to login again |
| Reset Password | 🔑 | Generate new password for user |
| Delete | 🗑️ | Permanently remove user |

### Filtering Users
- Use **Search Box**: Filter by name, email, or username
- Use **Role Filter**: Show only specific user types

## Key Features

✅ **Auto-Generated Credentials**
- System creates random username & password
- No manual password assignment needed

✅ **Role-Based Access**
- Different user types for different needs
- Only admins can manage users

✅ **User Status Control**
- Active: User can login
- Inactive: User cannot login
- Can reactivate anytime

✅ **Secure Password Reset**
- Generate new password without knowing old one
- Share new password securely with user

## Sidebar Navigation

The sidebar provides quick access to:
- 📊 **Dashboard** - Main overview
- 👥 **User Management** - Manage all users
- 🔑 **Manage Admins** - Coming soon
- 👨‍🏫 **Manage Faculty/Staff** - Coming soon
- 🚨 **Manage Guards** - Coming soon
- ⭐ **Manage VIP** - Coming soon
- 📋 **Activity Logs** - Coming soon
- ⚙️ **System Settings** - Coming soon

## Important Notes

⚠️ **Save Credentials Immediately**
- New credentials shown only once
- Share with new users securely
- Cannot retrieve if not saved

⚠️ **Email Format**
- Use valid email format (e.g., user@bulsu.edu.ph)
- System won't accept invalid emails

⚠️ **Cannot Undo Deletions**
- Deleted users cannot be recovered
- Make sure before deleting

⚠️ **Password Reset**
- Old passwords cannot be recovered
- Always use reset password feature
- Share new password securely

## Default Test Users

From the seeding script, default users are:

1. **Admin**
   - Username: `admin`
   - Password: `admin123`
   - Role: Admin

2. **Faculty**
   - Username: `faculty001`
   - Password: `faculty123`
   - Role: Faculty

3. **Guard**
   - Username: `security001`
   - Password: `security123`
   - Role: Guard

4. **VIP**
   - Username: `vip001`
   - Password: `vip123`
   - Role: VIP

## Troubleshooting

### "Access denied" error
- Make sure you're logged in as admin
- Only admins can manage users

### "Email already exists"
- That email is already registered
- Use a different email address

### Can't login with new credentials
- Check if user is in "active" status
- Verify username and password are correct
- Try resetting password

### Backend not running
```powershell
cd backend
npm start
```

### Frontend not running
```powershell
cd frontend
npm start
```

## Support
For detailed documentation, see: `USER_MANAGEMENT_GUIDE.md`
