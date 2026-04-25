import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

/* ── Sidebar ──────────────────────────────── */
function Sidebar({ tab, setTab, user, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sb-logo">
        <h2>Campus<span>Tutor</span></h2>
        <div className="sb-role">Admin Portal</div>
      </div>
      <nav className="sb-nav">
        <a className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>
          <span className="nav-icon">📊</span> Dashboard
        </a>
        <a className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>
          <span className="nav-icon">👥</span> Manage Users
        </a>
      </nav>
      <div className="sb-bottom">
        <div className="sb-user-name">{user?.full_name || 'Admin'}</div>
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
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
  return <span className="badge badge-open">{status || 'Open'}</span>;
}
function roleBadge(role) {
  const r = role?.toLowerCase();
  if (r === 'student') return <span className="badge badge-student">Student</span>;
  if (r === 'tutor') return <span className="badge badge-tutor">Tutor</span>;
  if (r === 'admin') return <span className="badge badge-admin">Admin</span>;
  return <span className="badge">{role || 'Unknown'}</span>;
}

/* ── Actions Dropdown ─────────────────────── */
function ActionsDropdown({ userId, currentRole, isActive, onUpdate }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleAction = async (action) => {
    setOpen(false);
    try {
      if (action === 'deactivate' || action === 'activate') {
        await api.put(`/admin/users/${userId}/status`, { is_active: action === 'activate' });
      } else {
        await api.put(`/admin/users/${userId}/role`, { role: action });
      }
      onUpdate();
    } catch (err) {
      alert(err.error || 'Action failed.');
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button className="btn btn-sm btn-outline" onClick={() => setOpen(!open)}>
        ⋮ Actions
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 4, zIndex: 100,
          background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-md)', minWidth: 160, overflow: 'hidden'
        }}>
          <button className="action-item" style={{
            display: 'block', width: '100%', padding: '9px 14px', border: 'none', background: 'none',
            fontSize: '.82rem', fontWeight: 600, color: 'var(--text)', cursor: 'pointer', textAlign: 'left',
            fontFamily: 'var(--font-body)'
          }} onClick={() => handleAction('student')}>Set as Student</button>
          <button className="action-item" style={{
            display: 'block', width: '100%', padding: '9px 14px', border: 'none', background: 'none',
            fontSize: '.82rem', fontWeight: 600, color: 'var(--text)', cursor: 'pointer', textAlign: 'left',
            fontFamily: 'var(--font-body)'
          }} onClick={() => handleAction('tutor')}>Set as Tutor</button>
          <button className="action-item" style={{
            display: 'block', width: '100%', padding: '9px 14px', border: 'none', background: 'none',
            fontSize: '.82rem', fontWeight: 600, color: 'var(--text)', cursor: 'pointer', textAlign: 'left',
            fontFamily: 'var(--font-body)'
          }} onClick={() => handleAction('admin')}>Set as Admin</button>
          <div style={{ height: 1, background: 'var(--border)' }} />
          <button className="action-item" style={{
            display: 'block', width: '100%', padding: '9px 14px', border: 'none', background: 'none',
            fontSize: '.82rem', fontWeight: 600, color: isActive ? 'var(--error)' : 'var(--success)',
            cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)'
          }} onClick={() => handleAction(isActive ? 'deactivate' : 'activate')}>
            {isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Main Component ───────────────────────── */
export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('dashboard');

  /* Dashboard state */
  const [stats, setStats] = useState({ total: 0, confirmed: 0, completed: 0, cancelled: 0, students: 0, tutors: 0 });
  const [allSessions, setAllSessions] = useState([]);
  const [loadingDash, setLoadingDash] = useState(false);

  /* Users state */
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  /* Load dashboard */
  useEffect(() => {
    if (tab !== 'dashboard') return;
    const load = async () => {
      setLoadingDash(true);
      try {
        const [statsRes, sessionsRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/sessions'),
        ]);
        setStats(statsRes.stats || statsRes);
        setAllSessions(
          Array.isArray(sessionsRes.sessions)
            ? sessionsRes.sessions
            : Array.isArray(sessionsRes)
            ? sessionsRes
            : []
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDash(false);
      }
    };
    load();
  }, [tab]);

  /* Load users */
  useEffect(() => {
    if (tab !== 'users') return;
    const load = async () => {
      setLoadingUsers(true);
      try {
        const data = await api.get('/admin/users');
        setUsers(Array.isArray(data.users) ? data.users : Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingUsers(false);
      }
    };
    load();
  }, [tab]);

  const filteredUsers = searchQuery.trim()
    ? users.filter(
        (u) =>
          (u.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (u.phone || '').includes(searchQuery)
      )
    : users;

  const maxSessions = Math.max(stats.confirmed, stats.completed, stats.cancelled, 1);

  return (
    <div className="app-shell">
      <Sidebar tab={tab} setTab={setTab} user={user} onLogout={logout} />

      <main className="main">
        {/* ── Dashboard Tab ── */}
        {tab === 'dashboard' && (
          <>
            <div className="page-header">
              <h1>Dashboard</h1>
              <p>Overview of platform activity</p>
            </div>

            {loadingDash && <div className="spinner"></div>}

            <div className="stats-row">
              <div className="stat-card navy">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">Total Sessions</div>
              </div>
              <div className="stat-card blue">
                <div className="stat-value">{stats.confirmed}</div>
                <div className="stat-label">Confirmed</div>
              </div>
              <div className="stat-card success">
                <div className="stat-value">{stats.completed}</div>
                <div className="stat-label">Completed</div>
              </div>
              <div className="stat-card gold">
                <div className="stat-value">{stats.cancelled}</div>
                <div className="stat-label">Cancelled</div>
              </div>
              <div className="stat-card blue">
                <div className="stat-value">{stats.students}</div>
                <div className="stat-label">Students</div>
              </div>
              <div className="stat-card navy">
                <div className="stat-value">{stats.tutors}</div>
                <div className="stat-label">Tutors</div>
              </div>
            </div>

            {/* Session activity bars */}
            <div className="card" style={{ marginBottom: 28 }}>
              <div className="section-title">Session Activity</div>
              <div className="bar-row">
                <div className="bar-meta">
                  <span>Confirmed</span>
                  <span>{stats.confirmed}</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(stats.confirmed / maxSessions) * 100}%`, background: 'var(--blue)' }} />
                </div>
              </div>
              <div className="bar-row">
                <div className="bar-meta">
                  <span>Completed</span>
                  <span>{stats.completed}</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(stats.completed / maxSessions) * 100}%`, background: 'var(--success)' }} />
                </div>
              </div>
              <div className="bar-row">
                <div className="bar-meta">
                  <span>Cancelled</span>
                  <span>{stats.cancelled}</span>
                </div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(stats.cancelled / maxSessions) * 100}%`, background: 'var(--error)' }} />
                </div>
              </div>
            </div>

            {/* All sessions table */}
            <div className="section-title">All Sessions</div>
            {allSessions.length === 0 && !loadingDash && (
              <div className="empty-state"><div className="ei">📋</div><p>No sessions recorded yet.</p></div>
            )}
            {allSessions.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Tutor</th>
                      <th>Course</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSessions.map((s) => (
                      <tr key={s.id}>
                        <td>{s.student_name || '—'}</td>
                        <td>{s.tutor_name || '—'}</td>
                        <td>{s.course_code ? <span className="course-tag">{s.course_code}</span> : '—'}</td>
                        <td>{formatDate(s.date_time)}</td>
                        <td>{formatTime(s.date_time)}</td>
                        <td>{statusBadge(s.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── Manage Users Tab ── */}
        {tab === 'users' && (
          <>
            <div className="page-header">
              <h1>Manage Users</h1>
              <p>View and manage all platform users</p>
            </div>

            <div className="search-bar">
              <input
                placeholder="Search by name, email, or phone…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {loadingUsers && <div className="spinner"></div>}

            {!loadingUsers && filteredUsers.length === 0 && (
              <div className="empty-state"><div className="ei">👥</div><p>No users found.</p></div>
            )}

            {filteredUsers.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Role</th>
                      <th>Verified</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const isInactive = !u.is_active && u.is_active !== undefined;
                      return (
                        <tr key={u.id} className={isInactive ? 'inactive-row' : ''}>
                          <td style={{ fontWeight: 600 }}>{u.full_name || '—'}</td>
                          <td>{u.email || '—'}</td>
                          <td>{u.phone || '—'}</td>
                          <td>{roleBadge(u.role)}</td>
                          <td>{u.is_verified ? '✅ Yes' : '❌ No'}</td>
                          <td>
                            <span style={{
                              fontSize: '.78rem', fontWeight: 700,
                              color: u.is_active !== false ? 'var(--success)' : 'var(--error)'
                            }}>
                              {u.is_active !== false ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <ActionsDropdown
                              userId={u.id}
                              currentRole={u.role}
                              isActive={u.is_active !== false}
                              onUpdate={async () => {
                                try {
                                  const data = await api.get('/admin/users');
                                  setUsers(Array.isArray(data.users) ? data.users : []);
                                } catch {}
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
