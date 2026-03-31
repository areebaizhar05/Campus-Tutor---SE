"""
Run this once to populate the database with demo data.

Usage:
  Mac/Linux:  python seed.py
  Windows:    python seed.py
"""

from app import create_app
from models import db, User, AvailabilitySlot, TutoringSession
from werkzeug.security import generate_password_hash
from datetime import date, timedelta

SLOT_TIMES = [
    ('09:00', '10:00'),
    ('10:00', '11:00'),
    ('11:00', '12:00'),
    ('14:00', '15:00'),
    ('15:00', '16:00'),
]


def seed():
    app = create_app()
    with app.app_context():
        # ── Wipe existing data ────────────────────────────────────
        TutoringSession.query.delete()
        AvailabilitySlot.query.delete()
        User.query.delete()
        db.session.commit()

        # ── Admin ─────────────────────────────────────────────────
        admin = User(
            full_name     = 'Admin User',
            email         = 'admin@campustutor.local',
            password_hash = generate_password_hash('Admin1234'),
            role          = 'admin',
            is_active     = True,
            is_verified   = True,
        )
        db.session.add(admin)

        # ── Tutors ────────────────────────────────────────────────
        tutors_seed = [
            {
                'full_name':  'Ali Hassan',
                'email':      'ali.hassan@st.habib.edu.pk',
                'department': 'Computer Science',
                'bio':        'Senior TA specializing in algorithms, data structures, and OOP.',
                'courses':    'CS101,CS201,CS301,SE301',
            },
            {
                'full_name':  'Sara Khan',
                'email':      'sara.khan@st.habib.edu.pk',
                'department': 'Computer Engineering',
                'bio':        'Passionate about circuit design, embedded systems, and digital logic.',
                'courses':    'CE201,CE301,EE201,CS101',
            },
            {
                'full_name':  'Hamza Qureshi',
                'email':      'hamza.qureshi@st.habib.edu.pk',
                'department': 'Mathematics',
                'bio':        'Loves breaking down complex calculus and linear algebra into simple steps.',
                'courses':    'MATH101,MATH201,PHY101,CS101',
            },
        ]

        tutor_objects = []
        for td in tutors_seed:
            t = User(
                full_name     = td['full_name'],
                email         = td['email'],
                password_hash = generate_password_hash('Tutor1234'),
                role          = 'tutor',
                is_active     = True,
                is_verified   = True,
                department    = td['department'],
                bio           = td['bio'],
                courses       = td['courses'],
            )
            db.session.add(t)
            tutor_objects.append(t)

        db.session.flush()   # get IDs without committing

        # ── Availability slots (next 6 working days) ──────────────
        today      = date.today()
        all_slots  = []

        for i, tutor in enumerate(tutor_objects):
            num_times = 3 + i          # tutor 0→3 slots/day, 1→4, 2→5
            for day_off in range(1, 7):
                slot_date = (today + timedelta(days=day_off)).isoformat()
                for start, end in SLOT_TIMES[:num_times]:
                    slot = AvailabilitySlot(
                        tutor_id   = tutor.id,
                        date       = slot_date,
                        start_time = start,
                        end_time   = end,
                        location   = 'Ehsas Room',
                        status     = 'open',
                    )
                    db.session.add(slot)
                    all_slots.append(slot)

        db.session.flush()

        # ── Students ──────────────────────────────────────────────
        students_seed = [
            {'full_name': 'Fatima Malik',     'email': 'fatima.malik@st.habib.edu.pk'},
            {'full_name': 'Usman Ahmed',      'email': 'usman.ahmed@st.habib.edu.pk'},
            {'full_name': 'Zainab Raza',      'email': 'zainab.raza@st.habib.edu.pk'},
            {'full_name': 'Omar Farooq',      'email': 'omar.farooq@st.habib.edu.pk'},
            {'full_name': 'Ayesha Siddiqui',  'email': 'ayesha.siddiqui@st.habib.edu.pk'},
            {'full_name': 'Bilal Sheikh',     'email': 'bilal.sheikh@st.habib.edu.pk'},
        ]

        student_objects = []
        for sd in students_seed:
            s = User(
                full_name     = sd['full_name'],
                email         = sd['email'],
                password_hash = generate_password_hash('Student1234'),
                role          = 'student',
                is_active     = True,
                is_verified   = True,
            )
            db.session.add(s)
            student_objects.append(s)

        db.session.flush()

        # ── Pre-booked sessions (makes dashboards look alive) ──────
        # Tutor 0 slots: indices 0..17  (6 days × 3 slots)
        # Tutor 1 slots: indices 18..41 (6 days × 4 slots)
        # Tutor 2 slots: indices 42..71 (6 days × 5 slots)

        def book(student, tutor_idx, slot_idx, course, status='confirmed'):
            slot = all_slots[slot_idx]
            if status == 'confirmed':
                slot.status = 'booked'
            s = TutoringSession(
                student_id  = student.id,
                tutor_id    = tutor_objects[tutor_idx].id,
                slot_id     = slot.id,
                course_code = course,
                status      = status,
            )
            db.session.add(s)

        book(student_objects[0], 0,  0,  'CS101')
        book(student_objects[1], 0,  3,  'CS201')
        book(student_objects[2], 1,  18, 'CE201')
        book(student_objects[3], 1,  22, 'EE201')
        book(student_objects[4], 2,  42, 'MATH101')
        book(student_objects[5], 2,  47, 'PHY101')
        # One completed session so the "Completed" tab isn't empty
        book(student_objects[0], 0,  6,  'CS301', status='completed')

        db.session.commit()

        # ── Summary ───────────────────────────────────────────────
        print('\n' + '=' * 52)
        print('  ✅  Database seeded successfully!')
        print('=' * 52)
        print('\n  Test credentials\n')
        print(f'  {"Role":<10} {"Email":<42} Password')
        print('  ' + '-' * 70)
        print(f'  {"Admin":<10} admin@campustutor.local                    Admin1234')
        print(f'  {"Tutor 1":<10} ali.hassan@st.habib.edu.pk                 Tutor1234')
        print(f'  {"Tutor 2":<10} sara.khan@st.habib.edu.pk                  Tutor1234')
        print(f'  {"Tutor 3":<10} hamza.qureshi@st.habib.edu.pk              Tutor1234')
        print(f'  {"Student":<10} fatima.malik@st.habib.edu.pk               Student1234')
        print(f'  {"(all 6)":<10} *@st.habib.edu.pk                          Student1234')
        print()


if __name__ == '__main__':
    seed()
