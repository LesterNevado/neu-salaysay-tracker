
export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
  created_at: string;
}

// Add the missing ViolationType export
export type ViolationType = 
  | "Attendance Issue"
  | "Dress Code Violation"
  | "Academic Misconduct"
  | "Behavioral Issue"
  | "Family Emergency"
  | "Medical Excuse"
  | "Other";
