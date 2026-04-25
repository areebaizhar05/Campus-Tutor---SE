import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Signup() {
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', confirmPassword: '',
    role: 'student', phone: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const handleRoleSelect = (role) => setForm({ ...form, role });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email.endsWith('@st.habib.edu.pk')) { setError('Only @st.habib.edu.pk email addresses are allowed.'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (form.phone && (form.phone.length !== 10 || !/^\d{10}$/.test(form.phone))) { setError('Phone number must be exactly 10 digits (without +92).'); return; }
    setLoading(true);
    try {
      const payload = {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        role: form.role,
      };
      if (form.phone) payload.phone = '+92' + form.phone;
      const res = await api.post('/auth/register', payload);
      const { token, user } = res.data;
      login(token, user);
      navigate('/verify');
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <nav className="navbar">
        <div className="navbar-container">
          <Link to="/" className="navbar-brand">
            <span className="brand-icon">🎓</span>
            <span className="brand-text">CampusTutor</span>
          </Link>
        </div>
      </nav>
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Create Account</h1>
            <p>Join CampusTutor with your Habib University email</p>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="full_name">Full Name</label>
              <input id="full_name" name="full_name" type="text" placeholder="Your full name" value={form.full_name} onChange={handleChange} required className="form-input" />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input id="email" name="email" type="email" placeholder="you@st.habib.edu.pk" value={form.email} onChange={handleChange} required className="form-input" />
              <span className="form-hint">Must be a @st.habib.edu.pk email</span>
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone Number (optional)</label>
              <div className="phone-group">
                <span className="phone-prefix">+92</span>
                <input id="phone" name="phone" type="tel" placeholder="3001234567" value={form.phone} onChange={handleChange} maxLength={10} className="form-input" />
              </div>
              <span className="form-hint">10 digits without +92 prefix</span>
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" placeholder="At least 8 characters" value={form.password} onChange={handleChange} required minLength={8} className="form-input" />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input id="confirmPassword" name="confirmPassword" type="password" placeholder="Re-enter your password" value={form.confirmPassword} onChange={handleChange} required className="form-input" />
            </div>
            <div className="form-group">
              <label>I want to be a</label>
              <div className="role-toggle">
                <button type="button" className={`role-btn ${form.role === 'student' ? 'role-btn-active' : ''}`} onClick={() => handleRoleSelect('student')}>
                  <span className="role-btn-icon">📚</span>
                  <span className="role-btn-label">Student</span>
                  <span className="role-btn-desc">Get tutored</span>
                </button>
                <button type="button" className={`role-btn ${form.role === 'tutor' ? 'role-btn-active' : ''}`} onClick={() => handleRoleSelect('tutor')}>
                  <span className="role-btn-icon">✏️</span>
                  <span className="role-btn-label">Tutor</span>
                  <span className="role-btn-desc">Help others</span>
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
          <div className="auth-footer">
            <p>Already have an account? <Link to="/login" className="form-link">Log in</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
