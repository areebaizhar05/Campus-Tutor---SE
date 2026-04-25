from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from models import db
from dotenv import load_dotenv
import os

load_dotenv()

def create_app():
    app = Flask(__name__)

    # ── Core config ──
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///campustutor.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'campus-tutor-dev-secret-2026')

    # ── Mail config (SMTP) ──
    app.config['MAIL_SERVER']         = os.getenv('MAIL_SERVER', 'smtp.mailtrap.io')
    app.config['MAIL_PORT']           = int(os.getenv('MAIL_PORT', 587))
    app.config['MAIL_USE_TLS']        = True
    app.config['MAIL_USERNAME']       = os.getenv('MAIL_USERNAME', '')
    app.config['MAIL_PASSWORD']       = os.getenv('MAIL_PASSWORD', '')
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', 'noreply@campustutor.local')

    # ── Extensions ──
    db.init_app(app)
    JWTManager(app)
    CORS(app, origins=['http://localhost:3000', 'http://localhost:5173'])

    # ── Prevent 308 redirects dropping auth tokens ──
    app.url_map.strict_slashes = False

    # ── Blueprints ──
    from routes.auth     import auth_bp
    from routes.tutors   import tutors_bp
    from routes.sessions import sessions_bp
    from routes.admin    import admin_bp

    app.register_blueprint(auth_bp,     url_prefix='/api/auth')
    app.register_blueprint(tutors_bp,   url_prefix='/api/tutors')
    app.register_blueprint(sessions_bp, url_prefix='/api/sessions')
    app.register_blueprint(admin_bp,    url_prefix='/api/admin')

    with app.app_context():
        db.create_all()

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5001)
