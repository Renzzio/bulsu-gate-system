// frontend/src/components/admin/UserManagement.js
import React, { useState, useEffect } from 'react';
import { getAllUsers, createUser, updateUser, deleteUser } from '../../services/adminService';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [selectedUser, setSelectedUser] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeData, setQRCodeData] = useState(null);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'student',
    firstName: '',
    lastName: '',
    studentNumber: '',
    program: '',
    yearLevel: '',
    section: '',
    department: '',
    gateAssignment: ''
  });

  useEffect(() => {
    fetchUsers();
  }, [filterRole]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await getAllUsers(filterRole, 'active');
      if (response.success) {
        setUsers(response.users);
      }
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRoleChange = (e) => {
    const role = e.target.value;
    setFormData({
      ...formData,
      role,
      // Clear role-specific fields
      studentNumber: '',
      program: '',
      yearLevel: '',
      section: '',
      department: '',
      gateAssignment: ''
    });
  };

  const handleCreateUser = () => {
    setModalMode('create');
    setFormData({
      username: '',
      email: '',
      password: 'default123',
      role: 'student',
      firstName: '',
      lastName: '',
      studentNumber: '',
      program: '',
      yearLevel: '',
      section: '',
      department: '',
      gateAssignment: ''
    });
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      studentNumber: user.studentNumber || '',
      program: user.program || '',
      yearLevel: user.yearLevel || '',
      section: user.section || '',
      department: user.department || '',
      gateAssignment: user.gateAssignment || ''
    });
    setShowModal(true);
  };

  const handleViewQR = (user) => {
    setQRCodeData(user);
    setShowQRModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (modalMode === 'create') {
        const response = await createUser(formData);
        if (response.success) {
          alert('User created successfully!');
          fetchUsers();
          setShowModal(false);
        }
      } else {
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        
        const response = await updateUser(selectedUser.userId, updateData);
        if (response.success) {
          alert('User updated successfully!');
          fetchUsers();
          setShowModal(false);
        }
      }
    } catch (err) {
      alert(err.message || 'Operation failed');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete ${userName}?`)) {
      try {
        const response = await deleteUser(userId);
        if (response.success) {
          alert('User deleted successfully!');
          fetchUsers();
        }
      } catch (err) {
        alert(err.message || 'Failed to delete user');
      }
    }
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower) ||
      user.username?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.studentNumber?.toLowerCase().includes(searchLower)
    );
  });

  const downloadQRCode = () => {
    if (!qrCodeData?.qrCode) return;
    
    const link = document.createElement('a');
    link.href = qrCodeData.qrCode;
    link.download = `QR_${qrCodeData.username}_${qrCodeData.userId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printQRCode = () => {
    if (!qrCodeData?.qrCode) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${qrCodeData.firstName} ${qrCodeData.lastName}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 20px;
            }
            .qr-container {
              max-width: 400px;
              margin: 0 auto;
              border: 2px solid #9D0A0A;
              padding: 20px;
              border-radius: 10px;
            }
            img { max-width: 100%; }
            h2 { color: #9D0A0A; }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h2>Bulacan State University</h2>
            <h3>Gate Restriction System</h3>
            <img src="${qrCodeData.qrCode}" alt="QR Code" />
            <p><strong>${qrCodeData.firstName} ${qrCodeData.lastName}</strong></p>
            <p>${qrCodeData.role.toUpperCase()}</p>
            ${qrCodeData.studentNumber ? `<p>Student No: ${qrCodeData.studentNumber}</p>` : ''}
            <p>User ID: ${qrCodeData.userId}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="user-management-container">
      <div className="page-header">
        <div>
          <h2>User Management</h2>
          <p>Manage students, faculty, and security personnel</p>
        </div>
        <button className="primary-button" onClick={handleCreateUser}>
          + Add New User
        </button>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <label>Filter by Role:</label>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="filter-select">
            <option value="">All Roles</option>
            <option value="student">Students</option>
            <option value="faculty">Faculty</option>
            <option value="security">Security</option>
          </select>
        </div>

        <div className="search-group">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading users...</p>
        </div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Details</th>
                <th>QR Code</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.userId}>
                    <td>{user.firstName} {user.lastName}</td>
                    <td>{user.username}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      {user.role === 'student' && user.studentNumber && (
                        <small>{user.studentNumber} | {user.program}</small>
                      )}
                      {user.role === 'faculty' && user.department && (
                        <small>{user.department}</small>
                      )}
                      {user.role === 'security' && user.gateAssignment && (
                        <small>{user.gateAssignment}</small>
                      )}
                    </td>
                    <td>
                      <button 
                        className="icon-button"
                        onClick={() => handleViewQR(user)}
                        title="View QR Code"
                      >
                        📱
                      </button>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="edit-button"
                          onClick={() => handleEditUser(user)}
                        >
                          Edit
                        </button>
                        <button 
                          className="delete-button"
                          onClick={() => handleDeleteUser(user.userId, `${user.firstName} ${user.lastName}`)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit User Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{modalMode === 'create' ? 'Add New User' : 'Edit User'}</h3>
              <button className="close-button" onClick={() => setShowModal(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    disabled={modalMode === 'edit'}
                  />
                </div>

                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Role *</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleRoleChange}
                    required
                    disabled={modalMode === 'edit'}
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                    <option value="security">Security</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Password {modalMode === 'edit' && '(leave blank to keep current)'}</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={modalMode === 'create'}
                    placeholder={modalMode === 'edit' ? 'Leave blank to keep current' : ''}
                  />
                </div>
              </div>

              {/* Student-specific fields */}
              {formData.role === 'student' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Student Number *</label>
                      <input
                        type="text"
                        name="studentNumber"
                        value={formData.studentNumber}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., 2021-12345"
                      />
                    </div>

                    <div className="form-group">
                      <label>Program *</label>
                      <input
                        type="text"
                        name="program"
                        value={formData.program}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., BSIT-WMAD"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Year Level *</label>
                      <select
                        name="yearLevel"
                        value={formData.yearLevel}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Year</option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Section *</label>
                      <input
                        type="text"
                        name="section"
                        value={formData.section}
                        onChange={handleInputChange}
                        required
                        placeholder="e.g., 3H"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Faculty-specific fields */}
              {formData.role === 'faculty' && (
                <div className="form-group">
                  <label>Department *</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., CICT"
                  />
                </div>
              )}

              {/* Security-specific fields */}
              {formData.role === 'security' && (
                <div className="form-group">
                  <label>Gate Assignment *</label>
                  <select
                    name="gateAssignment"
                    value={formData.gateAssignment}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Gate</option>
                    <option value="Main Gate">Main Gate</option>
                    <option value="Side Gate">Side Gate</option>
                    <option value="Back Gate">Back Gate</option>
                    <option value="Faculty Gate">Faculty Gate</option>
                  </select>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" className="cancel-button" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-button">
                  {modalMode === 'create' ? 'Create User' : 'Update User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && qrCodeData && (
        <div className="modal-overlay" onClick={() => setShowQRModal(false)}>
          <div className="modal-content qr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>QR Code</h3>
              <button className="close-button" onClick={() => setShowQRModal(false)}>×</button>
            </div>

            <div className="qr-content">
              <div className="qr-info">
                <h4>{qrCodeData.firstName} {qrCodeData.lastName}</h4>
                <p className="qr-role">{qrCodeData.role.toUpperCase()}</p>
                {qrCodeData.studentNumber && <p>Student No: {qrCodeData.studentNumber}</p>}
                <p className="qr-userid">User ID: {qrCodeData.userId}</p>
              </div>

              {qrCodeData.qrCode ? (
                <div className="qr-image-container">
                  <img src={qrCodeData.qrCode} alt="QR Code" className="qr-image" />
                </div>
              ) : (
                <div className="qr-error">QR Code not available</div>
              )}

              <div className="qr-actions">
                <button className="secondary-button" onClick={downloadQRCode}>
                  📥 Download
                </button>
                <button className="secondary-button" onClick={printQRCode}>
                  🖨️ Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;