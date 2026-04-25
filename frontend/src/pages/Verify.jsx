import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

const TIMER_SECONDS = 300; // 5 minutes

export default function Verify() {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(TIMER_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const intervalRef = useRef(null);

  const userEmail = user?.email || '';

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const formatTimer = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp.trim() || otp.trim().length !== 4) {
      setError('Please enter the 4-digit code.');
      return;
    }
    setLoading(true);
    try {
      const data = await api.post('/auth/verify', { email: userEmail, otp: otp.trim() });
      login(data.user, data.token);
      const role = data.user.role;
      if (role === 'student') navigate('/student', { replace: true });
      else if (role === 'tutor') navigate('/tutor', { replace: true });
      else if (role === 'admin') navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.error || err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setResendMsg('');
    setError('');
    try {
      await api.post('/auth/resend-otp', { email: userEmail });
      setResendMsg('A new code has been sent!');
      setCanResend(false);
      setTimer(TIMER_SECONDS);
      intervalRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.error || err.message || 'Failed to resend code.');
    }
  };

  if (!userEmail) {
    return (
      <div className="auth-bg">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="alert alert-info">Please log in or sign up first.</div>
          <a href="/login" className="btn btn-primary">Go to Login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-bg">
      <div className="auth-card">
        <div style={{ textAlign: 'center' }}>
          <div className="verify-icon">✉️</div>
          <div className="auth-heading" style={{ textAlign: 'center' }}>
            <h2>Verify Your Email</h2>
            <p>We sent a code to <strong>{userEmail}</strong></p>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {resendMsg && <div className="alert alert-success">{resendMsg}</div>}

        <form onSubmit={handleVerify}>
          <div className="form-group">
            <label>Enter 4-Digit Code</label>
            <input
              className="otp-input"
              type="text"
              inputMode="numeric"
              maxLength={4}
              placeholder="····"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </div>

          <div className={`otp-timer ${timer <= 30 ? 'urgent' : ''}`}>
            {timer > 0 ? `Code expires in ${formatTimer(timer)}` : 'Code expired'}
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: 16 }}>
            {loading ? 'Verifying…' : 'Verify'}
          </button>
        </form>

        {canResend && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button className="btn btn-ghost" onClick={handleResend}>
              Resend Code
            </button>
          </div>
        )}

        <div className="auth-footer">
          Wrong email?{' '}
          <a href="/signup">Sign up again</a>
        </div>
      </div>
    </div>
  );
}
