
import { VIOLATION_TYPES } from "@/components/upload/types";

// Keywords associated with different violation types
const VIOLATION_KEYWORDS: Record<string, string[]> = {
  "Attendance Issue": [
    "absent", "absence", "missed class", "late", "tardy", "attendance", 
    "not present", "could not attend", "unable to attend", "skipped class",
    "missed lecture", "class absence", "not in class", "didn't show up"
  ],
  "Dress Code Violation": [
    "uniform", "dress code", "inappropriate attire", "clothing", "dress", 
    "wore", "outfit", "attire", "improper dress", "not in uniform"
  ],
  "Academic Misconduct": [
    "cheating", "plagiarism", "copied", "academic dishonesty", "exam", 
    "test", "homework", "assignment", "paper", "quiz", "grades", 
    "academic integrity", "citation", "research misconduct"
  ],
  "Behavioral Issue": [
    "behavior", "attitude", "disrupting", "disruptive", "misconduct", 
    "disrespect", "talking back", "argument", "fighting", "altercation",
    "violated rules", "disobedience", "classroom behavior", "confrontation"
  ],
  "Property Damage": [
    "damage", "broke", "destroyed", "vandalism", "property", "equipment", 
    "facility", "school property", "broken", "ruined", "defaced"
  ]
};

/**
 * Determines the most likely violation type based on the extracted nature of excuse
 * @param text The nature of excuse or full document text
 * @returns The most appropriate violation type
 */
export function determineViolationType(text: string | undefined | null): string {
  if (!text) {
    return "Other"; // Default if no text is provided
  }
  
  const cleanText = text.toLowerCase();
  let bestMatchType = "Other";
  let highestMatchCount = 0;
  
  // Check each violation type against the text
  for (const violationType of VIOLATION_TYPES) {
    // Skip "Other" as it's our default
    if (violationType === "Other") continue;
    
    const keywords = VIOLATION_KEYWORDS[violationType] || [];
    let matchCount = 0;
    
    // Count how many keywords for this violation type appear in the text
    for (const keyword of keywords) {
      if (cleanText.includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }
    
    // If this violation type has more keyword matches than our previous best match,
    // update our best match
    if (matchCount > highestMatchCount) {
      highestMatchCount = matchCount;
      bestMatchType = violationType;
    }
  }
  
  return bestMatchType;
}
