# LabTrack — Blood Lab Tracker (Google Drive Edition)

A password-protected Progressive Web App that stores your blood lab results in your own Google Drive. Sign in from any device and your full history is there.

---

## How it works

- You sign in with Google — no separate account needed
- LabTrack creates a **LabTrack/** folder in your Drive
- Your parsed lab data is stored as `LabTrack/labtrack-data.json`
- When you upload a CSV, the raw file is also saved to `LabTrack/` so you always have the originals
- The app only has access to files **it creates** — it cannot see the rest of your Drive

---

## Setup (one-time, ~10 minutes)

### Step 1 — Get the code onto GitHub Pages

1. Create a new GitHub repo (can be private)
2. Upload all files from this zip to the repo root
3. Go to **Settings → Pages → Deploy from branch → main / root**
4. Note your URL: `https://YOUR_USERNAME.github.io/YOUR_REPO/`

### Step 2 — Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown (top left) → **New Project**
3. Name it anything, e.g. `LabTrack` → **Create**
4. Make sure the new project is selected in the dropdown

### Step 3 — Enable the Google Drive API

1. In the left sidebar, go to **APIs & Services → Library**
2. Search for **Google Drive API** → click it → **Enable**

### Step 4 — Create an API Key

1. Go to **APIs & Services → Credentials**
2. Click **+ Create Credentials → API key**
3. Copy the key — you'll need it in a moment
4. Click **Edit API key** (pencil icon):
   - Under **API restrictions**, select **Restrict key**
   - Choose **Google Drive API**
   - Under **Website restrictions** → **HTTP referrers** → add your GitHub Pages URL:
     ```
     https://YOUR_USERNAME.github.io/*
     ```
   - Save

### Step 5 — Create an OAuth 2.0 Client ID

1. Still on **Credentials** → **+ Create Credentials → OAuth client ID**
2. If prompted, click **Configure Consent Screen** first:
   - Choose **External** → **Create**
   - App name: `LabTrack`
   - User support email: your email
   - Developer contact: your email
   - Click **Save and Continue** through all steps
   - On the **Test users** page, add your own Google email
   - Submit
3. Back on Credentials → **+ Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Name: `LabTrack`
   - Under **Authorized JavaScript origins**, add:
     ```
     https://YOUR_USERNAME.github.io
     ```
   - Click **Create**
4. Copy the **Client ID** (looks like `12345678.apps.googleusercontent.com`)

### Step 6 — Fill in config.js

Open `config.js` and replace the placeholder values:

```javascript
const CONFIG = {
  CLIENT_ID: '12345678-abc.apps.googleusercontent.com',  // ← your OAuth Client ID
  API_KEY: 'AIzaSyABC123...',                             // ← your API Key
  SCOPES: 'https://www.googleapis.com/auth/drive.file',
  DRIVE_FOLDER_NAME: 'LabTrack',
  DATA_FILE_NAME: 'labtrack-data.json',
};
```

### Step 7 — Push and test

1. Commit and push the updated `config.js` to GitHub
2. Wait ~1 minute for Pages to deploy
3. Open your GitHub Pages URL
4. Click **Sign in with Google**
5. Approve the permissions (Drive file access only)
6. You're in — import a CSV to get started

---

## CSV format

| date       | test_name         | value | unit   |
|------------|-------------------|-------|--------|
| 2024-03-15 | Glucose           | 95    | mg/dL  |
| 2024-03-15 | LDL               | 118   | mg/dL  |
| 2024-09-20 | Vitamin D         | 32    | ng/mL  |

- **date**: YYYY-MM-DD only
- **test_name**: flexible, unrecognized names are still tracked
- **value**: numeric
- **unit**: optional but recommended

A sample CSV is available in the app under **Import → Download sample**.

---

## Adding results from any device

**Option A — Upload through the app**
Open the app on any device → Import tab → upload CSV.

**Option B — Drop CSVs directly into Drive**
Open Google Drive, navigate to the `LabTrack/` folder, and drop a CSV in. Then open the app and hit **Sync now** — it will pick up the new file automatically.

---

## Supported tests with reference ranges

| Category | Tests |
|----------|-------|
| Metabolic | Glucose, HbA1c, Insulin, Uric Acid |
| Lipids | Total Cholesterol, LDL, HDL, Triglycerides |
| Thyroid | TSH, Free T4, Free T3 |
| Blood | Ferritin, Hemoglobin, Hematocrit, WBC, Platelets, RBC |
| Kidney | Creatinine, eGFR, BUN |
| Liver | ALT, AST, GGT, Albumin |
| Hormones | Testosterone, Estradiol, Cortisol, DHEA-S, PSA |
| Vitamins | Vitamin D, Vitamin B12, Folate |
| Minerals | Magnesium, Calcium, Potassium, Sodium, Iron, Zinc |
| Inflammation | CRP, Homocysteine |

Any other test name is accepted and tracked — it just won't have a reference range overlay.

---

## Privacy & security

- **drive.file scope only** — the app can only see files it creates. It cannot read your other Drive files.
- Your `labtrack-data.json` and CSV files live in your own Drive and are only accessible with your Google login.
- No data is sent to any third-party server. The only network calls are to Google's APIs.
- The OAuth consent screen will show "unverified app" since this is a personal project. This is normal — click **Advanced → Go to LabTrack (unsafe)** to proceed. Only you (and any test users you add) can sign in.

---

## Install as a PWA

- **iPhone/iPad**: Open in Safari → Share → **Add to Home Screen**
- **Android**: Open in Chrome → three-dot menu → **Add to Home Screen**
- **Desktop Chrome**: Click the install icon in the address bar

---

## Updating the app

To push app updates: edit files locally → push to GitHub. Pages redeploys in ~1 minute. Hard-refresh the app to get the new service worker.

Your `labtrack-data.json` in Drive is untouched by code updates.
