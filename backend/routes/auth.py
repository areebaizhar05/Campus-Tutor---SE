from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from models import db, User
from datetime import datetime, timedelta
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

auth_bp = Blueprint('auth', __name__)

ALLOWED_DOMAIN = '@st.habib.edu.pk'
ADMIN_EMAILS   = ['admin@campustutor.local']


# ── Helpers ───────────────────────────────────────────────────────────────────

def generate_otp():
    return str(random.randint(1000, 9999))


def send_otp_email(to_email: str, otp_code: str, purpose: str = 'verify') -> bool:
    """
    Send OTP via Mailtrap SMTP.
    Falls back to printing in the terminal if MAIL_USERNAME is not set.
    """
    mail_user = current_app.config.get('MAIL_USERNAME', '').strip()
    mail_pass = current_app.config.get('MAIL_PASSWORD', '').strip()

    if purpose == 'verify':
        subject = 'CampusTutor — Your Verification Code'
        action  = 'verification'
    else:
        subject = 'CampusTutor — Your Password Reset Code'
        action  = 'password reset'

    body = (
        f"Hello,\n\n"
        f"Your CampusTutor {action} code is:\n\n"
        f"    {otp_code}\n\n"
        f"This code expires in 5 minutes. Do not share it with anyone.\n\n"
        f"— CampusTutor Team"
    )

    # ── Console fallback (no Mailtrap credentials) ─────────────────────────
    if not mail_user or not mail_pass:
        print('\n' + '=' * 44)
        print(f'  OTP for {to_email}')
        print(f'  Code    : {otp_code}')
        print(f'  Purpose : {purpose}')
        print('=' * 44 + '\n')
        return True

    # ── Mailtrap SMTP ──────────────────────────────────────────────────────
    try:
        msg = MIMEMultipart()
        msg['From']    = current_app.config['MAIL_DEFAULT_SENDER']
        msg['To']      = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        server = smtplib.SMTP(
            current_app.config['MAIL_SERVER'],
            current_app.config['MAIL_PORT']
        )
        server.starttls()
        server.login(mail_user, mail_pass)
        server.sendmail(current_app.config['MAIL_DEFAULT_SENDER'], to_email, msg.as_string())
        server.quit()
        return True
    except Exception as exc:
        # Never crash the request; print fallback
        print(f'[Mail Error] {exc}')
        print(f'[Fallback OTP] {to_email} → {otp_code}')
        return False


# ── Routes ────────────────────────────────────────────────────────────────────

@auth_bp.route('/register', methods=['POST'])
def register():
    data      = request.get_json() or {}
    full_name = data.get('full_name', '').strip()
    email     = data.get('email', '').strip().lower()
    password  = data.get('password', '')
    role      = data.get('role', '')

    if not all([full_name, email, password, role]):
        return jsonify({'error': 'All fields are required.'}), 400

    if role not in ('student', 'tutor'):
        return jsonify({'error': 'Invalid role selected.'}), 400

    # Domain enforcement
    if email not in ADMIN_EMAILS and not email.endswith(ALLOWED_DOMAIN):
        return jsonify({
            'error': f'Registration is restricted to {ALLOWED_DOMAIN} university email addresses.'
        }), 400

    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters.'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'An account with this email already exists.'}), 409

    otp = generate_otp()
    user = User(
        full_name     = full_name,
        email         = email,
        password_hash = generate_password_hash(password),
        role          = role,
        is_verified   = False,
        otp_code      = otp,
        otp_expiry    = datetime.utcnow() + timedelta(minutes=5),
        otp_purpose   = 'verify',
    )
    db.session.add(user)
    db.session.commit()

    send_otp_email(email, otp, 'verify')
    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token, 'user': user.to_dict()}), 201


@auth_bp.route('/verify-otp', methods=['POST'])
@jwt_required()
def verify_otp():
    user_id = int(get_jwt_identity())
    user    = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found.'}), 404

    code = (request.get_json() or {}).get('code', '').strip()
    if not code:
        return jsonify({'error': 'OTP code is required.'}), 400

    if user.is_verified:
        token = create_access_token(identity=str(user.id))
        return jsonify({'token': token, 'user': user.to_dict()}), 200

    if user.otp_code != code:
        return jsonify({'error': 'Invalid code. Please try again.'}), 400

    if not user.otp_expiry or datetime.utcnow() > user.otp_expiry:
        return jsonify({'error': 'Code has expired. Please request a new one.'}), 400

    user.is_verified = True
    user.otp_code    = None
    user.otp_expiry  = None
    user.otp_purpose = None
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token, 'user': user.to_dict()}), 200


@auth_bp.route('/resend-otp', methods=['POST'])
@jwt_required()
def resend_otp():
    user_id = int(get_jwt_identity())
    user    = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found.'}), 404

    if user.is_verified:
        return jsonify({'message': 'Account is already verified.'}), 200

    otp = generate_otp()
    user.otp_code   = otp
    user.otp_expiry = datetime.utcnow() + timedelta(minutes=5)
    user.otp_purpose = 'verify'
    db.session.commit()

    send_otp_email(user.email, otp, 'verify')
    return jsonify({'message': 'New OTP sent.'}), 200


@auth_bp.route('/login', methods=['POST'])
def login():
    data     = request.get_json() or {}
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required.'}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid email or password.'}), 401

    if not user.is_active:
        return jsonify({'error': 'Your account has been deactivated. Contact an administrator.'}), 403

    # Unverified: issue a token but tell the frontend to redirect to /verify
    if not user.is_verified:
        otp = generate_otp()
        user.otp_code   = otp
        user.otp_expiry = datetime.utcnow() + timedelta(minutes=5)
        user.otp_purpose = 'verify'
        db.session.commit()
        send_otp_email(user.email, otp, 'verify')
        token = create_access_token(identity=str(user.id))
        return jsonify({'error': 'unverified', 'token': token, 'user': user.to_dict()}), 403

    token = create_access_token(identity=str(user.id))
    return jsonify({'token': token, 'user': user.to_dict()}), 200


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    email = (request.get_json() or {}).get('email', '').strip().lower()
    if not email:
        return jsonify({'error': 'Email is required.'}), 400

    user = User.query.filter_by(email=email).first()
    # Always return 200 to prevent email enumeration
    if user and user.is_active:
        otp = generate_otp()
        user.otp_code    = otp
        user.otp_expiry  = datetime.utcnow() + timedelta(minutes=5)
        user.otp_purpose = 'reset'
        db.session.commit()
        send_otp_email(email, otp, 'reset')

    return jsonify({'message': 'If an account exists, a reset code has been sent.'}), 200


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data         = request.get_json() or {}
    email        = data.get('email', '').strip().lower()
    code         = data.get('code', '').strip()
    new_password = data.get('password', '')

    if not all([email, code, new_password]):
        return jsonify({'error': 'All fields are required.'}), 400

    if len(new_password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters.'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or user.otp_purpose != 'reset' or user.otp_code != code:
        return jsonify({'error': 'Invalid or expired code.'}), 400

    if not user.otp_expiry or datetime.utcnow() > user.otp_expiry:
        return jsonify({'error': 'Code has expired. Please request a new one.'}), 400

    user.password_hash = generate_password_hash(new_password)
    user.otp_code      = None
    user.otp_expiry    = None
    user.otp_purpose   = None
    db.session.commit()

    return jsonify({'message': 'Password updated successfully.'}), 200
