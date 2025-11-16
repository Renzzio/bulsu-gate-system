// frontend/src/components/Login.js
import React, { useState } from 'react';
import { login } from '../services/authService';

function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(formData.username, formData.password);
      
      if (response.success) {
        onLogin(response.user);
      } else {
        setError(response.message || 'Login failed');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-left">
          <h1>Gate Restriction System</h1>
          <p>
            Intelligent access control solution for Bulacan State University.
            Manage student movement based on class schedules and enhance campus security.
          </p>
          <div className="university-logo">
            <p>🎓 Bulacan State University</p>
            <p>College of Information and Communications Technology</p>
          </div>
        </div>

        <div className="login-right">
          <form className="login-form" onSubmit={handleSubmit}>
            <h2>Welcome Back</h2>
            <p>Sign in to your account to continue</p>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px', fontSize: '0.85rem', color: '#666' }}>
              <strong>Demo Credentials:</strong><br/>
              Admin: admin / admin123<br/>
              Faculty: faculty / faculty123<br/>
              Security: security / security123<br/>
              Student: student / student123
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;