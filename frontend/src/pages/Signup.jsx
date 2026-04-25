import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Signup() {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'student',
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = 'Full name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!form.email.endsWith('@st.habib.edu.pk')) errs.email = 'Must be a @st.habib.edu.pk email';
    if (!form.phone.trim()) errs.phone = 'Phone number is required';
    else if (!/^\d{10}$/.test(form.phone.trim())) errs.phone = 'Enter 10 digits (e.g. 3XX1234567)';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    return errs;
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setLoading(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: `+92${form.phone.trim()}`,
        password: form.password,
        role: form.role,
      };
      const data = await api.post('/auth/signup', payload);
      login(data.user || { email: form.email, role: form.role }, data.token || '');
      navigate('/verify', { replace: true });
    } catch (err) {
      setServerError(err.error || err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <svg viewBox="0 0 24 24">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" />
            </svg>
          </div>
          <h1>Campus<span>Tutor</span></h1>
          <p>Habib University</p>
        </div>

        <div className="auth-heading">
          <h2>Create Account</h2>
          <p>Join CampusTutor today</p>
        </div>

        {serverError && <div className="alert alert-error">{serverError}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              placeholder="Ali Ahmed"
              value={form.full_name}
              onChange={(e) => handleChange('full_name', e.target.value)}
            />
            {errors.full_name && <div className="field-error show">{errors.full_name}</div>}
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="you@st.habib.edu.pk"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
            />
            {errors.email && <div className="field-error show">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <div className="phone-group">
              <div className="phone-prefix">+92</div>
              <input
                type="tel"
                placeholder="3XX1234567"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                maxLength={10}
              />
            </div>
            {errors.phone && <div className="field-error show">{errors.phone}</div>}
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={(e) => handleChange('password', e.target.value)}
            />
            {errors.password && <div className="field-error show">{errors.password}</div>}
          </div>

          <div className="form-group">
            <label>I am a</label>
            <div className="role-row">
              <button
                type="button"
                className={`role-btn ${form.role === 'student' ? 'active' : ''}`}
                onClick={() => handleChange('role', 'student')}
              >
                Student
              </button>
              <button
                type="button"
                className={`role-btn ${form.role === 'tutor' ? 'active' : ''}`}
                onClick={() => handleChange('role', 'tutor')}
              >
                Tutor
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Log In</Link>
        </div>
      </div>
    </div>
  );
}
