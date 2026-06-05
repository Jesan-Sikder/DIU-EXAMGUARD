# 🛡️ DIU ExamGuard — DIU MISSION IMPOSSIBLE

**DIU ExamGuard** is a cutting-edge, real-time, AI-powered examination monitoring and local invigilation suite custom-built for **Daffodil International University (DIU)**. Engineered to enhance academic integrity, this application acts as an intelligent digital assistant for human proctors, combining client-side real-time Computer Vision (TensorFlow.js COCO-SSD) with state-of-the-art server-proxied AI reasoning via Gemini 3.5 Flash.

Developed by team **DIU MISSION IMPOSSIBLE**, this setup runs as a highly performant full-stack Node.js server, empowering exam halls with immediate phone detection, gaze-tracking telemetric telemetry, and automatic evidence snapshot archiving.

---

## 📐 Architecture & Design Flow

```text
                               ┌────────────────────────────────┐
                               │     Examiner's Live Video      │
                               │      (Webcam or MP4 Upload)    │
                               └───────────────┬────────────────┘
                                               │
                                               ▼
                         ┌──────────────────────────────────────────┐
                         │      Client browser (React + HTML5)      │
                         │                                          │
                         │   Skin region segmenter & Face centroid  │
                         │   Calculates Head Yaw Orientation Vector │
                         │                                          │
                         │   TensorFlow.js COCO-SSD local executor  │
                         │   Object Classifier seeks phone / book   │
                         └─────────────────────┬────────────────────┘
                                               │
                                               │ Log events & base64 Snapshots
                                               ▼
                        ┌────────────────────────────────────────────┐
                        │      Full-stack Express.js Backend         │
                        │                                            │
                        │   Writes metrics into high-speed SQLite   │
                        │   emulation (JSON persistence engine)     │
                        │                                            │
                        │   API routes serve security log queries    │
                        └──────────────────────┬─────────────────────┘
                                               │
                                               ▼
                        ┌────────────────────────────────────────────┐
                        │        Google Gemini 3.5 Flash API         │
                        │                                            │
                        │   Analyzes transaction records and head-  │
                        │   tracking anomalies to draft official     │
                        │   DIU investigation reports & answers Qs   │
                        └────────────────────────────────────────────┘
```

---

## 🚀 Key Features & Capabilities

### 1. Unified Computer Vision Pipeline (Edge Execution)
*   **Object Detection (TF.js & COCO-SSD)**: Local neural execution checks current webcam frames at up to 30 FPS. Deeply identifies mobile phones (representing YOLOv8 class `63`).
*   **Pose & Gaze Analytics**: Nose-to-eyes skin cluster tracking calculates horizontally smoothed head yaw rotation ($\theta = [r - 0.5] \times 180^\circ$).
    *   *Glances Left*: Threshold warning triggers when $\theta < -45^\circ$.
    *   *Glances Right*: Threshold warning triggers when $\theta > +45^\circ$.
    *   *Looking Back*: Highly critical flag triggers if horizontal head deflection reaches $\pm 70^\circ$.
*   **Frequent Head Movements Monitor**: Automatically tracks frequency of glances within a rolling 10-second sliding time-frame. Alerts if head oscillations exceed 4 cycles to detect suspicious search maneuvers.
*   **Prolonged Side-View Lock**: Tracks sustained glancing left or right for more than 3 consecutive seconds, isolating peer-collaboration activity.

### 2. High-Fidelity Proctor Interface & Console
*   **Active Overlays Canvas**: Highlights face bounding regions, real-time horizontal calibration lasers, gaze vectors, and status labels directly mapped to the video viewport.
*   **Adaptive Integrity Rating Meter**: Starts at a default of 100% and drops dynamically upon verified infractions (Phones drops rating by -35 index, Look warnings drop by -10).
*   **Evidence Snapshots Gallery**: Automatically captures and catalogues high-definition webcam frames representing the violation. Pre-computes yaw angles and confidence ratings, allowing proctors to download reports or inspect snapshot details.
*   **Chronological Security Logs**: Review ongoing infractions, search logs by category description, or manual dismiss/resolve statuses to control false positives.

### 3. Integrated Gemini Co-Pilot
*   **Interactive Compliance Bot**: Dedicated server-side Gemini 3.5 Assistant that answers university exam regulations, rules explanations, or troubleshooting directions.
*   **Brief Generator**: Autonomously translates logged visual telemetry into a professionally structures university disciplinary brief (PDF generation via jsPDF with markdown notes).

---

## 👥 Meet Team DIU MISSION IMPOSSIBLE

This solution has been engineered and refined under intense hackathon criteria by Daffodil International University students:

| Student Name | Student ID | Assigned Project Role | Focus Area & Contributions |
| :--- | :--- | :--- | :--- |
| **MD Habibur Rahman Jesan** | `241-15-628` | AI Vision Engineer | TensorFlow model integration, skin centroid vector mapping |
| **Sheikh Moumoni Ahmed** | `241-15-707` | Frontend Architect | UI typography tuning, responsive grids, high-contrast light styles |
| **MD Touhidul Islam Raha** | `241-15-708` | Full-Stack Specialist | Express API development, JSON-based high-speed emulation |
| **Reshad Bin Alam** | `241-15-191` | Security & QA Lead | Validation checking, telemetry log routing, PDF brief layout |

---

## 📂 Project Directory Structure

```text
/
├── server.ts              # Full-stack Node.js server (serves Express endpoints & hosts Vite middleware)
├── package.json           # Application scripts, build commands & dependencies metadata
├── tsconfig.json          # Strict TypeScript compiler options Configuration
├── vite.config.ts         # Vite bundler options, plugins & absolute path aliases
├── alerts_db.json         # High-speed file-based SQLite emulation DB (snapshots, confidence, angles)
├── .env.example           # Secure template environment declarations (ex: GEMINI_API_KEY)
└── src/
    ├── main.tsx           # React virtual tree bootstrap
    ├── App.tsx            # Central layout orchestrator (brings components together)
    ├── index.css          # Global Tailwind CSS variables & custom color themes
    ├── types.ts           # Unified TypeScript definitions (DIUStudent, AlertEvent, SessionStats)
    └── components/
        ├── TeamBox.tsx         # Meet team "DIU MISSION IMPOSSIBLE" developer profiles panel
        ├── WebcamFeed.tsx      # Handles video capture (webcam / local upload), skin vectors & TF.js
        ├── StatsCards.tsx      # Renders real-time integrity progress bars, timers & telemetry indicators
        ├── EventLog.tsx        # High-Fidelity Chronological table of captured academic infractions
        ├── EvidenceGallery.tsx # Image snapshot card desk with full scale interactive inspectors
        └── AIProctorBot.tsx    # Dedicated Gemini chatbot interface & pdf brief compiler
```

---

## ⚙️ Getting Started & Technical Setup

To start the project on your local workstation, proceed through the following guides:

### Prerequisites
Make sure you have Node.js installed on your operating system (LTS v18 or newer recommended) along with standard terminal utilities.

### 1. Clone the Workspace & Install Dependencies
First, clone this project directory to your computer, navigate inside the root folder, and clean-install all package requirements:

```bash
# Install core frontend, backend, and development tools
npm install
```

### 2. Configure Environment Variables
Copy the secure environment variable template to make a local setup file:

```bash
cp .env.example .env
```

Open `.env` in your favorite code editor and secure your Google Gemini API:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_goes_here
```

### 3. Launching Development Server (Node.js + Vite Hybrid)
To boot your full-stack application on terminal local-host (port 3000):

```bash
# Starts both Express server.ts and Vite HMR middleware
npm run dev
```

Open your web browser and visit:  
👉 **`http://localhost:3000`**

### 4. Compiling & Starting Production Build
To test high-speed production performance, compile your code to optimized vanilla browser bundles & standalone node code:

```bash
# Builds UI assets into dist/ & bundles server.ts to dist/server.cjs via esbuild
npm run build

# Runs standalone bundled production server
npm start
```

---

## 🛠️ Machine Learning & Geometric Logic Reference

### Skin Segmentation Centroid Core
Standard bounding boxes are estimated under high-performance criteria using color threshold intervals mapped to skin pigments:
$$\mathbf{P}_{\text{skin}} = \{ (x, y) \mid R > 55, G > 35, B > 15, R > G, R > B, R - G > 12 \}$$

The centroid $X_c$ behaves as:
$$X_c = \frac{1}{N} \sum_{i=1}^{N} x_i$$
Where $N$ maps to matching pixels, and the percentage deflection maps linear values to orientation directions immediately:
$$\theta = (X_c - W/2) \cdot M$$

---

Developed with absolute dedication and precision. DIU MISSION IMPOSSIBLE is protecting university integrity guidelines with secure telemetry! 🎓🛡️
