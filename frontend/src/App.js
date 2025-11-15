// frontend/src/App.js
import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import FacultyDashboard from './components/FacultyDashboard';
import SecurityDashboard from './components/SecurityDashboard';
import StudentDashboard from './components/StudentDashboard';
import ChangePassword from './components/ChangePassword';
import { verifyToken } from './services/authService';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    
    if (token) {
      try {
        const response = await verifyToken();
        if (response.success) {
          setUser(response.user);
        } else {
          localStorage.removeItem('token');
        }
      } catch (error) {
        localStorage.removeItem('token');
      }
    }
    
    setLoading(false);
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // Check if user needs to change password on first login
  if (user.firstTimeLogin) {
    return <ChangePassword user={user} onPasswordChanged={() => {
      // Refresh user data after password change
      checkAuth();
    }} />;
  }

  // Render dashboard based on user role
  switch (user.role) {
    case 'admin':
      return <AdminDashboard user={user} onLogout={handleLogout} />;
    case 'faculty':
      return <FacultyDashboard user={user} onLogout={handleLogout} />;
    case 'guard':
      return <SecurityDashboard user={user} onLogout={handleLogout} />;
    case 'student':
      return <StudentDashboard user={user} onLogout={handleLogout} />;
    default:
      return <Login onLogin={handleLogin} />;
  }
}

export default App;
