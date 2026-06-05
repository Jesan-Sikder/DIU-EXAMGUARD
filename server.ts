import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser limits elevated to handle base64 snapshots easily
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const DB_FILE = path.join(process.cwd(), "alerts_db.json");

// Helper to initialize "database" JSON file
function initializeDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(
      DB_FILE,
      JSON.stringify({ alerts: [], currentStudent: {
        name: "Person 1",
        id: "cctv_person_1",
        department: "Computer Science & Engineering (CSE)",
        course: "Artificial Intelligence Lab (CSE-412)",
        examTitle: "Midterm Exam on Machine Learning & Computer Vision",
        room: "DIU Smart Classroom-704"
      } }, null, 2)
    );
  }
}

initializeDB();

// Read from database helper
function readDB() {
  try {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database:", err);
    return { alerts: [], currentStudent: {} };
  }
}

// Write to database helper
function writeDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error writing database:", err);
  }
}

// Lazy load Gemini Client to prevent crash if key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      console.warn("WARNING: GEMINI_API_KEY is not defined or is placeholder. Using mock replies for AI assistant.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// REST API ENPOINTS

// 1. Get current candidate details
app.get("/api/student", (req, res) => {
  const db = readDB();
  res.json(db.currentStudent);
});

// 2. Update candidate details
app.post("/api/student", (req, res) => {
  const db = readDB();
  db.currentStudent = { ...db.currentStudent, ...req.body };
  writeDB(db);
  res.json({ success: true, student: db.currentStudent });
});

// 3. Get all alerts
app.get("/api/alerts", (req, res) => {
  const db = readDB();
  res.json(db.alerts || []);
});

// 4. Create an alert event (snapshot included)
app.post("/api/alerts", (req, res) => {
  const db = readDB();
  const newAlert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    type: req.body.type,
    timestamp: req.body.timestamp || new Date().toISOString(),
    yawAngle: Number(req.body.yawAngle || 0),
    duration: req.body.duration !== undefined ? Number(req.body.duration) : undefined,
    screenshotUrl: req.body.screenshotUrl || "",
    confidence: Number(req.body.confidence || 0.9),
    status: req.body.status || "unresolved",
    notes: req.body.notes || "",
    studentId: req.body.studentId || "",
    studentName: req.body.studentName || "",
    seatNo: req.body.seatNo ? Number(req.body.seatNo) : 1
  };

  db.alerts = [newAlert, ...(db.alerts || [])];
  writeDB(db);
  res.json({ success: true, alert: newAlert });
});

// 5. Update an alert status/notes
app.patch("/api/alerts/:id", (req, res) => {
  const db = readDB();
  const alertIndex = db.alerts.findIndex((a: any) => a.id === req.params.id);
  if (alertIndex > -1) {
    db.alerts[alertIndex] = { ...db.alerts[alertIndex], ...req.body };
    writeDB(db);
    res.json({ success: true, alert: db.alerts[alertIndex] });
  } else {
    res.status(404).json({ error: "Alert not found" });
  }
});

// 6. Clear alert logs (reset demo)
app.post("/api/alerts/clear", (req, res) => {
  const db = readDB();
  db.alerts = [];
  writeDB(db);
  res.json({ success: true, message: "Alert database cleared successfully." });
});

// 7. AI Proctor Advisor Chat Endpoint (uses Gemini 3.5 Flash)
app.post("/api/gemini/chat", async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages array provided." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    // Elegant fallback mock responder
    const userMsg = messages[messages.length - 1]?.text || "";
    let reply = "Hello! I am DIU ExamGuard AI Proctor Assistant. I am currently running in Offline mode. Please configure your GEMINI_API_KEY in the Secrets panel for fully empowered neural suggestions!";
    
    if (userMsg.toLowerCase().includes("phone")) {
      reply = "According to DIU academic policies, holding or using a mobile phone in the examination hall is a severe violation. Instant disqualification may apply. As an AI-Proctor, I instantly flag phone objects within 50ms.";
    } else if (userMsg.toLowerCase().includes("head") || userMsg.toLowerCase().includes("yaw")) {
      reply = "Our head yaw estimation model evaluates angles from -90° to +90°. Looking left (< -45°) or looks right (> +45°) triggers side-looking alert. If maintained for more than 3s, or frequently oscillating, it marks high suspiciousness.";
    } else if (userMsg.toLowerCase().includes("report")) {
      reply = "For university competitions, you can trigger 'Generate Integrity Report'. Under offline mode, we compile a static standard report outline. Connected with Gemini, it creates real semantic evaluations based on actual violation times.";
    }
    return res.json({ text: reply });
  }

  try {
    const ai = getGeminiClient();
    const systemPrompt = `You are "DIU ExamGuard AI Proctor Advisor", an expert automated computer-vision referee for academic examinations at Daffodil International University (Bangladesh).
Your job is to answer queries from Head of Examinations, Department Chairs, and Hall invigilators regarding cheating detection logs, head movement anomalies, guidelines on academic dishonesty, and optimal thresholds.
Use friendly, objective, and professional academic prose. You may occasionally refer to local context like DIU's lush green campus in Ashulia, Dhaka, or Smart Classrooms. Keep responses authoritative and helpful.`;

    // Format chat messages
    const formattedContents = messages.map((m: any) => ({
      role: m.sender === "ai" ? "model" : "user",
      parts: [{ text: m.text }],
    }));

    // Generate response using gemini-3.5-flash
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text });
  } catch (err: any) {
    console.error("Gemini Chat API Error:", err);
    res.status(500).json({ error: "AI Proctor failed to formulate a response: " + err.message });
  }
});

// 8. AI Academic Integrity Report Generator using Gemini 3.5 Flash
app.post("/api/gemini/report", async (req, res) => {
  const db = readDB();
  const alertsList = db.alerts || [];
  const student = db.currentStudent || {};

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    // Generate an incredibly detailed, high-professional mock report if no API key is specified
    const mockReport = `### 📋 DIU ACADEMIC INTEGRITY MONITORING REPORT
**Platform**: DIU ExamGuard® (Neural Vision Proctor V1.0)
**Course**: ${student.course || "Artificial Intelligence"}
**Candidate Name**: ${student.name || "Person 1"} (${student.id || "cctv_person_1"})
**Location**: ${student.room || "Smart Room"}
**Status**: ${alertsList.length > 5 ? "⚠️ HIGH SUSPICIOUS / SCRUTINY REQUIRED" : alertsList.length > 0 ? "ℹ️ REASONABLE CLEARANCE WITH WARNINGS" : "✅ PRISTINE RECORDED INTEGRITY"}

---

#### 📊 SESSION AUDIT METRICS
* **Total Logged Events**: ${alertsList.length} suspicious actions identified.
* **Integrity Score Computed**: ${Math.max(10, 100 - (alertsList.length * 15))} / 100
* **Phone Violations**: ${alertsList.filter((a: any) => a.type === "Phone Detected").length} counts
* **Looking Left/Right**: ${alertsList.filter((a: any) => a.type === "Looking Left" || a.type === "Looking Right").length} counts
* **Looking Behind**: ${alertsList.filter((a: any) => a.type === "Looking Behind").length} counts
* **Movement Oscillations**: ${alertsList.filter((a: any) => a.type === "Frequent Head Movement").length} counts

---

#### 🔍 EVENT CHRONOLOGY SUMMARY
${
  alertsList.length === 0 
    ? "No behavioral anomalies triggered during this session. Candidate maintained perfect head-alignment and visual focus."
    : alertsList.map((a: any) => `* **[${new Date(a.timestamp).toLocaleTimeString()}]** ${a.type} - Yaw Angle: ${a.yawAngle}°, Confidence: ${(a.confidence * 100).toFixed(0)}%. ${a.notes || 'No description entered.'}`).join("\n")
}

---

#### 🎯 AUTOMATED PROCTOR ANALYSIS
1. **Critical Observations**: ${alertsList.length > 0 ? `The neural network registered ${alertsList.length} alerts. ` : "Candidate demonstrates consistent visual alignment."}
2. **Cheating Possibility Index**: ${alertsList.length > 5 ? "Critically High (92%). Please audit screenshots." : alertsList.length > 2 ? "Moderate (55%). Review timeline notes." : "Negligible (<10%)."}
3. **Recommended Actions**: ${alertsList.length > 5 ? "1. Summon Candidate for oral viva explanation.\n2. Discard Exam session logs.\n3. Audit video snapshots from Timestamp range." : "Pristine exam, approve and lock exam scripts."}

*Note: This report is generated locally by DIU ExamGuard. Configure a real Gemini API Key for adaptive, deep multi-factor semantic reasoning.*`;

    return res.json({ report: mockReport });
  }

  try {
    const ai = getGeminiClient();

    // Prepare a condensed summaries of logs to feed into Gemini context
    const formattedLogs = alertsList.map((a: any, i: number) => ({
      index: i + 1,
      type: a.type,
      time: new Date(a.timestamp).toLocaleTimeString(),
      angle: `${a.yawAngle}°`,
      confidence: `${(a.confidence * 100).toFixed(0)}%`,
      notes: a.notes || "None"
    }));

    const prompt = `You are a professional Academic Integrity Evaluator for Daffodil International University (DIU).
Generate an official "DIU ExamGuard Comprehensive Integrity Report" based on the following student details and visual alerts logged by the AI Real-Time Proctor.

Student Details:
- Name: ${student.name}
- ID: ${student.id}
- Department: ${student.department}
- Course: ${student.course}
- Exam Title: ${student.examTitle}
- Room/Venue: ${student.room}

Summary of Suspicious Activity Alerts Logged by Computer Vision Model:
${JSON.stringify(formattedLogs, null, 2)}

Structure your report into the following clean, professional markdown format:
1. Executive Summary: High-level verdict (e.g. SUSPICION LEVEL: HIGH/MEDIUM/LOW, Integrity Score out of 100).
2. Diagnostic Analysis: Deep dive into the nature of the infractions (e.g. explain what phone detection or looking back alerts signify, identify if the frequency of head movements shows a collaborative cheating pattern).
3. Evidence Review: Reference specific timestamps or clusters of violations from the log.
4. Proctor Panel Verdict: Actions that the Chief Examiner should take according to standard university regulations (warnings, script-withholding, viva-voce callback).
5. Tech Performance Metrics: Rate the security audit's precision.

Write in a formal academic, sharp, authoritative tone. Format with clear Markdown headings, divider lines, and structured bullet lists. Include specific Bengali context like Daffodil International University or DIU academic rules where relevant.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.4,
      }
    });

    res.json({ report: response.text });
  } catch (err: any) {
    console.error("Gemini Report Generation API Error:", err);
    res.status(500).json({ error: "Failed to generate report using Gemini: " + err.message });
  }
});


// Express static / Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        watch: {
          ignored: [
            "**/alerts_db.json",
            "**/alerts_db.json/**",
            "**/backend/app/alerts_db.json",
            "**/node_modules/**",
            "**/.git/**"
          ]
        }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DIU ExamGuard Server running on port ${PORT}`);
  });
}

startServer();
