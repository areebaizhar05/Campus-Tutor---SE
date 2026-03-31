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
            Connect with fellow students for CS &amp; CE tutoring sessions.
            Book slots, track progress, and learn together — all in one place.
          </p>
          <div className="hero-actions">
            <Link to="/signup" className="btn btn-primary btn-lg">Get Started</Link>
            <Link to="/login" className="btn btn-outline btn-lg">I already have an account</Link>
          </div>
        </div>
      </section>

      <section className="features-section">
        <h2 className="section-title">How It Works</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">📝</div>
            <h3>Sign Up</h3>
            <p>Create your account with your <strong>@st.habib.edu.pk</strong> email and choose your role.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📅</div>
            <h3>Book Sessions</h3>
            <p>Browse available tutors, pick a time slot, and book a 1-on-1 tutoring session.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Track Progress</h3>
            <p>View upcoming and past sessions, see completion stats, and manage your journey.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">⭐</div>
            <h3>Rate &amp; Review</h3>
            <p>Rate your tutor and leave feedback to help other students find the best match.</p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>CampusTutor &copy; 2026 — CS/CE 353/374 L1, Habib University</p>
      </footer>
    </div>
  );
}
