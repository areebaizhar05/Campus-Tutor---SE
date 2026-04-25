"""
CampusTutor – Admin Routes
Dashboard stats, user management, session listing.
All routes require admin role.
"""

import logging

from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import db, User, AvailabilitySlot, TutoringSession
from sqlalchemy import func, or_

admin_bp = Blueprint("admin", __name__)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Decorator
# ---------------------------------------------------------------------------

def admin_required(fn):
    """Custom decorator to require admin role."""
    from functools import wraps
    from flask_jwt_extended import verify_jwt_in_request

    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role != "admin":
            return jsonify({"error": "Admin access required"}), 403
        return fn(*args, **kwargs)

    return wrapper


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@admin_bp.route("/stats", methods=["GET"])
@jwt_required()
@admin_required
def get_stats():
    """
    Return dashboard statistics:
    - Total sessions, confirmed, completed, cancelled
    - Total students, total tutors, active users
    """
    total_sessions = TutoringSession.query.count()
    confirmed_sessions = TutoringSession.query.filter_by(status="confirmed").count()
    completed_sessions = TutoringSession.query.filter_by(status="completed").count()
    cancelled_sessions = TutoringSession.query.filter_by(status="cancelled").count()

    total_students = User.query.filter_by(role="student").count()
    total_tutors = User.query.filter_by(role="tutor").count()
    active_users = User.query.filter_by(is_active=True).count()
    verified_users = User.query.filter_by(is_verified=True).count()

    # Open slots count
    open_slots = AvailabilitySlot.query.filter_by(status="open").count()

    return (
        jsonify(
            {
                "sessions": {
                    "total": total_sessions,
                    "confirmed": confirmed_sessions,
                    "completed": completed_sessions,
                    "cancelled": cancelled_sessions,
                },
                "users": {
                    "total_students": total_students,
                    "total_tutors": total_tutors,
                    "active_users": active_users,
                    "verified_users": verified_users,
                },
                "availability": {
                    "open_slots": open_slots,
                },
            }
        ),
        200,
    )


@admin_bp.route("/users", methods=["GET"])
@jwt_required()
@admin_required
def list_users():
    """
    List all users.
    Optional query param: ?search=xyz – search by name, email, or phone.
    """
    search = request.args.get("search", "").strip()

    query = User.query.order_by(User.created_at.desc())

    if search:
        query = query.filter(
            or_(
                User.full_name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                User.phone.ilike(f"%{search}%"),
            )
        )

    users = query.all()
    return jsonify({"users": [u.to_dict_safe() for u in users]}), 200


@admin_bp.route("/users/<int:user_id>/role", methods=["PUT"])
@jwt_required()
@admin_required
def change_user_role(user_id):
    """
    Change a user's role.
    Body: { "role": "student" | "tutor" | "admin" }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    new_role = data.get("role", "").strip().lower()
    if new_role not in ("student", "tutor", "admin"):
        return jsonify({"error": "Role must be 'student', 'tutor', or 'admin'"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    old_role = user.role
    user.role = new_role
    db.session.commit()

    logger.info(f"[Admin] Changed role: user={user_id}, {old_role} -> {new_role}")

    return jsonify({"message": f"User role changed to {new_role}", "user": user.to_dict_safe()}), 200


@admin_bp.route("/users/<int:user_id>/toggle-active", methods=["PUT"])
@jwt_required()
@admin_required
def toggle_user_active(user_id):
    """
    Activate or deactivate a user account.
    """
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Prevent admin from deactivating themselves
    current_user_id = int(get_jwt_identity())
    if user_id == current_user_id:
        return jsonify({"error": "You cannot deactivate your own account"}), 400

    user.is_active = not user.is_active
    status = "activated" if user.is_active else "deactivated"
    db.session.commit()

    logger.info(f"[Admin] {status}: user={user_id}")

    return (
        jsonify(
            {
                "message": f"User {status}",
                "user": user.to_dict_safe(),
            }
        ),
        200,
    )


@admin_bp.route("/sessions", methods=["GET"])
@jwt_required()
@admin_required
def list_all_sessions():
    """
    List all tutoring sessions with optional filters.
    Query params: ?status=confirmed&course=CS101
    """
    status_filter = request.args.get("status", "").strip()
    course_filter = request.args.get("course", "").strip().upper()

    query = TutoringSession.query

    if status_filter:
        query = query.filter(TutoringSession.status == status_filter)

    if course_filter:
        query = query.filter(TutoringSession.course_code == course_filter)

    sessions = query.order_by(TutoringSession.created_at.desc()).all()
    return jsonify({"sessions": [s.to_dict() for s in sessions]}), 200
