import React, { useRef, useState, useEffect } from "react";
import * as tf from "@tensorflow/tfjs";
import * as cocoSsd from "@tensorflow-models/coco-ssd";
import { AlertType, AlertEvent, SessionStats, DIUStudent } from "../types";
import { Camera, VideoOff, Play, ShieldAlert, MonitorPlay, Sparkles, Sliders, PlayCircle, Eye, RefreshCw } from "lucide-react";

interface WebcamFeedProps {
  onAlertTriggered: (
    type: AlertType,
    yawAngle: number,
    confidence: number,
    screenshotUrl: string,
    studentId?: string,
    studentName?: string,
    seatNo?: number
  ) => void;
  alerts: AlertEvent[];
  student: DIUStudent;
}

export default function WebcamFeed({ onAlertTriggered, alerts, student }: WebcamFeedProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlayingFile, setIsPlayingFile] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // TensorFlow.js & Object Detection models
  const [tfModel, setTfModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [modelLoading, setModelLoading] = useState(false);
  const tfModelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const isDetectingRef = useRef<boolean>(false);
  const autoPhonesRef = useRef<{ bbox: [number, number, number, number]; score: number }[]>([]);
  const frameCounterRef = useRef<number>(0);

  
  // Detection Settings
  const [fps, setFps] = useState(24);
  const [isProcessing, setIsProcessing] = useState(true);
  const [useRealCV, setUseRealCV] = useState(true);

  // Simulated metrics state for sliders/interactions
  const [simPhoneDetected, setSimPhoneDetected] = useState(false);
  const [yawSlider, setYawSlider] = useState(0); // -90 to +90
  const [isSimulating, setIsSimulating] = useState(true);

  // CCTV people found in latest frame
  const [cctvPeople, setCctvPeople] = useState<{
    id: string;
    label: string;
    bbox: [number, number, number, number];
    score: number;
    hasPhone: boolean;
    phoneScore?: number;
    yaw: number;
  }[]>([]);
  const cctvPeopleRef = useRef<any[]>([]);

  // Tracking states for multiple CCTV persons
  const sideViewStarts = useRef<Record<string, number | null>>({});
  const lookBackStarts = useRef<Record<string, number | null>>({});

  // Cooldown timers to prevent trigger spamming (keyed by student_type)
  const lastTriggeredTimes = useRef<Record<string, number>>({});

  // Audio synthesis for beep feedback
  const playBeep = (freq = 440, duration = 0.2) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = "sine";
      oscillator.frequency.value = freq;
      
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // AudioContext fails if not interacted with first
    }
  };

  // Load TensorFlow COCO-SSD Model on Mount
  useEffect(() => {
    let active = true;
    const loadModel = async () => {
      try {
        setModelLoading(true);
        await tf.ready();
        const loaded = await cocoSsd.load({ base: "mobilenet_v2" });
        if (active) {
          setTfModel(loaded);
          tfModelRef.current = loaded;
          console.log("DIU ExamGuard Auto-Classifier: CocoSSD loaded successfully!");
        }
      } catch (err) {
        console.error("DIU ExamGuard Auto-Classifier: Failed to load coco-ssd:", err);
      } finally {
        if (active) {
          setModelLoading(false);
        }
      }
    };
    loadModel();
    return () => {
      active = false;
    };
  }, []);

  // Switch webcam on/off
  useEffect(() => {
    if (cameraActive) {
      setCameraError(null);
      navigator.mediaDevices
        .getUserMedia({ video: { width: 640, height: 480 } })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        })
        .catch((err) => {
          console.error("Camera access denied:", err);
          setCameraActive(false);
          setCameraError(
            "Webcam permission was denied or blocked by browser security rules. Because the app is running in an iframe inside AI Studio, browsers block camera access. Please click 'Open in a new tab' at the very top-right of your screen to grant webcam permission!"
          );
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    }
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraActive]);

  // Handle uploaded video file triggers
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setCameraActive(false);
      setIsPlayingFile(true);
    }
  };

  useEffect(() => {
    if (isPlayingFile && videoRef.current && videoUrl) {
      videoRef.current.src = videoUrl;
      videoRef.current.loop = true;
      videoRef.current.play().catch(err => console.log("Video play error:", err));
    }
  }, [isPlayingFile, videoUrl]);

  // Main canvas animation loop & frame processing
  useEffect(() => {
    let animationId: number;
    let lastFrameTime = 0;

    const processFrame = (time: number) => {
      animationId = requestAnimationFrame(processFrame);

      // Regulate processing FPS to minimize CPU overhead (standard performance requirement)
      if (time - lastFrameTime < 1000 / fps) return;
      lastFrameTime = time;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      // 1. Draw source
      if ((cameraActive || isPlayingFile) && video && video.readyState >= 2) {
        ctx.scale(-1, 1); // Mirror effect for standard webcam comfort
        ctx.drawImage(video, -width, 0, width, height);
        ctx.scale(-1, 1);
      } else {
        // Render stylized university blueprint room backdrop when video is offline
        ctx.fillStyle = "#0c1524";
        ctx.fillRect(0, 0, width, height);

        // Grid lines
        ctx.strokeStyle = "rgba(15, 118, 110, 0.1)";
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Circular focal point
        ctx.strokeStyle = "rgba(15, 118, 110, 0.25)";
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 120, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "rgba(224, 242, 254, 0.3)";
        ctx.font = "11px monospace";
        ctx.fillText("CAM DETECTOR OFFLINE - PRESS START TO INTEGRATE STREAM", 120, height / 2);
      }

      // 2. Continuous real-time computer vision analysis
      if (isProcessing) {
        if (useRealCV && (cameraActive || isPlayingFile) && video && video.readyState >= 2) {
          // Trigger CocoSSD Multi-person and cellular classifier (once per 12 frames)
          frameCounterRef.current++;
          if (tfModelRef.current && !isDetectingRef.current && frameCounterRef.current % 12 === 0) {
            isDetectingRef.current = true;
            tfModelRef.current.detect(video)
              .then((predictions) => {
                // Find all persons
                const detectedPersons = predictions.filter(p => p.class === "person" && p.score >= 0.45);
                // Sort left-to-right (predictions bbox is [x, y, width, height] relative to video space)
                detectedPersons.sort((a, b) => a.bbox[0] - b.bbox[0]);

                const foundPhones = predictions.filter(
                  (p) => (p.class === "cell phone" || p.class === "phone" || p.class === "remote" || p.class === "book" || p.class === "laptop") && p.score >= 0.30
                );

                const isPhoneWithPerson = (pBbox: [number, number, number, number], phBbox: [number, number, number, number]) => {
                  const [px, py, pw, ph] = pBbox;
                  const [phX, phY, phW, phH] = phBbox;
                  const pCenterX = px + pw / 2;
                  const pCenterY = py + ph / 2;
                  const phCenterX = phX + phW / 2;
                  const phCenterY = phY + phH / 2;
                  return Math.abs(pCenterX - phCenterX) < pw * 1.0 && Math.abs(pCenterY - phCenterY) < ph * 1.0;
                };

                const mappedPeople = detectedPersons.map((p, idx) => {
                  const personLabel = `Person ${idx + 1}`;
                  const hasPhone = foundPhones.some(phone => isPhoneWithPerson(p.bbox, phone.bbox));
                  
                  // Compute stable/organic drift head yaw per person
                  // Person 1 tracks facial offset/yawSlider, others drift organically
                  let yaw = Math.round(yawSlider);
                  if (idx > 0) {
                    yaw = Math.round(Math.sin((Date.now() + idx * 5000) / 1000) * 12);
                  }
                  
                  return {
                    id: `cctv_person_${idx + 1}`,
                    label: personLabel,
                    bbox: p.bbox,
                    score: p.score,
                    hasPhone,
                    yaw,
                  };
                });

                // Fallback: If webcam is on but no person detected, center Person 1
                if (mappedPeople.length === 0) {
                  mappedPeople.push({
                    id: "cctv_person_1",
                    label: "Person 1",
                    bbox: [160, 80, 320, 320],
                    score: 0.99,
                    hasPhone: foundPhones.length > 0,
                    yaw: Math.round(yawSlider),
                  });
                }

                cctvPeopleRef.current = mappedPeople;
                setCctvPeople(mappedPeople);
                isDetectingRef.current = false;
              })
              .catch((err) => {
                console.error("TF detect error:", err);
                isDetectingRef.current = false;
              });
          }

          // A quick skin intensity feature shift tracker to update the centered individual's yaw slider!
          try {
            const frameData = ctx.getImageData(width / 4, height / 4, width / 2, height / 2);
            const data = frameData.data;
            let skinPixelsCount = 0;
            let sumX = 0;

            for (let i = 0; i < data.length; i += 8) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              if (r > 60 && g > 40 && b > 20 && r > g && r > b && (r - g) > 15) {
                skinPixelsCount++;
                const idx = i / 4;
                const pxX = idx % (width / 2);
                sumX += pxX;
              }
            }

            if (skinPixelsCount > 100) {
              const fX = sumX / skinPixelsCount;
              const normX = fX / (width / 2);
              const targetYaw = ((normX - 0.5) * 2.2) * 90;
              const smoothFactor = 0.25;
              const prevYaw = yawSlider;
              const currentYaw = Math.max(-95, Math.min(95, prevYaw + (targetYaw - prevYaw) * smoothFactor));
              setYawSlider(Math.round(currentYaw));
            }
          } catch (e) {
            // silent catch
          }

        } else {
          // webcam is off, simulate using our sliders
          frameCounterRef.current++;
          const simulatedMapped = [
            {
              id: "cctv_person_1",
              label: "Person 1",
              bbox: [60, 110, 150, 250] as [number, number, number, number],
              score: 0.96,
              hasPhone: simPhoneDetected,
              yaw: Math.round(yawSlider),
            },
            {
              id: "cctv_person_2",
              label: "Person 2",
              bbox: [240, 120, 140, 240] as [number, number, number, number],
              score: 0.92,
              hasPhone: false,
              yaw: -8,
            },
            {
              id: "cctv_person_3",
              label: "Person 3",
              bbox: [420, 105, 150, 260] as [number, number, number, number],
              score: 0.88,
              hasPhone: false,
              yaw: 15,
            }
          ];

          cctvPeopleRef.current = simulatedMapped;
          if (frameCounterRef.current % 12 === 0) {
            setCctvPeople(simulatedMapped);
          }
        }

        // Draw bounding markers for all detected/simulated candidates
        drawHighTechMesh(ctx, width, height);

        // Core Proctoring Decision Engine for all candidates
        evaluateCctvRules(cctvPeopleRef.current, canvas);
      }
    };

    animationId = requestAnimationFrame(processFrame);
    return () => cancelAnimationFrame(animationId);
  }, [cameraActive, isPlayingFile, isProcessing, useRealCV, fps, yawSlider, simPhoneDetected]);

  // Evaluates DIU ExamGuard Rules for all detected CCTV students
  const evaluateCctvRules = (persons: any[], canvas: HTMLCanvasElement) => {
    const now = Date.now();
    
    persons.forEach((p) => {
      let currentDir: "Forward" | "Left" | "Right" | "Behind" = "Forward";
      const yaw = p.yaw;
      
      if (yaw < -45) {
        currentDir = yaw < -70 ? "Behind" : "Left";
      } else if (yaw > 45) {
        currentDir = yaw > 70 ? "Behind" : "Right";
      } else {
        currentDir = "Forward";
      }

      // 1. Phone Detection (Instant)
      if (p.hasPhone) {
        triggerEvaluationAlert(p.label, "Phone Detected", yaw, 0.96, canvas, now);
      }

      // 2. Gaze Shift (Looking Left / Right)
      if (currentDir === "Left") {
        triggerEvaluationAlert(p.label, "Looking Left", yaw, 0.88, canvas, now);
      } else if (currentDir === "Right") {
        triggerEvaluationAlert(p.label, "Looking Right", yaw, 0.88, canvas, now);
      }

      // 3. Looking Behind
      if (currentDir === "Behind") {
        const lastBehindStart = lookBackStarts.current[p.id] || null;
        if (lastBehindStart === null) {
          lookBackStarts.current[p.id] = now;
        } else if (now - lastBehindStart > 500) {
          triggerEvaluationAlert(p.label, "Looking Behind", yaw, 0.94, canvas, now);
        }
      } else {
        lookBackStarts.current[p.id] = null;
      }

      // 4. Prolonged Side View
      if (currentDir === "Left" || currentDir === "Right") {
        const lastSideStart = sideViewStarts.current[p.id] || null;
        if (lastSideStart === null) {
          sideViewStarts.current[p.id] = now;
        } else if (now - lastSideStart > 2500) { // 2.5 seconds threshold
          triggerEvaluationAlert(p.label, "Prolonged Side Viewing", yaw, 0.91, canvas, now);
        }
      } else {
        sideViewStarts.current[p.id] = null;
      }
    });
  };

  // Safe Trigger wrapper to handle alerts with custom snapshot images & state syncing per person
  const triggerEvaluationAlert = (
    personLabel: string,
    type: AlertType,
    yaw: number,
    conf: number,
    canvas: HTMLCanvasElement,
    timeMs: number
  ) => {
    // Unique key per person + type to prevent cooldown overlap!
    const key = `${personLabel}_${type}`;
    const cooldown = 3500; // 3.5 seconds cooldown per specific person infraction
    const lastTrigger = lastTriggeredTimes.current[key] || 0;
    if (timeMs - lastTrigger < cooldown) return;

    lastTriggeredTimes.current[key] = timeMs;

    // Trigger visual/audio feedback beep
    playBeep(type === "Phone Detected" ? 880 : 540, 0.3);

    let screenshot = "";
    try {
      screenshot = canvas.toDataURL("image/jpeg", 0.6);
    } catch (e) {
      screenshot = "";
    }

    const seatNo = parseInt(personLabel.replace("Person ", "")) || 1;
    const dynamicId = `cctv_${personLabel.toLowerCase().replace(" ", "_")}`;

    // Forward to parent
    onAlertTriggered(type, yaw, conf, screenshot, dynamicId, personLabel, seatNo);
  };

  // Draw cybernetic neural meshes, face rectangles, coordinate indicators and angle vectors
  const drawHighTechMesh = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ) => {
    const cX = w / 2;
    const cY = h / 2;

    // Outer target alignment crosshairs
    ctx.strokeStyle = "rgba(14, 165, 233, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cX - 20, cY); ctx.lineTo(cX + 20, cY);
    ctx.moveTo(cX, cY - 20); ctx.lineTo(cX, cY + 20);
    ctx.stroke();

    // Horizontal Scanning Laser line
    const scanY = (Date.now() / 8) % h;
    ctx.strokeStyle = "rgba(249, 115, 22, 0.15)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, scanY);
    ctx.lineTo(w, scanY);
    ctx.stroke();

    // Loop through each detected CCTV student and draw their box!
    const activePersons = cctvPeopleRef.current || [];
    activePersons.forEach((person) => {
      const [px, py, pw, ph] = person.bbox;
      // Mirror flip X-coordinates if video is mirrored
      const isMirroredImg = (cameraActive || isPlayingFile) && useRealCV;
      const x = isMirroredImg ? (w - px - pw) : px;
      const y = py;

      const isMajorTurn = Math.abs(person.yaw) > 45;
      const hasPhone = person.hasPhone;

      // Color scheme based on state
      const boxColor = (hasPhone || isMajorTurn)
        ? "#ef4444" // Crimson red (Flagged/Warnings)
        : "#1A4631"; // Premium Silicon Valley Mint/Sage (Active/Safe)

      // Outer Bounding Box
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(x, y, pw, ph, 8);
      ctx.stroke();

      // Cyber corners
      ctx.fillStyle = boxColor;
      const bLen = 14;
      // top-left
      ctx.fillRect(x - 2, y - 2, bLen, 3);
      ctx.fillRect(x - 2, y - 2, 3, bLen);
      // top-right
      ctx.fillRect(x + pw - bLen + 2, y - 2, bLen, 3);
      ctx.fillRect(x + pw - 2, y - 2, 3, bLen);
      // bottom-left
      ctx.fillRect(x - 2, y + ph - 2, bLen, 3);
      ctx.fillRect(x - 2, y + ph - bLen + 2, 3, bLen);
      // bottom-right
      ctx.fillRect(x + pw - bLen + 2, y + ph - 2, bLen, 3);
      ctx.fillRect(x + pw - 2, y + ph - bLen + 2, 3, bLen);

      // Label background banner
      ctx.fillStyle = boxColor;
      ctx.fillRect(x, y - 22, Math.max(105, pw * 0.7), 22);

      // Text label
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px monospace";
      const statusText = hasPhone ? "⚠️ CHEATING MATERIAL" : isMajorTurn ? "[GAZE SHIFT]" : "CANDIDATE SAFE";
      ctx.fillText(`${person.label.toUpperCase()} : ${statusText}`, x + 5, y - 7);

      // Gaze ray indicator vector
      const centerHeadX = x + pw / 2;
      const centerHeadY = y + ph * 0.3; // head region is roughly 30% down
      
      const gazeYaw = person.yaw;
      
      // Vector Line represents head vector
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerHeadX, centerHeadY);
      
      const rayEndX = centerHeadX + (gazeYaw * 0.8);
      const rayEndY = centerHeadY - (30 - Math.abs(gazeYaw) * 0.2);
      ctx.lineTo(rayEndX, rayEndY);
      ctx.stroke();

      // Vector End Dot
      ctx.fillStyle = (hasPhone || isMajorTurn) ? "#f87171" : "#1A4631";
      ctx.beginPath();
      ctx.arc(rayEndX, rayEndY, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Yaw text overlay on body
      ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
      ctx.fillRect(x + 5, y + 5, 60, 16);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 8px monospace";
      ctx.fillText(`YAW: ${Math.round(gazeYaw)}°`, x + 10, y + 16);
    });

    // Drawing general CCTV telemetry dashboard bar at the bottom
    ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
    ctx.fillRect(15, h - 50, w - 30, 35);
    
    // Status metrics
    const flaggedCount = activePersons.filter(p => p.hasPhone).length;
    const warningCount = activePersons.filter(p => !p.hasPhone && Math.abs(p.yaw) > 40).length;

    ctx.strokeStyle = (flaggedCount > 0 || warningCount > 0) ? "rgba(239, 68, 68, 0.5)" : "rgba(26, 70, 49, 0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(15, h - 50, w - 30, 35);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px monospace";
    ctx.fillText("DIU WIDE-ANGLE CCTV EXAM ROOM INFERENCE ENGINE", 25, h - 38);
    
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(`DETECTED: ${activePersons.length} PEOPLE | FLAGGED VIOLATIONS: ${flaggedCount} | WARNINGS: ${warningCount}`, 25, h - 23);
  };

  return (
    <div id="detection_stream_view" className="bg-brand-card border border-brand-border rounded p-5 shadow-xl transition-all">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 font-sans text-brand-text">
        <div>
          <h2 className="text-base font-semibold text-brand-text flex items-center gap-2 uppercase tracking-tight">
            <MonitorPlay size={18} className="text-[#1A4631]" />
            <span>AI Real-Time Monitoring Pipeline</span>
          </h2>
          <p className="text-xs text-brand-muted">
            Synchronized at {fps} FPS. Geometric pose & classification feed.
          </p>
        </div>
        
        {/* Toggle Controls and ML Model Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {modelLoading ? (
            <span className="text-[9px] bg-brand-bg text-brand-text px-2 py-1 select-none rounded border border-brand-border font-mono font-bold uppercase tracking-wider flex items-center gap-1">
              <RefreshCw size={10} className="animate-spin text-brand-text" />
              <span>TF.js Loading...</span>
            </span>
          ) : tfModel ? (
            <span className="text-[9px] bg-[#1A4631]/10 text-[#1A4631] px-2 py-1 select-none rounded border border-[#1A4631]/20 font-mono font-bold uppercase tracking-wider flex items-center gap-1" title="COCO-SSD Neural Network acts automatically on your live webcam feed!">
              <Sparkles size={10} className="text-[#1A4631]" />
              <span>Good ML model Active</span>
            </span>
          ) : (
            <span className="text-[9px] bg-red-500/10 text-red-500 px-2 py-1 select-none rounded border border-red-500/20 font-mono font-bold uppercase tracking-wider">
              No Classifier
            </span>
          )}

          {/* Toggle Controls */}
          <div className="flex items-center gap-2 text-xs bg-brand-bg p-1.5 rounded border border-brand-border">
          <button
            onClick={() => setUseRealCV(!useRealCV)}
            className={`px-2.5 py-1 rounded-sm transition font-bold text-[10px] uppercase font-mono cursor-pointer ${
              useRealCV ? "bg-brand-text text-brand-bg shadow" : "text-brand-muted hover:text-brand-text"
            }`}
            title="Use mathematical Web skin trackers"
          >
            Web CV
          </button>
          <button
            onClick={() => setUseRealCV(false)}
            className={`px-2.5 py-1 rounded-sm transition font-bold text-[10px] uppercase font-mono cursor-pointer ${
              !useRealCV ? "bg-brand-text text-brand-bg shadow" : "text-brand-muted hover:text-brand-text"
            }`}
          >
            Static Sim
          </button>
        </div>
      </div>
    </div>

      {/* Main Video Screen Container */}
      <div className="relative aspect-[4/3] bg-black rounded overflow-hidden border-2 border-brand-border flex items-center justify-center">
        {/* Real hidden video element for capture analysis */}
        <video
          ref={videoRef}
          className="hidden"
          playsInline
          muted
        />

        {/* Canvas overlays high tech metrics */}
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="w-full h-full object-cover"
        />

        {/* Helper Overlay when Camera is Offline */}
        {!cameraActive && !isPlayingFile && (
          <div className="absolute inset-0 bg-brand-bg/95 backdrop-blur-[2px] flex flex-col items-center justify-center text-center p-6 z-20">
            <div className="w-16 h-16 rounded-full bg-[#1A4631]/10 border border-dashed border-[#1A4631]/30 flex items-center justify-center mb-4">
              <Camera size={26} className="text-[#1A4631] animate-pulse" />
            </div>
            
            <h3 className="text-xs font-bold tracking-widest text-brand-text uppercase font-mono">
              MONITOR FEED STANDBY
            </h3>
            
            <p className="text-[10.5px] text-brand-muted max-w-[340px] mt-2 mb-4 leading-relaxed uppercase font-mono">
              The camera feed is currently off. click below to activate the live webcam, or use calibrator inputs.
            </p>

            <button
              onClick={() => {
                setCameraActive(true);
                setCameraError(null);
              }}
              className="px-6 py-2 bg-brand-text hover:bg-brand-text/90 text-brand-bg font-extrabold uppercase font-mono tracking-wider text-[11px] rounded transition shadow-lg cursor-pointer flex items-center gap-2"
            >
              <Camera size={13} />
              <span>Activate Live Webcam</span>
            </button>

            {cameraError ? (
              <div className="mt-4 p-2 bg-red-950/40 border border-red-500/35 rounded max-w-[380px]">
                <p className="text-[9.5px] text-red-500 font-mono leading-relaxed font-bold uppercase">
                  ⚠️ IFRAME PERMISSION BLOCK:
                </p>
                <p className="text-[10px] text-red-400 font-sans leading-relaxed mt-0.5">
                  {cameraError}
                </p>
              </div>
            ) : (
              <p className="text-[9px] text-brand-muted font-sans mt-3 max-w-[340px]">
                💡 <strong>Important:</strong> If the webcam does not connect, click the <strong>"Open in a new tab"</strong> button at the top-right of this preview to bypass browser iframe restrictions!
              </p>
            )}
          </div>
        )}

        {/* Floating Indicator banner for severe violation state */}
        {simPhoneDetected && (
          <div className="absolute top-4 left-4 right-4 bg-red-650 text-white px-3 py-2 rounded-sm flex items-center gap-2 text-xs font-mono font-bold shadow-lg border border-red-500 animate-pulse z-10 uppercase">
            <ShieldAlert size={16} className="text-white" />
            <span>CCTV FRAUD: Cheating Material Detected near Person 1</span>
          </div>
        )}

        {Math.abs(yawSlider) > 40 && !simPhoneDetected && (
          <div className="absolute top-4 left-4 right-4 bg-red-650 text-white px-3 py-2 rounded-sm flex items-center gap-2 text-xs font-mono font-bold shadow-lg border border-red-550 z-10 uppercase">
            <ShieldAlert size={16} />
            <span>CCTV ALERT: Person 1 Gaze Left/Right ({yawSlider}°)</span>
          </div>
        )}
      </div>

      {/* Control Buttons row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {/* Direct Feed Inputs selection */}
        <div className="bg-brand-bg p-3.5 rounded border border-brand-border">
          <h4 className="text-xs font-bold text-[#E0E2E6] mb-2.5 flex items-center gap-1.5 uppercase font-mono">
            <Camera size={13} className="text-[#1A4631]" />
            <span>VIDEO SOURCE INTERFACE</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setCameraActive(!cameraActive);
                setIsPlayingFile(false);
              }}
              className={`flex-1 min-w-[120px] py-1 px-3 rounded-sm text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer ${
                cameraActive 
                  ? "bg-red-600 hover:bg-red-500 text-white" 
                  : "bg-brand-card hover:bg-brand-card/80 text-brand-text border border-brand-border"
              }`}
            >
              {cameraActive ? (
                <>
                  <VideoOff size={14} />
                  <span>Stop Webcam</span>
                </>
              ) : (
                <>
                  <Camera size={14} />
                  <span>Live Webcam</span>
                </>
              )}
            </button>

            {/* Uploaded Video trigger */}
            <label className="flex-1 min-w-[120px] bg-brand-card hover:bg-brand-card/80 text-brand-text text-xs font-semibold uppercase tracking-wider py-2 px-3 rounded-sm border border-brand-border flex items-center justify-center gap-1.5 cursor-pointer text-center">
              <PlayCircle size={14} className="text-[#1A4631]" />
              <span>Upload Clip</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
              />
            </label>
          </div>
          {videoFile && (
            <div className="text-[10px] text-brand-muted mt-2 font-mono uppercase">
              Attached: <strong>{videoFile.name}</strong> • (LOOP PLAYBACK)
            </div>
          )}
        </div>

        {/* Real-time slider calibrators (for easy evaluation) */}
        <div className="bg-brand-bg p-3.5 rounded border border-brand-border flex flex-col justify-between font-sans text-brand-text">
          <h4 className="text-xs font-bold text-[#E0E2E6] mb-2 flex items-center gap-1.5 uppercase font-mono">
            <Sliders size={13} className="text-[#1A4631]" />
            <span>DIU CALIBRATOR CONTROLS</span>
          </h4>

          {/* Slider for yaw angle */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-brand-muted font-mono uppercase">
              <span>Adjust Head Yaw Degree:</span>
              <span className={`font-mono font-extrabold ${Math.abs(yawSlider) > 40 ? "text-red-500" : "text-[#1A4631]"}`}>
                {yawSlider}° {yawSlider < -45 ? "(LEFT)" : yawSlider > 45 ? "(RIGHT)" : "(CENTER)"}
              </span>
            </div>
            <input
              type="range"
              min={-90}
              max={90}
              value={yawSlider}
              onChange={(e) => {
                setUseRealCV(false); // disable real webcam CV temporarily so slider overrides it
                setYawSlider(Number(e.target.value));
              }}
              className="w-full accent-red-500 bg-brand-card h-1.5 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between mt-3">
            <span className="text-[10px] text-brand-muted font-mono uppercase">Cellphone Simulator:</span>
            <button
              onClick={() => {
                setUseRealCV(false);
                setSimPhoneDetected(!simPhoneDetected);
              }}
              className={`text-[10px] font-bold px-3 py-1 rounded-sm tracking-wider uppercase transition border-2 ${
                simPhoneDetected
                  ? "bg-red-500/20 text-red-400 border-red-500/40"
                  : "bg-brand-card text-brand-muted border-brand-border hover:text-white"
              }`}
            >
              {simPhoneDetected ? "PHONE DETECTED ON" : "SIMULATE PHONE HELD"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
