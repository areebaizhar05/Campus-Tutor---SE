from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, AvailabilitySlot, TutoringSession

sessions_bp = Blueprint('sessions', __name__)


@sessions_bp.route('/book', methods=['POST'])
@jwt_required()
def book_session():
    user_id = int(get_jwt_identity())
    user    = User.query.get(user_id)
    if not user or user.role != 'student':
        return jsonify({'error': 'Only students can book sessions.'}), 403

    data        = request.get_json() or {}
    slot_id     = data.get('slot_id')
    course_code = data.get('course_code', '').strip().upper()

    if not slot_id or not course_code:
        return jsonify({'error': 'Slot and course are required.'}), 400

    slot = AvailabilitySlot.query.get(slot_id)
    if not slot:
        return jsonify({'error': 'Slot not found.'}), 404

    if slot.status != 'open':
        return jsonify({'error': 'This slot is no longer available.'}), 409

    # Prevent duplicate booking
    existing = TutoringSession.query.filter_by(
        student_id=user_id, slot_id=slot_id, status='confirmed'
    ).first()
    if existing:
        return jsonify({'error': 'You already have a booking for this slot.'}), 409

    slot.status = 'booked'
    session = TutoringSession(
        student_id  = user_id,
        tutor_id    = slot.tutor_id,
        slot_id     = slot_id,
        course_code = course_code,
        status      = 'confirmed',
    )
    db.session.add(session)
    db.session.commit()

    return jsonify({'session': session.to_dict()}), 201


@sessions_bp.route('/my', methods=['GET'])
@jwt_required()
def my_sessions():
    user_id = int(get_jwt_identity())
    user    = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found.'}), 404

    if user.role == 'student':
        sessions = TutoringSession.query.filter_by(student_id=user_id).all()
    else:
        sessions = TutoringSession.query.filter_by(tutor_id=user_id).all()

    return jsonify({'sessions': [s.to_dict() for s in sessions]}), 200


@sessions_bp.route('/<int:session_id>/cancel', methods=['PUT'])
@jwt_required()
def cancel_session(session_id):
    user_id = int(get_jwt_identity())
    session = TutoringSession.query.get(session_id)

    if not session:
        return jsonify({'error': 'Session not found.'}), 404

    if session.student_id != user_id and session.tutor_id != user_id:
        return jsonify({'error': 'Unauthorized.'}), 403

    if session.status != 'confirmed':
        return jsonify({'error': 'Only confirmed sessions can be cancelled.'}), 400

    session.status = 'cancelled'
    slot = AvailabilitySlot.query.get(session.slot_id)
    if slot:
        slot.status = 'open'

    db.session.commit()
    return jsonify({'session': session.to_dict()}), 200


@sessions_bp.route('/<int:session_id>/complete', methods=['PUT'])
@jwt_required()
def complete_session(session_id):
    """Mark a confirmed session as completed (tutor or admin only)."""
    user_id = int(get_jwt_identity())
    user    = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found.'}), 404

    session = TutoringSession.query.get(session_id)
    if not session:
        return jsonify({'error': 'Session not found.'}), 404

    # Only the session's tutor or an admin can mark as completed
    if session.tutor_id != user_id and user.role != 'admin':
        return jsonify({'error': 'Only the session tutor or an admin can complete a session.'}), 403

    if session.status != 'confirmed':
        return jsonify({'error': 'Only confirmed sessions can be marked as completed.'}), 400

    session.status = 'completed'
    db.session.commit()
    return jsonify({'session': session.to_dict()}), 200


# ── FR9: Session Rescheduling ─────────────────────────────────────────────────

@sessions_bp.route('/<int:session_id>/reschedule', methods=['PUT'])
@jwt_required()
def reschedule_session(session_id):
    """
    Reschedule a confirmed session to a new time slot with the same tutor.

    Flow:
      1. Validate the session is confirmed and the caller is student or tutor.
      2. Cancel the old session (status → cancelled, old slot → open).
      3. Book the new slot (new session, status → confirmed, new slot → booked).

    Body: { "new_slot_id": <int> }
    """
    user_id = int(get_jwt_identity())
    session = TutoringSession.query.get(session_id)

    if not session:
        return jsonify({'error': 'Session not found.'}), 404

    # Only the student or tutor of this session can reschedule
    if session.student_id != user_id and session.tutor_id != user_id:
        return jsonify({'error': 'Unauthorized.'}), 403

    if session.status != 'confirmed':
        return jsonify({'error': 'Only confirmed sessions can be rescheduled.'}), 400

    data         = request.get_json() or {}
    new_slot_id  = data.get('new_slot_id')

    if not new_slot_id:
        return jsonify({'error': 'New slot ID is required.'}), 400

    # Validate the new slot
    new_slot = AvailabilitySlot.query.get(new_slot_id)
    if not new_slot:
        return jsonify({'error': 'New slot not found.'}), 404

    if new_slot.status != 'open':
        return jsonify({'error': 'Selected slot is no longer available.'}), 409

    # Must reschedule with the same tutor
    if new_slot.tutor_id != session.tutor_id:
        return jsonify({'error': 'You can only reschedule with the same tutor.'}), 400

    # Prevent booking the same slot
    if new_slot.id == session.slot_id:
        return jsonify({'error': 'This is already your current slot.'}), 400

    # ── Perform the reschedule ──

    # 1. Open the old slot
    old_slot = AvailabilitySlot.query.get(session.slot_id)
    if old_slot:
        old_slot.status = 'open'

    # 2. Cancel the old session
    session.status = 'cancelled'

    # 3. Book the new slot and create a new session
    new_slot.status = 'booked'
    new_session = TutoringSession(
        student_id  = session.student_id,
        tutor_id    = session.tutor_id,
        slot_id     = new_slot_id,
        course_code = session.course_code,
        status      = 'confirmed',
    )
    db.session.add(new_session)
    db.session.commit()

    return jsonify({'session': new_session.to_dict()}), 200
