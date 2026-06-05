import React from "react";
import { AlertEvent, SessionStats } from "../types";
import { Shield, Clock, ShieldAlert, Wifi, Activity, Smartphone, EyeOff, Navigation } from "lucide-react";

interface StatsCardsProps {
  alerts: AlertEvent[];
  stats: SessionStats;
  elapsedTimeStr: string;
}

export default function StatsCards({ alerts, stats, elapsedTimeStr }: StatsCardsProps) {
  // Score color determinations
  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-[#1A4631] bg-[#1A4631]/10 border-[#1A4631]/20";
    if (score >= 60) return "text-brand-text bg-brand-card border-brand-border";
    return "text-red-500 bg-red-510/10 border-red-500/20 bg-red-500/5";
  };

  const getScoreVerdict = (score: number) => {
    if (score >= 85) return "PRISTINE HONESTY (PASSED)";
    if (score >= 60) return "SUSPICIOUS ACTIVITY (WARNING)";
    return "FAIL / CANDIDATE DISQUALIFICATION";
  };

  const getScoreProgressWidth = (score: number) => {
    return `${score}%`;
  };

  // Infractions calculation
  const phoneCount = alerts.filter(a => a.type === "Phone Detected").length;
  const turnsCount = alerts.filter(a => a.type === "Looking Left" || a.type === "Looking Right").length;
  const behindCount = alerts.filter(a => a.type === "Looking Behind").length;
  const oscCount = alerts.filter(a => a.type === "Frequent Head Movement").length;
  const prolongCount = alerts.filter(a => a.type === "Prolonged Side Viewing").length;

  return (
    <div id="stats_cards_grid" className="space-y-6">
      {/* 1. Main Row: Integrity Index & Duration */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Integrity score card */}
        <div className={`sm:col-span-2 border rounded p-5 flex flex-col justify-between shadow-lg transition duration-305 hover:scale-[1.01] ${getScoreColor(stats.integrityScore)}`}>
          <div className="flex items-center justify-between uppercase tracking-wider font-bold">
            <span className="text-[10px] font-mono tracking-widest opacity-90">DIU Honesty Integrity Code</span>
            <Shield size={18} className="opacity-80" />
          </div>
          <div className="my-3 flex items-baseline gap-2.5">
            <span className="text-4xl font-mono font-extrabold tracking-tight">
              {stats.integrityScore}
            </span>
            <span className="text-base font-semibold opacity-70">/ 100</span>
          </div>

          <div className="space-y-2">
            <div className="w-full bg-black/40 rounded-sm h-2.5 overflow-hidden border border-brand-border">
              <div 
                className={`h-full transition-all duration-500 ${
                  stats.integrityScore >= 85 ? "bg-[#1A4631]" : stats.integrityScore >= 60 ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: getScoreProgressWidth(stats.integrityScore) }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono font-bold tracking-wider uppercase">
              <span>Verdict: {getScoreVerdict(stats.integrityScore)}</span>
              <span>{stats.integrityScore}% Honest</span>
            </div>
          </div>
        </div>

        {/* Timer stats */}
        <div className="bg-brand-card border border-brand-border rounded p-5 flex flex-col justify-between shadow-lg text-brand-text transition duration-305 hover:scale-[1.01]">
          <div className="flex items-center justify-between text-brand-muted uppercase font-bold">
            <span className="text-[10px] font-mono tracking-widest">Elapsed Exam Time</span>
            <Clock size={16} className="text-[#1A4631]" />
          </div>
          <div className="my-4">
            <span className="text-3xl font-bold tracking-tight font-mono text-brand-text">
              {elapsedTimeStr}
            </span>
            <p className="text-[10px] text-brand-muted mt-1 uppercase font-mono">
              ACTIVE REC SOCKET UP
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] text-[#1A4631] font-mono uppercase font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1A4631] animate-ping"></span>
            <span>PROCTOR FEED ACTIVE</span>
          </div>
        </div>
      </div>

      {/* 2. Breakdown Infractions row */}
      <div className="bg-brand-card border border-brand-border rounded p-5 shadow-lg">
        <h3 className="text-[10px] font-bold text-brand-text uppercase tracking-widest mb-4 flex items-center justify-between font-mono">
          <span>Infractions Diagnostic Grid</span>
          <span className="text-[9px] bg-brand-bg text-brand-muted px-2 py-0.5 rounded border border-brand-border">
            {alerts.length} Total Warnings
          </span>
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          {/* Card 1: Phones */}
          <div className="bg-brand-bg border border-brand-border rounded p-3 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[9px] uppercase font-mono font-bold text-brand-muted">Cellphone Holds</span>
              <Smartphone size={14} className={phoneCount > 0 ? "text-red-500" : "text-brand-muted"} />
            </div>
            <div className="mt-3">
              <span className={`text-xl font-mono font-extrabold ${phoneCount > 0 ? "text-red-500" : "text-brand-text"}`}>
                {phoneCount}
              </span>
              <p className="text-[8px] text-[#6E7681] font-mono mt-0.5 uppercase">YOLOv8 CLS:63</p>
            </div>
          </div>

          {/* Card 2: Head turns */}
          <div className="bg-brand-bg border border-brand-border rounded p-3 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[9px] uppercase font-mono font-bold text-brand-muted">Head Turns</span>
              <Navigation size={14} className={turnsCount > 0 ? "text-red-500 rotate-90" : "text-brand-muted"} />
            </div>
            <div className="mt-3">
              <span className={`text-xl font-mono font-extrabold ${turnsCount > 0 ? "text-red-500" : "text-brand-text"}`}>
                {turnsCount}
              </span>
              <p className="text-[8px] text-[#6E7681] font-mono mt-0.5 uppercase">YAW DEP LIMIT</p>
            </div>
          </div>

          {/* Card 3: Looking Behind */}
          <div className="bg-brand-bg border border-brand-border rounded p-3 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <span className="text-[9px] uppercase font-mono font-bold text-brand-muted">Look Behind</span>
              <EyeOff size={14} className={behindCount > 0 ? "text-red-500" : "text-brand-muted"} />
            </div>
            <div className="mt-3">
              <span className={`text-xl font-mono font-extrabold ${behindCount > 0 ? "text-red-500" : "text-brand-text"}`}>
                {behindCount}
              </span>
              <p className="text-[8px] text-[#6E7681] font-mono mt-0.5 uppercase">Rotated &gt;70°</p>
            </div>
          </div>

          {/* Card 4: Frequent moves */}
          <div className="bg-brand-bg border border-brand-border rounded p-3 flex flex-col justify-between">
            <div className="flex justify-between items-start font-mono">
              <span className="text-[9px] uppercase font-bold text-brand-muted">Oscillations</span>
              <Activity size={14} className={oscCount > 0 ? "text-red-500" : "text-brand-muted"} />
            </div>
            <div className="mt-3">
              <span className={`text-xl font-mono font-extrabold ${oscCount > 0 ? "text-red-500" : "text-brand-text"}`}>
                {oscCount}
              </span>
              <p className="text-[8px] text-[#6E7681] font-mono mt-0.5 uppercase">ROLLING 10S</p>
            </div>
          </div>

          {/* Card 5: Prolonged side look */}
          <div className="bg-brand-bg border border-brand-border rounded p-3 flex flex-col justify-between col-span-2 md:col-span-1">
            <div className="flex justify-between items-start font-mono">
              <span className="text-[9px] uppercase font-bold text-brand-muted">Prolonged Side</span>
              <ShieldAlert size={14} className={prolongCount > 0 ? "text-red-500" : "text-brand-muted"} />
            </div>
            <div className="mt-3">
              <span className={`text-xl font-mono font-extrabold ${prolongCount > 0 ? "text-red-500" : "text-brand-text"}`}>
                {prolongCount}
              </span>
              <p className="text-[8px] text-[#6E7681] font-mono mt-0.5 uppercase">Sustained &gt;3s</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
