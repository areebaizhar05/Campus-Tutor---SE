"""
CampusTutor – Authentication Routes
Registration, OTP verification, login, password reset.
"""

import re
import logging
import sys

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required
from models import db, User
from flask_mail import Message

auth_bp = Blueprint("auth", __name__)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def send_otp_email(user):
    """
    Send OTP email to the user.
    Tries SMTP first (Mailtrap); falls back to printing to console.
    """
    otp = user.otp_code
    subject = f"CampusTutor – Your OTP Code: {otp}"
    body = (
        f"Hello {user.full_name},\n\n"
        f"Your CampusTutor verification code is: {otp}\n\n"
        f"This code expires in 10 minutes. Do not share it with anyone.\n\n"
        f"– CampusTutor Team"
    )
    html_body = (
        f"<h2>Hello {user.full_name},</h2>"
        f"<p>Your CampusTutor verification code is: <strong>{otp}</strong></p>"
        f"<p>This code expires in 10 minutes. Do not share it with anyone.</p>"
        f"<p>– CampusTutor Team</p>"
    )

    try:
        msg = Message(
            subject=subject,
            recipients=[user.email],
            body=body,
            html=html_body,
        )
        current_app.extensions["mail"].send(msg)
        logger.info(f"[OTP Email] Sent to {user.email} (purpose: {user.otp_purpose})")
    except Exception as e:
        # Console fallback
        logger.warning(f"[OTP Email] SMTP failed ({e}), printing to console")
        print(f"\n{'='*60}", file=sys.stderr)
        print(f"  EMAIL TO: {user.email}", file=sys.stderr)
        print(f"  SUBJECT:  {subject}", file=sys.stderr)
        print(f"  OTP CODE: {otp}", file=sys.stderr)
        print(f"  PURPOSE:  {user.otp_purpose}", file=sys.stderr)
        print(f"{'='*60}\n", file=sys.stderr)


def send_notification_email(to_email, subject, body_text, body_html=None):
    """
    Send a notification email (booking confirmation, cancellation, reminder).
    Falls back to console if SMTP fails.
    """
    try:
        msg = Message(
            subject=subject,
            recipients=[to_email],
            body=body_text,
            html=body_html or body_text.replace("\n", "<br>"),
        )
        current_app.extensions["mail"].send(msg)
        logger.info(f"[Notification Email] Sent to {to_email}: {subject}")
    except Exception as e:
        logger.warning(f"[Notification Email] SMTP failed ({e}), printing to console")
        print(f"\n{'='*60}", file=sys.stderr)
        print(f"  EMAIL TO: {to_email}", file=sys.stderr)
        print(f"  SUBJECT:  {subject}", file=sys.stderr)
        print(f"  BODY:     {body_text[:200]}...", file=sys.stderr)
        print(f"{'='*60}\n", file=sys.stderr)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

PHONE_REGEX = re.compile(r"^\+92\d{10}$")


@auth_bp.route("/register", methods=["POST"])
def register():
    """
    Register a new user.
    Requires: full_name, email, phone, password, role
    Domain enforcement: @st.habib.edu.pk
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    full_name = data.get("full_name", "").strip()
    email = data.get("email", "").strip().lower()
    phone = data.get("phone", "").strip()
    password = data.get("password", "")
    role = data.get("role", "student").strip().lower()

    # --- Validation ---
    errors = []
    if not full_name or len(full_name) < 2:
        errors.append("Full name must be at least 2 characters")
    if not email or not email.endswith("@st.habib.edu.pk"):
        errors.append("Email must be a valid @st.habib.edu.pk address")
    if not PHONE_REGEX.match(phone):
        errors.append("Phone must be in format +92XXXXXXXXXX (e.g. +923001234567)")
    if not password or len(password) < 6:
        errors.append("Password must be at least 6 characters")
    if role not in ("student", "tutor"):
        errors.append("Role must be 'student' or 'tutor'")

    if errors:
        return jsonify({"error": "Validation failed", "details": errors}), 400

    # Check uniqueness
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409
    if User.query.filter_by(phone=phone).first():
        return jsonify({"error": "Phone number already registered"}), 409

    # --- Create user ---
    user = User(
        full_name=full_name,
        email=email,
        phone=phone,
        role=role,
        is_active=True,
        is_verified=False,
    )
    user.set_password(password)
    user.set_otp(purpose="verify_email")
    db.session.add(user)
    db.session.commit()

    # Send OTP email
    send_otp_email(user)

    logger.info(f"[Auth] New user registered: {email} ({role})")

    return (
        jsonify(
            {
                "message": "Registration successful. Please verify your email with the OTP sent.",
                "user": user.to_dict_safe(),
            }
        ),
        201,
    )


@auth_bp.route("/verify-otp", methods=["POST"])
def verify_otp():
    """Verify a 4-digit OTP to activate the account or confirm password reset."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    email = data.get("email", "").strip().lower()
    otp = data.get("otp", "").strip()

    if not email or not otp:
        return jsonify({"error": "Email and OTP are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    if not user.is_otp_valid(otp):
        return jsonify({"error": "Invalid or expired OTP"}), 400

    if user.otp_purpose == "verify_email":
        user.is_verified = True
        user.otp_code = None
        user.otp_expiry = None
        user.otp_purpose = None
        db.session.commit()
        logger.info(f"[Auth] User verified: {email}")

        # Issue a token upon successful verification
        token = create_access_token(identity=str(user.id))
        return (
            jsonify(
                {
                    "message": "Email verified successfully",
                    "token": token,
                    "user": user.to_dict_safe(),
                }
            ),
            200,
        )

    elif user.otp_purpose == "reset_password":
        user.otp_code = None
        user.otp_expiry = None
        user.otp_purpose = None
        db.session.commit()
        # Return a temporary token so the frontend can proceed to set new password
        token = create_access_token(identity=str(user.id))
        return (
            jsonify(
                {
                    "message": "OTP verified. You may now set a new password.",
                    "token": token,
                }
            ),
            200,
        )

    return jsonify({"error": "Unknown OTP purpose"}), 400


@auth_bp.route("/resend-otp", methods=["POST"])
def resend_otp():
    """Resend the OTP to the user's email."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    email = data.get("email", "").strip().lower()
    purpose = data.get("purpose", "verify_email")

    if not email:
        return jsonify({"error": "Email is required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    user.set_otp(purpose=purpose)
    db.session.commit()
    send_otp_email(user)

    return jsonify({"message": "A new OTP has been sent to your email"}), 200


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Authenticate user and return JWT token.
    If user is unverified, return 403 with error:'unverified' + token + user.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    if not user.is_active:
        return jsonify({"error": "Account is deactivated. Contact an administrator."}), 403

    # Issue token regardless of verification (frontend decides UX)
    token = create_access_token(identity=str(user.id))

    if not user.is_verified:
        return (
            jsonify(
                {
                    "error": "unverified",
                    "message": "Please verify your email before proceeding.",
                    "token": token,
                    "user": user.to_dict_safe(),
                }
            ),
            403,
        )

    logger.info(f"[Auth] User logged in: {email} ({user.role})")
    return (
        jsonify(
            {
                "message": "Login successful",
                "token": token,
                "user": user.to_dict_safe(),
            }
        ),
        200,
    )


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    """Send a reset-password OTP to the user's email."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    email = data.get("email", "").strip().lower()
    if not email:
        return jsonify({"error": "Email is required"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        # Don't reveal whether the email exists (security best practice)
        return jsonify({"message": "If the email exists, a reset OTP has been sent."}), 200

    user.set_otp(purpose="reset_password")
    db.session.commit()
    send_otp_email(user)

    return jsonify({"message": "If the email exists, a reset OTP has been sent."}), 200


@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    """Verify the reset OTP and set a new password."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400

    email = data.get("email", "").strip().lower()
    otp = data.get("otp", "").strip()
    new_password = data.get("new_password", "")

    if not email or not otp or not new_password:
        return jsonify({"error": "Email, OTP, and new password are required"}), 400

    if len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    if not user.is_otp_valid(otp):
        return jsonify({"error": "Invalid or expired OTP"}), 400

    if user.otp_purpose != "reset_password":
        return jsonify({"error": "This OTP is not for password reset"}), 400

    user.set_password(new_password)
    user.otp_code = None
    user.otp_expiry = None
    user.otp_purpose = None
    db.session.commit()

    logger.info(f"[Auth] Password reset for: {email}")
    return jsonify({"message": "Password has been reset successfully"}), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    """Return the current authenticated user's profile."""
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": user.to_dict_safe()}), 200
