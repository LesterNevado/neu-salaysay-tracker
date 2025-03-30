
import { VIOLATION_TYPES } from "@/components/upload/types";

// Keywords associated with different violation types with expanded and improved vocabulary
const VIOLATION_KEYWORDS: Record<string, string[]> = {
  "Attendance Issue": [
    "absent", "absence", "missed class", "late", "tardy", "attendance", 
    "not present", "could not attend", "unable to attend", "skipped class",
    "missed lecture", "class absence", "not in class", "didn't show up",
    "not attending", "fail to attend", "missing from class"
  ],
  "Dress Code Violation": [
    "uniform", "dress code", "inappropriate attire", "clothing", "dress", 
    "wore", "outfit", "attire", "improper dress", "not in uniform",
    "dress violation", "improper attire", "prohibited clothing", "dress requirements"
  ],
  "Academic Misconduct": [
    "cheating", "plagiarism", "copied", "academic dishonesty", "exam", 
    "test", "homework", "assignment", "paper", "quiz", "grades", 
    "academic integrity", "citation", "research misconduct", "academic offense",
    "unauthorized assistance", "unauthorized collaboration", "unauthorized aid",
    "copied work", "copying", "answers", "cheat sheet", "plagiarized",
    "academic violation", "unfair advantage", "unethical behavior in class",
    "inappropriate behavior in exam", "dishonest", "fabrication", "falsification",
    "improper citation", "cheated", "academic fraud", "unfair means"
  ],
  "Behavioral Issue": [
    "behavior", "attitude", "disrupting", "disruptive", "misconduct", 
    "disrespect", "talking back", "argument", "fighting", "altercation",
    "violated rules", "disobedience", "classroom behavior", "confrontation",
    "inappropriate behavior", "disturbing class", "disruptive actions",
    "verbal abuse", "violation of conduct", "unruly", "unprofessional",
    "misbehavior", "insubordination", "violated code of conduct"
  ],
  "Property Damage": [
    "damage", "broke", "destroyed", "vandalism", "property", "equipment", 
    "facility", "school property", "broken", "ruined", "defaced",
    "damaged item", "vandalized", "destruction", "harm to property",
    "defacement", "property violation", "unauthorized modification"
  ]
};

// Context phrases that strengthen certain violation types
const CONTEXT_PHRASES: Record<string, string[]> = {
  "Academic Misconduct": [
    "in exam", "during test", "in class", "in your", "in my", "in the", 
    "on test", "on quiz", "on exam", "on assignment",
    "on homework", "in assignment", "in homework", "engineering class",
    "programming class", "science class", "math class", "class", "course"
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
  let highestScore = 0;
  
  // Check each violation type against the text
  for (const violationType of VIOLATION_TYPES) {
    // Skip "Other" as it's our default
    if (violationType === "Other") continue;
    
    const keywords = VIOLATION_KEYWORDS[violationType] || [];
    let matchScore = 0;
    let foundKeywords: string[] = [];
    
    // Count how many keywords for this violation type appear in the text
    for (const keyword of keywords) {
      if (cleanText.includes(keyword.toLowerCase())) {
        matchScore += 1;
        foundKeywords.push(keyword);
      }
    }
    
    // Apply context-based boosting for certain violation types
    if (violationType === "Academic Misconduct" && foundKeywords.length > 0) {
      // If we found academic misconduct keywords, check for contextual phrases that strengthen this classification
      const contextPhrases = CONTEXT_PHRASES["Academic Misconduct"] || [];
      for (const phrase of contextPhrases) {
        if (cleanText.includes(phrase.toLowerCase())) {
          // Boost the score significantly if we find context that supports academic misconduct
          matchScore += 0.5;
        }
      }
    }
    
    // Special handling for priority keywords that strongly indicate a specific violation
    if (violationType === "Academic Misconduct") {
      const priorityKeywords = ["cheating", "plagiarism", "copied", "academic dishonesty", "cheated"];
      for (const keyword of priorityKeywords) {
        if (cleanText.includes(keyword.toLowerCase())) {
          // Give extra weight to these strong indicators
          matchScore += 2;
        }
      }
    }
    
    // Specific phrase matching for common scenarios
    // Academic misconduct specific phrases
    if (violationType === "Academic Misconduct") {
      if (cleanText.includes("cheating in") || 
          cleanText.includes("plagiarism in") || 
          cleanText.includes("copied from") ||
          (cleanText.includes("cheating") && cleanText.includes("class"))) {
        matchScore += 3; // Strong boost for direct phrases
      }
    }
    
    // If this violation type has a higher score than our previous best match,
    // update our best match
    if (matchScore > highestScore) {
      highestScore = matchScore;
      bestMatchType = violationType;
    }

    // Log for debugging
    console.log(`Violation type "${violationType}" score: ${matchScore}, found keywords: ${foundKeywords.join(", ")}`);
  }
  
  console.log(`Selected violation type: ${bestMatchType} with score: ${highestScore}`);
  return bestMatchType;
}
