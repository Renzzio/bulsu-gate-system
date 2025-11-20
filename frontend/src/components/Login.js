// frontend/src/components/Login.js
import React, { useState } from 'react';
import { login } from '../services/authService';
import { Eye, EyeOff } from 'lucide-react';
import bulsuLogo from '../bulsuLogo.png';

function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <img
              src={bulsuLogo}
              alt="Bulacan State University Logo"
              style={{
                width: '120px',
                height: '120px',
                marginBottom: '20px',
                objectFit: 'contain'
              }}
            />
            <h1 style={{ margin: '10px 0', color: '#ffffffff' }}>Bulacan State University</h1>
            <p style={{ fontSize: '0.9rem', color: '#ffffffff', marginBottom: '10px' }}>
              Gate Restriction System
            </p>
          </div>
          <p style={{ lineHeight: '1.6', color: '#e7e7e7ff' }}>
            Intelligent access control solution for Bulacan State University.
            Manage student movement based on class schedules and enhance campus security.
          </p>
          <div className="university-logo" style={{ marginTop: '30px' }}>
            <p style={{ fontSize: '0.9rem', fontWeight: '500', color: '#c4c4c4ff' }}>
              College of Information and Communications Technology
            </p>
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
              <label htmlFor="username">Username or Email</label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username or email"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  disabled={loading}
                  style={{ paddingRight: '40px', width: '100%' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#666',
                    padding: '5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
