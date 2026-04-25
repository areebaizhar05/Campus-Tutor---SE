import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total_students: 0, total_tutors: 0, total_sessions: 0,
    confirmed: 0, completed: 0, cancelled: 0,
  });
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingId, setTogglingId] = useState(null);
  const [changingRoleId, setChangingRoleId] = useState(null);
  const [completingId, setCompletingId] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, sessionsRes, usersRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/sessions'),
        api.get('/admin/users'),
      ]);
      setStats(statsRes.data || { total_students: 0, total_tutors: 0, total_sessions: 0, confirmed: 0, completed: 0, cancelled: 0 });
      setSessions(sessionsRes.data.sessions || []);
      setUsers(usersRes.data.users || []);
    } catch (err) {
      setError('Failed to load admin data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    try {
      const res = await api.get(`/admin/users?search=${encodeURIComponent(query)}`);
      setUsers(res.data.users || []);
    } catch (err) { /* silent */ }
  };

  const handleToggleActive = async (userId, currentStatus) => {
    setTogglingId(userId);
    try {
      await api.put(`/admin/users/${userId}/toggle-active`);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_active: !currentStatus } : u));
      setSuccess(`User ${currentStatus ? 'deactivated' : 'activated'} successfully.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError('Failed to update user status.'); }
    finally { setTogglingId(null); }
  };

  const handleChangeRole = async (userId, newRole) => {
    if (!newRole) return;
    setChangingRoleId(userId);
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
      setSuccess(`User role changed to ${newRole} successfully.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError('Failed to change user role.'); }
    finally { setChangingRoleId(null); }
  };

  const handleCompleteSession = async (sessionId) => {
    if (!window.confirm('Mark this session as completed?')) return;
    setCompletingId(sessionId);
    try {
      await api.put(`/sessions/${sessionId}/complete`);
      setSuccess('Session marked as completed.');
      fetchDashboardData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { setError(err.response?.data?.error || 'Failed to complete session.'); }
    finally { setCompletingId(null); }
  };

  if (loading) {
    return (
      <div className="dashboard-layout">
        <div className="loading-screen"><div className="spinner"></div><p>Loading admin dashboard...</p></div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">🎓</span>
          <span className="brand-text">CampusTutor</span>
        </div>
        <div className="sidebar-user">
          <div className="user-avatar user-avatar-admin">A</div>
          <div className="user-info">
            <span className="user-name">Admin</span>
            <span className="user-role">Administrator</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <button className={`sidebar-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <span className="nav-icon">📊</span> Dashboard
          </button>
          <button className={`sidebar-link ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <span className="nav-icon">👥</span> Manage Users
          </button>
        </nav>
        <div className="sidebar-footer">
          <button className="sidebar-link sidebar-logout" onClick={handleLogout}>
            <span className="nav-icon">🚪</span> Log Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="dashboard-main">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {activeTab === 'dashboard' && (
          <>
            <header className="dashboard-header">
              <h1>Dashboard</h1>
              <p className="text-muted">System monitoring and session overview</p>
            </header>

            <div className="stats-row stats-row-4">
              <div className="stat-card"><div className="stat-icon">👥</div><div className="stat-info"><span className="stat-value">{stats.total_students}</span><span className="stat-label">Students</span></div></div>
              <div className="stat-card"><div className="stat-icon">👨‍🏫</div><div className="stat-info"><span className="stat-value">{stats.total_tutors}</span><span className="stat-label">Tutors</span></div></div>
              <div className="stat-card"><div className="stat-icon">📅</div><div className="stat-info"><span className="stat-value">{stats.total_sessions}</span><span className="stat-label">Total Sessions</span></div></div>
              <div className="stat-card"><div className="stat-icon">✅</div><div className="stat-info"><span className="stat-value">{stats.completed}</span><span className="stat-label">Completed</span></div></div>
            </div>

            <section className="dashboard-section">
              <h2 className="section-heading">Session Status Breakdown</h2>
              <div className="chart-container">
                {stats.total_sessions === 0 ? (
                  <div className="empty-state"><span className="empty-icon">📭</span><h3>No sessions recorded yet</h3><p>Chart will populate once students start booking sessions.</p></div>
                ) : (
                  <div className="bar-chart">
                    <div className="bar-group"><div className="bar-value">{stats.confirmed}</div><div className="bar bar-confirmed" style={{ height: `${Math.max(10, (stats.confirmed / Math.max(1, stats.total_sessions)) * 160)}px` }}></div><span className="bar-label">Confirmed</span></div>
                    <div className="bar-group"><div className="bar-value">{stats.completed}</div><div className="bar bar-completed" style={{ height: `${Math.max(10, (stats.completed / Math.max(1, stats.total_sessions)) * 160)}px` }}></div><span className="bar-label">Completed</span></div>
                    <div className="bar-group"><div className="bar-value">{stats.cancelled}</div><div className="bar bar-cancelled" style={{ height: `${Math.max(10, (stats.cancelled / Math.max(1, stats.total_sessions)) * 160)}px` }}></div><span className="bar-label">Cancelled</span></div>
                  </div>
                )}
              </div>
            </section>

            <section className="dashboard-section">
              <h2 className="section-heading">All Sessions</h2>
              {sessions.length === 0 ? (
                <div className="empty-state"><span className="empty-icon">📭</span><h3>No sessions found</h3><p>Sessions will appear here once students start booking.</p></div>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead><tr><th>ID</th><th>Student</th><th>Tutor</th><th>Course</th><th>Date</th><th>Time</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {sessions.map((session) => (
                        <tr key={session.id}>
                          <td>#{session.id}</td>
                          <td>{session.student_name || 'N/A'}</td>
                          <td>{session.tutor_name || 'N/A'}</td>
                          <td>{session.course_code || '-'}</td>
                          <td>{session.slot?.date || '-'}</td>
                          <td>{session.slot?.start_time ? `${session.slot.start_time} - ${session.slot.end_time}` : '-'}</td>
                          <td><span className={`badge badge-${session.status}`}>{session.status}</span></td>
                          <td>
                            {session.status === 'confirmed' ? (
                              <button className="btn btn-sm btn-success-outline" onClick={() => handleCompleteSession(session.id)} disabled={completingId === session.id}>
                                {completingId === session.id ? <span className="btn-spinner"></span> : 'Complete'}
                              </button>
                            ) : (
                              <span className="action-disabled">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === 'users' && (
          <>
            <header className="dashboard-header">
              <h1>Manage Users</h1>
              <p className="text-muted">View, search, and manage user accounts</p>
            </header>

            <section className="dashboard-section">
              <div className="admin-search-bar">
                <input type="text" className="admin-search-input" placeholder="Search users by name, email, or phone..." value={searchQuery} onChange={handleSearch} />
                <span className="admin-search-count">{users.length} user{users.length !== 1 ? 's' : ''} found</span>
              </div>
            </section>

            <section className="dashboard-section">
              <h2 className="section-heading">User Accounts</h2>
              {users.length === 0 ? (
                <div className="empty-state"><span className="empty-icon">👥</span><h3>No users found</h3><p>{searchQuery ? 'Try adjusting your search query.' : 'Users will appear here once they sign up.'}</p></div>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Verified</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className={!u.is_active ? 'row-inactive' : ''}>
                          <td>#{u.id}</td>
                          <td className="user-name-cell">
                            {u.full_name || 'N/A'}
                            {u.role === 'admin' && <span className="badge badge-role-admin admin-badge-inline">Admin</span>}
                          </td>
                          <td>{u.email}</td>
                          <td><span className="phone-display">{u.phone || '—'}</span></td>
                          <td><span className={`badge badge-role-${u.role}`}>{u.role}</span></td>
                          <td><span className={`badge badge-${u.is_verified ? 'completed' : 'pending'}`}>{u.is_verified ? 'Yes' : 'No'}</span></td>
                          <td><span className={`badge badge-${u.is_active ? 'active' : 'deactivated'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                          <td>
                            <div className="action-cells">
                              {u.role === 'admin' ? (
                                <span className="action-disabled">Protected</span>
                              ) : (
                                <>
                                  <select className="role-select" value={u.role} onChange={(e) => handleChangeRole(u.id, e.target.value)} disabled={changingRoleId === u.id}>
                                    <option value="student">Student</option>
                                    <option value="tutor">Tutor</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                  <button className={`btn btn-sm ${u.is_active ? 'btn-danger-outline' : 'btn-success-outline'}`} onClick={() => handleToggleActive(u.id, u.is_active)} disabled={togglingId === u.id}>
                                    {togglingId === u.id ? <span className="btn-spinner"></span> : u.is_active ? 'Deactivate' : 'Activate'}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}