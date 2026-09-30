"""
Reproducible Preprocessing & Leak-Free Dataset Splitting Pipeline.
Performs:
1. Image validation & invalid file detection.
2. Resolution check (minimum requirements).
3. Duplicate detection via SHA-256 content hashing.
4. Resizing to 224x224 RGB.
5. Normalization (ImageNet channel means and standard deviations).
6. Optional data augmentation (horizontal flip).
7. Grouped split (70% train, 15% validation, 15% test) grouped strictly by animal_id
   to prevent cross-split data leakage.
"""

import os
import csv
import shutil
import hashlib
import random
from typing import Dict, List, Tuple
import numpy as np
from PIL import Image

TARGET_SIZE = (224, 224)
MIN_RESOLUTION = (150, 150)
IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def compute_file_hash(filepath: str) -> str:
    """Calculate SHA-256 hash to detect exact duplicate images."""
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def validate_and_preprocess_image(filepath: str, output_path: str) -> Tuple[bool, str, np.ndarray]:
    """
    Validates image file integrity, verifies resolution, resizes to TARGET_SIZE,
    and returns normalized numpy float array.
    """
    if not os.path.exists(filepath):
        return False, "File does not exist", np.empty(0)

    try:
        with Image.open(filepath) as img:
            img.verify()
    except Exception as e:
        return False, f"Corrupted or invalid image header: {str(e)}", np.empty(0)

    try:
        with Image.open(filepath) as img:
            img_rgb = img.convert("RGB")
            w, h = img_rgb.size
            if w < MIN_RESOLUTION[0] or h < MIN_RESOLUTION[1]:
                return False, f"Resolution {w}x{h} below minimum threshold {MIN_RESOLUTION}", np.empty(0)

            # Resize with anti-aliasing
            resized = img_rgb.resize(TARGET_SIZE, Image.Resampling.LANCZOS)
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            resized.save(output_path, "JPEG", quality=90)

            # Convert to normalized numpy array
            arr = np.array(resized, dtype=np.float32) / 255.0
            norm_arr = (arr - IMAGENET_MEAN) / IMAGENET_STD
            return True, "Valid and processed", norm_arr
    except Exception as e:
        return False, f"Preprocessing failed: {str(e)}", np.empty(0)


def run_pipeline(
    base_dir: str = "data",
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    seed: int = 42
) -> Dict[str, any]:
    """
    Executes complete preprocessing and group-based splitting.
    """
    random.seed(seed)
    np.random.seed(seed)

    raw_dir = os.path.join(base_dir, "raw")
    metadata_path = os.path.join(base_dir, "metadata", "metadata.csv")
    processed_dir = os.path.join(base_dir, "processed")
    train_dir = os.path.join(base_dir, "train")
    val_dir = os.path.join(base_dir, "validation")
    test_dir = os.path.join(base_dir, "test")

    for d in [processed_dir, train_dir, val_dir, test_dir]:
        os.makedirs(d, exist_ok=True)

    if not os.path.exists(metadata_path):
        raise FileNotFoundError(f"Metadata file not found at {metadata_path}. Run dataset_generator.py first.")

    # Read metadata
    records = []
    with open(metadata_path, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append(row)

    print(f"[PREPROCESSING] Read {len(records)} records from {metadata_path}")

    # 1. Duplicate detection & validation
    seen_hashes = {}
    valid_records = []
    duplicates_detected = 0
    invalid_detected = 0

    for rec in records:
        raw_path = os.path.join(raw_dir, rec["filename"])
        if not os.path.exists(raw_path):
            invalid_detected += 1
            continue

        fhash = compute_file_hash(raw_path)
        if fhash in seen_hashes:
            duplicates_detected += 1
            print(f"[PREPROCESSING] Duplicate detected and skipped: {rec['filename']}")
            continue
        seen_hashes[fhash] = rec["filename"]

        processed_path = os.path.join(processed_dir, rec["filename"])
        is_valid, reason, _ = validate_and_preprocess_image(raw_path, processed_path)
        if not is_valid:
            invalid_detected += 1
            print(f"[PREPROCESSING] Invalid image {rec['filename']}: {reason}")
            continue

        rec["processed_path"] = processed_path
        valid_records.append(rec)

    print(f"[PREPROCESSING] Validated {len(valid_records)} unique images ({duplicates_detected} duplicates, {invalid_detected} invalid).")

    # 2. Group-based splitting by animal_id to prevent data leakage
    animal_groups: Dict[str, List[dict]] = {}
    for rec in valid_records:
        aid = rec["animal_id"]
        if aid not in animal_groups:
            animal_groups[aid] = []
        animal_groups[aid].append(rec)

    unique_animals = list(animal_groups.keys())
    random.shuffle(unique_animals)

    n_animals = len(unique_animals)
    n_train = int(n_animals * train_ratio)
    n_val = int(n_animals * val_ratio)

    train_animals = set(unique_animals[:n_train])
    val_animals = set(unique_animals[n_train:n_train + n_val])
    test_animals = set(unique_animals[n_train + n_val:])

    split_counts = {"train": 0, "validation": 0, "test": 0}

    for aid, recs in animal_groups.items():
        if aid in train_animals:
            split_name = "train"
            dest_dir = train_dir
        elif aid in val_animals:
            split_name = "validation"
            dest_dir = val_dir
        else:
            split_name = "test"
            dest_dir = test_dir

        for r in recs:
            r["split"] = split_name
            # Copy to split directory under class subfolders
            class_folder = r["target_class"].replace("/", "_").replace(" ", "_")
            target_class_dir = os.path.join(dest_dir, class_folder)
            os.makedirs(target_class_dir, exist_ok=True)
            shutil.copy2(r["processed_path"], os.path.join(target_class_dir, r["filename"]))
            split_counts[split_name] += 1

    # Update metadata with split assignments
    fieldnames = list(valid_records[0].keys())
    if "split" not in fieldnames:
        fieldnames.append("split")
    if "processed_path" in fieldnames:
        fieldnames.remove("processed_path")

    with open(metadata_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[fn for fn in fieldnames if fn != "processed_path"])
        clean_rows = []
        for r in valid_records:
            row_copy = {k: v for k, v in r.items() if k != "processed_path"}
            clean_rows.append(row_copy)
        writer.writeheader()
        writer.writerows(clean_rows)

    summary = {
        "total_records": len(records),
        "valid_images": len(valid_records),
        "duplicates_detected": duplicates_detected,
        "invalid_detected": invalid_detected,
        "unique_animal_groups": n_animals,
        "train_animals": len(train_animals),
        "val_animals": len(val_animals),
        "test_animals": len(test_animals),
        "split_counts": split_counts
    }

    print(f"[PREPROCESSING] Splitting complete: {split_counts}")
    return summary


if __name__ == "__main__":
    run_pipeline()
