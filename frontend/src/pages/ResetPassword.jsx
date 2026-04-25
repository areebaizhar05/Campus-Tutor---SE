import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';
  const [otp, setOtp] = useState(['', '', '', '']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = React.useRef([]);

  useEffect(() => {
    if (!email) navigate('/forgot-password', { replace: true });
    inputRefs.current[0]?.focus();
  }, [email, navigate]);

  const handleChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp]; newOtp[index] = value; setOtp(newOtp);
    if (value && index < 3) inputRefs.current[index + 1]?.focus();
  };
  const handleKeyDown = (index, e) => { if (e.key === 'Backspace' && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus(); };
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    const newOtp = [...otp]; for (let i = 0; i < pasted.length; i++) newOtp[i] = pasted[i];
    setOtp(newOtp); inputRefs.current[Math.min(pasted.length, 3)]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join(''); setError(''); setSuccess('');
    if (code.length !== 4) { setError('Enter all 4 digits.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, code, password });
      setSuccess('Password reset successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) { setError(err.response?.data?.error || 'Failed to reset password.'); }
    finally { setLoading(false); }
  };

  if (!email) return null;

  return (
    <div className="auth-page">
      <nav className="navbar"><div className="navbar-container"><Link to="/" className="navbar-brand"><span className="brand-icon">🎓</span><span className="brand-text">CampusTutor</span></Link></div></nav>
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header"><h1>Reset Password</h1><p>Enter the code sent to <strong>{email}</strong></p></div>
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="otp-group">
              {[0,1,2,3].map((i) => (
                <input key={i} ref={(el) => (inputRefs.current[i] = el)} type="text" inputMode="numeric" maxLength={1} value={otp[i]} onChange={(e) => handleChange(i, e.target.value)} onKeyDown={(e) => handleKeyDown(i, e)} onPaste={handlePaste} className="otp-input" required />
              ))}
            </div>
            <p className="resend-text" style={{ fontSize: '.75rem' }}>💡 Check the Flask backend terminal for the code</p>
            <div className="form-group" style={{ marginTop: '.5rem' }}>
              <label htmlFor="password">New Password</label>
              <input id="password" type="password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="form-input" />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input id="confirmPassword" type="password" placeholder="Re-enter new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="form-input" />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</button>
          </form>
          <div className="auth-footer"><p>Didn&apos;t get the code? <Link to="/forgot-password" className="form-link">Try again</Link></p></div>
        </div>
      </div>
    </div>
  );
}
