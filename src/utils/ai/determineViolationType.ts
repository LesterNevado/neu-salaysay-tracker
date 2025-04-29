
import { ViolationType } from "../../types/database.types";
import { DocumentInfo } from "./extractDocumentInfo";

/**
 * Translate text from Tagalog to English using an alternative translation service
 * Since LibreTranslate is giving 400 errors, we'll use MyMemory translation API
 * which is free and doesn't require authentication for limited usage
 */
export async function translateTagalogToEnglish(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return "";
  
  try {
    console.log("Translating Tagalog text to English...");
    
    // Use MyMemory Translation API instead of LibreTranslate
    const encodedText = encodeURIComponent(text);
    const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=tl|en`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error("Translation API error:", response.status, response.statusText);
      // Return original text if translation fails
      return text;
    }
    
    const data = await response.json();
    
    if (data.responseStatus === 200 && data.responseData) {
      console.log("Translation successful");
      return data.responseData.translatedText || text;
    } else {
      console.warn("Translation response incomplete:", data);
      return text; // Return original text if response is unexpected
    }
  } catch (error) {
    console.error("Translation error:", error);
    return text; // Return original text if translation fails
  }
}

/**
 * Determine the violation type from the extracted document text and context
 */
export async function determineViolationType(documentInfo: DocumentInfo): Promise<ViolationType> {
  const { extractedText, pdfTitle, natureOfExcuse, language } = documentInfo;
  
  // Default to "Other" if we can't determine
  let violationType: ViolationType = "Other";
  
  // For Tagalog documents, we'll only translate the nature of excuse
  // instead of the entire document to avoid hitting API limits
  let excuseToAnalyze = natureOfExcuse || "";
  
  if (language === "Tagalog" && natureOfExcuse) {
    console.log("Detected Tagalog document, translating nature of excuse");
    excuseToAnalyze = await translateTagalogToEnglish(natureOfExcuse);
    console.log("Translated nature of excuse:", excuseToAnalyze);
  }
  
  // Convert to lowercase for case-insensitive matching
  const textLower = extractedText?.toLowerCase() || "";
  const titleLower = pdfTitle?.toLowerCase() || "";
  const excuseLower = excuseToAnalyze.toLowerCase();
  
  // Prioritize checking the nature of excuse first as it's more focused
  if (excuseLower) {
    // Check for attendance related keywords in the excuse
    if (
      excuseLower.includes("absent") || 
      excuseLower.includes("attendance") || 
      excuseLower.includes("absences") ||
      excuseLower.includes("not present") ||
      excuseLower.includes("missed class") ||
      excuseLower.includes("couldn't attend") ||
      excuseLower.includes("couldn't make it to class") ||
      excuseLower.includes("failed to attend") ||
      excuseLower.includes("unable to join") && excuseLower.includes("class")
    ) {
      return "Attendance Issue";
    }
    
    // Check for academic misconduct in the excuse
    else if (
      excuseLower.includes("plagiarism") || 
      excuseLower.includes("cheating") || 
      excuseLower.includes("academic misconduct") ||
      excuseLower.includes("academic dishonesty") ||
      excuseLower.includes("copied") ||
      excuseLower.includes("exam") && (
        excuseLower.includes("cheat") || 
        excuseLower.includes("misconduct")
      ) ||
      excuseLower.includes("assignment") && excuseLower.includes("copied")
    ) {
      return "Academic Misconduct";
    }
    
    // Check for behavioral issues in class in the excuse
    else if (
      (excuseLower.includes("behavior") || excuseLower.includes("behaviour")) && 
      (excuseLower.includes("class") || excuseLower.includes("course")) ||
      excuseLower.includes("disrupt") ||
      excuseLower.includes("inappropriate") ||
      excuseLower.includes("disrespect") ||
      excuseLower.includes("apologize for my recent behavior") ||
      excuseLower.includes("conduct") ||
      excuseLower.includes("misbehavior") ||
      excuseLower.includes("bad behavior")
    ) {
      return "Behavioral Issue";
    }
    
    // Check for property damage
    else if (
      excuseLower.includes("damage") && excuseLower.includes("property") ||
      excuseLower.includes("university property") ||
      excuseLower.includes("sincerely apologize") && excuseLower.includes("damage") ||
      excuseLower.includes("broke") && (
        excuseLower.includes("window") ||
        excuseLower.includes("chair") ||
        excuseLower.includes("desk") ||
        excuseLower.includes("equipment")
      ) ||
      excuseLower.includes("vandalism") ||
      excuseLower.includes("graffiti")
    ) {
      return "Property Damage";
    }

    // Check for dress code violations
    else if (
      excuseLower.includes("uniform") ||
      excuseLower.includes("dress code") ||
      excuseLower.includes("proper attire") ||
      excuseLower.includes("clothing") && (
        excuseLower.includes("violation") ||
        excuseLower.includes("inappropriate") ||
        excuseLower.includes("inappropriate")
      ) ||
      excuseLower.includes("improper") && excuseLower.includes("attire") ||
      excuseLower.includes("not wearing") && (
        excuseLower.includes("uniform") ||
        excuseLower.includes("id") ||
        excuseLower.includes("proper")
      )
    ) {
      return "Dress Code Violation";
    }
  }
  
  // If we couldn't determine from the excuse, check the full text
  // Using the original text without translation
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
    violationType = "Attendance Issue";
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
    violationType = "Academic Misconduct";
  }
  
  // Check for behavioral issues
  else if (
    (textLower.includes("behavior") || textLower.includes("behaviour")) && 
    (textLower.includes("class") || textLower.includes("course")) ||
    textLower.includes("disrupt") ||
    textLower.includes("inappropriate") ||
    textLower.includes("disrespect") ||
    textLower.includes("apologize for my recent behavior") ||
    textLower.includes("conduct violation") ||
    textLower.includes("disciplinary action") ||
    textLower.includes("misbehavior")
  ) {
    violationType = "Behavioral Issue";
  }
  
  // Check for property damage
  else if (
    textLower.includes("damage") && textLower.includes("property") ||
    textLower.includes("university property") ||
    textLower.includes("sincerely apologize") && textLower.includes("damage") ||
    textLower.includes("broke") && (
      textLower.includes("window") ||
      textLower.includes("chair") ||
      textLower.includes("desk")
    ) ||
    textLower.includes("vandalism") ||
    textLower.includes("graffiti")
  ) {
    violationType = "Property Damage";
  }

  // Check for dress code violations
  else if (
    textLower.includes("uniform") ||
    textLower.includes("dress code") ||
    textLower.includes("proper attire") ||
    textLower.includes("clothing") && (
      textLower.includes("violation") ||
      textLower.includes("inappropriate") ||
      textLower.includes("inappropriate")
    ) ||
    textLower.includes("improper") && textLower.includes("attire") ||
    textLower.includes("not wearing") && (
      textLower.includes("uniform") ||
      textLower.includes("id")
    )
  ) {
    violationType = "Dress Code Violation";
  }
  
  return violationType;
}

/**
 * Extract the nature of excuse from the document text - simplified to return the result of extractFirstSentences
 * function from the main extraction module
 */
export function extractNatureOfExcuse(documentInfo: DocumentInfo): string {
  // Safety check - if no document info or text, return empty string
  if (!documentInfo || !documentInfo.extractedText) {
    console.log("No document info or extracted text");
    return "";
  }
  
  // This function now relies on the new extractFirstSentences function used in the main module
  // This simplifies this function significantly and maintains consistency
  
  return "";  // Intentionally return empty string as the main module now handles this
}

/**
 * Update the document info with the violation type and nature of excuse
 */
export async function enhanceDocumentInfo(documentInfo: DocumentInfo): Promise<DocumentInfo> {
  try {
    // Always make sure we have a valid document info object
    const safeDocumentInfo = documentInfo || { extractedText: "" };
    
    // Determine the violation type - we now use async/await for translation
    const violationType = await determineViolationType(safeDocumentInfo);
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
