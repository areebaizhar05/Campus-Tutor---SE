import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="landing-page">
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <span className="brand-icon">🎓</span>
            <span className="brand-text">CampusTutor</span>
          </div>
          <div className="navbar-links">
            <Link to="/login" className="btn btn-outline">Log In</Link>
            <Link to="/signup" className="btn btn-primary">Sign Up</Link>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Peer-to-Peer Tutoring<br />
            <span className="hero-highlight">at Habib University</span>
          </h1>
          <p className="hero-subtitle">
            Connect with fellow students.<br />
            Book slots, track progress, and learn together all in one place.
          </p>
          <div className="hero-actions">
            <Link to="/signup" className="btn btn-primary btn-lg">Get Started</Link>
            <Link to="/login" className="btn btn-outline btn-lg">I already have an account</Link>
          </div>
        </div>
      </section>

      {/* ── Student Section ── */}
      <section className="role-section">
        <div className="role-header">
          <div className="role-tag role-tag-student">Student</div>
          <h2 className="role-title">Find the right tutor, fast.</h2>
          <p className="role-subtitle">
            Filter by course, check real-time availability, and book in two clicks.
          </p>
        </div>

        <div className="role-split">
          <div className="role-steps">
            <h3 className="role-split-heading">How it works</h3>
            <div className="step">
              <div className="step-num">1</div>
              <div className="step-body">
                <h4>Sign Up</h4>
                <p>Create your account with your <strong>@st.habib.edu.pk</strong> email.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <div className="step-body">
                <h4>Browse & Book</h4>
                <p>Search tutors by course, view their Ehsas Hours, and lock in a slot.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <div className="step-body">
                <h4>Show Up & Learn</h4>
                <p>Get email reminders, sync to your calendar, and attend your session.</p>
              </div>
            </div>
          </div>

          <div className="role-features">
            <h3 className="role-split-heading">What you can do</h3>
            <div className="feature-item">
              <span className="feature-check">✓</span>
              <div>
                <h4>Browse Tutors by Course</h4>
                <p>Search and filter available tutors for any course you need help with.</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-check">✓</span>
              <div>
                <h4>Book & Reschedule</h4>
                <p>Pick a time slot, reschedule if something comes up, or cancel anytime.</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-check">✓</span>
              <div>
                <h4>Session Tracking</h4>
                <p>View upcoming, completed, and cancelled sessions from your dashboard.</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-check">✓</span>
              <div>
                <h4>Calendar Sync & Reminders</h4>
                <p>Sync bookings to Google Calendar and receive automated email reminders.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Tutor Section ── */}
      <section className="role-section role-section-alt">
        <div className="role-header">
          <div className="role-tag role-tag-tutor">Tutor</div>
          <h2 className="role-title">Own your schedule.</h2>
          <p className="role-subtitle">
            Set your Ehsas Hours on your terms and help fellow students succeed.
          </p>
        </div>

        <div className="role-split">
          <div className="role-steps">
            <h3 className="role-split-heading">How it works</h3>
            <div className="step">
              <div className="step-num step-num-alt">1</div>
              <div className="step-body">
                <h4>Sign Up & Set Courses</h4>
                <p>Create your account and list the courses you're qualified to tutor.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-num step-num-alt">2</div>
              <div className="step-body">
                <h4>Define Your Hours</h4>
                <p>Pick your available time slots so students can book you during Ehsas Hours.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-num step-num-alt">3</div>
              <div className="step-body">
                <h4>Teach & Track</h4>
                <p>Get booked, show up, and track all your sessions from one dashboard.</p>
              </div>
            </div>
          </div>

          <div className="role-features">
            <h3 className="role-split-heading">What you can do</h3>
            <div className="feature-item">
              <span className="feature-check feature-check-alt">✓</span>
              <div>
                <h4>Manage Your Profile</h4>
                <p>List courses you support and update your personal information anytime.</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-check feature-check-alt">✓</span>
              <div>
                <h4>Set Ehsas Hours</h4>
                <p>Define weekly availability slots that students can browse and book.</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-check feature-check-alt">✓</span>
              <div>
                <h4>Session Tracking</h4>
                <p>View upcoming bookings and completed session history from your dashboard.</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-check feature-check-alt">✓</span>
              <div>
                <h4>Sync Booking</h4>
                <p>Sync bookings to Google Calendar and get notified when students book or cancel.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>CampusTutor &copy; 2026 — CS/CE 353/374 L1, Habib University</p>
      </footer>
    </div>
  );
}
