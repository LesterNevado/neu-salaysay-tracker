
import { VIOLATION_TYPES } from "@/components/upload/types";

// Keywords associated with different violation types with expanded Tagalog vocabulary
const VIOLATION_KEYWORDS: Record<string, string[]> = {
  "Attendance Issue": [
    // English keywords
    "absent", "absence", "missed class", "late", "tardy", "attendance", 
    "not present", "could not attend", "unable to attend", "skipped class",
    "missed lecture", "class absence", "not in class", "didn't show up",
    "not attending", "fail to attend", "missing from class",
    
    // Tagalog keywords
    "hindi nakapasok", "hindi nakadalo", "lumiban", "absent", "pagliban",
    "hindi nakasali", "hindi nakarating", "hindi nakaattend", "hindi nakapunta",
    "nawala", "hindi dumalo", "hindi sumipot", "hindi nakaabot",
    "hindi nakahabol", "pagkaantala", "hindi sumama", "hindi nakasama",
    "hindi nakatungtong", "wala sa klase", "hindi nakababa"
  ],
  
  "Dress Code Violation": [
    // English keywords
    "uniform", "dress code", "inappropriate attire", "clothing", "dress", 
    "wore", "outfit", "attire", "improper dress", "not in uniform",
    "dress violation", "improper attire", "prohibited clothing", "dress requirements",
    
    // Tagalog keywords
    "uniporme", "kasuotan", "hindi naka-uniporme", "pananamit", "suot",
    "hindi angkop na kasuotan", "hindi angkop na damit", "hindi tamang pananamit",
    "kasuotang pangsikwela", "damit", "hindi naaangkop", "suot na hindi angkop",
    "labag sa pamantayan", "hindi ayon sa patakaran"
  ],
  
  "Academic Misconduct": [
    // English keywords
    "cheating", "plagiarism", "copied", "academic dishonesty", "exam", 
    "test", "homework", "assignment", "paper", "quiz", "grades", 
    "academic integrity", "citation", "research misconduct", "academic offense",
    "unauthorized assistance", "unauthorized collaboration", "unauthorized aid",
    "copied work", "copying", "answers", "cheat sheet", "plagiarized",
    "academic violation", "unfair advantage", "unethical behavior in class",
    "inappropriate behavior in exam", "dishonest", "fabrication", "falsification",
    "improper citation", "cheated", "academic fraud", "unfair means",
    
    // Tagalog keywords
    "nangopya", "pagkopya", "pandaraya", "pagpapasa ng kopya", "pakikipagtulungan", 
    "panlilinlang", "paggamit ng kodigo", "pagkuha ng sagot", "pandaraya sa pagsusulit",
    "hindi sariling gawa", "gumamit ng bawal na kagamitan", "pagsisinungaling",
    "hindi tapat", "pang-aakademikong pagkakasala", "pagkopya ng sagot",
    "panggagaya ng gawa", "pagpapatulong sa pagsusulit", "hindi awtorisadong tulong"
  ],
  
  "Behavioral Issue": [
    // English keywords
    "behavior", "attitude", "disrupting", "disruptive", "misconduct", 
    "disrespect", "talking back", "argument", "fighting", "altercation",
    "violated rules", "disobedience", "classroom behavior", "confrontation",
    "inappropriate behavior", "disturbing class", "disruptive actions",
    "verbal abuse", "violation of conduct", "unruly", "unprofessional",
    "misbehavior", "insubordination", "violated code of conduct",
    
    // Tagalog keywords
    "asal", "ugali", "gawi", "hindi magandang asal", "bastos", "pagsuway",
    "hindi pagsunod", "paglabag sa alituntunin", "di-magalang na kilos",
    "hindi magandang pakikitungo", "hindi magandang pakikisalamuha",
    "hindi wastong kilos", "nakakagulo", "nakakagambala", "pag-aasal",
    "paglabag sa patakaran", "kaguluhan", "di-magalang", "pagtatalo",
    "pagsuway sa awtoridad", "hindi wastong asal", "pagbibigay ng kahihiyan"
  ],
  
  "Property Damage": [
    // English keywords
    "damage", "broke", "destroyed", "vandalism", "property", "equipment", 
    "facility", "school property", "broken", "ruined", "defaced",
    "damaged item", "vandalized", "destruction", "harm to property",
    "defacement", "property violation", "unauthorized modification",
    
    // Tagalog keywords
    "nasira", "sirain", "pagkasira", "nabasag", "napunit", "napinsala",
    "nasiraan", "pinsala", "kagamitan", "pag-aari", "kasangkapan",
    "pasilidad", "ari-arian", "pag-aari ng paaralan", "kagamitan ng paaralan",
    "pagpapasama ng anyo", "pagpapawalang-halaga sa ari-arian"
  ]
};

// Context phrases that strengthen certain violation types
const CONTEXT_PHRASES: Record<string, string[]> = {
  "Academic Misconduct": [
    // English phrases
    "in exam", "during test", "in class", "in your", "in my", "in the", 
    "on test", "on quiz", "on exam", "on assignment",
    "on homework", "in assignment", "in homework", "engineering class",
    "programming class", "science class", "math class", "class", "course",
    
    // Tagalog phrases
    "sa exam", "sa pagsusulit", "sa klase", "sa aking", "sa inyong",
    "sa assignment", "sa takdang aralin", "sa proyekto", "noong pagsusulit",
    "habang nagsusulit", "noong exam"
  ]
};

// English to Tagalog translation map for common violation-related terms
const TAGALOG_TRANSLATIONS: Record<string, string[]> = {
  "absent": ["hindi nakapasok", "lumiban", "wala", "hindi dumalo"],
  "cheating": ["nangopya", "pandaraya", "nandaya", "hindi tapat"],
  "damage": ["sira", "pinsala", "nasira", "napinsala"],
  "behavior": ["asal", "ugali", "kilos", "gawi", "pag-uugali"],
  "uniform": ["uniporme", "kasuotan", "pananamit", "damit"]
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
    
    // Enhanced Tagalog detection with translations
    for (const [englishTerm, tagalogTerms] of Object.entries(TAGALOG_TRANSLATIONS)) {
      // Check if the English term is relevant for this violation type
      if (keywords.some(k => k.includes(englishTerm))) {
        // Look for all Tagalog translations
        for (const tagalogTerm of tagalogTerms) {
          if (cleanText.includes(tagalogTerm)) {
            matchScore += 1.5; // Give slightly higher weight to Tagalog matches
            foundKeywords.push(`${englishTerm} (${tagalogTerm})`);
          }
        }
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
      const priorityKeywords = ["cheating", "plagiarism", "copied", "academic dishonesty", "cheated", "nangopya", "pandaraya"];
      for (const keyword of priorityKeywords) {
        if (cleanText.includes(keyword.toLowerCase())) {
          // Give extra weight to these strong indicators
          matchScore += 2;
        }
      }
    }
    
    // Specific Tagalog scenarios 
    
    // Attendance-specific phrases in Tagalog
    if (violationType === "Attendance Issue") {
      if (cleanText.includes("hindi nakapasok") || 
          cleanText.includes("hindi nakadalo") || 
          cleanText.includes("lumiban") ||
          cleanText.includes("hindi nakarating")) {
        matchScore += 2; // Strong boost for direct phrases
      }
      
      // Check for phrases explaining why they couldn't attend
      if (cleanText.includes("hindi ako nakapasok") || 
          cleanText.includes("hindi ko naatiman") || 
          cleanText.includes("hindi ako nakadalo")) {
        matchScore += 3; // Even stronger boost
      }
    }
    
    // Academic misconduct specific phrases in Tagalog
    if (violationType === "Academic Misconduct") {
      if (cleanText.includes("nangopya ako") || 
          cleanText.includes("gumamit ng kodigo") || 
          cleanText.includes("hindi sariling gawa") ||
          cleanText.includes("nagpakopya")) {
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
  
  // For Tagalog letters, check for specific common phrases that indicate a violation type
  
  // "Dahil sa aking nagawang pagkakasala" often refers to academic misconduct
  if (cleanText.includes("nagawang pagkakasala") || 
      cleanText.includes("hindi nagsumite") || 
      cleanText.includes("hindi nakasumite") ||
      cleanText.includes("hindi nasunod ang alituntunin")) {
    if (highestScore < 3) {
      console.log("Detected specific Tagalog indicator of academic misconduct");
      bestMatchType = "Academic Misconduct";
    }
  }
  
  // "Hindi nakaabot sa klase" often refers to attendance
  if (cleanText.includes("hindi nakaabot") || 
      cleanText.includes("hindi nakahabol") || 
      cleanText.includes("huli ako dumating") ||
      cleanText.includes("hindi nakatungtong")) {
    if (highestScore < 3) {
      console.log("Detected specific Tagalog indicator of attendance issue");
      bestMatchType = "Attendance Issue";
    }
  }
  
  console.log(`Selected violation type: ${bestMatchType} with score: ${highestScore}`);
  return bestMatchType;
}
