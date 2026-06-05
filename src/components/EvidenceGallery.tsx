import React, { useState } from "react";
import { AlertEvent } from "../types";
import { Eye, ImageIcon } from "lucide-react";

interface EvidenceGalleryProps {
  alerts: AlertEvent[];
}

export default function EvidenceGallery({ alerts }: EvidenceGalleryProps) {
  const [selectedSnapshot, setSelectedSnapshot] = useState<AlertEvent | null>(null);

  // Filter alerts that have a captured snapshot image
  const snapshotAlerts = alerts.filter((a) => !!a.screenshotUrl);

  const getOverlayBadge = (type: string) => {
    switch (type) {
      case "Phone Detected":
        return "bg-red-650 text-white border border-red-500";
      case "Looking Behind":
        return "bg-red-650 text-white border border-red-500";
      default:
        return "bg-brand-bg text-brand-text border border-brand-border";
    }
  };

  return (
    <div id="evidence_gallery_view" className="bg-brand-card border border-brand-border rounded p-5 shadow-xl">
      <div className="flex items-center justify-between border-b border-brand-border pb-4 mb-4">
        <div>
          <h3 className="font-bold text-brand-text text-sm flex items-center gap-2 uppercase tracking-wide">
            <ImageIcon size={18} className="text-[#1A4631]" />
            <span>Captured Video Snapshots Gallery</span>
          </h3>
          <p className="text-xs text-brand-muted mt-0.5">
            Automatically captured photo logs of integrity alarms ({snapshotAlerts.length})
          </p>
        </div>
      </div>

      {snapshotAlerts.length === 0 ? (
        <div className="py-12 border border-brand-border bg-brand-bg rounded flex flex-col items-center justify-center text-center p-6 text-brand-muted">
          <ImageIcon size={32} className="text-[#6E7681] mb-2.5" />
          <p className="text-xs font-bold text-brand-text uppercase font-mono tracking-wider">No Snapshot Evidence Captured</p>
          <p className="text-[10px] text-brand-muted mt-1 max-w-[280px] font-mono leading-relaxed uppercase">
            Once a phone is detected or parameters exceed thresholds, snapshots appear instantly.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
          {snapshotAlerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => setSelectedSnapshot(alert)}
              className="group border border-brand-border rounded overflow-hidden bg-brand-bg hover:border-brand-text cursor-pointer transition relative shadow-lg"
            >
              {/* Snapshot image thumbnail */}
              <div className="aspect-[4/3] w-full bg-black overflow-hidden relative border-b border-brand-border">
                <img
                  src={alert.screenshotUrl}
                  alt={alert.type}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                
                {/* Visual hover inspect overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                  <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-brand-bg bg-brand-text px-2 py-1 rounded-sm shadow-xl flex items-center gap-1">
                    <Eye size={10} />
                    <span>Inspect</span>
                  </span>
                </div>

                {/* Tag */}
                <span className={`absolute bottom-1 px-1.5 py-0.5 rounded-sm text-[8px] font-mono font-bold uppercase left-1 shadow ${getOverlayBadge(alert.type)}`}>
                  {alert.type}
                </span>
              </div>

              {/* Timestamp text */}
              <div className="p-2 text-brand-text bg-brand-bg">
                <div className="text-[10px] text-brand-text font-bold truncate mb-0.5" title={alert.studentName || "Active Candidate"}>
                  {alert.studentName ? `${alert.studentName} (Seat ${alert.seatNo})` : "Active Exam User"}
                </div>
                <div className="text-[9px] font-mono font-semibold flex justify-between">
                  <span>{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  <span className="text-red-500 font-bold">{alert.yawAngle}°</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enlarged snap Inspect Modal */}
      {selectedSnapshot && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-brand-card border border-brand-border rounded max-w-lg w-full overflow-hidden shadow-2xl relative">
            <div className="bg-brand-bg p-4 border-b border-brand-border flex justify-between items-center">
              <div>
                <h4 className="font-bold text-brand-text text-sm flex items-center gap-2 uppercase tracking-wide">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                  <span>{selectedSnapshot.type}</span>
                </h4>
                <p className="text-[10px] text-brand-muted font-mono mt-0.5">
                  STUDENT: <span className="text-brand-text font-bold">{selectedSnapshot.studentName || "Active Exam User"} (Seat {selectedSnapshot.seatNo || "01"})</span> • {new Date(selectedSnapshot.timestamp).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedSnapshot(null)}
                className="text-brand-text hover:text-white bg-brand-bg border border-brand-border px-3 py-1 text-xs uppercase font-mono font-bold rounded-sm cursor-pointer hover:bg-brand-bg/80"
              >
                Close
              </button>
            </div>

            {/* Photo body */}
            <div className="aspect-[4/3] bg-black relative w-full border-b border-brand-border">
              <img
                src={selectedSnapshot.screenshotUrl}
                alt={selectedSnapshot.type}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Diagnostics information */}
            <div className="p-4 space-y-3.5 bg-brand-bg/40">
              <div className="grid grid-cols-2 gap-4 text-xs uppercase font-mono font-bold">
                <div className="bg-brand-card/75 p-2.5 rounded-sm border border-brand-border">
                  <span className="text-[9px] text-[#6E7681] block mb-1">Yaw Direction Angle</span>
                  <span className="text-brand-text font-mono font-bold">{selectedSnapshot.yawAngle}° deg</span>
                </div>
                <div className="bg-brand-card/75 p-2.5 rounded-sm border border-brand-border">
                  <span className="text-[9px] text-[#6E7681] block mb-1">Cheating Confidence</span>
                  <span className="text-red-500 font-mono font-bold">{(selectedSnapshot.confidence * 100).toFixed(1)}% Score</span>
                </div>
              </div>

              {selectedSnapshot.notes && (
                <div className="bg-brand-card/75 p-3 rounded-sm text-xs border border-brand-border text-brand-text">
                  <span className="text-[9px] font-mono text-[#6E7681] uppercase font-bold block mb-1">Proctor Incident Feedback</span>
                  <p className="text-[#e2e8f0] italic font-sans">"{selectedSnapshot.notes}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
