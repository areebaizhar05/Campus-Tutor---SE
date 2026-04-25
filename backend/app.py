"""
CampusTutor - Main Flask Application Factory
"""

import os
import logging
from datetime import datetime, date, timedelta

from flask import Flask, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_mail import Mail
from apscheduler.schedulers.background import BackgroundScheduler

# ---------------------------------------------------------------------------
# Extensions (initialized here, bound to app in create_app)
# ---------------------------------------------------------------------------
from models import db as _db  # noqa: E402 – we re-bind below

db = _db
jwt = JWTManager()
cors = CORS()
mail = Mail()

# ---------------------------------------------------------------------------
# Scheduler helpers
# ---------------------------------------------------------------------------

def auto_complete_sessions(app):
    """
    Background task: mark confirmed sessions whose slot date is in the past
    as 'completed' and close the corresponding slot.
    Runs every 5 minutes.
    """
    with app.app_context():
        try:
            from models import TutoringSession, AvailabilitySlot

            past_sessions = (
                TutoringSession.query
                .filter(
                    TutoringSession.status == "confirmed",
                    AvailabilitySlot.date < date.today(),
                )
                .join(AvailabilitySlot, TutoringSession.slot_id == AvailabilitySlot.id)
                .all()
            )

            count = 0
            for session in past_sessions:
                session.status = "completed"
                session.slot.status = "closed"
                count += 1

            db.session.commit()
            if count > 0:
                app.logger.info(f"[Auto-Complete] Completed {count} past session(s)")
        except Exception as e:
            db.session.rollback()
            app.logger.error(f"[Auto-Complete] Error: {e}")


def send_session_reminders(app):
    """
    Background task: log reminders for sessions happening tomorrow.
    Runs every 10 minutes.
    """
    with app.app_context():
        try:
            from models import TutoringSession, AvailabilitySlot

            tomorrow = date.today() + timedelta(days=1)
            upcoming = (
                TutoringSession.query
                .filter(
                    TutoringSession.status == "confirmed",
                    AvailabilitySlot.date == tomorrow,
                )
                .join(AvailabilitySlot, TutoringSession.slot_id == AvailabilitySlot.id)
                .all()
            )

            for session in upcoming:
                slot = session.slot
                student_name = session.student.full_name if session.student else "Unknown"
                tutor_name = session.tutor.full_name if session.tutor else "Unknown"
                app.logger.info(
                    f"[Reminder] Session tomorrow: {student_name} ↔ {tutor_name} | "
                    f"{slot.date} {slot.start_time}-{slot.end_time} | {slot.location} | "
                    f"Course: {session.course_code}"
                )

            if upcoming:
                app.logger.info(f"[Reminder] {len(upcoming)} session(s) tomorrow")
        except Exception as e:
            app.logger.error(f"[Reminder] Error: {e}")


# ---------------------------------------------------------------------------
# App Factory
# ---------------------------------------------------------------------------

def create_app():
    """Create and configure the Flask application."""

    app = Flask(
        __name__,
        instance_relative_config=True,
        static_folder=None,
    )

    # ------------------------------------------------------------------
    # Configuration
    # ------------------------------------------------------------------
    app.config["SECRET_KEY"] = os.environ.get(
        "SECRET_KEY", "campustutor-dev-secret-change-in-production"
    )
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
        "DATABASE_URL", "sqlite:///campustutor.db"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["JWT_SECRET_KEY"] = os.environ.get(
        "JWT_SECRET_KEY", "jwt-super-secret-change-me"
    )
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)

    # Mail config – Mailtrap SMTP with console fallback
    app.config["MAIL_SERVER"] = os.environ.get("MAIL_SERVER", "smtp.mailtrap.io")
    app.config["MAIL_PORT"] = int(os.environ.get("MAIL_PORT", 587))
    app.config["MAIL_USERNAME"] = os.environ.get("MAIL_USERNAME", "")
    app.config["MAIL_PASSWORD"] = os.environ.get("MAIL_PASSWORD", "")
    app.config["MAIL_USE_TLS"] = True
    app.config["MAIL_USE_SSL"] = False
    app.config["MAIL_DEFAULT_SENDER"] = os.environ.get(
        "MAIL_DEFAULT_SENDER", "noreply@campustutor.local"
    )

    # ------------------------------------------------------------------
    # Logging
    # ------------------------------------------------------------------
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(message)s",
    )

    # ------------------------------------------------------------------
    # Initialize extensions
    # ------------------------------------------------------------------
    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})
    mail.init_app(app)

    # ------------------------------------------------------------------
    # JWT error handlers
    # ------------------------------------------------------------------
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Token has expired", "code": "token_expired"}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error_string):
        return jsonify({"error": "Invalid token", "code": "invalid_token"}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error_string):
        return jsonify({"error": "Authorization token is missing", "code": "missing_token"}), 401

    # ------------------------------------------------------------------
    # Create tables
    # ------------------------------------------------------------------
    with app.app_context():
        db.create_all()

    # ------------------------------------------------------------------
    # Register blueprints
    # ------------------------------------------------------------------
    from routes.auth import auth_bp
    from routes.sessions import sessions_bp
    from routes.tutors import tutors_bp
    from routes.admin import admin_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(sessions_bp, url_prefix="/api/sessions")
    app.register_blueprint(tutors_bp, url_prefix="/api/tutors")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

    # ------------------------------------------------------------------
    # Health check
    # ------------------------------------------------------------------
    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok", "service": "CampusTutor API"})

    # ------------------------------------------------------------------
    # APScheduler – background tasks
    # ------------------------------------------------------------------
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        func=auto_complete_sessions,
        args=[app],
        trigger="interval",
        minutes=5,
        id="auto_complete_sessions",
        replace_existing=True,
    )
    scheduler.add_job(
        func=send_session_reminders,
        args=[app],
        trigger="interval",
        minutes=10,
        id="send_session_reminders",
        replace_existing=True,
    )
    scheduler.start()
    app.logger.info("APScheduler started – auto-complete (5 min) & reminders (10 min)")

    return app


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5001, debug=True)
