"""
Training script for the lightweight livestock image baseline classifier.
Trains on data/train/, evaluates on data/validation/, and saves the model artifact.
"""

import os
import glob
import joblib
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, accuracy_score
from app.ml.model import extract_lightweight_visual_features, CLASS_NAMES, MODEL_ARTIFACT_PATH


def load_dataset_from_dir(dataset_dir: str):
    """
    Loads images organized by class subfolders.
    """
    x_features = []
    y_labels = []

    for class_idx, class_name in enumerate(CLASS_NAMES):
        folder_pattern = class_name.replace("/", "_").replace(" ", "_")
        class_dir = os.path.join(dataset_dir, folder_pattern)
        if not os.path.exists(class_dir):
            # Try plain class name
            class_dir = os.path.join(dataset_dir, class_name)

        if not os.path.exists(class_dir):
            continue

        img_files = glob.glob(os.path.join(class_dir, "*.jpg")) + glob.glob(os.path.join(class_dir, "*.png"))
        for fpath in img_files:
            try:
                feat = extract_lightweight_visual_features(fpath)
                x_features.append(feat)
                y_labels.append(class_idx)
            except Exception as e:
                print(f"[TRAIN] Skipping {fpath}: {e}")

    return np.array(x_features, dtype=np.float32), np.array(y_labels, dtype=np.int32)


def train_baseline_model(data_base_dir: str = "data"):
    """
    Fits scaler and classifier on training set and validates on validation set.
    """
    train_dir = os.path.join(data_base_dir, "train")
    val_dir = os.path.join(data_base_dir, "validation")

    print(f"[TRAIN] Loading training samples from {train_dir}...")
    x_train, y_train = load_dataset_from_dir(train_dir)
    print(f"[TRAIN] Loaded {len(x_train)} training instances.")

    print(f"[TRAIN] Loading validation samples from {val_dir}...")
    x_val, y_val = load_dataset_from_dir(val_dir)
    print(f"[TRAIN] Loaded {len(x_val)} validation instances.")

    if len(x_train) == 0:
        raise ValueError(f"No training data found in {train_dir}. Please run dataset_generator and preprocessing.")

    scaler = StandardScaler()
    x_train_scaled = scaler.fit_transform(x_train)
    x_val_scaled = scaler.transform(x_val) if len(x_val) > 0 else None

    # Calibrated lightweight Logistic Regression with L2 regularization
    model = LogisticRegression(
        C=1.0,
        max_iter=1000,
        solver="lbfgs",
        random_state=42
    )
    model.fit(x_train_scaled, y_train)

    train_acc = accuracy_score(y_train, model.predict(x_train_scaled))
    print(f"[TRAIN] Training Accuracy: {train_acc * 100:.1f}%")

    if x_val_scaled is not None and len(x_val) > 0:
        val_preds = model.predict(x_val_scaled)
        val_acc = accuracy_score(y_val, val_preds)
        print(f"[TRAIN] Validation Accuracy: {val_acc * 100:.1f}%")

    # Save artifact
    os.makedirs(os.path.dirname(MODEL_ARTIFACT_PATH), exist_ok=True)
    bundle = {
        "model": model,
        "scaler": scaler,
        "classes": CLASS_NAMES,
        "train_samples": len(x_train),
        "val_samples": len(x_val),
        "train_accuracy": float(train_acc)
    }
    joblib.dump(bundle, MODEL_ARTIFACT_PATH)
    print(f"[TRAIN] Successfully exported trained model artifact to {MODEL_ARTIFACT_PATH}")
    return bundle


if __name__ == "__main__":
    import sys
    base_d = sys.argv[1] if len(sys.argv) > 1 else "data"
    train_baseline_model(base_d)
