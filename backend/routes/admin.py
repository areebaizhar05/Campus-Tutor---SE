from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, TutoringSession

admin_bp = Blueprint('admin', __name__)


def _get_admin():
    """Return the current user if they are an admin, else None."""
    user_id = int(get_jwt_identity())
    user    = User.query.get(user_id)
    return user if (user and user.role == 'admin') else None


@admin_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    if not _get_admin():
        return jsonify({'error': 'Unauthorized.'}), 403

    all_sessions = TutoringSession.query.all()
    return jsonify({
        'total_sessions': len(all_sessions),
        'confirmed':      sum(1 for s in all_sessions if s.status == 'confirmed'),
        'completed':      sum(1 for s in all_sessions if s.status == 'completed'),
        'cancelled':      sum(1 for s in all_sessions if s.status == 'cancelled'),
        'total_students': User.query.filter_by(role='student').count(),
        'total_tutors':   User.query.filter_by(role='tutor').count(),
    }), 200


@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    if not _get_admin():
        return jsonify({'error': 'Unauthorized.'}), 403

    search = request.args.get('search', '').strip().lower()
    query  = User.query

    if search:
        query = query.filter(
            db.or_(
                User.full_name.ilike(f'%{search}%'),
                User.email.ilike(f'%{search}%'),
            )
        )

    users = query.order_by(User.created_at.desc()).all()
    return jsonify({'users': [u.to_dict() for u in users]}), 200


@admin_bp.route('/users/<int:user_id>/role', methods=['PUT'])
@jwt_required()
def change_role(user_id):
    if not _get_admin():
        return jsonify({'error': 'Unauthorized.'}), 403

    new_role = (request.get_json() or {}).get('role', '')
    if new_role not in ('student', 'tutor', 'admin'):
        return jsonify({'error': 'Invalid role.'}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found.'}), 404

    user.role = new_role
    db.session.commit()
    return jsonify({'user': user.to_dict()}), 200


@admin_bp.route('/users/<int:user_id>/toggle-active', methods=['PUT'])
@jwt_required()
def toggle_active(user_id):
    if not _get_admin():
        return jsonify({'error': 'Unauthorized.'}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found.'}), 404

    user.is_active = not user.is_active
    db.session.commit()
    return jsonify({'user': user.to_dict()}), 200


@admin_bp.route('/sessions', methods=['GET'])
@jwt_required()
def get_all_sessions():
    if not _get_admin():
        return jsonify({'error': 'Unauthorized.'}), 403

    sessions = TutoringSession.query.order_by(TutoringSession.created_at.desc()).all()
    return jsonify({'sessions': [s.to_dict() for s in sessions]}), 200
