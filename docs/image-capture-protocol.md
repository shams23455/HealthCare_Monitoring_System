# Field Image Capture Protocol

## 1. Overview
High-quality, standardized visual records are indispensable for remote veterinary triage. Low-resolution, blurry, or poorly framed photographs impair an expert's ability to assess clinical indicators (e.g. eye discharge, skin lesions, swelling).

This protocol outlines mandatory standards and mobile guidance for farmers capturing photographs in pasture or stall environments.

---

## 2. Image Capture Standards

| Parameter | Standard Guideline | Rationale |
| :--- | :--- | :--- |
| **Distance** | **1.0 – 2.0 meters** for whole animal; **0.3 – 0.5 meters** for localized lesions/eyes. | Avoids digital zoom distortion while capturing adequate anatomical context. |
| **Orientation** | **Landscape** preferred for broadside body stance; **Portrait** acceptable for head/facial shots. | Maximizes the sensor area capturing the animal. |
| **Lighting** | **Natural daylight** (morning or late afternoon). Avoid direct harsh backlighting. In stalls, face the light source toward the animal. | Backlighting silhouettes the animal, obscuring skin and eye features. |
| **Focus & Stability**| Rest elbows against torso or brace against a rail. Tap screen to lock focus on the affected region. | Minimizes motion blur caused by animal movement. |
| **Subject Framing** | Center the animal or affected organ. Ensure the animal occupies at least **60% of the frame**. | Excludes irrelevant barn background and maximizes diagnostic pixel density. |
| **Multiple Views** | 1. **Broadside Body View** (standing stance, posture, abdominal distension)<br>2. **Close-Up View** (head/eyes/muzzle or lesion site) | Provides both systemic context and granular pathology details. |

---

## 3. Real-Time Farmer Guidance Prompts
The application displays progressive, intuitive prompts on the camera interface:

> 📸 **"Keep the animal clearly visible."**  
> Ensure the animal is standing in open space without obstructions.

> ☀️ **"Use good lighting if possible."**  
> Position yourself with the sun or lamp behind you, illuminating the subject.

> 🫱 **"Keep the camera steady."**  
> Pause for one second before tapping capture to ensure sharp focus.

> 🔍 **"Capture the affected area clearly."**  
> If an udder, hoof, or eye is swollen, take a close-up photo within arm's reach.

---

## 4. Automated Image Quality Check

Before storing or queuing an image for synchronization, the application executes a two-tier quality check (client-side in PWA, validated on backend):

### Quality Thresholds:
1. **Dimensions**: Minimum $800 \times 600$ px for whole body ($300 \times 300$ px absolute floor).
2. **File Size**: Between $50\text{ KB}$ and $10\text{ MB}$ (automatically compressed on device to $\sim 400\text{ KB}$).
3. **Contrast & Blur**: Evaluated via pixel luminance variance.

### Quality Status Ratings:
- 🟢 **`GOOD`**: Sharp focus, adequate resolution, balanced exposure. Ready for high-confidence review.
- 🟡 **`ACCEPTABLE`**: Minor blur or suboptimal lighting, but anatomical features remain discernable.
- 🔴 **`POOR`**: Significant motion blur, underexposure, or extreme low resolution. 

> [!WARNING]
> If an image is flagged as **`POOR`**, the application displays:  
> **"Photo quality may be too low for reliable review. Please capture another photo if possible."**  
> The system does **NOT** automatically infer disease from poor-quality photographs.
