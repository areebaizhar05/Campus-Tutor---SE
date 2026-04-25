import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="landing-bg">
      <div className="landing-logo-ring">🎓</div>
      <h1 className="landing-title">
        Campus<span>Tutor</span>
      </h1>
      <p className="landing-tagline">Habib University Tutoring Platform</p>
      <p className="landing-desc">
        Connect with peer tutors across campus. Book one-on-one sessions,
        track your learning progress, and manage your schedule — all in one place.
      </p>
      <div className="landing-btns">
        <Link to="/login" className="btn btn-gold">
          Log In
        </Link>
        <Link to="/signup" className="btn btn-outline" style={{ borderColor: '#fff', color: '#fff' }}>
          Sign Up
        </Link>
      </div>

      <div className="landing-features">
        <div className="landing-feature">
          <div className="lf-icon">📚</div>
          <div className="lf-title">Book Sessions</div>
          <div className="lf-desc">Find tutors and book slots instantly</div>
        </div>
        <div className="landing-feature">
          <div className="lf-icon">📊</div>
          <div className="lf-title">Track Progress</div>
          <div className="lf-desc">Monitor your tutoring history</div>
        </div>
        <div className="landing-feature">
          <div className="lf-icon">📅</div>
          <div className="lf-title">Manage Schedule</div>
          <div className="lf-desc">Set availability and stay organized</div>
        </div>
      </div>

      <footer style={{ marginTop: 'auto', paddingTop: '60px', fontSize: '.78rem', color: 'rgba(255,255,255,.3)' }}>
        &copy; {new Date().getFullYear()} CampusTutor &mdash; Habib University
      </footer>
    </div>
  );
}
