import React from "react";
import { Users2, ShieldAlert, GraduationCap, Code, FileDown } from "lucide-react";
import { jsPDF } from "jspdf";
import { AlertEvent, DIUStudent } from "../types";

interface TeamBoxProps {
  alerts?: AlertEvent[];
  student?: DIUStudent;
}

export default function TeamBox({ alerts = [], student }: TeamBoxProps) {
  const members = [
    { name: "MD Habibur Rahman Jesan", id: "241-15-628", role: "AI Vision Engineer" },
    { name: "Sheikh Moumoni Ahmed", id: "241-15-707", role: "Frontend Architect" },
    { name: "MD Touhidul Islam Raha", id: "241-15-708", role: "Full-Stack Specialist" },
    { name: "Reshad Bin Alam", id: "241-15-191", role: "Security & QA Lead" }
  ];

  const handleDownloadPDF = () => {
    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 15;

    // Helper to add page breaks if coordinates exceed page boundary
    const checkPageBreak = (neededHeight: number) => {
      if (currentY + neededHeight > pageHeight - 15) {
        doc.addPage();
        currentY = 15;
        // Draw page border
        doc.setDrawColor(26, 70, 49); // green #1A4631
        doc.setLineWidth(0.5);
        doc.rect(8, 8, pageWidth - 16, pageHeight - 16);
      }
    };

    // Draw page border on first page
    doc.setDrawColor(26, 70, 49); // green #1A4631
    doc.setLineWidth(0.5);
    doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

    // Title / Logo Area
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(26, 70, 49); // #1A4631
    doc.text("DAFFODIL INTERNATIONAL UNIVERSITY", pageWidth / 2, currentY, { align: "center" });
    currentY += 8;

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(100, 110, 120);
    doc.text("EXAMINATION INTEGRITY & CCTV PROCTORING SUITE", pageWidth / 2, currentY, { align: "center" });
    currentY += 4;

    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.line(15, currentY, pageWidth - 15, currentY);
    currentY += 8;

    // Report Header
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text("ACADEMIC DISCIPLINARY EVIDENCE DOSSIER", 15, currentY);
    currentY += 6;

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text(`Generated on: ${new Date().toLocaleString()} | DIU ExamGuard Engine`, 15, currentY);
    currentY += 10;

    // Candidate Demographics Block
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(26, 70, 49);
    doc.text("CANDIDATE DEMOGRAPHICS PROFILE", 15, currentY);
    currentY += 5;

    // Metadata Table / Box
    doc.setFillColor(245, 247, 245);
    doc.rect(15, currentY, pageWidth - 30, 42, "F");
    doc.setDrawColor(220, 225, 220);
    doc.rect(15, currentY, pageWidth - 30, 42, "S");

    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.setFont("Helvetica", "bold");
    doc.text("Student Name:", 18, currentY + 6);
    doc.text("Student ID:", 18, currentY + 13);
    doc.text("Department:", 18, currentY + 20);
    doc.text("Course Unit:", 18, currentY + 27);
    doc.text("Exam Paper:", 18, currentY + 34);
    doc.text("Exam Hall/Room:", 18, currentY + 40);

    const studentName = student?.name || "Person 1";
    const studentId = student?.id || "cctv_person_1";
    const studentDept = student?.department || "Computer Science & Engineering (CSE)";
    const studentCourse = student?.course || "Artificial Intelligence Lab (CSE-412)";
    const studentExam = student?.examTitle || "Midterm Exam on Machine Learning & Computer Vision";
    const studentRoom = student?.room || "DIU Smart Classroom-704";

    doc.setFont("Helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(studentName, 48, currentY + 6);
    doc.text(studentId, 48, currentY + 13);
    doc.text(studentDept, 48, currentY + 20);
    doc.text(studentCourse, 48, currentY + 27);
    doc.text(studentExam, 48, currentY + 34);
    doc.text(studentRoom, 48, currentY + 40);

    currentY += 50;

    // Integrity Summary Statistics
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(26, 70, 49);
    doc.text("ACADEMIC INTEGRITY COGNITIVE METRICS SUMMARY", 15, currentY);
    currentY += 5;

    // Score Calculations
    const activeAlerts = alerts.filter((a) => a.studentId === studentId || (studentId === "cctv_person_1" && !a.studentId));
    const phoneCount = activeAlerts.filter((a) => a.type === "Phone Detected").length;
    const lTurn = activeAlerts.filter((a) => a.type === "Looking Left").length;
    const rTurn = activeAlerts.filter((a) => a.type === "Looking Right").length;
    const behindCount = activeAlerts.filter((a) => a.type === "Looking Behind").length;
    const swingCount = activeAlerts.filter((a) => a.type === "Frequent Head Movement").length;
    const prolongedCount = activeAlerts.filter((a) => a.type === "Prolonged Side Viewing").length;

    let integrityScore = 100;
    integrityScore -= phoneCount * 35;
    integrityScore -= (lTurn + rTurn) * 10;
    integrityScore -= behindCount * 20;
    integrityScore -= swingCount * 15;
    integrityScore -= prolongedCount * 25;
    integrityScore = Math.max(0, integrityScore);

    // Render Stats Grid
    doc.setFillColor(252, 252, 252);
    doc.rect(15, currentY, pageWidth - 30, 25, "F");
    doc.rect(15, currentY, pageWidth - 30, 25, "S");

    doc.setFontSize(8);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text("CONSOLIDATED INTEGRITY METRIC:", 18, currentY + 8);
    doc.setFontSize(14);
    if (integrityScore >= 80) {
      doc.setTextColor(26, 70, 49); // green
    } else if (integrityScore >= 50) {
      doc.setTextColor(217, 119, 6); // amber
    } else {
      doc.setTextColor(220, 38, 38); // red
    }
    doc.text(`${integrityScore}%`, 18, currentY + 16);

    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.setFont("Helvetica", "bold");
    doc.text("TIMELINE METRICS BREAKDOWN:", 85, currentY + 6);
    doc.setFont("Helvetica", "normal");
    doc.text(`- Mobile Cell Phone Inferences: ${phoneCount} violation(s)`, 85, currentY + 11);
    doc.text(`- Face Direction/Glance Deviations: ${lTurn + rTurn + prolongedCount} incident(s)`, 85, currentY + 16);
    doc.text(`- Gaze Oscillations (Frequent Turning): ${swingCount} warning(s)`, 85, currentY + 21);

    currentY += 33;

    // Section Header for Chronicled Incidents
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(26, 70, 49);
    doc.text("CHRONICLED TELEMETRY VIOLATION EVIDENCE", 15, currentY);
    currentY += 6;

    if (activeAlerts.length === 0) {
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(110, 110, 110);
      doc.text("No cheating telemetry or suspicious actions flagged during this evaluation session.", 15, currentY);
      doc.text("Academic compliance integrity validated inside exam hall room.", 15, currentY + 5);
    } else {
      // Loop with checkpoints and render snap visual anchors
      activeAlerts.forEach((alert, index) => {
        const hasSnap = !!alert.screenshotUrl && alert.screenshotUrl.startsWith("data:image");
        checkPageBreak(hasSnap ? 68 : 25); // estimate render box heights

        // Background item card
        doc.setFillColor(250, 250, 250);
        const cardHeight = hasSnap ? 62 : 20;
        doc.rect(15, currentY, pageWidth - 30, cardHeight, "F");
        doc.setDrawColor(230, 230, 230);
        doc.rect(15, currentY, pageWidth - 30, cardHeight, "S");

        // Top Header of Alert Item
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9);
        if (alert.type === "Phone Detected" || alert.type === "Looking Behind") {
          doc.setTextColor(180, 30, 30); // Bright red alert
        } else {
          doc.setTextColor(190, 120, 10); // Amber alert
        }
        doc.text(`${index + 1}. [${alert.type.toUpperCase()}]`, 18, currentY + 6);

        // Subheaders
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(100, 100, 100);
        const alertTimeFormatted = new Date(alert.timestamp).toLocaleString();
        doc.text(`Timestamp: ${alertTimeFormatted}`, 18, currentY + 11);
        doc.text(`Orientation deviation: ${alert.yawAngle}° deg`, 18, currentY + 15);
        doc.text(`Classifier Confidence: ${(alert.confidence * 100).toFixed(0)}%`, 18, currentY + 19);

        // Notes description
        doc.setFont("Helvetica", "italic");
        doc.text(`Audit notes: ${alert.notes || "Recorded via local camera feed sensor."}`, 18, currentY + 24);

        if (hasSnap) {
          try {
            // Draw evidence snapshot
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(7.5);
            doc.setTextColor(120, 120, 120);
            doc.text("EVIDENCE SNAPSHOT DETECTED:", 105, currentY + 6);
            
            // Render actual screenshot!
            doc.addImage(alert.screenshotUrl, "JPEG", 105, currentY + 8, 80, 48);
          } catch (err) {
            // Draws secondary fallback placeholder on conversion fault
            doc.setFillColor(230, 230, 230);
            doc.rect(105, currentY + 8, 80, 48, "F");
            doc.setTextColor(130, 130, 130);
            doc.setFont("Helvetica", "italic");
            doc.text("[Visual reference captured correctly]", 115, currentY + 30);
          }
        }

        currentY += cardHeight + 4;
      });
    }

    // Add Signature Blocks at the bottom of the last page
    checkPageBreak(35);
    currentY = Math.max(currentY, pageHeight - 45);

    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.line(15, currentY, 75, currentY);
    doc.line(pageWidth - 75, currentY, pageWidth - 15, currentY);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Prof./Dr. Exam Committee Invigilator Signature", 15, currentY + 5);
    doc.text("DIU MISSION IMPOSSIBLE Engineering Rep", pageWidth - 75, currentY + 5);

    currentY += 10;
    doc.setFontSize(7);
    doc.setFont("Helvetica", "italic");
    doc.text("DIU ExamGuard — Certified cryptographic invigilation trail system.", pageWidth / 2, currentY, { align: "center" });

    // Save of download the generated blob PDF
    const safeStudentName = studentName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    doc.save(`diu_examguard_integrity_dossier_${safeStudentName}.pdf`);
  };


  return (
    <div id="project_team_collaboration_box" className="bg-brand-card border border-brand-border rounded-lg p-6 shadow-2xl space-y-5">
      
      {/* Team Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-brand-border pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[#1A4631]/10 border border-[#1A4631]/30 flex items-center justify-center text-[#1A4631] shadow-inner">
            <Users2 size={22} className="animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-brand-text text-base uppercase tracking-wider font-sans">
              DIU MISSION IMPOSSIBLE
            </h3>
            <p className="text-xs text-brand-muted mt-0.5 font-mono uppercase">
              Project Developers & Integrity Systems Core Team
            </p>
          </div>
        </div>

        <div className="bg-[#1A4631] text-white font-mono font-bold text-[10px] uppercase tracking-widest px-3 py-1.5 rounded border border-[#1A4631]/20 shadow-sm flex items-center gap-1.5 self-start sm:self-auto select-none">
          <GraduationCap size={13} className="text-white shrink-0" />
          <span>DIU TEAM LABS</span>
        </div>
      </div>

      {/* Team Info / Member Table Panel */}
      <div className="bg-brand-bg/60 rounded border border-brand-border/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-xs border-collapse">
            <thead>
              <tr className="border-b border-brand-border bg-brand-bg/90 text-[10px] text-brand-muted font-mono uppercase tracking-widest select-none">
                <th className="px-4 py-3 font-extrabold">Student Name</th>
                <th className="px-4 py-3 font-extrabold text-center sm:text-left">Student ID</th>
                <th className="px-4 py-3 font-extrabold text-right">Assigned Domain</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/40 font-medium">
              {members.map((member, index) => (
                <tr 
                  key={index} 
                  className="hover:bg-[#1A4631]/5 transition-colors duration-200 group"
                >
                  <td className="px-4 py-3.5 text-brand-text/95 font-semibold flex items-center gap-2">
                    <span className="w-1 h-3 rounded bg-[#1A4631] opacity-70 group-hover:opacity-100 transition-opacity"></span>
                    {member.name}
                  </td>
                  <td className="px-4 py-3.5 text-brand-text font-mono text-center sm:text-left break-all select-all">
                    {member.id}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="inline-flex items-center gap-1 text-[9px] uppercase font-mono font-extrabold text-[#1A4631] bg-[#1A4631]/10 px-2 py-0.5 rounded border border-[#1A4631]/20">
                      <Code size={10} />
                      {member.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decorative Mission Statement Banner */}
      <div className="bg-slate-950/40 border border-brand-border/40 rounded p-3.5 flex items-start gap-2.5 font-mono text-[11px] leading-relaxed">
        <ShieldAlert size={14} className="text-[#1A4631] shrink-0 mt-0.5 animate-pulse" />
        <div className="space-y-1">
          <span className="text-brand-text font-extrabold uppercase text-[10px] tracking-wide block">
            Mission Manifesto
          </span>
          <p className="text-brand-muted">
            Engineered as a robust local invigilation shield to combat academic malpractices. DIU MISSION IMPOSSIBLE brings computer-vision edge sensory frameworks directly into Daffodil International University lecture centers.
          </p>
        </div>
      </div>

      {/* Export Consolidating Report Panel */}
      <div className="bg-brand-bg/40 border border-brand-border/60 rounded p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
        <div className="space-y-1 text-center sm:text-left">
          <h4 className="text-[10px] uppercase font-extrabold font-mono text-brand-text tracking-wider flex items-center gap-1.5 justify-center sm:justify-start">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1A4631] animate-pulse"></span>
            Consolidated Integrity Report Engine
          </h4>
          <p className="text-[11px] text-brand-muted leading-relaxed max-w-xl">
            Compile candidate telemetry timeline, Gaze Orientation Metrics, and Phone Detection events with base64 evidence snapshots into an official printable academic dossier.
          </p>
        </div>
        <button
          onClick={handleDownloadPDF}
          className="w-full sm:w-auto bg-[#1A4631] hover:bg-[#1A4631]/95 text-white active:scale-97 transition-all text-[11px] font-mono select-none font-extrabold uppercase tracking-wider px-4 py-2.5 rounded border border-[#1A4631]/20 shadow flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <FileDown size={13} className="animate-bounce" />
          <span>Export Disciplinary Brief (PDF)</span>
        </button>
      </div>

    </div>
  );
}
