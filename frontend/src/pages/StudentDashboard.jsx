import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [sRes, tRes] = await Promise.all([api.get('/sessions/my'), api.get('/tutors/')]);
      setSessions(sRes.data.sessions || []);
      setTutors(tRes.data.tutors || []);
    } catch (err) { setError('Failed to load data.'); } finally { setLoading(false); }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  // Backend returns session.slot = { date, start_time, end_time }
  const upcoming = sessions.filter(s => s.status === 'confirmed');
  const completed = sessions.filter(s => s.status === 'completed');

  if (loading) return (
    <div className="dashboard-layout"><div className="loading-screen"><div className="spinner"></div><p>Loading...</p></div></div>
  );

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-brand"><span className="brand-icon">🎓</span><span className="brand-text">CampusTutor</span></div>
        <div className="sidebar-user">
          <div className="user-avatar">{user?.full_name?.charAt(0)?.toUpperCase() || 'S'}</div>
          <div className="user-info"><span className="user-name">{user?.full_name || 'Student'}</span><span className="user-role">Student</span></div>
        </div>
        <nav className="sidebar-nav">
          <button className={`sidebar-link ${activeTab === 'upcoming' ? 'active' : ''}`} onClick={() => setActiveTab('upcoming')}><span className="nav-icon">📅</span> Upcoming</button>
          <button className={`sidebar-link ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}><span className="nav-icon">✅</span> Completed</button>
          <button className={`sidebar-link ${activeTab === 'tutors' ? 'active' : ''}`} onClick={() => setActiveTab('tutors')}><span className="nav-icon">👨‍🏫</span> Browse Tutors</button>
        </nav>
        <div className="sidebar-footer"><button className="sidebar-link sidebar-logout" onClick={handleLogout}><span className="nav-icon">🚪</span> Log Out</button></div>
      </aside>
      <main className="dashboard-main">
        <header className="dashboard-header"><h1>Welcome, {user?.full_name} 👋</h1><p className="text-muted">Your tutoring sessions overview</p></header>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="stats-row">
          <div className="stat-card"><div className="stat-icon">📅</div><div className="stat-info"><span className="stat-value">{upcoming.length}</span><span className="stat-label">Upcoming</span></div></div>
          <div className="stat-card"><div className="stat-icon">✅</div><div className="stat-info"><span className="stat-value">{completed.length}</span><span className="stat-label">Completed</span></div></div>
          <div className="stat-card"><div className="stat-icon">📊</div><div className="stat-info"><span className="stat-value">{sessions.length}</span><span className="stat-label">Total</span></div></div>
        </div>
        {activeTab === 'upcoming' && (
          <section className="dashboard-section">
            <h2 className="section-heading">Upcoming Sessions</h2>
            {upcoming.length === 0 ? (
              <div className="empty-state"><span className="empty-icon">📭</span><h3>No upcoming sessions</h3><p>Browse tutors and book a session!</p><button className="btn btn-primary" onClick={() => setActiveTab('tutors')}>Browse Tutors</button></div>
            ) : (
              <div className="sessions-list">{upcoming.map(s => (
                <div key={s.id} className="session-card">
                  <div className="session-header"><h3>{s.course_code || 'Session'}</h3><span className={`badge badge-${s.status}`}>{s.status}</span></div>
                  <div className="session-details">
                    <p><strong>Tutor:</strong> {s.tutor_name || 'N/A'}</p>
                    <p><strong>Date:</strong> {s.slot?.date || 'TBD'}</p>
                    <p><strong>Time:</strong> {s.slot?.start_time}{s.slot?.end_time ? ' — ' + s.slot.end_time : ''}</p>
                    <p><strong>Location:</strong> {s.slot?.location || 'N/A'}</p>
                  </div>
                </div>
              ))}</div>
            )}
          </section>
        )}
        {activeTab === 'completed' && (
          <section className="dashboard-section">
            <h2 className="section-heading">Completed Sessions</h2>
            {completed.length === 0 ? (
              <div className="empty-state"><span className="empty-icon">📋</span><h3>No completed sessions</h3></div>
            ) : (
              <div className="sessions-list">{completed.map(s => (
                <div key={s.id} className="session-card">
                  <div className="session-header"><h3>{s.course_code || 'Session'}</h3><span className="badge badge-completed">completed</span></div>
                  <div className="session-details">
                    <p><strong>Tutor:</strong> {s.tutor_name || 'N/A'}</p>
                    <p><strong>Date:</strong> {s.slot?.date || 'N/A'}</p>
                    <p><strong>Time:</strong> {s.slot?.start_time || 'N/A'}</p>
                  </div>
                </div>
              ))}</div>
            )}
          </section>
        )}
        {activeTab === 'tutors' && (
          <section className="dashboard-section">
            <h2 className="section-heading">Available Tutors</h2>
            {tutors.length === 0 ? (
              <div className="empty-state"><span className="empty-icon">🔍</span><h3>No tutors available yet</h3></div>
            ) : (
              <div className="tutors-grid">{tutors.map(t => (
                <div key={t.id} className="tutor-card">
                  <div className="tutor-avatar">{t.full_name?.charAt(0)?.toUpperCase() || 'T'}</div>
                  <h3>{t.full_name}</h3>
                  <p className="tutor-subjects">{t.department || ''}</p>
                  <p className="tutor-sessions">{t.courses?.join(', ') || 'No courses listed'}</p>
                  <p className="tutor-rating">{t.open_slots_count || 0} open slots</p>
                </div>
              ))}</div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
