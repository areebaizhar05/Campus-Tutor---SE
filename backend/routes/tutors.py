"""
CampusTutor – Tutor Routes
List tutors, manage availability slots, update tutor profile.
"""

import logging
from datetime import date

from flask import Blueprint, request, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import db, User, AvailabilitySlot
from sqlalchemy import func

tutors_bp = Blueprint("tutors", __name__)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@tutors_bp.route("/", methods=["GET"])
@jwt_required()
def list_tutors():
    """
    List all active tutors.
    Optional query param: ?course=CS101 – filter tutors who teach that course.
    Includes open_slots_count for each tutor.
    """
    course_filter = request.args.get("course", "").strip().upper()

    query = User.query.filter_by(role="tutor", is_active=True)

    if course_filter:
        # SQLAlchemy LIKE match for comma-separated courses field
        query = query.filter(
            db.or_(
                User.courses == course_filter,
                User.courses.like(f"{course_filter},%"),
                User.courses.like(f"%,{course_filter}"),
                User.courses.like(f"%,{course_filter},%"),
            )
        )

    tutors = query.all()

    result = []
    for tutor in tutors:
        tutor_dict = tutor.to_dict_safe()
        # Count open slots
        open_count = AvailabilitySlot.query.filter_by(
            tutor_id=tutor.id, status="open"
        ).filter(AvailabilitySlot.date >= date.today()).count()
        tutor_dict["open_slots_count"] = open_count
        result.append(tutor_dict)

    return jsonify({"tutors": result}), 200


@tutors_bp.route("/<int:tutor_id>/availability", methods=["GET"])
@jwt_required()
def tutor_availability(tutor_id):
    """
    Return open availability slots for a specific tutor.
    Only future slots (date >= today) are returned.
    """
    tutor = User.query.get(tutor_id)
    if not tutor or tutor.role != "tutor":
        return jsonify({"error": "Tutor not found"}), 404

    slots = (
        AvailabilitySlot.query
        .filter_by(tutor_id=tutor_id, status="open")
        .filter(AvailabilitySlot.date >= date.today())
        .order_by(AvailabilitySlot.date, AvailabilitySlot.start_time)
        .all()
    )

    return jsonify({"slots": [s.to_dict() for s in slots]}), 200


@tutors_bp.route("/my-availability", methods=["GET"])
@jwt_required()
def my_availability():
    """
    Return all availability slots for the currently logged-in tutor.
    Includes all statuses (open, booked, closed).
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != "tutor":
        return jsonify({"error": "Only tutors can access this endpoint"}), 403

    slots = (
        AvailabilitySlot.query
        .filter_by(tutor_id=user_id)
        .order_by(AvailabilitySlot.date.desc(), AvailabilitySlot.start_time)
        .all()
    )

    return jsonify({"slots": [s.to_dict() for s in slots]}), 200


@tutors_bp.route("/availability", methods=["POST"])
@jwt_required()
def add_availability():
    """
    Add a new availability slot.
    Body: { "date": "YYYY-MM-DD", "start_time": "HH:MM", "end_time": "HH:MM", "location": string }
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user or user.role != "tutor":
        return jsonify({"error": "Only tutors can add availability"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    date_str = data.get("date", "").strip()
    start_time = data.get("start_time", "").strip()
    end_time = data.get("end_time", "").strip()
    location = data.get("location", "").strip()

    errors = []
    if not date_str:
        errors.append("date is required (YYYY-MM-DD)")
    if not start_time:
        errors.append("start_time is required (HH:MM)")
    if not end_time:
        errors.append("end_time is required (HH:MM)")
    if not location:
        errors.append("location is required")

    if errors:
        return jsonify({"error": "Validation failed", "details": errors}), 400

    try:
        slot_date = date.fromisoformat(date_str)
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    if slot_date < date.today():
        return jsonify({"error": "Cannot create slots in the past"}), 400

    if start_time >= end_time:
        return jsonify({"error": "start_time must be before end_time"}), 400

    # Check for overlapping slots for the same tutor
    existing = AvailabilitySlot.query.filter_by(
        tutor_id=user_id, date=slot_date
    ).all()

    for ex in existing:
        # Overlap check: not (end <= existing_start or start >= existing_end)
        if not (end_time <= ex.start_time or start_time >= ex.end_time):
            return (
                jsonify(
                    {
                        "error": "This slot overlaps with an existing slot",
                        "existing": ex.to_dict(),
                    }
                ),
                409,
            )

    slot = AvailabilitySlot(
        tutor_id=user_id,
        date=slot_date,
        start_time=start_time,
        end_time=end_time,
        location=location,
        status="open",
    )
    db.session.add(slot)
    db.session.commit()

    logger.info(
        f"[Tutors] Added slot: tutor={user_id}, date={slot_date}, "
        f"time={start_time}-{end_time}, location={location}"
    )

    return jsonify({"message": "Availability slot added", "slot": slot.to_dict()}), 201


@tutors_bp.route("/availability/<int:slot_id>", methods=["DELETE"])
@jwt_required()
def delete_availability(slot_id):
    """
    Delete an open availability slot.
    Only the tutor who owns the slot can delete it.
    Only open (unbooked) slots can be deleted.
    """
    user_id = int(get_jwt_identity())
    slot = AvailabilitySlot.query.get(slot_id)
    if not slot:
        return jsonify({"error": "Slot not found"}), 404

    if slot.tutor_id != user_id:
        return jsonify({"error": "You can only delete your own slots"}), 403

    if slot.status != "open":
        return jsonify({"error": "Cannot delete a booked or closed slot"}), 400

    db.session.delete(slot)
    db.session.commit()

    logger.info(f"[Tutors] Deleted slot: slot={slot_id}, tutor={user_id}")

    return jsonify({"message": "Availability slot deleted"}), 200


@tutors_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_tutor_profile():
    """Return the tutor's full profile data."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.role != "tutor":
        return jsonify({"error": "This endpoint is for tutors only"}), 403

    # Add extra stats
    profile = user.to_dict_safe()
    total_sessions = user.tutor_sessions.count()
    completed_sessions = user.tutor_sessions.filter_by(status="completed").count()
    profile["total_sessions"] = total_sessions
    profile["completed_sessions"] = completed_sessions

    return jsonify({"profile": profile}), 200


@tutors_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_tutor_profile():
    """
    Update the tutor's profile.
    Updatable fields: full_name, phone, department, bio, courses.
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    if user.role != "tutor":
        return jsonify({"error": "This endpoint is for tutors only"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    import re
    phone_regex = re.compile(r"^\+92\d{10}$")

    if "full_name" in data:
        full_name = data["full_name"].strip()
        if len(full_name) < 2:
            return jsonify({"error": "Full name must be at least 2 characters"}), 400
        user.full_name = full_name

    if "phone" in data:
        phone = data["phone"].strip()
        if not phone_regex.match(phone):
            return jsonify({"error": "Phone must be in format +92XXXXXXXXXX"}), 400
        # Check uniqueness (excluding current user)
        existing = User.query.filter(User.phone == phone, User.id != user_id).first()
        if existing:
            return jsonify({"error": "Phone number already in use"}), 409
        user.phone = phone

    if "department" in data:
        user.department = data["department"].strip()

    if "bio" in data:
        user.bio = data["bio"].strip()

    if "courses" in data:
        courses = data["courses"]
        if isinstance(courses, list):
            courses = ",".join(c.strip() for c in courses if c.strip())
        user.courses = courses.strip()

    db.session.commit()

    logger.info(f"[Tutors] Updated profile: tutor={user_id}")

    return jsonify({"message": "Profile updated", "profile": user.to_dict_safe()}), 200
