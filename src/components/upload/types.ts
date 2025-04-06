
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
    language?: 'English' | 'Tagalog';
  } | null;
}

export const VIOLATION_TYPES = [
  "Attendance",
  "Technical",
  "Academic",
  "Transport", 
  "Family",
  "Medical",
  "Other"
] as const;

// Add Tagalog violation types mapping
export const TAGALOG_VIOLATION_TYPES: Record<string, ViolationType> = {
  "Pagdalo": "Attendance",
  "Teknikal": "Technical",
  "Akademiko": "Academic",
  "Transportasyon": "Transport",
  "Pamilya": "Family",
  "Medikal": "Medical",
  "Iba Pa": "Other"
};

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
