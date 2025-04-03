
import { ViolationType } from "../../types/database.types";
import { DocumentInfo } from "./extractDocumentInfo";

/**
 * Determine the violation type from the extracted document text
 */
export function determineViolationType(documentInfo: DocumentInfo): ViolationType {
  const { extractedText, pdfTitle } = documentInfo;
  
  // Default to "Other" if we can't determine
  let violationType: ViolationType = "Other";
  
  // Convert to lowercase for case-insensitive matching
  const textLower = extractedText?.toLowerCase() || "";
  const titleLower = pdfTitle?.toLowerCase() || "";
  
  // Check for attendance related keywords
  if (
    textLower.includes("absent") || 
    textLower.includes("attendance") || 
    textLower.includes("absences") ||
    titleLower.includes("attendance")
  ) {
    violationType = "Attendance Issue";
  }
  
  // Check for academic misconduct
  else if (
    textLower.includes("plagiarism") || 
    textLower.includes("cheating") || 
    textLower.includes("misconduct") ||
    textLower.includes("academic dishonesty")
  ) {
    violationType = "Academic Misconduct";
  }
  
  return violationType;
}

/**
 * Extract the nature of excuse from the document text
 * Always returns a string, defaulting to "for my absences in your Application Development class"
 */
export function extractNatureOfExcuse(documentInfo: DocumentInfo): string {
  // Our default nature of excuse - use this when we can't determine anything specific
  const DEFAULT_EXCUSE = "for my absences in your Application Development class";
  
  // Safety check - if no document info or text, return default
  if (!documentInfo || !documentInfo.extractedText) {
    console.log("No document info or extracted text, returning default excuse");
    return DEFAULT_EXCUSE;
  }
  
  const { extractedText } = documentInfo;
  console.log("Analyzing text for excuse:", extractedText.substring(0, 100) + "...");
  
  // Try to extract a specific excuse using various patterns
  const excusePatterns = [
    /(?:excuse|reason|apologize|apology|sorry).*?for\s+(my\s+)?([^.;:]+)/i,
    /(?:regarding|concerning|about)\s+(my\s+)?([^.;:]+)/i,
    /(?:request|ask).*?consideration.*?for\s+(my\s+)?([^.;:]+)/i,
    /I(?:'m| am)?\s+writing\s+(?:to\s+)?(?:you\s+)?(?:about|regarding|concerning)\s+([^.;:]+)/i,
    /This\s+letter\s+is\s+(?:to\s+)?(?:inform|explain|request)\s+([^.;:]+)/i,
  ];
  
  // Check each pattern
  for (const pattern of excusePatterns) {
    const match = extractedText.match(pattern);
    if (match) {
      // Get the matched excuse - either from group 2 (if it exists) or group 1
      const matchedExcuse = match[2] || match[1];
      if (matchedExcuse && matchedExcuse.trim().length > 5) {
        const excuse = matchedExcuse.trim();
        console.log("Found specific excuse:", excuse);
        return excuse;
      }
    }
  }
  
  // If no specific excuse found, return the default
  console.log("No specific excuse patterns matched, returning default excuse");
  return DEFAULT_EXCUSE;
}

/**
 * Update the document info with the violation type and nature of excuse
 */
export function enhanceDocumentInfo(documentInfo: DocumentInfo): DocumentInfo {
  try {
    // Always make sure we have a valid document info object
    const safeDocumentInfo = documentInfo || { extractedText: "" };
    
    // Extract the nature of excuse first
    const natureOfExcuse = extractNatureOfExcuse(safeDocumentInfo);
    console.log("Nature of excuse determined:", natureOfExcuse);
    
    // Then determine the violation type
    const violationType = determineViolationType(safeDocumentInfo);
    console.log("Violation type determined:", violationType);
    
    // Return the enhanced document info
    return {
      ...safeDocumentInfo,
      violationType,
      natureOfExcuse
    };
  } catch (error) {
    console.error("Error enhancing document info:", error);
    // Even if an error occurs, return the document info with default values
    return {
      ...documentInfo,
      natureOfExcuse: "for my absences in your Application Development class",
      violationType: "Other" as ViolationType
    };
  }
}

export default enhanceDocumentInfo;
