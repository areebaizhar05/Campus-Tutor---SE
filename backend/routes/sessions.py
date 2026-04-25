"""
CampusTutor – Session Routes
Booking, listing, cancellation, rescheduling, calendar export, auto-complete.
"""

import logging
from datetime import date, datetime, timedelta

from flask import Blueprint, request, jsonify, Response, current_app
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import db, User, AvailabilitySlot, TutoringSession
from routes.auth import send_notification_email

sessions_bp = Blueprint("sessions", __name__)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_ics_event(session):
    """
    Generate an .ics (iCalendar) string for a tutoring session.
    """
    slot = session.slot
    if not slot:
        return ""

    dt_start = datetime.combine(slot.date, datetime.strptime(slot.start_time, "%H:%M").time())
    dt_end = datetime.combine(slot.date, datetime.strptime(slot.end_time, "%H:%M").time())

    # UID – use session id + timestamp for uniqueness
    uid = f"campustutor-session-{session.id}@campustutor.local"

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//CampusTutor//EN",
        "BEGIN:VEVENT",
        f"UID:{uid}",
        f"DTSTART:{dt_start.strftime('%Y%m%dT%H%M%S')}",
        f"DTEND:{dt_end.strftime('%Y%m%dT%H%M%S')}",
        f"SUMMARY:Tutoring – {session.course_code}",
        f"DESCRIPTION:Session with {session.tutor.full_name} (Tutor) and {session.student.full_name} (Student)",
        f"LOCATION:{slot.location}",
        "STATUS:CONFIRMED",
        "END:VEVENT",
        "END:VCALENDAR",
    ]
    return "\r\n".join(lines)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@sessions_bp.route("/book", methods=["POST"])
@jwt_required()
def book_session():
    """
    Book a tutoring session.
    Body: { "slot_id": int, "course_code": string }
    Validates slot is open, creates session, marks slot as booked,
    sends booking confirmation emails to student and tutor (FR-13).
    """
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    slot_id = data.get("slot_id")
    course_code = data.get("course_code", "").strip().upper()

    if not slot_id:
        return jsonify({"error": "slot_id is required"}), 400
    if not course_code:
        return jsonify({"error": "course_code is required"}), 400

    slot = AvailabilitySlot.query.get(slot_id)
    if not slot:
        return jsonify({"error": "Slot not found"}), 404

    if slot.status != "open":
        return jsonify({"error": "This slot is no longer available"}), 409

    if slot.tutor_id == user_id:
        return jsonify({"error": "You cannot book your own slot"}), 400

    # Check duplicate
    existing = TutoringSession.query.filter_by(slot_id=slot_id).first()
    if existing:
        return jsonify({"error": "This slot is already booked"}), 409

    # Create session
    session = TutoringSession(
        student_id=user_id,
        tutor_id=slot.tutor_id,
        slot_id=slot_id,
        course_code=course_code,
        status="confirmed",
    )
    slot.status = "booked"
    db.session.add(session)
    db.session.commit()

    # --- Send booking confirmation emails (FR-13) ---
    student = User.query.get(user_id)
    tutor = User.query.get(slot.tutor_id)

    if student and tutor:
        slot_date_str = slot.date.isoformat() if slot.date else "TBD"
        summary = f"{slot_date_str} | {slot.start_time}–{slot.end_time} | {slot.location}"

        # Email to student
        send_notification_email(
            to_email=student.email,
            subject=f"Booking Confirmed – {course_code} with {tutor.full_name}",
            body_text=(
                f"Hello {student.full_name},\n\n"
                f"Your tutoring session has been booked:\n\n"
                f"  Course: {course_code}\n"
                f"  Tutor:  {tutor.full_name}\n"
                f"  Date:   {slot_date_str}\n"
                f"  Time:   {slot.start_time} – {slot.end_time}\n"
                f"  Location: {slot.location}\n\n"
                f"– CampusTutor Team"
            ),
        )

        # Email to tutor
        send_notification_email(
            to_email=tutor.email,
            subject=f"New Booking – {course_code} with {student.full_name}",
            body_text=(
                f"Hello {tutor.full_name},\n\n"
                f"You have a new tutoring session:\n\n"
                f"  Course: {course_code}\n"
                f"  Student: {student.full_name}\n"
                f"  Date:   {slot_date_str}\n"
                f"  Time:   {slot.start_time} – {slot.end_time}\n"
                f"  Location: {slot.location}\n\n"
                f"– CampusTutor Team"
            ),
        )

    logger.info(
        f"[Sessions] Booked: student={user_id}, tutor={slot.tutor_id}, "
        f"slot={slot_id}, course={course_code}"
    )

    # Refresh to get relationships
    db.session.refresh(session)
    return jsonify({"message": "Session booked successfully", "session": session.to_dict()}), 201


@sessions_bp.route("/my", methods=["GET"])
@jwt_required()
def my_sessions():
    """
    Return sessions for the current user.
    If the user is a student, return their student sessions.
    If the user is a tutor, return their tutor sessions.
    Admins get all sessions.
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    query = TutoringSession.query

    if user.role == "admin":
        pass  # see all
    elif user.role == "tutor":
        query = query.filter(TutoringSession.tutor_id == user_id)
    else:
        query = query.filter(TutoringSession.student_id == user_id)

    sessions = query.order_by(TutoringSession.created_at.desc()).all()
    return jsonify({"sessions": [s.to_dict() for s in sessions]}), 200


@sessions_bp.route("/<int:session_id>/cancel", methods=["PUT"])
@jwt_required()
def cancel_session(session_id):
    """
    Cancel a tutoring session.
    Frees the slot and sends cancellation emails to both parties (FR-15).
    Only the student or tutor of the session can cancel.
    """
    user_id = int(get_jwt_identity())
    session = TutoringSession.query.get(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404

    if session.status in ("cancelled", "completed"):
        return jsonify({"error": f"Cannot cancel a {session.status} session"}), 400

    if session.student_id != user_id and session.tutor_id != user_id:
        return jsonify({"error": "You are not authorized to cancel this session"}), 403

    # Determine who cancelled
    canceller = "student" if user_id == session.student_id else "tutor"

    # Free the slot
    slot = AvailabilitySlot.query.get(session.slot_id)
    if slot:
        slot.status = "open"

    session.status = "cancelled"
    db.session.commit()

    # --- Send cancellation emails (FR-15) ---
    student = User.query.get(session.student_id)
    tutor = User.query.get(session.tutor_id)

    if slot:
        slot_date_str = slot.date.isoformat() if slot.date else "TBD"

    canceller_name = student.full_name if canceller == "student" else tutor.full_name

    if student and tutor:
        cancel_info = f"This session was cancelled by the {canceller} ({canceller_name})."
        # Email to student
        send_notification_email(
            to_email=student.email,
            subject=f"Session Cancelled – {session.course_code}",
            body_text=(
                f"Hello {student.full_name},\n\n"
                f"The following tutoring session has been cancelled:\n\n"
                f"  Course: {session.course_code}\n"
                f"  Tutor:  {tutor.full_name}\n"
                f"  Date:   {slot_date_str if slot else 'TBD'}\n"
                f"  Time:   {slot.start_time if slot else 'TBD'} – {slot.end_time if slot else 'TBD'}\n\n"
                f"{cancel_info}\n\n"
                f"– CampusTutor Team"
            ),
        )

        # Email to tutor
        send_notification_email(
            to_email=tutor.email,
            subject=f"Session Cancelled – {session.course_code}",
            body_text=(
                f"Hello {tutor.full_name},\n\n"
                f"The following tutoring session has been cancelled:\n\n"
                f"  Course: {session.course_code}\n"
                f"  Student: {student.full_name}\n"
                f"  Date:   {slot_date_str if slot else 'TBD'}\n"
                f"  Time:   {slot.start_time if slot else 'TBD'} – {slot.end_time if slot else 'TBD'}\n\n"
                f"{cancel_info}\n\n"
                f"– CampusTutor Team"
            ),
        )

    logger.info(
        f"[Sessions] Cancelled: session={session_id} by {canceller} (user={user_id})"
    )

    db.session.refresh(session)
    return jsonify({"message": "Session cancelled", "session": session.to_dict()}), 200


@sessions_bp.route("/<int:session_id>/reschedule", methods=["PUT"])
@jwt_required()
def reschedule_session(session_id):
    """
    Reschedule a tutoring session (FR-9).
    Body: { "new_slot_id": int }
    Validates:
      - New slot belongs to the same tutor
      - New slot is open
      - Cancels old session, frees old slot
      - Books new slot, creates new session
    Only the student or tutor of the session can reschedule.
    """
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    new_slot_id = data.get("new_slot_id")
    if not new_slot_id:
        return jsonify({"error": "new_slot_id is required"}), 400

    session = TutoringSession.query.get(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404

    if session.status != "confirmed":
        return jsonify({"error": "Only confirmed sessions can be rescheduled"}), 400

    if session.student_id != user_id and session.tutor_id != user_id:
        return jsonify({"error": "You are not authorized to reschedule this session"}), 403

    new_slot = AvailabilitySlot.query.get(new_slot_id)
    if not new_slot:
        return jsonify({"error": "New slot not found"}), 404

    if new_slot.status != "open":
        return jsonify({"error": "The new slot is no longer available"}), 409

    if new_slot.tutor_id != session.tutor_id:
        return jsonify({"error": "You can only reschedule with the same tutor. The new slot belongs to a different tutor."}), 400

    if new_slot.tutor_id == session.student_id:
        return jsonify({"error": "Cannot book the student's own slot"}), 400

    # --- Cancel old session & free old slot ---
    old_slot = AvailabilitySlot.query.get(session.slot_id)
    if old_slot:
        old_slot.status = "open"
    session.status = "cancelled"
    db.session.flush()

    # --- Book new slot & create new session ---
    new_slot.status = "booked"
    new_session = TutoringSession(
        student_id=session.student_id,
        tutor_id=session.tutor_id,
        slot_id=new_slot_id,
        course_code=session.course_code,
        status="confirmed",
    )
    db.session.add(new_session)
    db.session.commit()

    # --- Send reschedule notification emails ---
    student = User.query.get(session.student_id)
    tutor = User.query.get(session.tutor_id)

    if student and tutor:
        rescheduler = "student" if user_id == session.student_id else "tutor"
        rescheduler_name = student.full_name if rescheduler == "student" else tutor.full_name

        old_info = f"{old_slot.date.isoformat()} {old_slot.start_time}–{old_slot.end_time}" if old_slot else "N/A"
        new_info = f"{new_slot.date.isoformat()} {new_slot.start_time}–{new_slot.end_time}"

        for recipient in [student, tutor]:
            send_notification_email(
                to_email=recipient.email,
                subject=f"Session Rescheduled – {session.course_code}",
                body_text=(
                    f"Hello {recipient.full_name},\n\n"
                    f"The following tutoring session has been rescheduled by the {rescheduler} ({rescheduler_name}):\n\n"
                    f"  Course: {session.course_code}\n"
                    f"  Old: {old_info}\n"
                    f"  New: {new_info}\n"
                    f"  Location: {new_slot.location}\n\n"
                    f"– CampusTutor Team"
                ),
            )

    logger.info(
        f"[Sessions] Rescheduled: old_session={session_id} -> new_session={new_session.id}, "
        f"old_slot={session.slot_id} -> new_slot={new_slot_id}"
    )

    db.session.refresh(new_session)
    return jsonify({"message": "Session rescheduled", "session": new_session.to_dict()}), 200


@sessions_bp.route("/<int:session_id>/calendar", methods=["GET"])
@jwt_required()
def get_session_calendar(session_id):
    """
    Generate and return a .ics (iCalendar) file for a session (FR-16).
    """
    user_id = int(get_jwt_identity())
    session = TutoringSession.query.get(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404

    if session.student_id != user_id and session.tutor_id != user_id:
        return jsonify({"error": "You are not authorized to access this session"}), 403

    ics_content = _build_ics_event(session)
    if not ics_content:
        return jsonify({"error": "Could not generate calendar file"}), 500

    filename = f"session-{session.id}-{session.course_code}.ics"

    return Response(
        ics_content,
        mimetype="text/calendar",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "text/calendar; charset=utf-8",
        },
    )


@sessions_bp.route("/auto-complete", methods=["POST"])
def auto_complete():
    """
    Manually trigger auto-completion (FR-12).
    Marks all confirmed sessions where slot.date < today as completed
    and sets slot status to closed.
    """
    from flask import current_app

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

    logger.info(f"[Sessions] Manual auto-complete: {count} session(s) completed")

    return jsonify(
        {
            "message": f"Auto-complete finished",
            "completed_count": count,
        }
    ), 200
