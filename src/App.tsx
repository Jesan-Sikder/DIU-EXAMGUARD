import React, { useState, useEffect } from "react";
import { AlertType, AlertEvent, SessionStats, DIUStudent } from "./types";
import WebcamFeed from "./components/WebcamFeed";
import StatsCards from "./components/StatsCards";
import EventLog from "./components/EventLog";
import EvidenceGallery from "./components/EvidenceGallery";
import TeamBox from "./components/TeamBox";
import { ShieldCheck, User2, Settings, Compass, HelpCircle, Activity, LayoutGrid, Check, RefreshCw, Sun, Moon } from "lucide-react";

export default function App() {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [student, setStudent] = useState<DIUStudent>({
    name: "Person 1",
    id: "cctv_person_1",
    department: "Computer Science & Engineering (CSE)",
    course: "Artificial Intelligence Lab (CSE-412)",
    examTitle: "Midterm Exam on Machine Learning & Computer Vision",
    room: "DIU Smart Classroom-704",
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem("examguard_theme") !== "light";
  });

  // Toggling class at element level
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove("light");
      localStorage.setItem("examguard_theme", "dark");
    } else {
      document.documentElement.classList.add("light");
      localStorage.setItem("examguard_theme", "light");
    }
  }, [isDarkMode]);
  
  const [stats, setStats] = useState<SessionStats>({
    totalAlerts: 0,
    integrityScore: 100,
    phoneCount: 0,
    headTurnCount: 0,
    lookingBehindCount: 0,
    frequentMoveCount: 0,
    prolongedSideCount: 0,
    durationSeconds: 0,
  });

  const [elapsedTime, setElapsedTime] = useState(0);
  const [isEditingStudent, setIsEditingStudent] = useState(false);
  const [editedStudent, setEditedStudent] = useState<DIUStudent>({ ...student });
  const [isConnected, setIsConnected] = useState(true);

  // Synchronize student details and historic alerts from server on startup
  useEffect(() => {
    fetch("/api/student")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setStudent(data);
        setEditedStudent(data);
      })
      .catch((err) => console.log("Failed to fetch initial student info"));

    fetch("/api/alerts")
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setAlerts(data);
      })
      .catch((err) => console.log("Failed to fetch alerts log"));
  }, []);

  // Compute stats on alerts changes
  useEffect(() => {
    // Filter alerts specifically for the currently active/selected student
    const studentAlerts = alerts.filter(
      (a) => a.studentId === student.id || (student.id === "221-15-628" && !a.studentId)
    );
    const phone = studentAlerts.filter((a) => a.type === "Phone Detected").length;
    const leftRight = studentAlerts.filter((a) => a.type === "Looking Left" || a.type === "Looking Right").length;
    const behind = studentAlerts.filter((a) => a.type === "Looking Behind").length;
    const osc = studentAlerts.filter((a) => a.type === "Frequent Head Movement").length;
    const prolonged = studentAlerts.filter((a) => a.type === "Prolonged Side Viewing").length;

    // Integrity scoring algorithm
    let score = 100;
    score -= phone * 35;
    score -= leftRight * 10;
    score -= behind * 20;
    score -= osc * 15;
    score -= prolonged * 25;

    setStats({
      totalAlerts: studentAlerts.length,
      integrityScore: Math.max(0, score),
      phoneCount: phone,
      headTurnCount: leftRight,
      lookingBehindCount: behind,
      frequentMoveCount: osc,
      prolongedSideCount: prolonged,
      durationSeconds: elapsedTime,
    });
  }, [alerts, elapsedTime, student.id]);

  // Session clock ticker (running every second since integration starts)
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatElapsedTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // Callback triggers when CV warning parameters are breached
  const handleAlertTriggered = async (
    type: AlertType,
    yawAngle: number,
    confidence: number,
    screenshotUrl: string,
    studentId?: string,
    studentName?: string,
    seatNo?: number
  ) => {
    const newAlertPayload = {
      type,
      timestamp: new Date().toISOString(),
      yawAngle,
      confidence,
      screenshotUrl,
      status: "unresolved" as const,
      notes: "Detected via computer-vision edge sensory model.",
      studentId: studentId || "cctv_person_1", // Fallback to Person 1 cctv profile
      studentName: studentName || "Person 1",
      seatNo: seatNo || 1,
    };

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAlertPayload),
      });

      if (!res.ok) throw new Error();
      const result = await res.json();
      
      // Sync local alerts view instantly
      if (result.success && result.alert) {
        setAlerts((prev) => [result.alert, ...prev]);
      }
    } catch (e) {
      // Fallback offline sync if backend fails temporarily
      const offlineAlert: AlertEvent = {
        id: `offline_${Date.now()}`,
        ...newAlertPayload,
      };
      setAlerts((prev) => [offlineAlert, ...prev]);
    }
  };

  // Callback to insert animated timeline infractions for other students in the hall
  const handleSimulatedAlert = async (
    studentId: string,
    studentName: string,
    seatNo: number,
    type: string
  ) => {
    const newAlertPayload = {
      type,
      timestamp: new Date().toISOString(),
      yawAngle: Math.floor(Math.random() * 41) - 20, // -20° to +20°
      confidence: Number((0.75 + Math.random() * 0.2).toFixed(2)),
      screenshotUrl: "", // simulated candidates are offline, so no camera snap is available
      status: "unresolved" as const,
      notes: "Automated alert logged by hall noise simulation model.",
      studentId,
      studentName,
      seatNo,
    };

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAlertPayload),
      });

      if (!res.ok) throw new Error();
      const result = await res.json();
      
      if (result.success && result.alert) {
        setAlerts((prev) => [result.alert, ...prev]);
      }
    } catch (e) {
      const offlineAlert: AlertEvent = {
        id: `offline_sim_${Date.now()}`,
        ...newAlertPayload,
        type: type as AlertType,
      };
      setAlerts((prev) => [offlineAlert, ...prev]);
    }
  };

  // Sync update to alert status (flag/dismiss)
  const handleUpdateAlertStatus = async (
    id: string,
    status: "unresolved" | "flagged" | "dismissed",
    notes?: string
  ) => {
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes }),
      });

      if (!res.ok) throw new Error();
      const data = await res.json();

      if (data.success && data.alert) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === id ? data.alert : a))
        );
      }
    } catch (e) {
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status, notes } : a))
      );
    }
  };

  // Reset/Reset all databases
  const handleClearAlerts = async () => {
    const confirmClear = window.confirm(
      "Are you sure you want to reset all active exam logs to start a fresh competition demonstration run?"
    );
    if (!confirmClear) return;

    try {
      const res = await fetch("/api/alerts/clear", { method: "POST" });
      if (res.ok) {
        setAlerts([]);
        setElapsedTime(0);
      }
    } catch (e) {
      setAlerts([]);
      setElapsedTime(0);
    }
  };

  // Update candidate profile edits
  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editedStudent),
      });

      if (res.ok) {
        const data = await res.json();
        setStudent(data.student);
        setIsEditingStudent(false);
      }
    } catch (e) {
      setStudent(editedStudent);
      setIsEditingStudent(false);
    }
  };

  return (
    <div id="diu_examguard_root_layout" className="min-h-screen bg-brand-bg text-brand-text font-sans border-[12px] border-brand-frame selection:bg-red-500/30 flex flex-col">
      
      {/* Dynamic Header */}
      <header className="bg-brand-card border-b border-brand-border sticky top-0 z-40 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Logo Branding */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded bg-brand-text text-brand-bg flex items-center justify-center font-black shadow-md">
              EG
            </div>
            <div>
              <h1 className="text-lg font-bold text-brand-text tracking-tight flex items-center gap-2 uppercase">
                <span>DIU ExamGuard</span>
                <span className="text-[10px] uppercase font-mono font-bold bg-brand-bg text-brand-text px-2 py-0.5 rounded-sm border border-brand-border">
                  CV Proctor v1.0
                </span>
              </h1>
              <p className="text-xs text-brand-muted">
                Autonomous Computer Vision System for Academic Integrity Monitoring
              </p>
            </div>
          </div>

          {/* Student Status Profile banner */}
          <div className="flex flex-wrap items-center gap-3 bg-brand-bg p-2.5 rounded border border-brand-border">
            <div className="flex items-center gap-2 text-xs">
              <User2 size={13} className="text-brand-text shrink-0" />
              <span className="text-brand-muted shrink-0">Candidate:</span>
              <strong className="text-brand-text font-medium truncate max-w-[150px] sm:max-w-none">
                {student.name} ({student.id})
              </strong>
            </div>

            {/* Editing Button */}
            <button
              onClick={() => {
                setEditedStudent({ ...student });
                setIsEditingStudent(true);
              }}
              className="text-brand-muted hover:text-brand-text p-1 rounded hover:bg-brand-card transition border border-brand-border"
              title="Edit Candidate Information"
            >
              <Settings size={13} />
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="text-brand-muted hover:text-brand-text p-1 rounded hover:bg-brand-card transition border border-brand-border flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 cursor-pointer"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? (
                <>
                  <Sun size={12} className="text-brand-text shrink-0" />
                  <span>LIGHT</span>
                </>
              ) : (
                <>
                  <Moon size={12} className="text-brand-text shrink-0" />
                  <span>DARK</span>
                </>
              )}
            </button>

            {/* Socket Network Status */}
            <div className="flex items-center gap-1.5 text-[10px] font-mono border-l border-brand-border pl-3">
              <span className="h-2 w-2 rounded-full bg-[#1A4631]"></span>
              <span className="text-[#1A4631] uppercase font-bold tracking-wider">ACTIVE PROCTOR</span>
            </div>
          </div>

        </div>
      </header>

      {/* Primary Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 space-y-6">
        
        {/* Candidate Info Editor Modal */}
        {isEditingStudent && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <form
              onSubmit={handleSaveStudent}
              className="bg-brand-card border border-brand-border rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl relative"
            >
              <h3 className="font-bold text-brand-text text-base border-b border-brand-border pb-2">
                Configure Active Student Demographics
              </h3>
              
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-brand-muted block mb-1">Student Complete Name:</label>
                  <input
                    type="text"
                    required
                    value={editedStudent.name}
                    onChange={(e) => setEditedStudent({ ...editedStudent, name: e.target.value })}
                    className="w-full bg-brand-bg border border-brand-border rounded px-3 py-2 text-brand-text placeholder-brand-muted text-xs focus:outline-none focus:border-brand-text"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-brand-muted block mb-1">Student University ID:</label>
                    <input
                      type="text"
                      required
                      value={editedStudent.id}
                      onChange={(e) => setEditedStudent({ ...editedStudent, id: e.target.value })}
                      className="w-full bg-brand-bg border border-brand-border rounded px-3 py-2 text-brand-text placeholder-brand-muted text-xs focus:outline-none focus:border-brand-text"
                    />
                  </div>
                  <div>
                    <label className="text-brand-muted block mb-1">Room / Location:</label>
                    <input
                      type="text"
                      required
                      value={editedStudent.room}
                      onChange={(e) => setEditedStudent({ ...editedStudent, room: e.target.value })}
                      className="w-full bg-brand-bg border border-brand-border rounded px-3 py-2 text-brand-text placeholder-brand-muted text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-brand-muted block mb-1">Department / Faculty:</label>
                  <input
                    type="text"
                    required
                    value={editedStudent.department}
                    onChange={(e) => setEditedStudent({ ...editedStudent, department: e.target.value })}
                    className="w-full bg-brand-bg border border-brand-border rounded px-3 py-2 text-brand-text focus:outline-none focus:border-brand-text"
                  />
                </div>

                <div>
                  <label className="text-brand-muted block mb-1">Active Course Unit Name:</label>
                  <input
                    type="text"
                    required
                    value={editedStudent.course}
                    onChange={(e) => setEditedStudent({ ...editedStudent, course: e.target.value })}
                    className="w-full bg-brand-bg border border-brand-border rounded px-3 py-2 text-brand-text focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-brand-muted block mb-1">Academic Exam Title:</label>
                  <input
                    type="text"
                    required
                    value={editedStudent.examTitle}
                    onChange={(e) => setEditedStudent({ ...editedStudent, examTitle: e.target.value })}
                    className="w-full bg-brand-bg border border-brand-border rounded px-3 py-2 text-brand-text placeholder-brand-muted text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingStudent(false)}
                  className="bg-brand-bg hover:bg-brand-card text-brand-muted px-4 py-2 rounded-sm text-xs transition border border-brand-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand-text hover:bg-brand-text/90 text-brand-bg font-extrabold text-xs px-4 py-2 rounded-sm transition flex items-center gap-1.5 shadow"
                >
                  <Check size={14} />
                  <span>Update Profile</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Current Student Metadata Profile board */}
        <div className="bg-brand-card border border-brand-border rounded p-4 flex flex-col md:flex-row items-stretch justify-between gap-4 shadow-xl">
          <div className="flex flex-col sm:flex-row gap-4 items-start font-sans">
            <div className="shrink-0 h-11 w-11 rounded bg-[#1A4631]/10 flex items-center justify-center text-[#1A4631] border border-[#1A4631]/20">
              <Activity size={22} className="animate-pulse text-[#1A4631]" />
            </div>
            <div className="space-y-1">
               <div className="flex flex-wrap items-baseline gap-2.5">
                <h2 className="text-sm font-bold text-brand-text uppercase tracking-wider">
                  {student.examTitle}
                </h2>
              </div>
              <p className="text-xs text-brand-text opacity-85 font-mono">
                {student.department} • {student.course}
              </p>
              <div className="text-[10px] text-brand-muted flex flex-wrap gap-4 items-center mt-1 uppercase font-mono">
                <span>Room: <strong className="text-brand-text">{student.room}</strong></span>
                <span>Proctor status: <strong className="text-[#1A4631] bg-[#1A4631]/10 border border-[#1A4631]/20 px-2 py-0.5 rounded font-bold text-[9px]">SECURE TELEMETRY LIVE</strong></span>
              </div>
            </div>
          </div>

          <div className="border-t md:border-t-0 md:border-l border-brand-border pt-3 md:pt-0 md:pl-5 flex flex-col justify-center text-left md:text-right self-stretch md:w-48">
            <span className="text-[10px] text-brand-muted block uppercase font-bold font-mono">Exam Status Code</span>
            <span className="text-brand-text text-sm font-mono font-bold tracking-wide border-b border-brand-border">
              DIU_MID_E412_A
            </span>
            <span className="text-[9px] text-brand-muted mt-1 block uppercase font-mono">
              Session verified
            </span>
          </div>
        </div>


        {/* Dynamic Bento Matrix rows */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Block: Camera Stream */}
          <WebcamFeed
            onAlertTriggered={handleAlertTriggered}
            alerts={alerts}
            student={student}
          />

          {/* Right Block: Stats, Cards & Alerts */}
          <div className="space-y-6">
            <StatsCards
              alerts={alerts}
              stats={stats}
              elapsedTimeStr={formatElapsedTime(elapsedTime)}
            />
            
            <EventLog
              alerts={alerts}
              onUpdateAlertStatus={handleUpdateAlertStatus}
              onClearAlerts={handleClearAlerts}
            />
          </div>

        </div>

        {/* Snapshot Evidence grid */}
        <EvidenceGallery alerts={alerts} />

        {/* Team Collaboration & Student Profiles */}
        <TeamBox alerts={alerts} student={student} />

      </main>

      {/* Simple university bottom footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-slate-550 text-xs space-y-2 mt-12 pb-16">
        <p className="font-semibold text-slate-400">
          DIU ExamGuard® • Autonomous Intelligent Invigilation System
        </p>
        <p className="text-slate-500 max-w-[500px] mx-auto text-[10px] leading-relaxed">
          Developed for academic integrity compliance monitoring at Daffodil International University. Powered by client-edge mathematical facial pose vectors, fast smartphone shape classifiers, and neural Gemini 3.5 Flash report analytics.
        </p>
        <p className="text-[9px] text-slate-600 font-mono">
          Daffodil Smart City, Ashulia, Dhaka, Bangladesh. All rights reserved © 2026.
        </p>
      </footer>

    </div>
  );
}
