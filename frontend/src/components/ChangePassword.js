// frontend/src/components/ChangePassword.js
import React, { useState } from 'react';
import * as authService from '../services/authService';
import {
  Lock, Key, CheckCircle, AlertCircle, Eye, EyeOff,
  User, Shield, ArrowRight
} from 'lucide-react';
import './ChangePassword.css';

function ChangePassword({ user, onPasswordChanged }) {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    newPassword: false,
    confirmPassword: false
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validateForm = () => {
    if (!formData.newPassword || !formData.confirmPassword) {
      setError('Both password fields are required');
      return false;
    }

    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    // Check for basic password strength
    if (!/(?=.*[a-z])(?=.*[A-Z])|(?=.*\d)|(?=.*[@$!%*?&])/.test(formData.newPassword)) {
      setError('Password should contain a mix of uppercase letters, lowercase letters, numbers, or special characters');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await authService.changePassword(user.userId, {
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword
      });

      if (response.success) {
        setSuccess('Password changed successfully! Redirecting to your dashboard...');
        setTimeout(() => {
          onPasswordChanged();
        }, 2000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-container">
      <div className="change-password-card">
        {/* Header */}
        <div className="change-password-header">
          <div className="header-icon">
            <Shield size={48} color="var(--bulsu-red)" />
          </div>
          <h1>Welcome to BulSU Gate System</h1>
          <p className="welcome-message">
            Hello, <strong>{user.firstName} {user.lastName}</strong>!
          </p>
        </div>

        {/* Info Banner */}
        <div className="info-banner">
          <AlertCircle size={20} />
          <div>
            <strong>Security Notice:</strong> For your first login, you must change your default password to ensure account security.
            <br />
            <small>Your new password must be at least 6 characters long.</small>
          </div>
        </div>

        {/* User Info */}
        <div className="user-info-section">
          <div className="user-info-item">
            <User size={16} />
            <span><strong>Username:</strong> {user.username}</span>
          </div>
          <div className="user-info-item">
            <Shield size={16} />
            <span><strong>Role:</strong> {user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: '20px' }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success" style={{ marginBottom: '20px' }}>
            <CheckCircle size={16} />
            {success}
          </div>
        )}

        {/* Change Password Form */}
        <form onSubmit={handleSubmit} className="change-password-form">
          <div className="form-section">
            <h3>Create Your New Password</h3>

            {/* New Password Field */}
            <div className="form-group">
              <label htmlFor="newPassword">
                <Key size={16} />
                New Password *
              </label>
              <div className="password-input-container">
                <input
                  type={showPasswords.newPassword ? 'text' : 'password'}
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  placeholder="Enter your new password"
                  required
                  disabled={loading || !!success}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility('newPassword')}
                  tabIndex={-1}
                >
                  {showPasswords.newPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="form-group">
              <label htmlFor="confirmPassword">
                <Key size={16} />
                Confirm New Password *
              </label>
              <div className="password-input-container">
                <input
                  type={showPasswords.confirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirm your new password"
                  required
                  disabled={loading || !!success}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => togglePasswordVisibility('confirmPassword')}
                  tabIndex={-1}
                >
                  {showPasswords.confirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Password Requirements */}
            <div className="password-requirements">
              <h4>Password Requirements:</h4>
              <ul>
                <li className={formData.newPassword.length >= 6 ? 'met' : ''}>
                  ✓ At least 6 characters long
                </li>
                <li className={/(?=.*[a-z])(?=.*[A-Z])|(?=.*\d)|(?=.*[@$!%*?&])/.test(formData.newPassword) ? 'met' : ''}>
                  ✓ Mix of uppercase, lowercase, numbers, or special characters recommended
                </li>
                <li className={formData.newPassword && formData.confirmPassword && formData.newPassword === formData.confirmPassword ? 'met' : ''}>
                  ✓ Passwords match
                </li>
              </ul>
            </div>
          </div>

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-success btn-large"
              disabled={loading || !!success}
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Updating Password...
                </>
              ) : success ? (
                <>
                  <CheckCircle size={16} />
                  Password Changed!
                </>
              ) : (
                <>
                  <ArrowRight size={16} />
                  Set New Password
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer Note */}
        <div className="change-password-footer">
          <p>
            <strong>Important:</strong> Keep your password secure and do not share it with others.
            <br />
            Remember to use a strong password that you can easily remember.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ChangePassword;
