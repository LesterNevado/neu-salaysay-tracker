
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
      return "Attendance";
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
      return "Academic";
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
      excuseLower.includes("damage") && excuseLower.includes("property") ||
      excuseLower.includes("university property") ||
      excuseLower.includes("sincerely apologize") && excuseLower.includes("damage")
    ) {
      return "Academic";
    }
    
    // Check for medical related excuses in the excuse
    else if (
      excuseLower.includes("sick") ||
      excuseLower.includes("illness") ||
      excuseLower.includes("medical") ||
      excuseLower.includes("doctor") ||
      excuseLower.includes("hospital") ||
      excuseLower.includes("health") ||
      excuseLower.includes("fever") ||
      excuseLower.includes("injury") ||
      excuseLower.includes("appointment") && 
        (excuseLower.includes("doctor") || excuseLower.includes("medical")) ||
      excuseLower.includes("not feeling well") ||
      excuseLower.includes("under the weather")
    ) {
      return "Medical";
    }
    
    // Check for family emergencies in the excuse
    else if (
      (excuseLower.includes("family") && (
        excuseLower.includes("emergency") ||
        excuseLower.includes("urgent") ||
        excuseLower.includes("crisis") ||
        excuseLower.includes("matter") ||
        excuseLower.includes("issue") ||
        excuseLower.includes("problem")
      )) ||
      excuseLower.includes("death") ||
      excuseLower.includes("funeral") ||
      excuseLower.includes("bereavement") ||
      excuseLower.includes("relative") && (excuseLower.includes("sick") || excuseLower.includes("ill")) ||
      excuseLower.includes("parent") && (
        excuseLower.includes("sick") || 
        excuseLower.includes("hospital") ||
        excuseLower.includes("emergency")
      )
    ) {
      return "Family";
    }
    
    // Check for technical issues in the excuse
    else if (
      excuseLower.includes("technical") ||
      excuseLower.includes("internet") ||
      excuseLower.includes("connection") ||
      excuseLower.includes("device") ||
      excuseLower.includes("computer") ||
      excuseLower.includes("laptop") ||
      excuseLower.includes("power outage") ||
      excuseLower.includes("wifi") ||
      excuseLower.includes("network") ||
      excuseLower.includes("electricity") ||
      excuseLower.includes("browser") ||
      excuseLower.includes("website") && excuseLower.includes("down") ||
      excuseLower.includes("technical difficulties") ||
      excuseLower.includes("software") ||
      excuseLower.includes("system") && excuseLower.includes("down")
    ) {
      return "Technical";
    }

    // Check for transportation issues in the excuse
    else if (
      excuseLower.includes("transport") ||
      excuseLower.includes("traffic") ||
      excuseLower.includes("commute") ||
      excuseLower.includes("travel") ||
      excuseLower.includes("late") ||
      excuseLower.includes("car") && (
        excuseLower.includes("broke") || 
        excuseLower.includes("accident") ||
        excuseLower.includes("problem")
      ) ||
      excuseLower.includes("flat tire") ||
      excuseLower.includes("public transportation") ||
      excuseLower.includes("missed the bus") ||
      excuseLower.includes("train delay") ||
      excuseLower.includes("stuck in traffic") ||
      excuseLower.includes("transportation issue")
    ) {
      return "Transport";
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
    textLower.includes("assignment") && textLower.includes("copied") ||
    textLower.includes("damage") && textLower.includes("property") ||
    textLower.includes("university property") ||
    textLower.includes("sincerely apologize") && textLower.includes("damage")
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
