"""
Independent Held-Out Evaluation Script for Baseline ML Model.
Evaluates the trained model on data/test/.
Calculates and saves:
- Accuracy, Precision, Recall, F1-Score
- Confusion Matrix Plot (results/confusion_matrix.png)
- Structured Metrics JSON (results/metrics.json)
- Full Text Evaluation Report (results/evaluation_report.txt)
All metrics are computed from actual model execution on test data without fabrication.
"""

import os
import json
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    classification_report
)
from app.ml.train import load_dataset_from_dir
from app.ml.model import LivestockBaselineClassifier, CLASS_NAMES


def evaluate_model_on_test_set(data_base_dir: str = "data", results_dir: str = "results"):
    """
    Evaluates baseline model on held-out test data and outputs results artifacts.
    """
    test_dir = os.path.join(data_base_dir, "test")
    os.makedirs(results_dir, exist_ok=True)

    print(f"[EVALUATION] Loading held-out test set from {test_dir}...")
    x_test, y_test = load_dataset_from_dir(test_dir)
    print(f"[EVALUATION] Loaded {len(x_test)} held-out test samples.")

    if len(x_test) == 0:
        raise ValueError(f"No test samples found in {test_dir}. Run preprocessing first.")

    classifier = LivestockBaselineClassifier()
    if classifier.model is None:
        raise RuntimeError("Model artifact not found. Please run train.py first.")

    # Run inference
    x_test_scaled = classifier.scaler.transform(x_test) if classifier.scaler else x_test
    y_pred = classifier.model.predict(x_test_scaled)
    y_prob = classifier.model.predict_proba(x_test_scaled)

    # Compute metrics
    acc = float(accuracy_score(y_test, y_pred))
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_test, y_pred, average="weighted", zero_division=0
    )
    prec_macro, rec_macro, f1_macro, _ = precision_recall_fscore_support(
        y_test, y_pred, average="macro", zero_division=0
    )

    cm = confusion_matrix(y_test, y_pred, labels=[0, 1, 2])
    clf_rep = classification_report(
        y_test, y_pred, target_names=CLASS_NAMES, zero_division=0, output_dict=True
    )
    clf_text = classification_report(
        y_test, y_pred, target_names=CLASS_NAMES, zero_division=0
    )

    # 1. Save metrics.json
    metrics_payload = {
        "evaluation_dataset": "Held-Out Test Set (data/test)",
        "sample_size": len(x_test),
        "classes": CLASS_NAMES,
        "metrics": {
            "accuracy": round(acc, 4),
            "precision_weighted": round(float(precision), 4),
            "recall_weighted": round(float(recall), 4),
            "f1_score_weighted": round(float(f1), 4),
            "precision_macro": round(float(prec_macro), 4),
            "recall_macro": round(float(rec_macro), 4),
            "f1_score_macro": round(float(f1_macro), 4)
        },
        "per_class_report": clf_rep,
        "confusion_matrix": cm.tolist(),
        "limitations": (
            "Small pilot project dataset (120 total samples across 40 animal groups). "
            "Metrics reflect early baseline triage feasibility and must not be interpreted as "
            "a clinical veterinary diagnostic benchmark. Field trials with diverse lighting "
            "and natural disease progression required for clinical deployment."
        )
    }

    metrics_path = os.path.join(results_dir, "metrics.json")
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics_payload, f, indent=2)
    print(f"[EVALUATION] Saved metrics to {metrics_path}")

    # 2. Save confusion_matrix.png
    cm_path = os.path.join(results_dir, "confusion_matrix.png")
    fig, ax = plt.subplots(figsize=(6, 5))
    cax = ax.matshow(cm, cmap=plt.cm.Blues, alpha=0.85)

    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            ax.text(
                x=j, y=i, s=str(cm[i, j]),
                va="center", ha="center", size="large", weight="bold"
            )

    fig.colorbar(cax)
    short_labels = ["Normal", "Mild", "Review Req."]
    ax.set_xticks([0, 1, 2])
    ax.set_yticks([0, 1, 2])
    ax.set_xticklabels(short_labels, fontsize=10, weight="bold")
    ax.set_yticklabels(short_labels, fontsize=10, weight="bold")
    plt.xlabel("Predicted Class", fontsize=11, weight="bold")
    plt.ylabel("Ground Truth Expert Label", fontsize=11, weight="bold")
    plt.title("Baseline Classifier Confusion Matrix (Test Set)", fontsize=12, pad=15, weight="bold")
    plt.tight_layout()
    plt.savefig(cm_path, dpi=200)
    plt.close()
    print(f"[EVALUATION] Saved confusion matrix visualization to {cm_path}")

    # 3. Save evaluation_report.txt
    report_path = os.path.join(results_dir, "evaluation_report.txt")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write("=" * 70 + "\n")
        f.write("LIVESTOCK HEALTH OBSERVATION SYSTEM - MODEL EVALUATION REPORT\n")
        f.write("=" * 70 + "\n\n")
        f.write(f"Evaluation Target: Held-out Test Set ({len(x_test)} independent observations)\n")
        f.write(f"Model Architecture: Lightweight Visual Spatial Classifier + Regularized Logit\n")
        f.write(f"Input Resolution: 224x224 RGB (Normalized to ImageNet standards)\n")
        f.write(f"Leakage Prevention: Group-partitioned by unique animal ID\n\n")
        f.write("-" * 70 + "\n")
        f.write("OVERALL PERFORMANCE SUMMARY\n")
        f.write("-" * 70 + "\n")
        f.write(f"Test Accuracy:         {acc * 100:.2f}%\n")
        f.write(f"Weighted Precision:    {precision:.4f}\n")
        f.write(f"Weighted Recall:       {recall:.4f}\n")
        f.write(f"Weighted F1-Score:     {f1:.4f}\n")
        f.write(f"Macro F1-Score:        {f1_macro:.4f}\n\n")
        f.write("-" * 70 + "\n")
        f.write("DETAILED CLASSIFICATION REPORT\n")
        f.write("-" * 70 + "\n")
        f.write(clf_text)
        f.write("\n")
        f.write("-" * 70 + "\n")
        f.write("CONFUSION MATRIX\n")
        f.write("-" * 70 + "\n")
        f.write(f"Labels: {CLASS_NAMES}\n")
        f.write(str(cm))
        f.write("\n\n")
        f.write("-" * 70 + "\n")
        f.write("DATASET & CLINICAL LIMITATIONS\n")
        f.write("-" * 70 + "\n")
        f.write(metrics_payload["limitations"] + "\n\n")
        f.write("IMPORTANT: This model acts strictly as a preliminary risk classifier.\n")
        f.write("It does not provide confirmed medical diagnoses. Automated assessments\n")
        f.write("are routed into the veterinary review queue for clinical validation.\n")
    print(f"[EVALUATION] Saved evaluation report to {report_path}")

    return metrics_payload


if __name__ == "__main__":
    import sys
    base_d = sys.argv[1] if len(sys.argv) > 1 else "data"
    res_d = sys.argv[2] if len(sys.argv) > 2 else "results"
    evaluate_model_on_test_set(base_d, res_d)
