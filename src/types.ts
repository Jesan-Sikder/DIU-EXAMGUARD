export type AlertType =
  | 'Phone Detected'
  | 'Looking Left'
  | 'Looking Right'
  | 'Looking Behind'
  | 'Frequent Head Movement'
  | 'Prolonged Side Viewing';

export interface AlertEvent {
  id: string;
  type: AlertType;
  timestamp: string; // ISO format
  yawAngle: number;
  duration?: number; // duration in seconds if applicable
  screenshotUrl: string; // Base64 snapshot
  confidence: number;
  status: 'unresolved' | 'flagged' | 'dismissed';
  notes?: string;
  studentId?: string;
  studentName?: string;
  seatNo?: number;
}

export interface SessionStats {
  totalAlerts: number;
  integrityScore: number; // 0 to 100
  phoneCount: number;
  headTurnCount: number;
  lookingBehindCount: number;
  frequentMoveCount: number;
  prolongedSideCount: number;
  durationSeconds: number;
}

export interface DIUStudent {
  name: string;
  id: string;
  department: string;
  course: string;
  examTitle: string;
  room: string;
}

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}
