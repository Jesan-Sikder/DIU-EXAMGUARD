import React, { useState } from "react";
import { AlertEvent, AlertType } from "../types";
import { Filter, Trash2, CheckCircle2, ShieldAlert, Check, MoreVertical, Edit2 } from "lucide-react";

interface EventLogProps {
  alerts: AlertEvent[];
  onUpdateAlertStatus: (id: string, status: "unresolved" | "flagged" | "dismissed", notes?: string) => void;
  onClearAlerts: () => void;
}

export default function EventLog({ alerts, onUpdateAlertStatus, onClearAlerts }: EventLogProps) {
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const alertTypes: string[] = [
    "ALL",
    "Phone Detected",
    "Looking Left",
    "Looking Right",
    "Looking Behind",
    "Frequent Head Movement",
    "Prolonged Side Viewing",
  ];

  const filteredAlerts = alerts.filter((alert) => {
    const matchesType = filterType === "ALL" || alert.type === filterType;
    const matchesStatus = filterStatus === "ALL" || alert.status === filterStatus;
    return matchesType && matchesStatus;
  });

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case "Phone Detected":
        return "bg-red-500/15 text-red-400 border border-red-500/20";
      case "Looking Behind":
      case "Prolonged Side Viewing":
        return "bg-red-500/10 text-red-500 border border-red-500/15";
      default:
        return "bg-brand-card text-brand-text border border-brand-border";
    }
  };

  const startEditingNote = (alert: AlertEvent) => {
    setEditingNotesId(alert.id);
    setNoteText(alert.notes || "");
  };

  const saveNote = (id: string) => {
    const alert = alerts.find((a) => a.id === id);
    if (alert) {
      onUpdateAlertStatus(id, alert.status, noteText);
    }
    setEditingNotesId(null);
  };

  return (
    <div id="proctor_event_log_module" className="bg-brand-card border border-brand-border rounded p-5 shadow-xl flex flex-col h-[520px]">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-brand-border pb-4 mb-4 gap-3">
        <div>
          <h3 className="font-bold text-brand-text text-sm uppercase tracking-wider">Chronological Security Audit Log</h3>
          <p className="text-xs text-brand-muted">
            Real-time telemetry event records
          </p>
        </div>
        <button
          onClick={onClearAlerts}
          className="bg-brand-bg hover:bg-red-950/40 text-brand-text hover:text-red-400 border border-brand-border px-3 py-1.5 rounded-sm text-[10px] uppercase font-mono font-bold flex items-center justify-center gap-1.5 transition self-start cursor-pointer"
        >
          <Trash2 size={13} />
          <span>Reset Session Logs</span>
        </button>
      </div>

      {/* Filter bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 font-mono uppercase text-[10px]">
        {/* Type filter */}
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-brand-muted shrink-0" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="flex-1 bg-brand-bg border border-brand-border text-xs text-brand-text py-1.5 px-2 rounded-sm cursor-pointer focus:outline-none"
          >
            {alertTypes.map((t) => (
              <option key={t} value={t} className="bg-brand-bg">
                {t === "ALL" ? "All Warning Classes" : t.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div className="flex bg-brand-bg border border-brand-border p-1 rounded-sm text-xs">
          {["ALL", "unresolved", "flagged", "dismissed"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`flex-1 py-1 rounded-sm text-center transition capitalize text-[9px] font-bold tracking-wider cursor-pointer ${
                filterStatus === s 
                  ? "bg-brand-card text-brand-text border border-brand-border underline decoration-red-500 decoration-2 font-black shadow" 
                  : "text-brand-muted hover:text-brand-text"
              }`}
            >
              {s === "unresolved" ? "Open" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Events loop list */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 text-brand-text">
        {filteredAlerts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-brand-muted py-10 text-center gap-2">
            <CheckCircle2 size={36} className="text-brand-border" />
            <p className="text-xs text-brand-text font-bold uppercase font-mono tracking-wider">Perfect Integrity Record</p>
            <p className="text-[10px] text-brand-muted max-w-[210px] font-mono leading-relaxed">
              NO WARNING RECORDS REGISTERED. CANDIDATE COMPLIANCE IS OPTIMAL.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`border rounded p-3 bg-brand-bg/60 transition ${
                alert.status === "flagged" 
                  ? "border-red-500/40 shadow-red-500/5 bg-red-950/10" 
                  : alert.status === "dismissed" 
                    ? "border-brand-border opacity-50 bg-brand-bg/25" 
                    : "border-brand-border hover:border-brand-border/80"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] bg-brand-card text-brand-text border border-brand-border px-1.5 py-0.5 rounded font-semibold font-mono">
                      {alert.studentName ? `${alert.studentName} (Seat ${alert.seatNo})` : "Active User (Seat 01)"}
                    </span>
                    <span className={`text-[9px] uppercase font-mono font-bold px-2 py-0.5 rounded-sm ${getBadgeStyle(alert.type)}`}>
                      {alert.type}
                    </span>
                    <span className="text-[9px] text-[#6E7681] font-mono font-bold">
                      {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-brand-muted font-mono uppercase">
                    Yaw Offset: <strong className="text-brand-text">{alert.yawAngle}° deg</strong> • Conf: <strong className="text-brand-text">{(alert.confidence * 100).toFixed(0)}%</strong>
                  </p>
                </div>

                {/* Audit Action Status switches */}
                <div className="flex items-center gap-1 font-mono uppercase text-[9px]">
                  <button
                    onClick={() => onUpdateAlertStatus(alert.id, "flagged")}
                    className={`px-2 py-0.5 rounded-sm font-bold border transition cursor-pointer ${
                      alert.status === "flagged"
                        ? "bg-red-650 text-white border-red-500"
                        : "bg-brand-card/50 border-brand-border text-red-400 hover:bg-brand-card"
                    }`}
                    title="Flag Violation"
                  >
                    Flag
                  </button>
                  <button
                    onClick={() => onUpdateAlertStatus(alert.id, "dismissed")}
                    className={`px-2 py-0.5 rounded-sm font-bold border transition cursor-pointer ${
                      alert.status === "dismissed"
                        ? "bg-brand-border text-brand-text border-brand-border"
                        : "bg-brand-card/50 border-brand-border text-brand-muted hover:bg-brand-card"
                    }`}
                    title="Dismiss Warning"
                  >
                    Dismiss
                  </button>
                </div>
              </div>

              {/* Editable proctor note inside log card */}
              <div className="mt-2 text-[10px] border-t border-brand-border/60 pt-1.5 flex items-start gap-1">
                <span className="font-bold text-brand-muted uppercase font-mono mt-0.5 whitespace-nowrap">Audit note:</span>
                {editingNotesId === alert.id ? (
                  <div className="flex-1 flex gap-1 items-stretch">
                    <input
                      type="text"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Add integrity audit description..."
                      className="flex-1 bg-brand-card border border-brand-border rounded-sm px-1.5 py-0.5 text-brand-text placeholder-brand-muted focus:outline-none"
                    />
                    <button
                      onClick={() => saveNote(alert.id)}
                      className="bg-brand-text hover:bg-brand-text/90 text-brand-bg font-bold px-1.5 rounded-sm cursor-pointer"
                    >
                      <Check size={11} />
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex justify-between items-center group/note text-[10px]">
                    <span className="text-brand-muted italic font-sans">
                      {alert.notes || "Click edit icon to add proctoring assessment notes..."}
                    </span>
                    <button
                      onClick={() => startEditingNote(alert)}
                      className="text-[#6E7681] hover:text-red-500 opacity-60 hover:opacity-100 transition p-0.5 cursor-pointer"
                    >
                      <Edit2 size={10} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
