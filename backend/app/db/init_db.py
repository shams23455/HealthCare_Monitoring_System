import logging
from sqlalchemy import create_engine, text
from app.db.session import engine, Base, SessionLocal
from app.core.config import settings
from app.core.security import get_password_hash
from app.models.user import User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_database_if_not_exists():
    """Attempts to connect to postgres default db and create livestock_db if missing."""
    try:
        # Extract base connection string without db name
        db_url = settings.DATABASE_URL
        if "/livestock_db" in db_url:
            base_url = db_url.rsplit("/", 1)[0] + "/postgres"
            temp_engine = create_engine(base_url, isolation_level="AUTOCOMMIT")
            with temp_engine.connect() as conn:
                result = conn.execute(text("SELECT 1 FROM pg_database WHERE datname='livestock_db'"))
                if not result.scalar():
                    conn.execute(text("CREATE DATABASE livestock_db"))
                    logger.info("Database 'livestock_db' created successfully.")
            temp_engine.dispose()
    except Exception as e:
        logger.warning(f"Could not auto-create database (may already exist or permission restricted): {e}")

def init_db():
    create_database_if_not_exists()
    
    logger.info("Creating database tables if not present...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # Seed Admin
        admin = db.query(User).filter(User.email == "admin@example.com").first()
        if not admin:
            admin = User(
                name="Admin User",
                email="admin@example.com",
                password_hash=get_password_hash("admin123"),
                role="ADMIN",
                phone="+1234567890"
            )
            db.add(admin)
            logger.info("Seeded default admin@example.com / admin123")

        # Seed Expert
        expert = db.query(User).filter(User.email == "expert@example.com").first()
        if not expert:
            expert = User(
                name="Dr. Sarah Jenkins (Veterinarian)",
                email="expert@example.com",
                password_hash=get_password_hash("expert123"),
                role="EXPERT",
                phone="+1987654321"
            )
            db.add(expert)
            logger.info("Seeded default expert@example.com / expert123")

        # Seed Farmer
        farmer = db.query(User).filter(User.email == "farmer@example.com").first()
        if not farmer:
            farmer = User(
                name="John Doe (Valley Farm)",
                email="farmer@example.com",
                password_hash=get_password_hash("farmer123"),
                role="FARMER",
                phone="+1555019283"
            )
        # Seed Initial Symptoms
        from app.models.symptom import Symptom
        initial_symptoms = [
            ("Fever", "Elevated body temperature or warmth to touch"),
            ("Coughing", "Persistent or wheezing cough"),
            ("Nasal discharge", "Runny discharge or mucus from nostrils"),
            ("Reduced appetite", "Reluctance to feed or off feed"),
            ("Reduced activity", "Lethargy, dullness, or lying down often"),
            ("Diarrhea", "Loose, watery stools or scours"),
            ("Skin changes", "Lesions, hair loss, crusting, or wounds"),
            ("Swelling", "Localized swelling in joints, udder, or throat"),
            ("Difficulty walking", "Lameness, limping, or abnormal gait"),
            ("Abnormal breathing", "Rapid, labored, or shallow respiration"),
            ("Other", "Other observable signs or behaviors")
        ]

        for s_name, s_desc in initial_symptoms:
            existing_symptom = db.query(Symptom).filter(Symptom.name == s_name).first()
            if not existing_symptom:
                db.add(Symptom(name=s_name, description=s_desc, is_active=True))

        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
