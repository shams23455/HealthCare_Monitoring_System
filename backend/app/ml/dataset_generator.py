"""
Ethical Dataset Generator for Livestock Health Observation System.
Generates project-created, non-identifiable livestock imagery (cattle, sheep, goats)
with synthetic clinical health manifestations (healthy, mild distress, acute/review required).
Contains strictly NO human faces, NO personally identifiable information (PII), and anonymized IDs.
"""

import os
import csv
import uuid
import random
import hashlib
from datetime import datetime, timezone
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# Deterministic seed for scientific reproducibility
RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

SPECIES_LIST = ["Cattle", "Sheep", "Goat", "Buffalo"]
STAGES = ["Adult", "Young", "Calf/Kid", "Senior"]
REGIONS = ["Northern Valley", "Highland Pasture", "Eastern Basin", "Southern Plains", "Western Range"]
QUALITIES = ["GOOD", "ACCEPTABLE", "POOR"]

# Clinical categories for baseline classification
CLASSES = [
    {
        "label": "Normal/Healthy",
        "symptoms": "none",
        "expert_label": "Healthy - No Action Needed",
        "risk": "LOW",
        "base_color": (160, 120, 80),   # Healthy natural coat
        "lesion_prob": 0.0
    },
    {
        "label": "Mild Distress",
        "symptoms": "coughing; reduced appetite",
        "expert_label": "Mild Respiratory Distress",
        "risk": "MEDIUM",
        "base_color": (140, 110, 75),
        "lesion_prob": 0.35
    },
    {
        "label": "Requires Expert Review",
        "symptoms": "fever; nasal discharge; skin changes; swelling",
        "expert_label": "Suspected Acute Infectious Condition - Immediate Review",
        "risk": "HIGH",
        "base_color": (120, 95, 70),
        "lesion_prob": 0.85
    }
]


def create_synthetic_livestock_image(
    category_info: dict,
    species: str,
    quality: str,
    output_path: str,
    width: int = 400,
    height: int = 400
) -> dict:
    """
    Generate a non-identifiable visual representation of livestock coat/tissue
    with realistic texture, shading, and symptomatic manifestations.
    """
    # Base background coat texture with perlin-like gradient noise
    base_rgb = category_info["base_color"]
    arr = np.zeros((height, width, 3), dtype=np.uint8)

    # Gradient pasture background top/bottom
    for y in range(height):
        ratio = y / height
        r = int(base_rgb[0] * (0.8 + 0.4 * ratio) + np.random.randint(-15, 15))
        g = int(base_rgb[1] * (0.8 + 0.3 * ratio) + np.random.randint(-15, 15))
        b = int(base_rgb[2] * (0.8 + 0.2 * ratio) + np.random.randint(-15, 15))
        arr[y, :, 0] = np.clip(r, 0, 255)
        arr[y, :, 1] = np.clip(g, 0, 255)
        arr[y, :, 2] = np.clip(b, 0, 255)

    img = Image.fromarray(arr, mode="RGB")
    draw = ImageDraw.Draw(img)

    # Add animal coat patches/hair fiber texture
    for _ in range(35):
        cx = random.randint(30, width - 30)
        cy = random.randint(30, height - 30)
        rad = random.randint(20, 80)
        patch_color = (
            np.clip(base_rgb[0] + random.randint(-40, 40), 20, 240),
            np.clip(base_rgb[1] + random.randint(-40, 40), 20, 240),
            np.clip(base_rgb[2] + random.randint(-40, 40), 20, 240),
        )
        draw.ellipse([cx - rad, cy - rad, cx + rad, cy + rad], fill=patch_color)

    # Symptom-specific visual indicators (lesions, discharge, swelling patterns)
    if random.random() < category_info["lesion_prob"]:
        lesion_count = random.randint(2, 5)
        for _ in range(lesion_count):
            lx = random.randint(80, width - 80)
            ly = random.randint(80, height - 80)
            lrad = random.randint(15, 45)
            # Erythema / inflamed skin lesion appearance (reddish-pink / purulent)
            lesion_fill = (
                random.randint(180, 230),
                random.randint(60, 110),
                random.randint(60, 100)
            )
            draw.ellipse([lx - lrad, ly - lrad, lx + lrad, ly + lrad], fill=lesion_fill)
            # Core scab / swelling ring
            draw.ellipse([lx - lrad // 2, ly - lrad // 2, lx + lrad // 2, ly + lrad // 2], fill=(130, 40, 40))

    # Apply blur for natural tissue appearance
    img = img.filter(ImageFilter.GaussianBlur(radius=random.uniform(1.2, 2.5)))

    # Quality degradation simulation for POOR quality test cases
    if quality == "POOR":
        # Simulates motion blur or defocus in rural conditions
        img = img.filter(ImageFilter.GaussianBlur(radius=random.uniform(4.5, 7.0)))
        # Reduce resolution then upscale to introduce pixelation
        small = img.resize((64, 64), resample=Image.NEAREST)
        img = small.resize((width, height), resample=Image.BILINEAR)

    img.save(output_path, "JPEG", quality=85 if quality != "POOR" else 45)
    return {"width": width, "height": height}


def generate_ethical_dataset(base_dir: str = "data", num_samples: int = 120):
    """
    Generate raw dataset and metadata.csv adhering to privacy & ethical standards.
    """
    raw_dir = os.path.join(base_dir, "raw")
    metadata_dir = os.path.join(base_dir, "metadata")
    os.makedirs(raw_dir, exist_ok=True)
    os.makedirs(metadata_dir, exist_ok=True)

    metadata_path = os.path.join(metadata_dir, "metadata.csv")

    # Distinct animals to ensure group-splitting without data leakage
    num_animals = 40
    animals = [f"ANON-ANIMAL-{hashlib.sha256(str(i).encode()).hexdigest()[:8].upper()}" for i in range(num_animals)]

    records = []
    print(f"[DATASET] Generating {num_samples} ethical livestock health samples...")

    for i in range(num_samples):
        img_uuid = uuid.uuid4().hex
        image_id = f"IMG-{img_uuid[:12].upper()}"
        animal_id = animals[i % num_animals]
        species = random.choice(SPECIES_LIST)
        stage = random.choice(STAGES)
        region = random.choice(REGIONS)

        # Distribute classes: 40% Normal, 30% Mild Distress, 30% Requires Expert Review
        r_val = random.random()
        if r_val < 0.40:
            cat = CLASSES[0]
            quality = random.choices(["GOOD", "ACCEPTABLE", "POOR"], weights=[0.8, 0.15, 0.05])[0]
        elif r_val < 0.70:
            cat = CLASSES[1]
            quality = random.choices(["GOOD", "ACCEPTABLE", "POOR"], weights=[0.7, 0.20, 0.10])[0]
        else:
            cat = CLASSES[2]
            quality = random.choices(["GOOD", "ACCEPTABLE", "POOR"], weights=[0.6, 0.25, 0.15])[0]

        filename = f"{image_id}.jpg"
        filepath = os.path.join(raw_dir, filename)

        create_synthetic_livestock_image(
            category_info=cat,
            species=species,
            quality=quality,
            output_path=filepath
        )

        record = {
            "image_id": image_id,
            "filename": filename,
            "animal_id": animal_id,
            "species": species,
            "symptoms": cat["symptoms"],
            "animal_stage": stage,
            "location_region": region,
            "image_quality": quality,
            "target_class": cat["label"],
            "expert_label": cat["expert_label"],
            "risk_level": cat["risk"],
            "source_type": "PROJECT_SYNTHESIS_STANDIN",
            "consent_status": "EXEMPT_NON_HUMAN_ANIMAL_STUDY",
            "anonymization_status": "STRICT_ANONYMIZED_NO_PII",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        records.append(record)

    fieldnames = [
        "image_id", "filename", "animal_id", "species", "symptoms",
        "animal_stage", "location_region", "image_quality", "target_class",
        "expert_label", "risk_level", "source_type", "consent_status",
        "anonymization_status", "created_at"
    ]

    with open(metadata_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    print(f"[DATASET] Successfully saved metadata to {metadata_path} ({len(records)} records).")
    return records


if __name__ == "__main__":
    generate_ethical_dataset()
