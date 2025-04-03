
import { ViolationType } from "@/types/database.types";

export interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'analyzing' | 'uploading' | 'completed' | 'error';
  violationType?: ViolationType;
  extractedInfo?: {
    studentNumber?: string;
    senderName?: string;
    date?: string;
    natureOfExcuse?: string;
    addressee?: string;
    confidence: 'high' | 'medium' | 'low';
  } | null;
}

export const VIOLATION_TYPES = [
  "Attendance Issue",
  "Dress Code Violation",
  "Academic Misconduct",
  "Behavioral Issue",
  "Family Emergency",
  "Medical Excuse",
  "Other"
] as const;

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
