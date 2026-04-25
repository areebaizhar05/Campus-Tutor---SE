import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Verify() {
  const { user, token, login } = useAuth();
  const navigate = useNavigate();
  const [otp, setOtp] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const inputRefs = React.useRef([]);

  useEffect(() => { if (!token || !user) navigate('/login', { replace: true }); }, [token, user, navigate]);
  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

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
    const code = otp.join('');
    if (code.length !== 4) { setError('Please enter all 4 digits.'); return; }
    setError(''); setLoading(true);
    try {
      const res = await api.post('/auth/verify-otp', { code });
      // Update auth context with verified user data
      const { token: newToken, user: updatedUser } = res.data;
      if (login && newToken && updatedUser) {
        login(newToken, updatedUser);
      }
      // Redirect based on role
      if (updatedUser?.role === 'admin') navigate('/admin', { replace: true });
      else if (updatedUser?.role === 'tutor') navigate('/tutor', { replace: true });
      else navigate('/student', { replace: true });
    } catch (err) { setError(err.response?.data?.error || 'Verification failed.'); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    setResending(true); setResendMsg(''); setError('');
    try {
      await api.post('/auth/resend-otp');
      setResendMsg('A new code has been sent.');
    } catch (err) { setError(err.response?.data?.error || 'Failed to resend.'); }
    finally { setResending(false); }
  };

  if (!token || !user) return null;

  return (
    <div className="auth-page">
      <nav className="navbar"><div className="navbar-container"><Link to="/" className="navbar-brand"><span className="brand-icon">🎓</span><span className="brand-text">CampusTutor</span></Link></div></nav>
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Verify Your Email</h1>
            <p>A 4-digit verification code has been sent to:</p>
            <p style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '.9375rem', marginTop: '.25rem' }}>{user.email}</p>
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          {resendMsg && <div className="alert alert-success">{resendMsg}</div>}
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="otp-group">
              {[0, 1, 2, 3].map((i) => (
                <input key={i} ref={(el) => (inputRefs.current[i] = el)} type="text" inputMode="numeric" maxLength={1} value={otp[i]} onChange={(e) => handleChange(i, e.target.value)} onKeyDown={(e) => handleKeyDown(i, e)} onPaste={handlePaste} className="otp-input" required />
              ))}
            </div>
            <p className="resend-text" style={{ fontSize: '.75rem', marginBottom: '.75rem' }}>💡 Check the Flask backend terminal for the code</p>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Verifying...' : 'Verify Account'}</button>
            <p className="resend-text">
              Didn&apos;t get the code?{' '}
              <button type="button" className="btn-link" onClick={handleResend} disabled={resending}>{resending ? 'Resending...' : 'Resend Code'}</button>
            </p>
          </form>
          <div className="auth-footer"><p><Link to="/signup" className="form-link">Back to Sign Up</Link></p></div>
        </div>
      </div>
    </div>
  );
}