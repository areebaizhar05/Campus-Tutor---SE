from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, AvailabilitySlot

tutors_bp = Blueprint('tutors', __name__)


@tutors_bp.route('/', methods=['GET'])
@jwt_required()
def get_tutors():
    course = request.args.get('course', '').strip().upper()
    tutors = User.query.filter_by(role='tutor', is_active=True, is_verified=True).all()

    result = []
    for t in tutors:
        if course and t.courses:
            codes = [c.strip().upper() for c in t.courses.split(',')]
            if course not in codes:
                continue
        open_count = AvailabilitySlot.query.filter_by(tutor_id=t.id, status='open').count()
        d = t.to_dict()
        d['open_slots_count'] = open_count
        result.append(d)

    return jsonify({'tutors': result}), 200


@tutors_bp.route('/<int:tutor_id>/availability', methods=['GET'])
@jwt_required()
def get_tutor_availability(tutor_id):
    slots = (AvailabilitySlot.query
             .filter_by(tutor_id=tutor_id, status='open')
             .order_by(AvailabilitySlot.date, AvailabilitySlot.start_time)
             .all())
    return jsonify({'slots': [s.to_dict() for s in slots]}), 200


@tutors_bp.route('/my-availability', methods=['GET'])
@jwt_required()
def my_availability():
    user_id = int(get_jwt_identity())
    slots   = (AvailabilitySlot.query
               .filter_by(tutor_id=user_id)
               .order_by(AvailabilitySlot.date, AvailabilitySlot.start_time)
               .all())
    return jsonify({'slots': [s.to_dict() for s in slots]}), 200


@tutors_bp.route('/availability', methods=['POST'])
@jwt_required()
def add_availability():
    user_id = int(get_jwt_identity())
    user    = User.query.get(user_id)
    if not user or user.role != 'tutor':
        return jsonify({'error': 'Unauthorized.'}), 403

    data       = request.get_json() or {}
    date       = data.get('date', '').strip()
    start_time = data.get('start_time', '').strip()
    end_time   = data.get('end_time', '').strip()
    location   = data.get('location', 'Ehsas Room').strip() or 'Ehsas Room'

    if not all([date, start_time, end_time]):
        return jsonify({'error': 'Date, start time, and end time are required.'}), 400

    if start_time >= end_time:
        return jsonify({'error': 'End time must be after start time.'}), 400

    slot = AvailabilitySlot(
        tutor_id   = user_id,
        date       = date,
        start_time = start_time,
        end_time   = end_time,
        location   = location,
        status     = 'open',
    )
    db.session.add(slot)
    db.session.commit()
    return jsonify({'slot': slot.to_dict()}), 201


@tutors_bp.route('/availability/<int:slot_id>', methods=['DELETE'])
@jwt_required()
def delete_availability(slot_id):
    user_id = int(get_jwt_identity())
    slot    = AvailabilitySlot.query.get(slot_id)

    if not slot:
        return jsonify({'error': 'Slot not found.'}), 404
    if slot.tutor_id != user_id:
        return jsonify({'error': 'Unauthorized.'}), 403
    if slot.status == 'booked':
        return jsonify({'error': 'Cannot delete a slot that is already booked.'}), 400

    db.session.delete(slot)
    db.session.commit()
    return jsonify({'message': 'Slot deleted.'}), 200


@tutors_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    user    = User.query.get(user_id)
    if not user or user.role != 'tutor':
        return jsonify({'error': 'Unauthorized.'}), 403

    data = request.get_json() or {}

    if 'full_name'  in data: user.full_name  = data['full_name'].strip()
    if 'department' in data: user.department = data['department'].strip()
    if 'bio'        in data: user.bio        = data['bio'].strip()
    if 'courses'    in data:
        raw = data['courses']
        user.courses = ','.join(raw) if isinstance(raw, list) else raw

    db.session.commit()
    return jsonify({'user': user.to_dict()}), 200
