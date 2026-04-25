"""
CampusTutor SQLAlchemy Models
"""

from datetime import datetime, date, timedelta
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash


db = SQLAlchemy()


class User(db.Model):
    """User model - supports student, tutor, and admin roles."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="student")  # student, tutor, admin
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)
    otp_code = db.Column(db.String(10), nullable=True)
    otp_expiry = db.Column(db.DateTime, nullable=True)
    otp_purpose = db.Column(db.String(20), nullable=True)  # verify_email, reset_password
    phone = db.Column(db.String(20), nullable=False)
    department = db.Column(db.String(120), nullable=True)
    bio = db.Column(db.Text, nullable=True)
    courses = db.Column(db.String(500), nullable=True)  # comma-separated course codes
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    availability_slots = db.relationship(
        "AvailabilitySlot",
        backref="tutor",
        lazy="dynamic",
        foreign_keys="AvailabilitySlot.tutor_id",
    )
    student_sessions = db.relationship(
        "TutoringSession",
        backref="student",
        lazy="dynamic",
        foreign_keys="TutoringSession.student_id",
    )
    tutor_sessions = db.relationship(
        "TutoringSession",
        backref="tutor",
        lazy="dynamic",
        foreign_keys="TutoringSession.tutor_id",
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def set_otp(self, purpose="verify_email"):
        """Generate a random 4-digit OTP and set expiry to 10 minutes from now."""
        import random
        self.otp_code = f"{random.randint(1000, 9999)}"
        self.otp_purpose = purpose
        self.otp_expiry = datetime.utcnow() + timedelta(minutes=10)

    def is_otp_valid(self, code):
        """Check if the provided OTP matches and hasn't expired."""
        if not self.otp_code or self.otp_code != code:
            return False
        if self.otp_expiry and datetime.utcnow() > self.otp_expiry:
            return False
        return True

    def to_dict(self):
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "role": self.role,
            "is_active": self.is_active,
            "is_verified": self.is_verified,
            "phone": self.phone,
            "department": self.department,
            "bio": self.bio,
            "courses": self.courses.split(",") if self.courses else [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def to_dict_safe(self):
        """Return user dict without sensitive fields."""
        d = self.to_dict()
        d.pop("password_hash", None)
        d.pop("otp_code", None)
        d.pop("otp_expiry", None)
        d.pop("otp_purpose", None)
        return d


class AvailabilitySlot(db.Model):
    """Availability slot created by tutors."""

    __tablename__ = "availability_slots"

    id = db.Column(db.Integer, primary_key=True)
    tutor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    date = db.Column(db.Date, nullable=False, index=True)
    start_time = db.Column(db.String(10), nullable=False)  # HH:MM format
    end_time = db.Column(db.String(10), nullable=False)    # HH:MM format
    location = db.Column(db.String(200), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="open")  # open, booked, closed

    __table_args__ = (
        db.UniqueConstraint("tutor_id", "date", "start_time", "end_time", name="uq_slot"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "tutor_id": self.tutor_id,
            "tutor_name": self.tutor.full_name if self.tutor else None,
            "date": self.date.isoformat() if self.date else None,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "location": self.location,
            "status": self.status,
        }


class TutoringSession(db.Model):
    """Tutoring session linking a student with a tutor's availability slot."""

    __tablename__ = "tutoring_sessions"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    tutor_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    slot_id = db.Column(db.Integer, db.ForeignKey("availability_slots.id"), nullable=False, unique=True)
    course_code = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), nullable=False, default="confirmed")  # confirmed, cancelled, completed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        slot_data = None
        if self.slot:
            slot_data = self.slot.to_dict()

        return {
            "id": self.id,
            "student_id": self.student_id,
            "student_name": self.student.full_name if self.student else None,
            "tutor_id": self.tutor_id,
            "tutor_name": self.tutor.full_name if self.tutor else None,
            "slot_id": self.slot_id,
            "slot": slot_data,
            "course_code": self.course_code,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

