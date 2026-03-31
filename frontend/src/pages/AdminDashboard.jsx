import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total_sessions: 0, confirmed: 0, completed: 0, cancelled: 0, total_students: 0, total_tutors: 0 });
  const [sessions, setSessions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      const [sRes, sessRes, uRes] = await Promise.all([api.get('/admin/stats'), api.get('/admin/sessions'), api.get('/admin/users')]);
      setStats(sRes.data);
      setSessions(sessRes.data.sessions || []);
      setUsers(uRes.data.users || []);
    } catch (err) { setError('Failed to load admin data.'); } finally { setLoading(false); }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  if (loading) return (
    <div className="dashboard-layout"><div className="loading-screen"><div className="spinner"></div><p>Loading...</p></div></div>
  );

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-brand"><span className="brand-icon">🎓</span><span className="brand-text">CampusTutor</span></div>
        <div className="sidebar-user">
          <div className="user-avatar user-avatar-admin">A</div>
          <div className="user-info"><span className="user-name">Admin</span><span className="user-role">Administrator</span></div>
        </div>
        <nav className="sidebar-nav">
          <button className={`sidebar-link ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}><span className="nav-icon">📊</span> Overview</button>
          <button className={`sidebar-link ${activeTab === 'sessions' ? 'active' : ''}`} onClick={() => setActiveTab('sessions')}><span className="nav-icon">📅</span> Sessions</button>
          <button className={`sidebar-link ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}><span className="nav-icon">👥</span> Users</button>
        </nav>
        <div className="sidebar-footer"><button className="sidebar-link sidebar-logout" onClick={handleLogout}><span className="nav-icon">🚪</span> Log Out</button></div>
      </aside>
      <main className="dashboard-main">
        <header className="dashboard-header"><h1>Admin Dashboard</h1><p className="text-muted">CampusTutor system overview</p></header>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="stats-row stats-row-4">
          <div className="stat-card"><div className="stat-icon">👥</div><div className="stat-info"><span className="stat-value">{stats.total_students}</span><span className="stat-label">Students</span></div></div>
          <div className="stat-card"><div className="stat-icon">👨‍🏫</div><div className="stat-info"><span className="stat-value">{stats.total_tutors}</span><span className="stat-label">Tutors</span></div></div>
          <div className="stat-card"><div className="stat-icon">📅</div><div className="stat-info"><span className="stat-value">{stats.total_sessions}</span><span className="stat-label">Total Sessions</span></div></div>
          <div className="stat-card"><div className="stat-icon">✅</div><div className="stat-info"><span className="stat-value">{stats.completed}</span><span className="stat-label">Completed</span></div></div>
        </div>

        {activeTab === 'overview' && (
          <div>
            <section className="dashboard-section">
              <h2 className="section-heading">Session Summary</h2>
              <div className="chart-container">
                <div className="bar-chart">
                  <div className="bar-group"><div className="bar bar-pending" style={{ height: Math.max(10, stats.confirmed * 20) + 'px' }}></div><span className="bar-label">Confirmed ({stats.confirmed})</span></div>
                  <div className="bar-group"><div className="bar bar-completed" style={{ height: Math.max(10, stats.completed * 20) + 'px' }}></div><span className="bar-label">Completed ({stats.completed})</span></div>
                  <div className="bar-group"><div className="bar bar-cancelled" style={{ height: Math.max(10, (stats.cancelled || 0) * 20) + 'px' }}></div><span className="bar-label">Cancelled ({stats.cancelled || 0})</span></div>
                </div>
              </div>
            </section>
            <section className="dashboard-section">
              <h2 className="section-heading">Recent Sessions</h2>
              {sessions.length === 0 ? <div className="empty-state"><span className="empty-icon">📭</span><h3>No sessions yet</h3></div> : (
                <div className="table-wrapper">
                  <table className="data-table"><thead><tr><th>ID</th><th>Student</th><th>Tutor</th><th>Course</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
                  <tbody>{sessions.slice(0, 10).map(s => (
                    <tr key={s.id}><td>#{s.id}</td><td>{s.student_name || 'N/A'}</td><td>{s.tutor_name || 'N/A'}</td><td>{s.course_code || '-'}</td><td>{s.slot?.date || '-'}</td><td>{s.slot?.start_time || '-'}</td><td><span className={`badge badge-${s.status}`}>{s.status}</span></td></tr>
                  ))}</tbody></table>
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'sessions' && (
          <section className="dashboard-section">
            <h2 className="section-heading">All Sessions</h2>
            {sessions.length === 0 ? <div className="empty-state"><span className="empty-icon">📭</span><h3>No sessions</h3></div> : (
              <div className="table-wrapper">
                <table className="data-table"><thead><tr><th>ID</th><th>Student</th><th>Tutor</th><th>Course</th><th>Date</th><th>Time</th><th>Status</th></tr></thead>
                <tbody>{sessions.map(s => (
                  <tr key={s.id}><td>#{s.id}</td><td>{s.student_name || 'N/A'}</td><td>{s.tutor_name || 'N/A'}</td><td>{s.course_code || '-'}</td><td>{s.slot?.date || '-'}</td><td>{s.slot?.start_time || '-'}</td><td><span className={`badge badge-${s.status}`}>{s.status}</span></td></tr>
                ))}</tbody></table>
              </div>
            )}
          </section>
        )}

        {activeTab === 'users' && (
          <section className="dashboard-section">
            <h2 className="section-heading">All Users</h2>
            {users.length === 0 ? <div className="empty-state"><span className="empty-icon">👥</span><h3>No users</h3></div> : (
              <div className="table-wrapper">
                <table className="data-table"><thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Verified</th></tr></thead>
                <tbody>{users.map(u => (
                  <tr key={u.id}><td>#{u.id}</td><td>{u.full_name || u.name || 'N/A'}</td><td>{u.email}</td><td><span className={`badge badge-role-${u.role}`}>{u.role}</span></td><td><span className={`badge badge-${u.is_verified ? 'completed' : 'cancelled'}`}>{u.is_verified ? 'Yes' : 'No'}</span></td></tr>
                ))}</tbody></table>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
