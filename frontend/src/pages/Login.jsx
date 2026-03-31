import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data;
      login(token, user);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'tutor') navigate('/tutor');
      else navigate('/student');
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      // If unverified, store token and redirect to verify
      if (status === 403 && data?.error === 'unverified' && data?.token) {
        login(data.token, data.user);
        navigate('/verify');
        return;
      }
      setError(data?.error || 'Login failed. Please check your credentials.');
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
            <h1>Welcome Back</h1>
            <p>Log in to your CampusTutor account</p>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input id="email" type="email" placeholder="you@st.habib.edu.pk" value={email} onChange={(e) => setEmail(e.target.value)} required className="form-input" />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required className="form-input" />
            </div>
            <div className="form-row form-row-between">
              <label className="checkbox-label"><input type="checkbox" /> Remember me</label>
              <Link to="/forgot-password" className="form-link">Forgot password?</Link>
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
          <div className="auth-footer">
            <p>Don&apos;t have an account? <Link to="/signup" className="form-link">Sign up</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}
