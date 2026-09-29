# AI/ML Architecture & Roadmap

## 1. Architectural Philosophy & Disclaimer
**The system does NOT claim to provide an automated medical disease diagnosis.**
Furthermore, at this project stage, **no machine learning model is claimed to be in production or pre-trained.** The current operational engine is a transparent, deterministic rule-based evaluation baseline (`RuleBasedRiskEngine`).

This document details the software architecture, abstraction layers, and comparison models designed to allow seamless drop-in integration of trained machine learning models in future phases without rewriting the core application.

---

## 2. Pluggable Risk Engine Architecture

The backend implements the Strategy pattern through an abstract base class in `backend/app/core/risk.py`:

```
                 +----------------------------+
                 |    RiskAssessmentEngine    |
                 |----------------------------|
                 | + assess(input) -> Result  |
                 +--------------+-------------+
                                ^
         +----------------------+----------------------+
         |                                             |
+---------------------+                       +---------------------+
| RuleBasedRiskEngine |                       |  MLModelRiskEngine  |
|---------------------|                       |---------------------|
| - Clinical rules    |                       | - Feature extraction|
| - Vital thresholds  |                       | - Model weights     |
| - Transparent logic |                       | - Model adapter     |
+----------+----------+                       +----------+----------+
           \                                             /
            \         +------------------------+        /
             +------->|    HybridRiskEngine    |<------+
                      |------------------------|
                      | - ML probability       |
                      | - Rule-based safety net|
                      +------------------------+
```

### Engine Implementations:
1. **`RuleBasedRiskEngine` (Current Operational Baseline)**:
   - Evaluates structured clinical symptoms, duration, age stage, and vital indicators.
   - Calculates rule-based risk levels (`LOW`, `MEDIUM`, `HIGH`, `UNKNOWN`).
   - Produces farmer-friendly explanation factors (e.g., *"Elevated body temperature combined with respiratory distress"*).
2. **`MLModelRiskEngine` (Future Integration Point)**:
   - Designed to load quantized model weights (e.g. MobileNetV3 / EfficientNet-Lite).
   - Generates normalized probability distributions across disease categories.
   - Formats predictions into the standardized `RiskAssessmentResult`.
3. **`HybridRiskEngine` (Recommended Production Design)**:
   - Employs ML predictions for pattern recognition while strictly applying rule-based clinical safety nets (e.g. if respiratory rate is severely compromised, risk is escalated regardless of model classification).

---

## 3. Future ML Processing Pipeline

```
[Field Photo Captured]
          |
          v
[Image Preprocessing & Normalization]
(Resolution resize 224x224, EXIF strip, color normalization, contrast check)
          |
          v
[Lightweight ML Inference Engine]
(Predict disease class probabilities + confidence score)
          |
          v
[Rule Safety Intercept]
(Ensure acute symptoms override benign visual classifications)
          |
          v
[Confidence & Farmer-Friendly Explanation Generation]
(Generate non-technical factors: "Why this needs attention")
          |
          v
[Expert Review & Validation Queue]
(Veterinarian validates, modifies, or marks inconclusive)
          |
          v
[Systematic Error Analysis & Continuous Learning Loop]
(Categorized errors feed back into retraining dataset)
```

---

## 4. Architectural Comparison: Edge Inference vs Cloud Inference

| Consideration | Option A: Lightweight Edge Inference (ONNX / TFLite in PWA) | Option B: Cloud-Based Inference (FastAPI Server / GPU Worker) | Selected Project Path |
| :--- | :--- | :--- | :--- |
| **Network Dependency** | **Zero**. Works completely offline in the middle of remote pastures. | **High**. Requires cellular/Wi-Fi to upload image before receiving assessment. | **Edge preferred for low-resource rural farms.** |
| **Farmer Latency** | **Immediate** (< 300 ms on modern mobile browsers via WebAssembly/WebGPU). | **High** (3–30 seconds depending on 2G/3G cellular bandwidth). | Edge provides instantaneous feedback. |
| **Model Size Constraint** | Strict limit (< 15–25 MB) to avoid degrading PWA download times. | Flexible (Large models, Vision Transformers, multi-modal ensembles). | Edge models must be aggressively quantized. |
| **Hardware Constraints** | Constrained by low-end Android smartphones common among rural farmers. | Server-grade compute resources. | Edge models require EfficientNet-Lite or MobileNet architectures. |
| **Privacy** | High. Photos analyzed locally before transmission. | Server logs and processes images in transit. | Edge minimizes transmission of raw visuals. |

### Architectural Conclusion:
The target architecture adopts a **Hybrid Edge-First strategy**:
- Initial triage and preliminary risk scoring run on-device via lightweight edge adapters where supported.
- Comprehensive veterinary escalation, longitudinal analysis, and aggregate analytics run in the cloud upon synchronization.

---

## 5. Model Continuous Improvement Loop
To prevent dataset drift and systematic misclassification, the architecture incorporates the expert feedback loop:
1. Every expert modification (`MODIFIED`) or classification of an error (`error_category`) is persisted alongside original system predictions.
2. Anonymized records (`/api/metrics/dataset/images`) export validated images and clinical tags with zero personally identifiable farmer data.
3. Retrained model candidates must undergo offline evaluation against the expert validation ground truth before deployment.
