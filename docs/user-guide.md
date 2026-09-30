# Farmer & User Guide
### Livestock Health Observation & Expert Escalation System

A simple, practical guide designed for smallholder farmers and pastoralists.

---

## 1. How to Log In

1. Open your mobile browser and navigate to the application address.
2. Tap **"Login"**.
3. Enter your registered email address and password:
   - **Demo Farmer Account**: `demo_farmer@example.com` / password: `farmer123`
   - **Demo Expert Account**: `demo_expert@example.com` / password: `expert123`
4. Tap **"Sign In"**. You will be taken directly to your livestock dashboard.

> **Tip**: You can add this website to your smartphone's home screen by tapping the browser menu (three dots) and choosing **"Install app"** or **"Add to Home Screen"**. It will work like a normal mobile app!

---

## 2. How to Create an Observation

1. From your **Farmer Dashboard**, tap the green button **"Record New Observation"**.
2. **Step 1: Choose Animal**: Select the ear tag or name of the animal you are checking (for example, `TAG-COW-101`). If this is a new animal, tap **"Register Animal"** first.
3. Tap **"Next Step"**.

---

## 3. How to Record Symptoms & Times

1. **When did you first notice symptoms?**: Select the date and time when the animal first started looking unwell. This helps the veterinarian know how fast the illness is developing.
2. **Select Symptoms**: Tap all symptoms you see on the animal (for example: *Coughing*, *Fever*, *Reduced appetite*, or *Skin changes*).
3. **Severity & Duration**:
   - Tap **Mild**, **Moderate**, or **Severe** for each symptom.
   - Choose how long it has lasted (e.g. *Less than 1 day*, *1–3 days*).
4. **Vital Signs**: If you checked body temperature, type it in (normal cattle temperature is 38.5°C to 39.3°C).
5. **Eating & Energy**: Tap whether the animal is eating normally or refusing feed, and whether it is active or lying down.
6. Tap **"Next Step"**.

---

## 4. How to Capture an Image

A clear photograph helps the veterinarian give you the best advice:

1. Tap **"Take Photo"** or **"Upload Photo"**.
2. **Where to photograph**: Point your camera closely at the affected part (e.g., eye mucosa, runny nose, swollen leg, or skin lesion).
3. **Lighting**: Take the photo in good daylight. Avoid harsh shadows or dark evening barns.
4. **Privacy**: Keep human faces and bystanders out of the picture. Only the animal needs to be photographed.
5. The application will automatically shrink the photo to save your phone battery and data bundles.

---

## 5. What to Do When Image Quality is Poor

If the photo was taken in low light or while the animal moved:
- The screen will show an orange alert:  
  **"Photo quality may be too low for reliable review."**
- **Action**: Tap **"Retake Photo"**. Wipe your camera lens, stand in better light, and hold the phone steady for 2 seconds.
- If you cannot take another photo, you can still submit the form, and the system will advise an in-person veterinary checkup.

---

## 6. How to Understand Risk Levels

Once you submit your checkup, the system gives you an immediate preliminary rating:

| Risk Level | What It Means | What You Should Do |
| :--- | :--- | :--- |
| **LOW (Green)** | The animal shows normal vitality or minor scratches. | Continue normal daily feeding and standard herd care. |
| **MEDIUM (Amber)** | Mild distress or early illness signs noticed. | Check on the animal twice daily. Ensure clean drinking water and shelter. |
| **HIGH (Red)** | Severe symptoms or fever detected (possible contagious illness). | **Isolate the animal immediately** from pregnant cows and calves. The case is automatically sent to the veterinary officer. |
| **REVIEW REQUIRED (Purple)** | The system is unsure or image confidence is low. | Do not panic. The case is forwarded for expert review. |

> **Remember**: Automated results are for guidance and *not* a final veterinary prescription. Never give antibiotics without consulting a veterinary professional.

---

## 7. What Happens When System Confidence is Low

If lighting was poor or symptoms are unusual:
- The system will say:  
  **"Expert review recommended because system confidence is low."**
- The system will **never** guess or give false reassurance when it is not confident.
- The case is safely flagged for the veterinary officer to inspect manually.

---

## 8. How Expert Review Works

1. High-risk and low-confidence cases appear immediately in the **Veterinary Expert Queue**.
2. A veterinary doctor opens the case on their tablet or computer.
3. The doctor inspects your reported symptoms, duration, temperature, and photographs.
4. The doctor writes guidance notes (e.g. *"Isolate for 48 hours, offer shade and electrolytes; officer dispatched tomorrow morning"*).
5. Your dashboard updates with a green checkmark: **"Reviewed by Veterinarian"** showing the doctor's name and instructions.

---

## 9. How to Use Offline Mode in the Pastures

When herding animals in hills or valleys without any mobile internet:

1. You can open the application normally (it loads directly from your phone's memory).
2. Tap **"Record New Observation"**, select your animal, pick symptoms, and take a photo.
3. Tap **"Save Offline"**.
4. The phone saves everything safely inside your phone storage (IndexedDB).
5. A banner will appear:  
   **"Saved offline. Will sync automatically when connected."**
6. You can close the app or turn off your phone. Nothing will be lost!

---

## 10. How Synchronization Works

1. When you walk back to the village or homestead where cellular signal returns:
2. The phone detects the connection automatically.
3. In the background, the app securely sends your saved observations and photos to the server.
4. If the connection drops halfway through, the app simply pauses and tries again automatically without creating duplicates.
5. You can also tap the **"Sync Now"** button anytime to upload immediately.
