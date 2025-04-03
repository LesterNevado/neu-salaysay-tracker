
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
    textLower.includes("not present") ||
    textLower.includes("missed class") ||
    textLower.includes("couldn't attend") ||
    textLower.includes("couldn't make it to class") ||
    titleLower.includes("attendance")
  ) {
    violationType = "Attendance";
  }
  
  // Check for academic misconduct - more detailed patterns
  else if (
    textLower.includes("plagiarism") || 
    textLower.includes("cheating") || 
    textLower.includes("academic misconduct") ||
    textLower.includes("academic dishonesty") ||
    textLower.includes("copied") ||
    textLower.includes("exam") && (
      textLower.includes("cheat") || 
      textLower.includes("misconduct")
    ) ||
    textLower.includes("assignment") && textLower.includes("copied")
  ) {
    violationType = "Academic";
  }
  
  // Check for behavioral issues in class
  else if (
    (textLower.includes("behavior") || textLower.includes("behaviour")) && 
    (textLower.includes("class") || textLower.includes("course")) ||
    textLower.includes("disrupt") ||
    textLower.includes("inappropriate") ||
    textLower.includes("disrespect") ||
    textLower.includes("apologize for my recent behavior")
  ) {
    violationType = "Academic";
  }
  
  // Check for medical related excuses - expanded patterns
  else if (
    textLower.includes("sick") ||
    textLower.includes("illness") ||
    textLower.includes("medical") ||
    textLower.includes("doctor") ||
    textLower.includes("hospital") ||
    textLower.includes("health") ||
    textLower.includes("fever") ||
    textLower.includes("injury") ||
    textLower.includes("appointment") && 
      (textLower.includes("doctor") || textLower.includes("medical")) ||
    textLower.includes("not feeling well")
  ) {
    violationType = "Medical";
  }
  
  // Check for family emergencies - expanded patterns
  else if (
    (textLower.includes("family") && (
      textLower.includes("emergency") ||
      textLower.includes("urgent") ||
      textLower.includes("crisis") ||
      textLower.includes("matter") ||
      textLower.includes("issue")
    )) ||
    textLower.includes("death") ||
    textLower.includes("funeral") ||
    textLower.includes("bereavement") ||
    textLower.includes("relative") && textLower.includes("sick") ||
    textLower.includes("parent") && (
      textLower.includes("sick") || 
      textLower.includes("hospital")
    )
  ) {
    violationType = "Family";
  }
  
  // Check for technical issues - expanded patterns
  else if (
    textLower.includes("technical") ||
    textLower.includes("internet") ||
    textLower.includes("connection") ||
    textLower.includes("device") ||
    textLower.includes("computer") ||
    textLower.includes("laptop") ||
    textLower.includes("power outage") ||
    textLower.includes("wifi") ||
    textLower.includes("network") ||
    textLower.includes("electricity") ||
    textLower.includes("browser") ||
    textLower.includes("website") && textLower.includes("down") ||
    textLower.includes("technical difficulties")
  ) {
    violationType = "Technical";
  }

  // Check for transportation issues - expanded patterns
  else if (
    textLower.includes("transport") ||
    textLower.includes("traffic") ||
    textLower.includes("commute") ||
    textLower.includes("travel") ||
    textLower.includes("late") ||
    textLower.includes("car") && (
      textLower.includes("broke") || 
      textLower.includes("accident") ||
      textLower.includes("problem")
    ) ||
    textLower.includes("flat tire") ||
    textLower.includes("public transportation") ||
    textLower.includes("missed the bus") ||
    textLower.includes("train delay")
  ) {
    violationType = "Transport";
  }
  
  return violationType;
}

/**
 * Extract the nature of excuse from the document text
 * More focused on providing accurate extraction
 */
export function extractNatureOfExcuse(documentInfo: DocumentInfo): string {
  // Safety check - if no document info or text, return empty string
  if (!documentInfo || !documentInfo.extractedText) {
    console.log("No document info or extracted text");
    return "";
  }
  
  const { extractedText } = documentInfo;
  console.log("Analyzing text for excuse:", extractedText.substring(0, 100) + "...");
  
  // Try to extract a specific excuse using various patterns
  const excusePatterns = [
    /(?:excuse|reason|apologize|apology|sorry).*?for\s+(my\s+)?([^.;:]{10,150})/i,
    /(?:regarding|concerning|about)\s+(my\s+)?([^.;:]{10,150})/i,
    /(?:request|ask).*?consideration.*?for\s+(my\s+)?([^.;:]{10,150})/i,
    /I(?:'m| am)?\s+writing\s+(?:to\s+)?(?:you\s+)?(?:about|regarding|concerning)\s+([^.;:]{10,150})/i,
    /This\s+letter\s+is\s+(?:to\s+)?(?:inform|explain|request)\s+([^.;:]{10,150})/i,
    /recent\s+behavior\s+in\s+your\s+class/i
  ];
  
  // Check each pattern
  for (const pattern of excusePatterns) {
    const match = extractedText.match(pattern);
    if (match) {
      // Get the matched excuse - either from group 2 (if it exists) or group 1
      const matchedExcuse = match[2] || match[1] || match[0];
      if (matchedExcuse && matchedExcuse.trim().length > 5) {
        const excuse = matchedExcuse.trim();
        console.log("Found specific excuse:", excuse);
        return excuse;
      }
    }
  }
  
  // If no specific excuse pattern matched, try to find sentences related to apologies
  const apologySentences = extractedText.match(/([^.!?]+(?:[.!?]+["']?\s)|[^.!?]+)(?=\s|$)/g);
  if (apologySentences) {
    for (const sentence of apologySentences) {
      if (
        sentence.toLowerCase().includes("apolog") || 
        sentence.toLowerCase().includes("sorry") ||
        sentence.toLowerCase().includes("regret") ||
        sentence.toLowerCase().includes("behavior")
      ) {
        if (sentence.trim().length > 10 && sentence.trim().length < 150) {
          console.log("Found apology sentence:", sentence.trim());
          return sentence.trim();
        }
      }
    }
  }
  
  console.log("No specific excuse patterns matched, returning empty");
  return "";
}

/**
 * Update the document info with the violation type and nature of excuse
 */
export function enhanceDocumentInfo(documentInfo: DocumentInfo): DocumentInfo {
  try {
    // Always make sure we have a valid document info object
    const safeDocumentInfo = documentInfo || { extractedText: "" };
    
    // If the nature of excuse wasn't already extracted, do it now
    if (!safeDocumentInfo.natureOfExcuse) {
      const natureOfExcuse = extractNatureOfExcuse(safeDocumentInfo);
      console.log("Nature of excuse determined:", natureOfExcuse);
      safeDocumentInfo.natureOfExcuse = natureOfExcuse;
    }
    
    // Determine the violation type
    const violationType = determineViolationType(safeDocumentInfo);
    console.log("Violation type determined:", violationType);
    
    // Return the enhanced document info
    return {
      ...safeDocumentInfo,
      violationType
    };
  } catch (error) {
    console.error("Error enhancing document info:", error);
    // Even if an error occurs, return the document info
    return documentInfo;
  }
}

export default enhanceDocumentInfo;
