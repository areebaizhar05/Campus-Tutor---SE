import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function TutorDashboard() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: '', department: '', bio: '', courses: '' });
  const [profileMsg, setProfileMsg] = useState('');
  const [slotForm, setSlotForm] = useState({ date: '', start_time: '', end_time: '', location: 'Ehsas Room' });
  const [slotMsg, setSlotMsg] = useState('');

  useEffect(() => {
    fetchData();
    if (user) setProfileForm({
      full_name: user.full_name || '',
      department: user.department || '',
      bio: user.bio || '',
      courses: Array.isArray(user.courses) ? user.courses.join(', ') : (user.courses || ''),
    });
  }, []);

  const fetchData = async () => {
    try {
      const [sRes, slRes] = await Promise.all([api.get('/sessions/my'), api.get('/tutors/my-availability')]);
      setSessions(sRes.data.sessions || []);
      setSlots(slRes.data.slots || []);
    } catch (err) { setError('Failed to load data.'); } finally { setLoading(false); }
  };

  const handleLogout = () => { logout(); };

  const handleProfileSave = async () => {
    try {
      const payload = { ...profileForm };
      if (payload.courses) {
        payload.courses = payload.courses.split(',').map(c => c.trim()).filter(Boolean);
      }
      const res = await api.put('/tutors/profile', payload);
      if (updateUser && res.data.user) updateUser(res.data.user);
      setEditingProfile(false);
      setProfileMsg('Profile updated!');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (err) { setProfileMsg(err.response?.data?.error || 'Failed to update.'); }
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    if (!slotForm.date || !slotForm.start_time || !slotForm.end_time) {
      setSlotMsg('All fields are required.'); return;
    }
    if (slotForm.start_time >= slotForm.end_time) {
      setSlotMsg('End time must be after start time.'); return;
    }
    try {
      await api.post('/tutors/availability', slotForm);
      setSlotMsg('Slot added successfully!');
      setSlotForm({ date: '', start_time: '', end_time: '', location: 'Ehsas Room' });
      fetchData();
      setTimeout(() => setSlotMsg(''), 3000);
    } catch (err) {
      setSlotMsg(err.response?.data?.error || 'Failed to add slot.');
    }
  };

  const handleDeleteSlot = async (slotId) => {
    if (!window.confirm('Are you sure you want to delete this slot?')) return;
    try {
      await api.delete(`/tutors/availability/${slotId}`);
      setSlotMsg('Slot deleted.');
      fetchData();
      setTimeout(() => setSlotMsg(''), 3000);
    } catch (err) {
      setSlotMsg(err.response?.data?.error || 'Failed to delete slot.');
    }
  };

  const handleCancelSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to cancel this session?')) return;
    try {
      await api.put(`/sessions/${sessionId}/cancel`);
      setSlotMsg('Session cancelled.');
      fetchData();
      setTimeout(() => setSlotMsg(''), 3000);
    } catch (err) {
      setSlotMsg(err.response?.data?.error || 'Failed to cancel session.');
    }
  };

  const upcoming = sessions.filter(s => s.status === 'confirmed');
  const completed = sessions.filter(s => s.status === 'completed');
  const openSlots = slots.filter(s => s.status === 'open');

  if (loading) return (
    <div className="dashboard-layout"><div className="loading-screen"><div className="spinner"></div><p>Loading...</p></div></div>
  );

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-brand"><span className="brand-icon">🎓</span><span className="brand-text">CampusTutor</span></div>
        <div className="sidebar-user">
          <div className="user-avatar">{user?.full_name?.charAt(0)?.toUpperCase() || 'T'}</div>
          <div className="user-info"><span className="user-name">{user?.full_name || 'Tutor'}</span><span className="user-role">Tutor</span></div>
        </div>
        <nav className="sidebar-nav">
          <button className={`sidebar-link ${activeTab === 'upcoming' ? 'active' : ''}`} onClick={() => setActiveTab('upcoming')}><span className="nav-icon">📅</span> Upcoming</button>
          <button className={`sidebar-link ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}><span className="nav-icon">✅</span> Completed</button>
          <button className={`sidebar-link ${activeTab === 'slots' ? 'active' : ''}`} onClick={() => setActiveTab('slots')}><span className="nav-icon">🕐</span> My Slots ({openSlots.length})</button>
          <button className={`sidebar-link ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}><span className="nav-icon">👤</span> My Profile</button>
        </nav>
        <div className="sidebar-footer"><button className="sidebar-link sidebar-logout" onClick={handleLogout}><span className="nav-icon">🚪</span> Log Out</button></div>
      </aside>
      <main className="dashboard-main">
        <header className="dashboard-header"><h1>Welcome, {user?.full_name} 👋</h1><p className="text-muted">Manage your sessions and profile</p></header>
        {error && <div className="alert alert-error">{error}</div>}
        {(profileMsg || slotMsg) && <div className="alert alert-success">{profileMsg || slotMsg}</div>}
        <div className="stats-row">
          <div className="stat-card"><div className="stat-icon">📅</div><div className="stat-info"><span className="stat-value">{upcoming.length}</span><span className="stat-label">Upcoming</span></div></div>
          <div className="stat-card"><div className="stat-icon">✅</div><div className="stat-info"><span className="stat-value">{completed.length}</span><span className="stat-label">Completed</span></div></div>
          <div className="stat-card"><div className="stat-icon">🕐</div><div className="stat-info"><span className="stat-value">{openSlots.length}</span><span className="stat-label">Open Slots</span></div></div>
        </div>

        {activeTab === 'upcoming' && (
          <section className="dashboard-section">
            <h2 className="section-heading">Upcoming Sessions</h2>
            {upcoming.length === 0 ? <div className="empty-state"><span className="empty-icon">📭</span><h3>No upcoming sessions</h3></div> : (
              <div className="sessions-list">{upcoming.map(s => (
                <div key={s.id} className="session-card">
                  <div className="session-header"><h3>{s.course_code || 'Session'}</h3><span className={`badge badge-${s.status}`}>{s.status}</span></div>
                  <div className="session-details">
                    <p><strong>Student:</strong> {s.student_name || 'TBD'}</p>
                    <p><strong>Date:</strong> {s.slot?.date || 'TBD'}</p>
                    <p><strong>Time:</strong> {s.slot?.start_time}{s.slot?.end_time ? ' — ' + s.slot.end_time : ''}</p>
                    <p><strong>Location:</strong> {s.slot?.location || 'N/A'}</p>
                  </div>
                  <div className="session-actions">
                    <button className="btn btn-outline btn-danger-outline" onClick={() => handleCancelSession(s.id)}>Cancel Session</button>
                  </div>
                </div>
              ))}</div>
            )}
          </section>
        )}

        {activeTab === 'completed' && (
          <section className="dashboard-section">
            <h2 className="section-heading">Completed Sessions</h2>
            {completed.length === 0 ? <div className="empty-state"><span className="empty-icon">📋</span><h3>No completed sessions</h3></div> : (
              <div className="sessions-list">{completed.map(s => (
                <div key={s.id} className="session-card">
                  <div className="session-header"><h3>{s.course_code || 'Session'}</h3><span className="badge badge-completed">completed</span></div>
                  <div className="session-details">
                    <p><strong>Student:</strong> {s.student_name || 'N/A'}</p>
                    <p><strong>Date:</strong> {s.slot?.date || 'N/A'}</p>
                    <p><strong>Time:</strong> {s.slot?.start_time || 'N/A'}</p>
                  </div>
                </div>
              ))}</div>
            )}
          </section>
        )}

        {activeTab === 'slots' && (
          <section className="dashboard-section">
            <h2 className="section-heading">My Availability Slots</h2>
            <div className="add-slot-form">
              <h3 className="form-subtitle">Add New Slot</h3>
              <form onSubmit={handleAddSlot} className="inline-form">
                <div className="form-group"><label>Date</label><input className="form-input" type="date" value={slotForm.date} onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })} required /></div>
                <div className="form-group"><label>Start Time</label><input className="form-input" type="time" value={slotForm.start_time} onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value })} required /></div>
                <div className="form-group"><label>End Time</label><input className="form-input" type="time" value={slotForm.end_time} onChange={(e) => setSlotForm({ ...slotForm, end_time: e.target.value })} required /></div>
                <div className="form-group"><label>Location</label><input className="form-input" type="text" placeholder="Ehsas Room" value={slotForm.location} onChange={(e) => setSlotForm({ ...slotForm, location: e.target.value })} /></div>
                <button type="submit" className="btn btn-primary">Add Slot</button>
              </form>
            </div>
            {slots.length === 0 ? <div className="empty-state"><span className="empty-icon">🕐</span><h3>No slots created</h3><p>Your availability slots will appear here.</p></div> : (
              <div className="sessions-list">{slots.map(s => (
                <div key={s.id} className="session-card">
                  <div className="session-header"><h3>{s.date}</h3><span className={`badge badge-${s.status === 'open' ? 'confirmed' : 'cancelled'}`}>{s.status}</span></div>
                  <div className="session-details">
                    <p><strong>Time:</strong> {s.start_time} — {s.end_time}</p>
                    <p><strong>Location:</strong> {s.location || 'N/A'}</p>
                  </div>
                  {s.status === 'open' && (
                    <div className="session-actions">
                      <button className="btn btn-outline btn-danger-outline" onClick={() => handleDeleteSlot(s.id)}>Delete Slot</button>
                    </div>
                  )}
                </div>
              ))}</div>
            )}
          </section>
        )}

        {activeTab === 'profile' && (
          <section className="dashboard-section">
            <div className="profile-section">
              <div className="profile-header-row">
                <h2 className="section-heading">My Tutor Profile</h2>
                {!editingProfile ? <button className="btn btn-outline" onClick={() => setEditingProfile(true)}>Edit Profile</button> : (
                  <div className="profile-actions"><button className="btn btn-outline" onClick={() => setEditingProfile(false)}>Cancel</button><button className="btn btn-primary" onClick={handleProfileSave}>Save</button></div>
                )}
              </div>
              <div className="profile-display">
                <div className="profile-avatar-large">{user?.full_name?.charAt(0)?.toUpperCase() || 'T'}</div>
                <div className="profile-details">
                  <h3>{user?.full_name}</h3><p className="text-muted">{user?.email}</p>
                  {editingProfile ? (
                    <div className="profile-form">
                      <div className="form-group"><label>Full Name</label><input className="form-input" value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} /></div>
                      <div className="form-group"><label>Department</label><input className="form-input" placeholder="e.g., Computer Science" value={profileForm.department} onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })} /></div>
                      <div className="form-group"><label>Bio</label><textarea className="form-input" rows={3} placeholder="Tell students about yourself..." value={profileForm.bio} onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })} /></div>
                      <div className="form-group"><label>Courses</label><input className="form-input" placeholder="e.g., CS101, CS201, MATH101" value={profileForm.courses} onChange={(e) => setProfileForm({ ...profileForm, courses: e.target.value })} /><span className="form-hint">Comma-separated course codes</span></div>
                    </div>
                  ) : (
                    <div className="profile-info-grid">
                      <div className="profile-info-item"><span className="info-label">Department</span><span className="info-value">{user?.department || 'Not specified'}</span></div>
                      <div className="profile-info-item"><span className="info-label">Bio</span><span className="info-value">{user?.bio || 'No bio yet.'}</span></div>
                      <div className="profile-info-item"><span className="info-label">Courses</span><span className="info-value">{Array.isArray(user?.courses) ? user.courses.join(', ') : (user?.courses || 'Not specified')}</span></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}