import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

/* ── Sidebar ──────────────────────────────── */
function Sidebar({ tab, setTab, user, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sb-logo">
        <h2>Campus<span>Tutor</span></h2>
        <div className="sb-role">Student Portal</div>
      </div>
      <nav className="sb-nav">
        <a className={tab === 'book' ? 'active' : ''} onClick={() => setTab('book')}>
          <span className="nav-icon">📚</span> Book a Session
        </a>
        <a className={tab === 'sessions' ? 'active' : ''} onClick={() => setTab('sessions')}>
          <span className="nav-icon">📋</span> My Sessions
        </a>
      </nav>
      <div className="sb-bottom">
        <div className="sb-user-name">{user?.full_name || 'Student'}</div>
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
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}
function formatTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function initials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}
function statusBadge(status) {
  const s = status?.toLowerCase();
  if (s === 'confirmed') return <span className="badge badge-confirmed">Confirmed</span>;
  if (s === 'completed') return <span className="badge badge-completed">Completed</span>;
  if (s === 'cancelled') return <span className="badge badge-cancelled">Cancelled</span>;
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
    `DESCRIPTION:Session with ${session.tutor_name || 'Tutor'}`,
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
export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('book');

  /* Book tab state */
  const [tutors, setTutors] = useState([]);
  const [courseFilter, setCourseFilter] = useState('');
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [pickedSlot, setPickedSlot] = useState(null);
  const [courseCode, setCourseCode] = useState('');
  const [bookModal, setBookModal] = useState(null);
  const [loadingTutors, setLoadingTutors] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);
  const [msg, setMsg] = useState('');

  /* Sessions tab state */
  const [subTab, setSubTab] = useState('upcoming');
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  /* Reschedule state */
  const [rescheduleModal, setRescheduleModal] = useState(null);
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [pickedReschedule, setPickedReschedule] = useState(null);
  const [rescheduling, setRescheduling] = useState(false);

  /* Load tutors */
  useEffect(() => {
    if (tab !== 'book') return;
    const load = async () => {
      setLoadingTutors(true);
      try {
        const data = await api.get('/tutors');
        setTutors(Array.isArray(data.tutors) ? data.tutors : Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingTutors(false);
      }
    };
    load();
  }, [tab]);

  /* Load sessions */
  useEffect(() => {
    if (tab !== 'sessions') return;
    const load = async () => {
      setLoadingSessions(true);
      try {
        const data = await api.get('/sessions/mine');
        setSessions(Array.isArray(data.sessions) ? data.sessions : Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSessions(false);
      }
    };
    load();
  }, [tab]);

  const handleViewSlots = async (tutor) => {
    setSelectedTutor(tutor);
    setPickedSlot(null);
    setCourseCode('');
    setLoadingSlots(true);
    try {
      const data = await api.get(`/tutors/${tutor.id}/slots`);
      setSlots(Array.isArray(data.slots) ? data.slots : Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBook = () => {
    if (!pickedSlot || !courseCode.trim()) return;
    setBookModal({ slot: pickedSlot, courseCode: courseCode.trim() });
  };

  const confirmBook = async () => {
    if (!bookModal) return;
    setBooking(true);
    setMsg('');
    try {
      await api.post('/sessions', {
        tutor_id: selectedTutor.id,
        slot_id: bookModal.slot.id,
        course_code: bookModal.courseCode,
      });
      setBookModal(null);
      setPickedSlot(null);
      setCourseCode('');
      setMsg('Session booked successfully!');
      setTimeout(() => setMsg(''), 4000);
      // Refresh slots
      try {
        const data = await api.get(`/tutors/${selectedTutor.id}/slots`);
        setSlots(Array.isArray(data.slots) ? data.slots : []);
      } catch {}
    } catch (err) {
      alert(err.error || 'Booking failed.');
    } finally {
      setBooking(false);
    }
  };

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

  const handleReschedule = async (session) => {
    setRescheduleModal(session);
    setPickedReschedule(null);
    setRescheduling(false);
    try {
      const data = await api.get(`/tutors/${session.tutor_id}/slots`);
      setRescheduleSlots(Array.isArray(data.slots) ? data.slots : Array.isArray(data) ? data : []);
    } catch (err) {
      setRescheduleSlots([]);
    }
  };

  const confirmReschedule = async () => {
    if (!rescheduleModal || !pickedReschedule) return;
    setRescheduling(true);
    try {
      await api.put(`/sessions/${rescheduleModal.id}/reschedule`, { slot_id: pickedReschedule.id });
      setSessions((prev) =>
        prev.map((s) =>
          s.id === rescheduleModal.id
            ? { ...s, date_time: pickedReschedule.date_time, location: pickedReschedule.location || s.location }
            : s
        )
      );
      setRescheduleModal(null);
    } catch (err) {
      alert(err.error || 'Reschedule failed.');
    } finally {
      setRescheduling(false);
    }
  };

  const upcoming = sessions.filter((s) => s.status?.toLowerCase() === 'confirmed');
  const completed = sessions.filter((s) => s.status?.toLowerCase() === 'completed');
  const cancelled = sessions.filter((s) => s.status?.toLowerCase() === 'cancelled');

  const filteredTutors = courseFilter.trim()
    ? tutors.filter(
        (t) =>
          (t.courses || []).some((c) => c.toLowerCase().includes(courseFilter.toLowerCase())) ||
          (t.full_name || '').toLowerCase().includes(courseFilter.toLowerCase())
      )
    : tutors;

  return (
    <div className="app-shell">
      <Sidebar tab={tab} setTab={setTab} user={user} onLogout={logout} />

      <main className="main">
        {tab === 'book' && (
          <>
            <div className="page-header">
              <h1>Book a Session</h1>
              <p>Find a tutor and book an available slot</p>
            </div>

            {msg && <div className="alert alert-success">{msg}</div>}

            <div className="search-bar">
              <input
                placeholder="Filter by course code or tutor name…"
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
              />
            </div>

            {loadingTutors && <div className="spinner"></div>}

            {!loadingTutors && filteredTutors.length === 0 && (
              <div className="empty-state">
                <div className="ei">🔍</div>
                <p>No tutors found{courseFilter ? ` for "${courseFilter}"` : ''}.</p>
              </div>
            )}

            <div className="tutor-grid">
              {filteredTutors.map((t) => (
                <div key={t.id} className="tutor-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div className="avatar">{initials(t.full_name)}</div>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{t.full_name}</div>
                      <div style={{ fontSize: '.78rem', color: 'var(--text-muted)' }}>
                        {t.department || 'Tutor'}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    {(t.courses || []).map((c) => (
                      <span key={c} className="course-chip">{c}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                    {t.open_slots_count ?? t.open_slots ?? 0} open slot(s)
                  </div>
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={() => handleViewSlots(t)}
                  >
                    View Slots
                  </button>
                </div>
              ))}
            </div>

            {/* Slots panel */}
            {selectedTutor && (
              <div className="card" style={{ marginTop: 24 }}>
                <div className="section-title">
                  Available Slots — {selectedTutor.full_name}
                  <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={() => { setSelectedTutor(null); setSlots([]); setPickedSlot(null); }}>
                    ✕ Close
                  </button>
                </div>

                {loadingSlots && <div className="spinner"></div>}

                {!loadingSlots && slots.length === 0 && (
                  <div className="empty-state">
                    <div className="ei">📭</div>
                    <p>No available slots for this tutor.</p>
                  </div>
                )}

                <div className="slots-grid">
                  {slots.map((s) => (
                    <button
                      key={s.id}
                      className={`slot-btn ${pickedSlot?.id === s.id ? 'picked' : ''}`}
                      onClick={() => setPickedSlot(s)}
                    >
                      <div className="s-date">{formatDate(s.date_time || s.date)}</div>
                      <div className="s-time">{formatTime(s.date_time || s.date)} {(s.end_time || '') && `– ${s.end_time}`}</div>
                      {s.location && <div className="s-loc">📍 {s.location}</div>}
                    </button>
                  ))}
                </div>

                {pickedSlot && (
                  <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label>Course Code</label>
                      <input
                        placeholder="e.g. CS201"
                        value={courseCode}
                        onChange={(e) => setCourseCode(e.target.value)}
                      />
                    </div>
                    <button className="btn btn-gold" onClick={handleBook}>
                      Book
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {tab === 'sessions' && (
          <>
            <div className="page-header">
              <h1>My Sessions</h1>
              <p>View and manage your tutoring sessions</p>
            </div>

            <div className="tab-bar">
              <div className={`tab ${subTab === 'upcoming' ? 'active' : ''}`} onClick={() => setSubTab('upcoming')}>
                Upcoming ({upcoming.length})
              </div>
              <div className={`tab ${subTab === 'completed' ? 'active' : ''}`} onClick={() => setSubTab('completed')}>
                Completed ({completed.length})
              </div>
              <div className={`tab ${subTab === 'cancelled' ? 'active' : ''}`} onClick={() => setSubTab('cancelled')}>
                Cancelled ({cancelled.length})
              </div>
            </div>

            {loadingSessions && <div className="spinner"></div>}

            {subTab === 'upcoming' && !loadingSessions && upcoming.length === 0 && (
              <div className="empty-state"><div className="ei">📅</div><p>No upcoming sessions.</p></div>
            )}
            {subTab === 'completed' && !loadingSessions && completed.length === 0 && (
              <div className="empty-state"><div className="ei">✅</div><p>No completed sessions.</p></div>
            )}
            {subTab === 'cancelled' && !loadingSessions && cancelled.length === 0 && (
              <div className="empty-state"><div className="ei">❌</div><p>No cancelled sessions.</p></div>
            )}

            {subTab === 'upcoming' && upcoming.map((s) => (
              <div key={s.id} className="session-item">
                <div className="session-info">
                  <div>
                    {s.course_code && <span className="course-tag">{s.course_code}</span>}
                    {statusBadge(s.status)}
                  </div>
                  <div className="person">{s.tutor_name || 'Tutor'}</div>
                  <div className="time">
                    {formatDate(s.date_time)} at {formatTime(s.date_time)}
                    {s.location && ` • ${s.location}`}
                  </div>
                </div>
                <div className="session-actions">
                  <button className="btn btn-sm btn-outline" onClick={() => generateICS(s)}>📅 .ics</button>
                  <button className="btn btn-sm btn-outline" onClick={() => handleReschedule(s)}>↻ Reschedule</button>
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
                  <div className="person">{s.tutor_name || 'Tutor'}</div>
                  <div className="time">{formatDate(s.date_time)} at {formatTime(s.date_time)}</div>
                </div>
              </div>
            ))}

            {subTab === 'cancelled' && cancelled.map((s) => (
              <div key={s.id} className="session-item">
                <div className="session-info">
                  <div>
                    {s.course_code && <span className="course-tag">{s.course_code}</span>}
                    {statusBadge(s.status)}
                  </div>
                  <div className="person">{s.tutor_name || 'Tutor'}</div>
                  <div className="time">{formatDate(s.date_time)} at {formatTime(s.date_time)}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </main>

      {/* Book Confirmation Modal */}
      {bookModal && (
        <div className="modal-overlay" onClick={() => !booking && setBookModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Confirm Booking</div>
            <div style={{ fontSize: '.9rem', color: 'var(--text-mid)', marginBottom: 8 }}>
              <strong>{selectedTutor?.full_name}</strong>
            </div>
            <div style={{ fontSize: '.88rem', color: 'var(--text-mid)' }}>
              <div>📅 {formatDate(bookModal.slot.date_time || bookModal.slot.date)} at {formatTime(bookModal.slot.date_time || bookModal.slot.date)}</div>
              {bookModal.slot.location && <div>📍 {bookModal.slot.location}</div>}
              <div>📖 Course: <strong>{bookModal.courseCode}</strong></div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-sm btn-outline" onClick={() => setBookModal(null)} disabled={booking}>
                Cancel
              </button>
              <button className="btn btn-sm btn-gold" onClick={confirmBook} disabled={booking}>
                {booking ? 'Booking…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancelModal && (
        <div className="modal-overlay" onClick={() => !cancelling && setCancelModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Cancel Session?</div>
            <p style={{ fontSize: '.9rem', color: 'var(--text-mid)' }}>
              Are you sure you want to cancel your session with <strong>{cancelModal.tutor_name}</strong> on{' '}
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

      {/* Reschedule Modal */}
      {rescheduleModal && (
        <div className="modal-overlay" onClick={() => !rescheduling && setRescheduleModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-title">Reschedule Session</div>
            <p style={{ fontSize: '.85rem', color: 'var(--text-mid)', marginBottom: 14 }}>
              Current: {formatDate(rescheduleModal.date_time)} at {formatTime(rescheduleModal.date_time)}
            </p>
            {rescheduleSlots.length === 0 ? (
              <p style={{ fontSize: '.88rem', color: 'var(--text-muted)' }}>No open slots available for this tutor.</p>
            ) : (
              <div className="slots-grid">
                {rescheduleSlots.map((s) => (
                  <button
                    key={s.id}
                    className={`slot-btn ${pickedReschedule?.id === s.id ? 'picked' : ''}`}
                    onClick={() => setPickedReschedule(s)}
                  >
                    <div className="s-date">{formatDate(s.date_time || s.date)}</div>
                    <div className="s-time">{formatTime(s.date_time || s.date)}</div>
                    {s.location && <div className="s-loc">📍 {s.location}</div>}
                  </button>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-sm btn-outline" onClick={() => setRescheduleModal(null)} disabled={rescheduling}>
                Cancel
              </button>
              <button
                className="btn btn-sm btn-gold"
                onClick={confirmReschedule}
                disabled={!pickedReschedule || rescheduling}
              >
                {rescheduling ? 'Rescheduling…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
