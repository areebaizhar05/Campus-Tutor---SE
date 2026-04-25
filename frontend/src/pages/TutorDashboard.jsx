import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

/* ── Sidebar ──────────────────────────────── */
function Sidebar({ tab, setTab, user, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sb-logo">
        <h2>Campus<span>Tutor</span></h2>
        <div className="sb-role">Tutor Portal</div>
      </div>
      <nav className="sb-nav">
        <a className={tab === 'sessions' ? 'active' : ''} onClick={() => setTab('sessions')}>
          <span className="nav-icon">📋</span> My Sessions
        </a>
        <a className={tab === 'availability' ? 'active' : ''} onClick={() => setTab('availability')}>
          <span className="nav-icon">📅</span> My Availability
        </a>
        <a className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>
          <span className="nav-icon">👤</span> My Profile
        </a>
      </nav>
      <div className="sb-bottom">
        <div className="sb-user-name">{user?.full_name || 'Tutor'}</div>
        <div className="sb-user-email">{user?.email || ''}</div>
        {user?.phone && <div className="sb-user-phone">{user.phone}</div>}
        <button className="sb-logout" onClick={onLogout}>↪ Log Out</button>
      </div>
    </aside>
  );
}

/* ── Helpers ──────────────────────────────── */
function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
function formatTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function statusBadge(status) {
  const s = status?.toLowerCase();
  if (s === 'confirmed') return <span className="badge badge-confirmed">Confirmed</span>;
  if (s === 'completed') return <span className="badge badge-completed">Completed</span>;
  if (s === 'cancelled') return <span className="badge badge-cancelled">Cancelled</span>;
  if (s === 'open') return <span className="badge badge-open">Open</span>;
  if (s === 'booked') return <span className="badge badge-booked">Booked</span>;
  return <span className="badge badge-open">{status || 'Open'}</span>;
}

function generateICS(session) {
  const start = new Date(session.date_time);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const pad = (n) => n.toString().padStart(2, '0');
  const fmt = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  const lines = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CampusTutor//EN',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,`DTEND:${fmt(end)}`,
    `SUMMARY:Tutoring: ${session.course_code || 'Session'}`,
    `DESCRIPTION:Session with ${session.student_name || 'Student'}`,
    'END:VEVENT','END:VCALENDAR'
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `session-${session.id || 'event'}.ics`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ── Main Component ───────────────────────── */
export default function TutorDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('sessions');

  /* Sessions state */
  const [subTab, setSubTab] = useState('upcoming');
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  /* Availability state */
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSlot, setNewSlot] = useState({ date: '', start_time: '', end_time: '', location: '' });
  const [adding, setAdding] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  /* Profile state */
  const [profile, setProfile] = useState({ full_name: '', department: '', bio: '', courses: [], phone: '' });
  const [editProfile, setEditProfile] = useState({ full_name: '', department: '', bio: '' });
  const [editCourses, setEditCourses] = useState([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  /* Load sessions */
  useEffect(() => {
    if (tab !== 'sessions') return;
    const load = async () => {
      setLoadingSessions(true);
      try {
        const data = await api.get('/sessions/tutor');
        setSessions(Array.isArray(data.sessions) ? data.sessions : Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSessions(false);
      }
    };
    load();
  }, [tab]);

  /* Load availability */
  useEffect(() => {
    if (tab !== 'availability') return;
    const load = async () => {
      setLoadingSlots(true);
      try {
        const data = await api.get('/availability');
        setSlots(Array.isArray(data.slots) ? data.slots : Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSlots(false);
      }
    };
    load();
  }, [tab]);

  /* Load profile */
  useEffect(() => {
    if (tab !== 'profile') return;
    const load = async () => {
      try {
        const data = await api.get('/tutor/profile');
        setProfile(data);
        setEditProfile({ full_name: data.full_name || '', department: data.department || '', bio: data.bio || '' });
        setEditCourses(data.courses || []);
      } catch (err) {
        console.error(err);
        // fallback to auth user
        setProfile({ full_name: user?.full_name || '', department: '', bio: '', courses: [], phone: user?.phone || '' });
        setEditProfile({ full_name: user?.full_name || '', department: '', bio: '' });
        setEditCourses([]);
      }
    };
    load();
  }, [tab]);

  const handleCancel = async () => {
    if (!cancelModal) return;
    setCancelling(true);
    try {
      await api.put(`/sessions/${cancelModal.id}/cancel`);
      setSessions((prev) => prev.map((s) => (s.id === cancelModal.id ? { ...s, status: 'cancelled' } : s)));
      setCancelModal(null);
    } catch (err) {
      alert(err.error || 'Cancel failed.');
    } finally {
      setCancelling(false);
    }
  };

  const handleAddSlot = async (e) => {
    e.preventDefault();
    if (!newSlot.date || !newSlot.start_time || !newSlot.end_time) {
      alert('Fill in all fields.');
      return;
    }
    setAdding(true);
    try {
      await api.post('/availability', newSlot);
      setNewSlot({ date: '', start_time: '', end_time: '', location: '' });
      setShowAddForm(false);
      // Refresh
      const data = await api.get('/availability');
      setSlots(Array.isArray(data.slots) ? data.slots : []);
    } catch (err) {
      alert(err.error || 'Failed to add slot.');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteSlot = async (id) => {
    try {
      await api.delete(`/availability/${id}`);
      setSlots((prev) => prev.filter((s) => s.id !== id));
      setDeleteId(null);
    } catch (err) {
      alert(err.error || 'Failed to delete slot.');
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setProfileMsg('');
    try {
      await api.put('/tutor/profile', { ...editProfile, courses: editCourses });
      setProfile((prev) => ({ ...prev, ...editProfile, courses: editCourses }));
      setEditing(false);
      setProfileMsg('Profile updated successfully!');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch (err) {
      alert(err.error || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const toggleCourse = (course) => {
    setEditCourses((prev) =>
      prev.includes(course) ? prev.filter((c) => c !== course) : [...prev, course]
    );
  };

  const upcoming = sessions.filter((s) => s.status?.toLowerCase() === 'confirmed');
  const completed = sessions.filter((s) => s.status?.toLowerCase() === 'completed');

  /* Group slots by date */
  const grouped = {};
  slots.forEach((s) => {
    const dateKey = s.date || (s.date_time ? new Date(s.date_time).toISOString().split('T')[0] : 'Unknown');
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(s);
  });

  const allCourses = ['CS101', 'CS201', 'CS301', 'CS305', 'CS401', 'MATH101', 'MATH201', 'PHY101', 'PHY201', 'EE201', 'SS101', 'SS201', 'HU101', 'HU201', 'COMM101'];

  return (
    <div className="app-shell">
      <Sidebar tab={tab} setTab={setTab} user={user} onLogout={logout} />

      <main className="main">
        {/* ── Sessions Tab ── */}
        {tab === 'sessions' && (
          <>
            <div className="page-header">
              <h1>My Sessions</h1>
              <p>Manage your tutoring sessions</p>
            </div>

            <div className="tab-bar">
              <div className={`tab ${subTab === 'upcoming' ? 'active' : ''}`} onClick={() => setSubTab('upcoming')}>
                Upcoming ({upcoming.length})
              </div>
              <div className={`tab ${subTab === 'completed' ? 'active' : ''}`} onClick={() => setSubTab('completed')}>
                Completed ({completed.length})
              </div>
            </div>

            {loadingSessions && <div className="spinner"></div>}

            {subTab === 'upcoming' && !loadingSessions && upcoming.length === 0 && (
              <div className="empty-state"><div className="ei">📅</div><p>No upcoming sessions.</p></div>
            )}
            {subTab === 'completed' && !loadingSessions && completed.length === 0 && (
              <div className="empty-state"><div className="ei">✅</div><p>No completed sessions.</p></div>
            )}

            {subTab === 'upcoming' && upcoming.map((s) => (
              <div key={s.id} className="session-item">
                <div className="session-info">
                  <div>
                    {s.course_code && <span className="course-tag">{s.course_code}</span>}
                    {statusBadge(s.status)}
                  </div>
                  <div className="person">{s.student_name || 'Student'}</div>
                  <div className="time">
                    {formatDate(s.date_time)} at {formatTime(s.date_time)}
                    {s.location && ` • ${s.location}`}
                  </div>
                </div>
                <div className="session-actions">
                  <button className="btn btn-sm btn-outline" onClick={() => generateICS(s)}>📅 .ics</button>
                  <button className="btn btn-sm btn-danger" onClick={() => setCancelModal(s)}>✕ Cancel</button>
                </div>
              </div>
            ))}

            {subTab === 'completed' && completed.map((s) => (
              <div key={s.id} className="session-item">
                <div className="session-info">
                  <div>
                    {s.course_code && <span className="course-tag">{s.course_code}</span>}
                    {statusBadge(s.status)}
                  </div>
                  <div className="person">{s.student_name || 'Student'}</div>
                  <div className="time">{formatDate(s.date_time)} at {formatTime(s.date_time)}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── Availability Tab ── */}
        {tab === 'availability' && (
          <>
            <div className="page-header">
              <h1>My Availability</h1>
              <p>Manage your tutoring time slots</p>
            </div>

            {loadingSlots && <div className="spinner"></div>}

            <button
              className="btn btn-primary"
              style={{ marginBottom: 20 }}
              onClick={() => setShowAddForm(!showAddForm)}
            >
              {showAddForm ? '✕ Cancel' : '+ Add New Slot'}
            </button>

            {showAddForm && (
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="section-title">New Availability Slot</div>
                <form onSubmit={handleAddSlot}>
                  <div className="form-2col">
                    <div className="form-group">
                      <label>Date</label>
                      <input type="date" value={newSlot.date} onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Location</label>
                      <input type="text" placeholder="e.g. Library Room 3" value={newSlot.location} onChange={(e) => setNewSlot({ ...newSlot, location: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-2col">
                    <div className="form-group">
                      <label>Start Time</label>
                      <input type="time" value={newSlot.start_time} onChange={(e) => setNewSlot({ ...newSlot, start_time: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>End Time</label>
                      <input type="time" value={newSlot.end_time} onChange={(e) => setNewSlot({ ...newSlot, end_time: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" className="btn btn-sm btn-gold" disabled={adding}>
                      {adding ? 'Adding…' : 'Add Slot'}
                    </button>
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => setShowAddForm(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {!loadingSlots && Object.keys(grouped).length === 0 && (
              <div className="empty-state"><div className="ei">📭</div><p>No availability slots yet.</p></div>
            )}

            {Object.entries(grouped).sort().map(([dateKey, dateSlots]) => (
              <div key={dateKey} style={{ marginBottom: 24 }}>
                <div className="section-title">{formatDate(dateKey)}</div>
                {dateSlots.map((s) => (
                  <div key={s.id} className="avail-item">
                    <div>
                      <div className="a-date">
                        {s.start_time || formatTime(s.date_time)}
                        {s.end_time ? ` – ${s.end_time}` : ''}
                      </div>
                      <div className="a-time">
                        {s.location || 'No location'}
                        {statusBadge(s.status)}
                      </div>
                    </div>
                    {s.status?.toLowerCase() === 'open' && (
                      <div className="session-actions">
                        <button className="btn btn-sm btn-danger" onClick={() => handleDeleteSlot(s.id)}>Delete</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </>
        )}

        {/* ── Profile Tab ── */}
        {tab === 'profile' && (
          <>
            <div className="page-header">
              <h1>My Profile</h1>
              <p>View and edit your tutor profile</p>
            </div>

            {profileMsg && <div className="alert alert-success">{profileMsg}</div>}

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div className="section-title" style={{ marginBottom: 0, border: 'none', padding: 0 }}>Profile Information</div>
                {!editing ? (
                  <button className="btn btn-sm btn-outline" onClick={() => setEditing(true)}>Edit</button>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-sm btn-outline" onClick={() => { setEditing(false); setEditProfile({ full_name: profile.full_name, department: profile.department, bio: profile.bio }); setEditCourses(profile.courses); }}>Cancel</button>
                    <button className="btn btn-sm btn-gold" onClick={handleSaveProfile} disabled={saving}>
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              {editing ? (
                <>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input value={editProfile.full_name} onChange={(e) => setEditProfile({ ...editProfile, full_name: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Department</label>
                    <input value={editProfile.department} onChange={(e) => setEditProfile({ ...editProfile, department: e.target.value })} placeholder="e.g. Computer Science" />
                  </div>
                  <div className="form-group">
                    <label>Bio</label>
                    <textarea rows={3} value={editProfile.bio} onChange={(e) => setEditProfile({ ...editProfile, bio: e.target.value })} placeholder="Tell students about yourself..." style={{ resize: 'vertical' }} />
                  </div>
                  <div className="form-group">
                    <label>Courses</label>
                    <div className="course-toggles">
                      {allCourses.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`course-toggle ${editCourses.includes(c) ? 'on' : ''}`}
                          onClick={() => toggleCourse(c)}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Full Name</div>
                    <div style={{ fontSize: '.95rem' }}>{profile.full_name || '—'}</div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Department</div>
                    <div style={{ fontSize: '.95rem' }}>{profile.department || '—'}</div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Phone</div>
                    <div style={{ fontSize: '.95rem' }}>{profile.phone || user?.phone || '—'}</div>
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Bio</div>
                    <div style={{ fontSize: '.95rem', color: 'var(--text-mid)' }}>{profile.bio || 'No bio provided.'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Courses</div>
                    <div className="course-toggles">
                      {(profile.courses || []).length > 0
                        ? profile.courses.map((c) => <span key={c} className="course-chip">{c}</span>)
                        : <span style={{ fontSize: '.88rem', color: 'var(--text-muted)' }}>No courses listed.</span>
                      }
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </main>

      {/* Cancel Confirmation Modal */}
      {cancelModal && (
        <div className="modal-overlay" onClick={() => !cancelling && setCancelModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Cancel Session?</div>
            <p style={{ fontSize: '.9rem', color: 'var(--text-mid)' }}>
              Are you sure you want to cancel this session with <strong>{cancelModal.student_name}</strong> on{' '}
              {formatDate(cancelModal.date_time)}?
            </p>
            <div className="modal-actions">
              <button className="btn btn-sm btn-outline" onClick={() => setCancelModal(null)} disabled={cancelling}>
                Keep
              </button>
              <button className="btn btn-sm btn-danger" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? 'Cancelling…' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
