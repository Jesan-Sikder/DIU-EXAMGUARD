import os
import json
import time
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="DIU ExamGuard API Portal", version="1.0.0")

# Enable CORS for local cross-origin development (e.g., Vite running on a separate port)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Detect DB File Path (Shared with Node.js)
DB_FILE = "alerts_db.json"
for path in [DB_FILE, "../alerts_db.json", "backend/alerts_db.json"]:
    if os.path.exists(path):
        DB_FILE = path
        break

def initialize_db():
    if not os.path.exists(DB_FILE):
        default_data = {
            "alerts": [],
            "currentStudent": {
                "name": "Sabbir Rahman",
                "id": "221-15-628",
                "department": "Computer Science & Engineering (CSE)",
                "course": "Artificial Intelligence Lab (CSE-412)",
                "examTitle": "Midterm Exam on Machine Learning & Computer Vision",
                "room": "DIU Smart Classroom-704"
            }
        }
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(default_data, f, indent=2)

initialize_db()

def read_db() -> dict:
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading DB: {e}")
        return {"alerts": [], "currentStudent": {}}

def write_db(data: dict):
    try:
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"Error writing DB: {e}")

# Gemini Client initializer
def get_gemini_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "MY_GEMINI_API_KEY":
        return None
    try:
        from google import genai
        return genai.Client(api_key=api_key)
    except Exception as e:
        print(f"Could not load google-genai library: {e}")
        return None


# Pydantic Schemas

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    id: Optional[str] = None
    department: Optional[str] = None
    course: Optional[str] = None
    examTitle: Optional[str] = None
    room: Optional[str] = None

class AlertCreate(BaseModel):
    type: str
    timestamp: Optional[str] = None
    yawAngle: float = 0.0
    duration: Optional[float] = None
    screenshotUrl: Optional[str] = ""
    confidence: float = 0.9
    status: str = "unresolved"
    notes: str = ""

class AlertUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

class Message(BaseModel):
    id: str
    sender: str
    text: str
    timestamp: str

class ChatPayload(BaseModel):
    messages: List[Message]


# API Routes

@app.get("/api/student")
async def get_student():
    db = read_db()
    return db.get("currentStudent", {})

@app.post("/api/student")
async def update_student(student: StudentUpdate):
    db = read_db()
    current = db.get("currentStudent", {})
    update_data = student.dict(exclude_unset=True)
    current.update(update_data)
    db["currentStudent"] = current
    write_db(db)
    return {"success": True, "student": current}

@app.get("/api/alerts")
async def get_alerts():
    db = read_db()
    return db.get("alerts", [])

@app.post("/api/alerts")
async def create_alert(alert: AlertCreate):
    db = read_db()
    import uuid
    new_alert = alert.dict()
    new_alert["id"] = f"alert_{int(time.time() * 1000)}_{uuid.uuid4().hex[:5]}"
    if not new_alert["timestamp"]:
        from datetime import datetime
        new_alert["timestamp"] = datetime.utcnow().isoformat() + "Z"
    
    alerts = db.get("alerts", [])
    alerts.insert(0, new_alert)
    db["alerts"] = alerts
    write_db(db)
    return {"success": True, "alert": new_alert}

@app.patch("/api/alerts/{alert_id}")
async def update_alert(alert_id: str, payload: AlertUpdate):
    db = read_db()
    alerts = db.get("alerts", [])
    found_idx = -1
    for idx, a in enumerate(alerts):
        if a.get("id") == alert_id:
            found_idx = idx
            break
            
    if found_idx > -1:
        update_data = payload.dict(exclude_unset=True)
        alerts[found_idx].update(update_data)
        db["alerts"] = alerts
        write_db(db)
        return {"success": True, "alert": alerts[found_idx]}
    else:
        raise HTTPException(status_code=404, detail="Alert not found")

@app.post("/api/alerts/clear")
async def clear_alerts():
    db = read_db()
    db["alerts"] = []
    write_db(db)
    return {"success": True, "message": "Alert database cleared successfully."}

@app.post("/api/gemini/chat")
async def gemini_chat(payload: ChatPayload):
    client = get_gemini_client()
    if not client:
        # Fallback offline proctor simulation helper
        user_msg = payload.messages[-1].text if payload.messages else ""
        user_msg_lower = user_msg.lower()
        
        reply = "Hello! I am DIU ExamGuard Python API Proctor Assistant. Running in offline/no-key mode. Please configure GEMINI_API_KEY in .env for advanced neural security advisor."
        
        if "phone" in user_msg_lower:
            reply = "[FastAPI Proctor] Mobile devices are fully banned from the evaluation desk at DIU. Our browser-based computer vision model detects cellphone bounds in less than 50ms automatically."
        elif "head" in user_msg_lower or "yaw" in user_msg_lower:
            reply = "[FastAPI Proctor] Head yaw degree detects if the candidate turned far left/right or look back (>70 degrees). Frequent oscillations indicate high suspicious activity."
        elif "report" in user_msg_lower:
            reply = "[FastAPI Proctor] Under offline mode, we trigger a rigorous static report outline containing summary of all infractions logged."
            
        return {"text": reply}

    try:
        # Prepare content hierarchy
        from google.genai import types
        
        system_instruction = (
            'You are "DIU ExamGuard AI Proctor Advisor", an expert automated computer-vision referee for academic examinations at Daffodil International University (Bangladesh).\n'
            'Your job is to answer queries from Head of Examinations, Department Chairs, and Hall invigilators regarding cheating detection logs, head movement anomalies, guidelines on academic dishonesty, and optimal thresholds.\n'
            'Use friendly, objective, and professional academic prose. You may occasionally refer to local context like DIU\'s lush green campus in Ashulia, Dhaka, or Smart Classrooms. Keep responses authoritative and helpful.'
        )
        
        contents = []
        for m in payload.messages:
            role = "model" if m.sender == "ai" else "user"
            contents.append(types.Content(
                role=role,
                parts=[types.Part.from_text(text=m.text)]
            ))
            
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.7
        )
        
        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=contents,
            config=config
        )
        return {"text": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini Chat Failed: {str(e)}")

@app.post("/api/gemini/report")
async def gemini_report():
    db = read_db()
    alerts_list = db.get("alerts", [])
    student = db.get("currentStudent", {})
    
    client = get_gemini_client()
    if not client:
        # Generate pristine markdown diagnostic layout
        severity = "✅ PRISTINE COMPLIANCE"
        if len(alerts_list) > 5:
            severity = "⚠️ CRITICAL CHEATING SUSPICION / ACTION REQUIRED"
        elif len(alerts_list) > 0:
            severity = "ℹ️ MINOR INFRACTIONS RECORDED"
            
        lines = [
            "### 📋 DIU ACADEMIC INTEGRITY MONITORING REPORT (FastAPI Backend)",
            f"**Candidate**: {student.get('name')} ({student.get('id')})",
            f"**Department**: {student.get('department')}",
            f"**Course**: {student.get('course')}",
            f"**Exam**: {student.get('examTitle')} room: {student.get('room')}",
            f"**Verdict Status**: {severity}",
            "\n---",
            "#### 📊 CHRONOLOGICAL INFRACTIONS TIMELINE"
        ]
        
        if not alerts_list:
            lines.append("* Candidate displayed optimal visual focus. No violations detected.")
        else:
            for alert in alerts_list:
                lines.append(f"* **[{alert.get('timestamp', '00:00')}]** {alert.get('type')} - Yaw: {alert.get('yawAngle')}°, Conf: {int(alert.get('confidence', 0.9)*100)}%. Note: *{alert.get('notes') or 'No comments entered.'}*")
                
        lines.append("\n---")
        lines.append("#### 🎯 AUTOMATED VERDICT AND ACTIONS")
        if len(alerts_list) > 3:
            lines.append("1. **Recommended**: Retain exam credentials under security lock.\n2. Request student for live viva explanation.\n3. Snapshot records verify item presence.")
        else:
            lines.append("1. **Recommended**: Lock and confirm scripts safe. Integrity standards met.")
            
        lines.append("\n*Note: Setup a valid GEMINI_API_KEY environment variable to trigger adaptive neural generative reasoning.*")
        
        return {"report": "\n".join(lines)}

    try:
        from google.genai import types
        
        formatted_logs = []
        for idx, a in enumerate(alerts_list):
            formatted_logs.append({
                "index": idx + 1,
                "type": a.get("type"),
                "time": a.get("timestamp"),
                "angle": f"{a.get('yawAngle')}°",
                "confidence": f"{int(a.get('confidence', 0.9)*100)}%",
                "notes": a.get("notes") or "None"
            })
            
        prompt = f"""You are a professional Academic Integrity Evaluator for Daffodil International University (DIU).
Generate an official "DIU ExamGuard Comprehensive Integrity Report" based on the following student details and visual alerts logged by the AI Real-Time Proctor.

Student Details:
- Name: {student.get('name')}
- ID: {student.get('id')}
- Department: {student.get('department')}
- Course: {student.get('course')}
- Exam Title: {student.get('examTitle')}
- Room/Venue: {student.get('room')}

Summary of Suspicious Activity Alerts Logged by Computer Vision Model:
{json.dumps(formatted_logs, indent=2)}

Structure your report into the following clean, professional markdown format:
1. Executive Summary: High-level verdict (e.g. SUSPICION LEVEL: HIGH/MEDIUM/LOW, Integrity Score out of 100).
2. Diagnostic Analysis: Deep dive into the nature of the infractions.
3. Evidence Review: Reference specific timestamps or clusters of violations from the log.
4. Proctor Panel Verdict: Actions that the Chief Examiner should take according to standard university regulations.
5. Tech Performance Metrics: Rate the security audit's precision.

Write in a formal academic, sharp, authoritative tone. Format with clear headings and structure."""

        response = client.models.generate_content(
            model="gemini-3.5-flash",
            contents=prompt,
        )
        return {"report": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


# Serve static assets if compiled dist folder found
dist_dir = None
for path in ["dist", "../dist", "backend/dist"]:
    if os.path.exists(path):
        dist_dir = path
        break

if dist_dir:
    assets_dir = os.path.join(dist_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
        
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404)
        index_file = os.path.join(dist_dir, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        raise HTTPException(status_code=404, detail="SPA entry not found")
