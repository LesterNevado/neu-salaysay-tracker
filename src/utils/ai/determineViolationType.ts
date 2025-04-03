
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
  const textLower = extractedText.toLowerCase();
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
 */
export function extractNatureOfExcuse(documentInfo: DocumentInfo): string {
  const { extractedText } = documentInfo;
  
  // Default nature of excuse
  const defaultNature = "for my absences in your Application Development class";
  
  // Try to extract a more specific excuse if possible
  const excusePatterns = [
    /(?:excuse|reason|apologize|apology|sorry).*?for\s+(my\s+)?([^.;:]+)/i,
    /(?:regarding|concerning|about)\s+(my\s+)?([^.;:]+)/i,
    /(?:request|ask).*?consideration.*?for\s+(my\s+)?([^.;:]+)/i
  ];
  
  for (const pattern of excusePatterns) {
    const match = extractedText.match(pattern);
    if (match && match[2]) {
      const extractedExcuse = match[2].trim();
      // If we found something meaningful, return it
      if (extractedExcuse.length > 10) {
        return extractedExcuse;
      }
    }
  }
  
  // If we couldn't extract a specific excuse, return the default
  return defaultNature;
}

/**
 * Update the document info with the violation type and nature of excuse
 */
export function enhanceDocumentInfo(documentInfo: DocumentInfo): DocumentInfo {
  return {
    ...documentInfo,
    violationType: determineViolationType(documentInfo),
    natureOfExcuse: extractNatureOfExcuse(documentInfo)
  };
}

export default enhanceDocumentInfo;
