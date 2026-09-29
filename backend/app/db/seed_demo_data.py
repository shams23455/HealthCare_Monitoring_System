"""
Seed realistic demo data for the Livestock Health Observation and Expert Escalation System.

Scenarios covered:
1. Normal observation (LOW risk, active healthy cow)
2. Medium-risk observation (MEDIUM risk, cough & reduced activity)
3. High-risk observation (HIGH risk, respiratory distress, escalated to expert queue)
4. Offline pending observation (Sync status PENDING, client_observation_id generated)
5. Synced observation (Sync status SYNCED, uploaded successfully)
6. Expert-reviewed observation (VALIDATED decision, timestamp metrics captured)
7. Poor-image observation (Image quality POOR, warning triggered)
8. Requires-more-information observation (Expert decision REQUIRES_MORE_INFORMATION)

IMPORTANT: ALL ENTRIES ARE CLEARLY LABELED WITH '[DEMO DATA]'.
NEVER PRESENT THIS DEMO DATA AS MEASURED FIELD EXPERIMENT RESULTS.
"""

import uuid
import logging
from datetime import datetime, timezone, timedelta
from app.db.session import engine, Base, SessionLocal
from app.models.user import User
from app.models.animal import Animal
from app.models.symptom import Symptom, ObservationSymptom
from app.models.observation import Observation
from app.models.review import ExpertReview
from app.models.image import Image
from app.core.security import get_password_hash

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_demo_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        logger.info("Initializing demo accounts...")
        # 1. Ensure Farmer exists
        farmer = db.query(User).filter(User.email == "demo_farmer@example.com").first()
        if not farmer:
            farmer = User(
                name="Demo Farmer (Baraka Pastures)",
                email="demo_farmer@example.com",
                password_hash=get_password_hash("farmer123"),
                role="FARMER",
                phone="+254700112233"
            )
            db.add(farmer)
            db.flush()

        # 2. Ensure Expert exists
        expert = db.query(User).filter(User.email == "demo_expert@example.com").first()
        if not expert:
            expert = User(
                name="Dr. Amina Patel (Veterinary Officer)",
                email="demo_expert@example.com",
                password_hash=get_password_hash("expert123"),
                role="EXPERT",
                phone="+254711998877"
            )
            db.add(expert)
            db.flush()

        # 3. Ensure Symptoms exist
        symptom_map = {}
        for s_name in ["Fever", "Coughing", "Reduced appetite", "Reduced activity", "Abnormal breathing", "Skin changes"]:
            s = db.query(Symptom).filter(Symptom.name == s_name).first()
            if not s:
                s = Symptom(name=s_name, description=f"{s_name} description", is_active=True)
                db.add(s)
                db.flush()
            symptom_map[s_name] = s

        # 4. Create Demo Animals
        animals_spec = [
            ("TAG-COW-101", "Cattle", "Friesian-Boran", "Female", "Adult", "North Pasture Enclosure"),
            ("TAG-GOAT-204", "Goat", "Boer Cross", "Male", "Young", "Barn B Pen 3"),
            ("TAG-SHEEP-308", "Sheep", "Dorper", "Female", "Lactating", "Hillside Grazing Area"),
        ]
        demo_animals = {}
        for tag, sp, breed, sex, stage, loc in animals_spec:
            a = db.query(Animal).filter(Animal.animal_tag == tag).first()
            if not a:
                a = Animal(
                    farmer_id=farmer.id,
                    animal_tag=tag,
                    species=sp,
                    breed=breed,
                    sex=sex,
                    age_stage=stage,
                    farm_location=loc,
                    notes="[DEMO DATA] Healthy stock tracked for demonstration."
                )
                db.add(a)
                db.flush()
            demo_animals[tag] = a

        now = datetime.now(timezone.utc)

        # Clear previous demo observations to ensure idempotency
        db.query(Observation).filter(Observation.notes.like("[DEMO DATA%")).delete(synchronize_session=False)
        db.commit()

        # SCENARIO 1: Normal Observation (LOW risk, healthy cow)
        cow1 = demo_animals["TAG-COW-101"]
        obs1 = Observation(
            client_observation_id=str(uuid.uuid4()),
            recorded_by=farmer.id,
            animal_id=cow1.id,
            first_symptom_at=now - timedelta(hours=6),
            observed_at=now - timedelta(hours=5),
            submitted_at=now - timedelta(hours=5),
            appetite_status="Normal",
            activity_status="Normal",
            farm_location=cow1.farm_location,
            age_stage=cow1.age_stage,
            risk_level="LOW",
            system_confidence=0.88,
            explanation_factors=["No acute clinical symptoms indicated", "Standard vital signs reported", "Photo quality clear"],
            recommended_action="Continue standard monitoring and hydration.",
            notes="[DEMO DATA - Scenario 1: Normal Observation] Routine checkup, animal eating normally, no signs of distress."
        )
        db.add(obs1)

        # SCENARIO 2: Medium-risk observation (MEDIUM risk, cough & reduced activity)
        goat1 = demo_animals["TAG-GOAT-204"]
        obs2 = Observation(
            client_observation_id=str(uuid.uuid4()),
            recorded_by=farmer.id,
            animal_id=goat1.id,
            first_symptom_at=now - timedelta(days=2),
            observed_at=now - timedelta(hours=14),
            submitted_at=now - timedelta(hours=14),
            appetite_status="Reduced",
            activity_status="Slow / lethargic",
            farm_location=goat1.farm_location,
            age_stage=goat1.age_stage,
            risk_level="MEDIUM",
            system_confidence=0.74,
            explanation_factors=["2 symptoms observed (Coughing, Reduced activity)", "Duration indicates progressive onset"],
            recommended_action="Isolate in dry pen and observe for 24 hours. Escalate if breathing worsens.",
            notes="[DEMO DATA - Scenario 2: Medium-Risk Observation] Coughing noticed yesterday evening; moving slower than herd."
        )
        db.add(obs2)
        db.flush()
        db.add(ObservationSymptom(observation_id=obs2.id, symptom_id=symptom_map["Coughing"].id, symptom_name="Coughing", severity="Moderate"))
        db.add(ObservationSymptom(observation_id=obs2.id, symptom_id=symptom_map["Reduced activity"].id, symptom_name="Reduced activity", severity="Mild"))

        # SCENARIO 3: High-risk observation (HIGH risk, acute respiratory distress, pending expert review)
        obs3 = Observation(
            client_observation_id=str(uuid.uuid4()),
            recorded_by=farmer.id,
            animal_id=cow1.id,
            first_symptom_at=now - timedelta(hours=18),
            observed_at=now - timedelta(hours=2),
            submitted_at=now - timedelta(hours=2),
            appetite_status="Refusing food",
            activity_status="Lying down, reluctant to rise",
            farm_location=cow1.farm_location,
            age_stage=cow1.age_stage,
            risk_level="HIGH",
            system_confidence=0.85,
            explanation_factors=["Critical symptom combination: Fever + Abnormal breathing", "High escalation priority flagged"],
            recommended_action="Urgent expert evaluation recommended. Maintain distance from pregnant livestock.",
            notes="[DEMO DATA - Scenario 3: High-Risk Escalation] High fever, rapid shallow breathing, foam around muzzle."
        )
        db.add(obs3)
        db.flush()
        db.add(ObservationSymptom(observation_id=obs3.id, symptom_id=symptom_map["Fever"].id, symptom_name="Fever", severity="Severe"))
        db.add(ObservationSymptom(observation_id=obs3.id, symptom_id=symptom_map["Abnormal breathing"].id, symptom_name="Abnormal breathing", severity="Severe"))

        # SCENARIO 4: Offline pending observation (Sync status PENDING, client_observation_id generated)
        sheep1 = demo_animals["TAG-SHEEP-308"]
        obs4 = Observation(
            client_observation_id=str(uuid.uuid4()),
            recorded_by=farmer.id,
            animal_id=sheep1.id,
            first_symptom_at=now - timedelta(hours=4),
            observed_at=now - timedelta(hours=1),
            submitted_at=None,
            appetite_status="Reduced",
            activity_status="Normal",
            farm_location=sheep1.farm_location,
            age_stage=sheep1.age_stage,
            risk_level="MEDIUM",
            system_confidence=0.70,
            explanation_factors=["Reduced appetite recorded while offline", "Awaiting server sync verification"],
            recommended_action="Synchronize as soon as network becomes available.",
            notes="[DEMO DATA - Scenario 4: Offline Pending] Recorded out in remote grazing valley with no cellular signal."
        )
        db.add(obs4)
        db.flush()
        db.add(ObservationSymptom(observation_id=obs4.id, symptom_id=symptom_map["Reduced appetite"].id, symptom_name="Reduced appetite", severity="Moderate"))

        # SCENARIO 5: Synced observation (Sync status SYNCED)
        obs5 = Observation(
            client_observation_id=str(uuid.uuid4()),
            recorded_by=farmer.id,
            animal_id=goat1.id,
            first_symptom_at=now - timedelta(days=1),
            observed_at=now - timedelta(hours=8),
            submitted_at=now - timedelta(hours=3),
            appetite_status="Normal",
            activity_status="Normal",
            farm_location=goat1.farm_location,
            age_stage=goat1.age_stage,
            risk_level="LOW",
            system_confidence=0.82,
            explanation_factors=["Single mild skin abrasion", "No systemic symptoms reported"],
            recommended_action="Clean abrasion with antiseptic and apply fly repellent.",
            notes="[DEMO DATA - Scenario 5: Successfully Synced] Created offline, synced automatically once connected to Wi-Fi."
        )
        db.add(obs5)
        db.flush()
        db.add(ObservationSymptom(observation_id=obs5.id, symptom_id=symptom_map["Skin changes"].id, symptom_name="Skin changes", severity="Mild"))

        # SCENARIO 6: Expert-reviewed observation (VALIDATED decision, timestamp metrics captured)
        fs_time = now - timedelta(hours=36)
        obs_time = now - timedelta(hours=30)
        sub_time = now - timedelta(hours=28)
        rev_start = now - timedelta(hours=24)
        rev_comp = now - timedelta(hours=23, minutes=45)

        obs6 = Observation(
            client_observation_id=str(uuid.uuid4()),
            recorded_by=farmer.id,
            animal_id=cow1.id,
            first_symptom_at=fs_time,
            observed_at=obs_time,
            submitted_at=sub_time,
            expert_review_started_at=rev_start,
            expert_review_completed_at=rev_comp,
            appetite_status="Refusing food",
            activity_status="Lying down, reluctant to rise",
            farm_location=cow1.farm_location,
            age_stage=cow1.age_stage,
            risk_level="HIGH",
            system_confidence=0.86,
            explanation_factors=["Severe breathing distress", "Fever and lethargy confirmed by expert"],
            recommended_action="Veterinary field intervention dispatched.",
            notes="[DEMO DATA - Scenario 6: Expert Reviewed & Validated] High risk case promptly examined by Dr. Amina Patel."
        )
        db.add(obs6)
        db.flush()
        db.add(ObservationSymptom(observation_id=obs6.id, symptom_id=symptom_map["Fever"].id, symptom_name="Fever", severity="Severe"))
        db.add(ObservationSymptom(observation_id=obs6.id, symptom_id=symptom_map["Abnormal breathing"].id, symptom_name="Abnormal breathing", severity="Severe"))

        rev6 = ExpertReview(
            observation_id=obs6.id,
            expert_id=expert.id,
            diagnosis="Suspected Acute Bovine Respiratory Disease",
            validation_status="VALIDATED",
            expert_decision="VALIDATED",
            system_risk_level="HIGH",
            system_confidence="0.86",
            modified_risk_level=None,
            comments="High risk case promptly examined and validated.",
            expert_notes="[DEMO DATA] Symptoms indicate acute bovine respiratory disease. Direct inspection arranged within 2 hours.",
            error_category=None,
            reviewed_at=rev_comp
        )
        db.add(rev6)

        # SCENARIO 7: Poor-image observation (Image quality POOR, warning triggered)
        obs7 = Observation(
            client_observation_id=str(uuid.uuid4()),
            recorded_by=farmer.id,
            animal_id=sheep1.id,
            first_symptom_at=now - timedelta(hours=10),
            observed_at=now - timedelta(hours=5),
            submitted_at=now - timedelta(hours=5),
            appetite_status="Normal",
            activity_status="Normal",
            farm_location=sheep1.farm_location,
            age_stage=sheep1.age_stage,
            risk_level="MEDIUM",
            system_confidence=0.55,
            explanation_factors=["Skin lesions suspected but image clarity low", "Quality warning generated"],
            recommended_action="Capture a clearer, well-lit photo of the affected skin area.",
            notes="[DEMO DATA - Scenario 7: Poor-Quality Image] Captured at dusk; image blurred and underexposed."
        )
        db.add(obs7)
        db.flush()
        db.add(Image(
            observation_id=obs7.id,
            storage_path="uploads/demo_blur_sheep.jpg",
            image_quality="POOR",
            quality_notes="Photo quality may be too low for reliable review (low contrast, blur detected)."
        ))

        # SCENARIO 8: Requires-more-information observation (Expert decision REQUIRES_MORE_INFORMATION)
        obs8 = Observation(
            client_observation_id=str(uuid.uuid4()),
            recorded_by=farmer.id,
            animal_id=goat1.id,
            first_symptom_at=now - timedelta(hours=20),
            observed_at=now - timedelta(hours=12),
            submitted_at=now - timedelta(hours=11),
            expert_review_started_at=now - timedelta(hours=8),
            expert_review_completed_at=now - timedelta(hours=7, minutes=50),
            appetite_status="Reduced",
            activity_status="Slow / lethargic",
            farm_location=goat1.farm_location,
            age_stage=goat1.age_stage,
            risk_level="MEDIUM",
            system_confidence=0.65,
            explanation_factors=["Mild lethargy with unspecified onset", "Insufficient visual evidence of lesions"],
            recommended_action="Submit close-up photograph of eye mucosa and take rectal temperature if possible.",
            notes="[DEMO DATA - Scenario 8: Requires More Information] Expert unable to confirm whether lethargy is nutritional or infectious."
        )
        db.add(obs8)
        db.flush()
        db.add(ObservationSymptom(observation_id=obs8.id, symptom_id=symptom_map["Reduced activity"].id, symptom_name="Reduced activity", severity="Mild"))

        rev8 = ExpertReview(
            observation_id=obs8.id,
            expert_id=expert.id,
            diagnosis="Inconclusive - Pending Clinical Vitals",
            validation_status="PENDING",
            expert_decision="REQUIRES_MORE_INFORMATION",
            system_risk_level="MEDIUM",
            system_confidence="0.65",
            modified_risk_level=None,
            comments="Requested rectal temperature reading and mucous membrane imagery.",
            expert_notes="[DEMO DATA] The current observations are ambiguous. Please provide temperature reading and re-check feeding behaviour.",
            error_category="SYMPTOM_AMBIGUITY",
            reviewed_at=now - timedelta(hours=7, minutes=50)
        )
        db.add(rev8)

        db.commit()
        logger.info("Successfully seeded all 8 realistic demo scenarios!")
        logger.info("Demo Farmer: demo_farmer@example.com / farmer123")
        logger.info("Demo Expert: demo_expert@example.com / expert123")
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding demo data: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_demo_data()
