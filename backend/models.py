from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'

    id            = db.Column(db.Integer, primary_key=True)
    full_name     = db.Column(db.String(100), nullable=False)
    email         = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role          = db.Column(db.String(20),  nullable=False)   # student | tutor | admin
    is_active     = db.Column(db.Boolean, default=True)
    is_verified   = db.Column(db.Boolean, default=False)

    # OTP ─────────────────────────────────────────────────────
    otp_code      = db.Column(db.String(4),   nullable=True)
    otp_expiry    = db.Column(db.DateTime,    nullable=True)
    otp_purpose   = db.Column(db.String(20),  nullable=True)    # 'verify' | 'reset'

    # Tutor profile ───────────────────────────────────────────
    department    = db.Column(db.String(100), nullable=True)
    bio           = db.Column(db.Text,        nullable=True)
    courses       = db.Column(db.String(200), nullable=True)    # comma-separated

    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':          self.id,
            'full_name':   self.full_name,
            'email':       self.email,
            'role':        self.role,
            'is_active':   self.is_active,
            'is_verified': self.is_verified,
            'department':  self.department,
            'bio':         self.bio,
            'courses':     [c.strip() for c in self.courses.split(',')] if self.courses else [],
        }


class AvailabilitySlot(db.Model):
    __tablename__ = 'availability_slots'

    id         = db.Column(db.Integer, primary_key=True)
    tutor_id   = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    date       = db.Column(db.String(10), nullable=False)   # YYYY-MM-DD
    start_time = db.Column(db.String(5),  nullable=False)   # HH:MM
    end_time   = db.Column(db.String(5),  nullable=False)   # HH:MM
    location   = db.Column(db.String(100), default='Ehsas Room')
    status     = db.Column(db.String(20),  default='open')  # open | booked | closed

    def to_dict(self):
        return {
            'id':         self.id,
            'tutor_id':   self.tutor_id,
            'date':       self.date,
            'start_time': self.start_time,
            'end_time':   self.end_time,
            'location':   self.location,
            'status':     self.status,
        }


class TutoringSession(db.Model):
    __tablename__ = 'tutoring_sessions'

    id          = db.Column(db.Integer, primary_key=True)
    student_id  = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    tutor_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    slot_id     = db.Column(db.Integer, db.ForeignKey('availability_slots.id'), nullable=False)
    course_code = db.Column(db.String(20), nullable=False)
    status      = db.Column(db.String(20), default='confirmed')  # confirmed | completed | cancelled
    created_at  = db.Column(db.DateTime,   default=datetime.utcnow)

    def to_dict(self):
        slot    = AvailabilitySlot.query.get(self.slot_id)
        student = User.query.get(self.student_id)
        tutor   = User.query.get(self.tutor_id)
        return {
            'id':           self.id,
            'student_name': student.full_name if student else 'Unknown',
            'tutor_name':   tutor.full_name   if tutor   else 'Unknown',
            'course_code':  self.course_code,
            'status':       self.status,
            'slot':         slot.to_dict()    if slot    else None,
        }
