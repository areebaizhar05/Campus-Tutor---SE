import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Signup() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirmPassword: '', role: 'student' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.email.endsWith('@st.habib.edu.pk')) { setError('Only @st.habib.edu.pk email addresses are allowed.'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/register', {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        role: form.role,
      });
      // Backend returns token + user immediately after registration
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
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" placeholder="At least 8 characters" value={form.password} onChange={handleChange} required minLength={8} className="form-input" />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input id="confirmPassword" name="confirmPassword" type="password" placeholder="Re-enter your password" value={form.confirmPassword} onChange={handleChange} required className="form-input" />
            </div>
            <div className="form-group">
              <label htmlFor="role">I want to be a</label>
              <select id="role" name="role" value={form.role} onChange={handleChange} className="form-input">
                <option value="student">Student (get tutored)</option>
                <option value="tutor">Tutor (help others)</option>
              </select>
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
