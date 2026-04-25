"""
CampusTutor – Database Seeder
Creates sample admin, tutors, students, availability slots, and sessions.
Run: python seed.py
"""

import sys
import random
from datetime import date, timedelta

# Ensure the backend directory is in the path
sys.path.insert(0, ".")

from app import create_app
from models import db, User, AvailabilitySlot, TutoringSession


def seed():
    """Seed the database with sample data."""
    app = create_app()
    with app.app_context():
        print("=" * 60)
        print("  CampusTutor – Database Seeder")
        print("=" * 60)

        # ------------------------------------------------------------------
        # Clear existing data (optional – remove if you want to keep data)
        # ------------------------------------------------------------------
        print("\n[1/5] Clearing existing data...")
        TutoringSession.query.delete()
        AvailabilitySlot.query.delete()
        User.query.delete()
        db.session.commit()
        print("  ✓ Cleared all tables")

        # ------------------------------------------------------------------
        # Create Admin
        # ------------------------------------------------------------------
        print("\n[2/5] Creating admin user...")
        admin = User(
            full_name="Admin User",
            email="admin@campustutor.local",
            phone="+923001234567",
            role="admin",
            is_active=True,
            is_verified=True,
        )
        admin.set_password("Admin1234")
        db.session.add(admin)
        db.session.commit()
        print(f"  ✓ Admin: {admin.email}")

        # ------------------------------------------------------------------
        # Create Tutors (3)
        # ------------------------------------------------------------------
        print("\n[2/5] Creating tutors...")
        tutors_data = [
            {
                "full_name": "Ahmed Khan",
                "email": "ahmed.khan@st.habib.edu.pk",
                "phone": "+923001234568",
                "department": "Computer Science",
                "bio": "Senior CS student specializing in algorithms and data structures. 3+ years of peer tutoring experience.",
                "courses": "CS201,CS301,CS401",
                "password": "Tutor1234",
            },
            {
                "full_name": "Sara Ali",
                "email": "sara.ali@st.habib.edu.pk",
                "phone": "+923001234569",
                "department": "Mathematics",
                "bio": "Math major with a passion for teaching calculus and linear algebra. Dean's List student.",
                "courses": "MA101,MA201,MA301",
                "password": "Tutor1234",
            },
            {
                "full_name": "Hassan Raza",
                "email": "hassan.raza@st.habib.edu.pk",
                "phone": "+923001234570",
                "department": "Electrical Engineering",
                "bio": "EE student focusing on circuits and signals. Experienced in lab demonstrations and tutorials.",
                "courses": "EE201,EE301,PH101",
                "password": "Tutor1234",
            },
        ]

        tutors = []
        for td in tutors_data:
            tutor = User(
                full_name=td["full_name"],
                email=td["email"],
                phone=td["phone"],
                department=td["department"],
                bio=td["bio"],
                courses=td["courses"],
                role="tutor",
                is_active=True,
                is_verified=True,
            )
            tutor.set_password(td["password"])
            db.session.add(tutor)
            tutors.append(tutor)

        db.session.commit()
        print(f"  ✓ Created {len(tutors)} tutors")
        for t in tutors:
            print(f"    - {t.full_name} ({t.email})")

        # ------------------------------------------------------------------
        # Create Students (6)
        # ------------------------------------------------------------------
        print("\n[3/5] Creating students...")
        students_data = [
            {
                "full_name": "Zainab Malik",
                "email": "zainab.malik@st.habib.edu.pk",
                "phone": "+923001234571",
                "password": "Student1234",
            },
            {
                "full_name": "Usman Sheikh",
                "email": "usman.sheikh@st.habib.edu.pk",
                "phone": "+923001234572",
                "password": "Student1234",
            },
            {
                "full_name": "Fatima Noor",
                "email": "fatima.noor@st.habib.edu.pk",
                "phone": "+923001234573",
                "password": "Student1234",
            },
            {
                "full_name": "Ali Haider",
                "email": "ali.haider@st.habib.edu.pk",
                "phone": "+923001234574",
                "password": "Student1234",
            },
            {
                "full_name": "Hira Bukhari",
                "email": "hira.bukhari@st.habib.edu.pk",
                "phone": "+923001234575",
                "password": "Student1234",
            },
            {
                "full_name": "Bilal Siddiqui",
                "email": "bilal.siddiqui@st.habib.edu.pk",
                "phone": "+923001234576",
                "password": "Student1234",
            },
        ]

        students = []
        for sd in students_data:
            student = User(
                full_name=sd["full_name"],
                email=sd["email"],
                phone=sd["phone"],
                role="student",
                is_active=True,
                is_verified=True,
            )
            student.set_password(sd["password"])
            db.session.add(student)
            students.append(student)

        db.session.commit()
        print(f"  ✓ Created {len(students)} students")
        for s in students:
            print(f"    - {s.full_name} ({s.email})")

        # ------------------------------------------------------------------
        # Create Availability Slots (72 = 3 tutors × 6 days × 3-5 slots)
        # ------------------------------------------------------------------
        print("\n[4/5] Creating availability slots...")

        locations = [
            "Library Room A",
            "Library Room B",
            "CS Lab 1",
            "CS Lab 2",
            "Study Lounge 1st Floor",
            "Cafeteria Area",
            "Student Center Room 3",
        ]

        time_slots = [
            ("09:00", "10:00"),
            ("10:00", "11:00"),
            ("11:00", "12:00"),
            ("13:00", "14:00"),
            ("14:00", "15:00"),
            ("15:00", "16:00"),
            ("16:00", "17:00"),
        ]

        today = date.today()
        slot_count = 0

        # We'll track which slots are bookable for sessions
        all_slots = []  # (slot_object, tutor)

        for tutor in tutors:
            for day_offset in range(6):  # next 6 days
                slot_date = today + timedelta(days=day_offset)
                # 3 to 5 slots per tutor per day
                num_slots = random.randint(3, 5)
                chosen_times = random.sample(time_slots, min(num_slots, len(time_slots)))
                chosen_times.sort()

                for start, end in chosen_times:
                    slot = AvailabilitySlot(
                        tutor_id=tutor.id,
                        date=slot_date,
                        start_time=start,
                        end_time=end,
                        location=random.choice(locations),
                        status="open",
                    )
                    db.session.add(slot)
                    all_slots.append((slot, tutor))
                    slot_count += 1

        db.session.commit()
        print(f"  ✓ Created {slot_count} availability slots")

        # ------------------------------------------------------------------
        # Create Pre-booked Sessions (7: 6 confirmed + 1 completed)
        # ------------------------------------------------------------------
        print("\n[5/5] Creating pre-booked sessions...")

        # Courses available per tutor
        tutor_courses = {
            tutors[0].id: ["CS201", "CS301", "CS401"],
            tutors[1].id: ["MA101", "MA201", "MA301"],
            tutors[2].id: ["EE201", "EE301", "PH101"],
        }

        session_configs = [
            # (student_index, tutor_index, day_offset, time_index, course, status)
            (0, 0, 0, 0, "CS201", "confirmed"),
            (1, 0, 1, 1, "CS301", "confirmed"),
            (2, 1, 0, 0, "MA101", "confirmed"),
            (3, 1, 2, 2, "MA201", "confirmed"),
            (4, 2, 1, 0, "EE201", "confirmed"),
            (5, 2, 3, 1, "PH101", "confirmed"),
            # Completed session (past slot)
            (0, 1, -3, 0, "MA101", "completed"),
        ]

        session_count = 0

        for student_idx, tutor_idx, day_offset, time_idx, course, status in session_configs:
            student = students[student_idx]
            tutor = tutors[tutor_idx]

            # Find a matching open slot
            target_date = today + timedelta(days=day_offset)
            target_start = time_slots[time_idx][0]
            target_end = time_slots[time_idx][1]

            slot = (
                AvailabilitySlot.query
                .filter_by(
                    tutor_id=tutor.id,
                    date=target_date,
                    start_time=target_start,
                    end_time=target_end,
                    status="open",
                )
                .first()
            )

            if not slot:
                # If the exact slot isn't available, pick any open slot for this tutor
                slot = (
                    AvailabilitySlot.query
                    .filter_by(tutor_id=tutor.id, status="open")
                    .first()
                )

            if slot:
                session = TutoringSession(
                    student_id=student.id,
                    tutor_id=tutor.id,
                    slot_id=slot.id,
                    course_code=course,
                    status=status,
                )
                slot.status = "booked" if status == "confirmed" else "closed"
                db.session.add(session)
                session_count += 1

        db.session.commit()
        print(f"  ✓ Created {session_count} pre-booked sessions")

        # ------------------------------------------------------------------
        # Summary
        # ------------------------------------------------------------------
        print("\n" + "=" * 60)
        print("  Seeding Complete!")
        print("=" * 60)
        print(f"  Admin:     1")
        print(f"  Tutors:    {len(tutors)}")
        print(f"  Students:  {len(students)}")
        print(f"  Slots:     {slot_count}")
        print(f"  Sessions:  {session_count}")
        print()
        print("  Admin login:   admin@campustutor.local / Admin1234")
        print("  Tutor login:   ahmed.khan@st.habib.edu.pk / Tutor1234")
        print("  Student login: zainab.malik@st.habib.edu.pk / Student1234")
        print("=" * 60)


if __name__ == "__main__":
    seed()
