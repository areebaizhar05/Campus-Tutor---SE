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
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');
  const [courseFilter, setCourseFilter] = useState('');

  // Booking state
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [tutorSlots, setTutorSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingCourse, setBookingCourse] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  // ── FR9: Reschedule state ──
  const [reschedulingSession, setReschedulingSession] = useState(null);
  const [rescheduleSlots, setRescheduleSlots] = useState([]);
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  useEffect(() => { fetchAllData(); }, []);

  const fetchAllData = async () => {
    try {
      const [sRes, tRes] = await Promise.all([api.get('/sessions/my'), api.get('/tutors/')]);
      setSessions(sRes.data.sessions || []);
      setTutors(tRes.data.tutors || []);
      setError('');
    } catch (err) {
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  // ── Cancel Session (with proper sync fix) ──
  const handleCancelSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to cancel this session?')) return;
    setError('');
    setSuccess('');
    try {
      await api.put(`/sessions/${sessionId}/cancel`);
      await fetchAllData();
      setSuccess('Session cancelled successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel session.');
    }
  };

  const handleViewSlots = async (tutor) => {
    setSelectedTutor(tutor);
    setTutorSlots([]);
    setLoadingSlots(true);
    setBookingCourse('');
    setError('');
    try {
      const res = await api.get(`/tutors/${tutor.id}/availability`);
      setTutorSlots(res.data.slots || []);
    } catch (err) { setError('Failed to load tutor availability.'); }
    finally { setLoadingSlots(false); }
  };

  const handleBookSlot = async (slotId) => {
    if (!bookingCourse) { setError('Please select a course for this session.'); return; }
    setBookingLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.post('/sessions/book', { slot_id: slotId, course_code: bookingCourse });
      setSelectedTutor(null);
      setTutorSlots([]);
      await fetchAllData();
      setSuccess('Session booked successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to book session.');
    } finally { setBookingLoading(false); }
  };

  // ── FR9: Reschedule Session ──
  const handleStartReschedule = async (session) => {
    setError('');
    setSuccess('');
    setReschedulingSession(session);
    setLoadingRescheduleSlots(true);
    setRescheduleSlots([]);
    try {
      const res = await api.get(`/tutors/${session.tutor_id}/availability`);
      // Filter out the current slot — can't reschedule to the same slot
      const availableSlots = (res.data.slots || []).filter(s => s.id !== session.slot?.id);
      setRescheduleSlots(availableSlots);
    } catch (err) {
      setError('Failed to load available slots for rescheduling.');
    } finally {
      setLoadingRescheduleSlots(false);
    }
  };

  const handleConfirmReschedule = async (newSlotId) => {
    if (!window.confirm('Reschedule to this slot? Your current session will be cancelled and a new one will be booked.')) return;
    setRescheduleLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.put(`/sessions/${reschedulingSession.id}/reschedule`, { new_slot_id: newSlotId });
      setReschedulingSession(null);
      setRescheduleSlots([]);
      await fetchAllData();
      setSuccess('Session rescheduled successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reschedule session.');
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleCancelReschedule = () => {
    setReschedulingSession(null);
    setRescheduleSlots([]);
    setError('');
  };

  // Collect all available courses from tutors
  const allCourses = [...new Set(tutors.flatMap(t => t.courses || []))].sort();

  // Filter tutors by course
  const filteredTutors = courseFilter
    ? tutors.filter(t => (t.courses || []).map(c => c.toUpperCase()).includes(courseFilter.toUpperCase()))
    : tutors;

  const upcoming  = sessions.filter(s => s.status === 'confirmed');
  const completed = sessions.filter(s => s.status === 'completed');
  const cancelled = sessions.filter(s => s.status === 'cancelled');

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
        {success && <div className="alert alert-success">{success}</div>}

        <div className="stats-row stats-row-4">
          <div className="stat-card"><div className="stat-icon">📅</div><div className="stat-info"><span className="stat-value">{upcoming.length}</span><span className="stat-label">Upcoming</span></div></div>
          <div className="stat-card"><div className="stat-icon">✅</div><div className="stat-info"><span className="stat-value">{completed.length}</span><span className="stat-label">Completed</span></div></div>
          <div className="stat-card"><div className="stat-icon">🚫</div><div className="stat-info"><span className="stat-value">{cancelled.length}</span><span className="stat-label">Cancelled</span></div></div>
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
                  <div className="session-header"><h3>{s.course_code}</h3><span className={`badge badge-${s.status}`}>{s.status}</span></div>
                  <div className="session-details">
                    <p><strong>Tutor:</strong> {s.tutor_name || 'N/A'}{s.tutor_phone ? ` (${s.tutor_phone})` : ''}</p>
                    <p><strong>Date:</strong> {s.slot?.date || 'TBD'}</p>
                    <p><strong>Time:</strong> {s.slot?.start_time}{s.slot?.end_time ? ` — ${s.slot.end_time}` : ''}</p>
                    <p><strong>Location:</strong> {s.slot?.location || 'N/A'}</p>
                  </div>
                  <div className="session-actions">
                    <button className="btn btn-sm btn-primary-outline" onClick={() => handleStartReschedule(s)}>Reschedule</button>
                    <button className="btn btn-sm btn-danger-outline" onClick={() => handleCancelSession(s.id)}>Cancel Session</button>
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
                  <div className="session-header"><h3>{s.course_code}</h3><span className="badge badge-completed">completed</span></div>
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

            {/* Course Filter */}
            {allCourses.length > 0 && (
              <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
                <label style={{ fontSize: '.875rem', fontWeight: 600, color: 'var(--gray-600)' }}>Filter by course:</label>
                <select className="role-select" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
                  <option value="">All Courses</option>
                  {allCourses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {courseFilter && <button className="btn btn-sm btn-outline" onClick={() => setCourseFilter('')}>Clear</button>}
              </div>
            )}

            {selectedTutor ? (
              <>
                <button className="btn btn-outline" onClick={() => { setSelectedTutor(null); setTutorSlots([]); }} style={{ marginBottom: '1rem' }}>← Back to Tutors</button>
                <div className="session-card" style={{ marginBottom: '1rem' }}>
                  <div className="session-header">
                    <h3>{selectedTutor.full_name}</h3>
                    <span className={`badge badge-role-tutor`}>{selectedTutor.role}</span>
                  </div>
                  <div className="session-details">
                    <p><strong>Department:</strong> {selectedTutor.department || 'N/A'}</p>
                    <p><strong>Phone:</strong> <span className="phone-display">{selectedTutor.phone || 'Not provided'}</span></p>
                    <p><strong>Courses:</strong> {(selectedTutor.courses || []).join(', ')}</p>
                    <p><strong>Bio:</strong> {selectedTutor.bio || 'No bio available.'}</p>
                  </div>
                </div>

                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '.75rem' }}>
                  Available Slots{selectedTutor.open_slots_count ? ` (${selectedTutor.open_slots_count})` : ''}
                </h3>

                {loadingSlots ? (
                  <div className="loading-screen"><div className="spinner"></div><p>Loading slots...</p></div>
                ) : tutorSlots.length === 0 ? (
                  <div className="empty-state"><span className="empty-icon">🕐</span><h3>No available slots</h3><p>This tutor has no open slots at the moment.</p></div>
                ) : (
                  <>
                    <div className="form-group" style={{ marginBottom: '1rem', maxWidth: '300px' }}>
                      <label>Select Course for Booking</label>
                      <select className="form-input" value={bookingCourse} onChange={(e) => setBookingCourse(e.target.value)} required>
                        <option value="">Choose a course...</option>
                        {(selectedTutor.courses || []).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="slots-grid">
                      {tutorSlots.map(slot => (
                        <div key={slot.id} className="slot-card" onClick={() => bookingCourse && handleBookSlot(slot.id)}>
                          <div className="slot-date">{slot.date}</div>
                          <div className="slot-time">{slot.start_time} — {slot.end_time}</div>
                          <div className="slot-loc">{slot.location}</div>
                          {bookingCourse && <button className="btn btn-sm btn-gold" style={{ marginTop: '.5rem' }} onClick={(e) => { e.stopPropagation(); handleBookSlot(slot.id); }} disabled={bookingLoading}>{bookingLoading ? 'Booking...' : 'Book'}</button>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                {filteredTutors.length === 0 ? (
                  <div className="empty-state"><span className="empty-icon">🔍</span><h3>No tutors available</h3><p>{courseFilter ? 'No tutors found for this course. Try a different filter.' : 'No tutors available yet.'}</p></div>
                ) : (
                  <div className="tutors-grid">{filteredTutors.map(t => (
                    <div key={t.id} className="tutor-card" onClick={() => handleViewSlots(t)}>
                      <div className="tutor-avatar">{t.full_name?.charAt(0)?.toUpperCase() || 'T'}</div>
                      <h3>{t.full_name}</h3>
                      <p className="tutor-subjects">{t.department || ''}</p>
                      <p className="tutor-phone">{t.phone || 'No phone'}</p>
                      <p className="tutor-sessions">{(t.courses || []).join(', ')}</p>
                      <p className="tutor-rating">{t.open_slots_count || 0} open slots</p>
                    </div>
                  ))}</div>
                )}
              </>
            )}
          </section>
        )}

        {/* ── FR9: Reschedule Modal / Panel ── */}
        {reschedulingSession && (
          <div className="reschedule-overlay" onClick={handleCancelReschedule}>
            <div className="reschedule-panel" onClick={(e) => e.stopPropagation()}>
              <div className="reschedule-header">
                <h2>Reschedule Session</h2>
                <button className="btn btn-sm btn-outline" onClick={handleCancelReschedule}>✕ Close</button>
              </div>

              <div className="reschedule-current">
                <h3>Current Session</h3>
                <div className="session-details">
                  <p><strong>Course:</strong> {reschedulingSession.course_code}</p>
                  <p><strong>Tutor:</strong> {reschedulingSession.tutor_name || 'N/A'}</p>
                  <p><strong>Current Date:</strong> {reschedulingSession.slot?.date || 'N/A'}</p>
                  <p><strong>Current Time:</strong> {reschedulingSession.slot?.start_time || 'N/A'} — {reschedulingSession.slot?.end_time || 'N/A'}</p>
                  <p><strong>Location:</strong> {reschedulingSession.slot?.location || 'N/A'}</p>
                </div>
              </div>

              <div className="reschedule-slots">
                <h3>Select a New Slot</h3>
                {loadingRescheduleSlots ? (
                  <div className="loading-screen"><div className="spinner"></div><p>Loading available slots...</p></div>
                ) : rescheduleSlots.length === 0 ? (
                  <div className="empty-state"><span className="empty-icon">🕐</span><h3>No available slots</h3><p>This tutor has no other open slots at the moment.</p></div>
                ) : (
                  <div className="slots-grid">
                    {rescheduleSlots.map(slot => (
                      <div key={slot.id} className="slot-card slot-card-reschedule">
                        <div className="slot-date">{slot.date}</div>
                        <div className="slot-time">{slot.start_time} — {slot.end_time}</div>
                        <div className="slot-loc">{slot.location}</div>
                        <button
                          className="btn btn-sm btn-gold"
                          style={{ marginTop: '.5rem' }}
                          onClick={() => handleConfirmReschedule(slot.id)}
                          disabled={rescheduleLoading}
                        >
                          {rescheduleLoading ? 'Rescheduling...' : 'Reschedule Here'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
