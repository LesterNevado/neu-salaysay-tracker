import { extractPdfText } from "../pdf/extractPdfText";
import enhanceDocumentInfo from "./determineViolationType";
import { ViolationType } from "../../types/database.types";
import { format, parse } from "date-fns";

export interface DocumentInfo {
  extractedText: string;
  studentId?: string;
  studentName?: string;
  courseCode?: string;
  violationType?: ViolationType;
  pdfTitle?: string;
  natureOfExcuse?: string;
  submissionDate?: string;
  addressee?: string;
  section?: string;
}

/**
 * Extract information from a PDF document
 */
export async function extractDocumentInfo(file: File): Promise<DocumentInfo> {
  try {
    console.log("Starting document info extraction for:", file.name);
    
    // Extract text from PDF
    const text = await extractPdfText(file);
    console.log("Extracted text:", text);
    
    // Create basic document info object
    let documentInfo: DocumentInfo = {
      extractedText: text,
      pdfTitle: file.name,
      submissionDate: format(new Date(), 'MMMM d, yyyy')
    };
    
    // Extract student ID (based on the template pattern - near the bottom)
    const studentIdPatterns = [
      /Student\s+Number(?::|\/|\()?(?:[^)]*\))?[\s:]*([0-9X]{2}-[0-9X]{4,7}-[0-9X]{3})/i,
      /\b(\d{2}-\d{4,7}-\d{3})\b/,  // Pattern like 22-12857-750
      /Student\s+(?:ID|Number):\s*([a-zA-Z0-9-]+)/i,
      /\b\d{8,10}\b/            // General 8-10 digit number
    ];
    
    for (const pattern of studentIdPatterns) {
      const studentIdMatch = text.match(pattern);
      if (studentIdMatch) {
        documentInfo.studentId = studentIdMatch[1] || studentIdMatch[0];
        console.log("Found student ID:", documentInfo.studentId);
        break;
      }
    }

    // Extract student name - Focus precisely on what comes immediately after "Sincerely,"
    const namePatterns = [
      // Strict pattern: Exactly what's below "Sincerely," - focusing on line breaks
      /Sincerely,[\s\r\n]+((?:[A-Z][a-z]+[\s\r\n]*)+(?:[A-Z][a-zA-Z\.-]+[\s\r\n]*)*)/i,
      
      // Find name on the next line after "Sincerely,"
      /Sincerely,[\s\r\n]+([A-Z][a-z]+(?:[\s\r\n]+[A-Z][a-zA-Z\.-]+){0,3})/i,
      
      // More permissive pattern but still anchored to Sincerely
      /Sincerely,[\s\r\n]+((?:[A-Z][a-z]+[\s\r\n]+){1,3})/i,
      
      // Alternative closings with similar pattern
      /(?:Respectfully|Regards|Yours truly|Thank you),[\s\r\n]+([A-Z][a-z]+(?:[\s\r\n]+[A-Z][a-zA-Z\.-]+){0,3})/i,
      
      // Last resort - look for capitalized words after Sincerely that don't match common phrases
      /Sincerely,[\s\r\n]+([A-Z][a-z]+(?:[\s\r\n]+[A-Z][a-z]+){0,3})(?![\s\r\n]+(?:for|and|the|your|in|of|hope|thank))/i
    ];

    let foundName = false;
    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        // Clean up the potential name (trim and remove extra whitespace)
        let potentialName = match[1].trim()
          .replace(/[\r\n]+/g, ' ')  // Replace line breaks with spaces
          .replace(/\s{2,}/g, ' ');  // Replace multiple spaces with one
        
        // Filter out common phrases that might be misidentified as names
        if (
          potentialName.length > 3 && 
          !/^\d+$/.test(potentialName) && 
          !/^(Sincerely|Respectfully|Regards|Thank you)$/i.test(potentialName) &&
          !/hope for your|thank you for|appreciate your/i.test(potentialName)
        ) {
          // Check if the potential name is more than one word
          if (potentialName.includes(' ')) {
            documentInfo.studentName = potentialName;
            console.log("Found sender name after complimentary close:", documentInfo.studentName);
            foundName = true;
            break;
          }
        }
      }
    }

    // If no name found, try a more specific pattern for the Sincerely line
    if (!foundName) {
      // Try to find the line with "Sincerely," and then take the next non-empty line
      const lines = text.split(/[\r\n]+/).filter(line => line.trim().length > 0);
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().match(/^Sincerely,$/i) && i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          // Make sure it looks like a name (not starting with numbers, not too short)
          if (nextLine.length > 3 && !/^\d/.test(nextLine) && 
              !/hope for your|thank you for|appreciate your/i.test(nextLine)) {
            documentInfo.studentName = nextLine;
            console.log("Found sender name on line after 'Sincerely,':", documentInfo.studentName);
            foundName = true;
            break;
          }
        }
      }
    }

    // If no name found with the primary patterns, try backup patterns
    if (!foundName) {
      const backupNamePatterns = [
        // Direct name pattern as in template 
        /Name[\s\n\r]*(?:\(First Name Middle Initial Surname\))?[\s\n\r]*:?[\s\n\r]*([A-Z][a-z]+(?:\s+[A-Z][a-zA-Z\.-]+){1,3})/i,
        
        // Other common self-identification patterns
        /(?:I am|I,|My name is|This is)[\s\n\r]+([A-Z][a-z]+(?:\s+[A-Z][a-zA-Z\.-]+){1,3})/i,
        /Submitted by:[\s\n\r]*([A-Z][a-z]+(?:\s+[A-Z][a-zA-Z\.-]+){1,3})/i
      ];
      
      for (const pattern of backupNamePatterns) {
        const nameMatch = text.match(pattern);
        if (nameMatch && nameMatch[1]) {
          const potentialName = nameMatch[1].trim();
          if (potentialName.length > 5 && !/^\d+$/.test(potentialName)) {
            documentInfo.studentName = potentialName;
            console.log("Found student name using backup pattern:", documentInfo.studentName);
            break;
          }
        }
      }
    }

    // Extract addressee/professor name with patterns specifically for "Dear Addressee" format from template
    const addresseePatterns = [
      // Template format - specifically find "Dear Addressee"
      /Dear[\s\n\r]+((?:Ma'am|Sir|Prof\.?|Professor|Dr\.?|Mr\.?|Ms\.?|Mrs\.?|Ma\.?)[^,\n\r]*)/i,
      
      // Alternative with position
      /Dear[\s\n\r]+(.+?)(?:,|[\n\r]+Position)/i,
      
      // Common addressee formats
      /(?:Dear|To|Attention:)[\s\n\r]+((?:Ma'am|Sir|Prof\.?|Professor|Dr\.?|Mr\.?|Ms\.?)\s*[A-Z][a-z]+(?:\s+[A-Z][a-zA-Z\.-]+)*)/i,
      /(?:Dear|To|Attention:)[\s\n\r]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      
      // Generic address
      /(?:To whom it may concern|Dear Sir\/Madam)/i
    ];

    for (const pattern of addresseePatterns) {
      const addresseeMatch = text.match(pattern);
      if (addresseeMatch) {
        // If it's a general salutation, use a default value
        if (addresseeMatch[0].match(/(?:To whom it may concern|Dear Sir\/Madam)/i)) {
          documentInfo.addressee = addresseeMatch[0].trim();
        } else if (addresseeMatch[1]) {
          documentInfo.addressee = addresseeMatch[1].trim();
          // Remove any trailing commas or periods
          documentInfo.addressee = documentInfo.addressee.replace(/[,.]+$/, '');
        }
        console.log("Found addressee:", documentInfo.addressee);
        break;
      }
    }

    // Extract course code with improved pattern
    const coursePatterns = [
      // Template format - specifically labeled as Course/Subject
      /Course\/Subject(?:\s+\(If necessary\))?[\s\n\r]*:?[\s\n\r]*([A-Z]{2,4}\s*\d{3,4}[A-Z]?)/i,
      
      // General course code patterns
      /\b([A-Z]{2,4}\s*\d{3,4}[A-Z]?)\b/,
      /(?:course|subject|class):[\s\n\r]*([A-Z]{2,4}\s*\d{3,4}[A-Z]?)/i
    ];

    for (const pattern of coursePatterns) {
      const courseMatch = text.match(pattern);
      if (courseMatch) {
        const matchedText = courseMatch[1] || courseMatch[0];
        documentInfo.courseCode = matchedText.trim();
        console.log("Found course code:", documentInfo.courseCode);
        break;
      }
    }

    // Extract section information
    const sectionPatterns = [
      // Template format - specifically labeled as Section
      /Section(?:\s+\(If necessary\))?[\s\n\r]*:?[\s\n\r]*([A-Z0-9-]+)/i,
      
      // General section patterns
      /section[\s\n\r]*:?[\s\n\r]*([A-Z0-9-]+)/i
    ];

    for (const pattern of sectionPatterns) {
      const sectionMatch = text.match(pattern);
      if (sectionMatch && sectionMatch[1]) {
        documentInfo.section = sectionMatch[1].trim();
        console.log("Found section:", documentInfo.section);
        break;
      }
    }

    // Extract date from text with improved pattern based on template
    const datePatterns = [
      // Template format - Date at the top of the letter
      /Date[\s\n\r]*(?:\(Month Day, Year\))?[\s\n\r]*:?[\s\n\r]*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
      
      // Common date formats
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(\d{4}-\d{2}-\d{2})/,
      /([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i
    ];

    for (const pattern of datePatterns) {
      const dateMatch = text.match(pattern);
      if (dateMatch && dateMatch[1]) {
        try {
          let parsedDate;
          const dateStr = dateMatch[1].trim();
          
          // Try different date formats
          if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
            parsedDate = parse(dateStr, 'MM/dd/yyyy', new Date());
          } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            parsedDate = parse(dateStr, 'yyyy-MM-dd', new Date());
          } else {
            // Handle formats like "March 30, 2025" or "March 30 2025"
            if (dateStr.includes(',')) {
              parsedDate = parse(dateStr, 'MMMM d, yyyy', new Date());
            } else {
              parsedDate = parse(dateStr, 'MMMM d yyyy', new Date());
            }
          }
          
          if (!isNaN(parsedDate.getTime())) {
            documentInfo.submissionDate = format(parsedDate, 'MMMM d, yyyy');
            console.log("Found and formatted date:", documentInfo.submissionDate);
            break;
          }
        } catch (error) {
          console.warn("Error parsing date:", error);
          continue; // Try the next pattern
        }
      }
    }

    // Extract nature of excuse from the document body - focusing on the main content area of the template
    const excuseResult = extractNatureOfExcuse(documentInfo);
    documentInfo.natureOfExcuse = excuseResult;
    console.log("Extracted nature of excuse:", documentInfo.natureOfExcuse);

    // Enhance the document info
    const enhancedInfo = enhanceDocumentInfo(documentInfo);
    console.log("Enhanced document info:", enhancedInfo);
    
    // Log the extraction results in the format shown in the image
    console.log("Extraction results:", {
      studentNumber: enhancedInfo.studentId,
      senderName: enhancedInfo.studentName,
      addressee: enhancedInfo.addressee,
      date: enhancedInfo.submissionDate,
      natureOfExcuse: enhancedInfo.natureOfExcuse,
      confidence: "high"
    });
    
    return enhancedInfo;
  } catch (error) {
    console.error("Error in extractDocumentInfo:", error);
    
    // In case of error, return object with available information
    const baseInfo: DocumentInfo = {
      extractedText: "Error extracting text from document",
      pdfTitle: file.name,
      submissionDate: format(new Date(), 'MMMM d, yyyy')
    };

    console.log("Using partial values due to error:", baseInfo);
    return baseInfo;
  }
}

/**
 * Extract the nature of excuse from the document text
 */
function extractNatureOfExcuse(documentInfo: DocumentInfo): string {
  // Safety check - if no document info or text, return empty
  if (!documentInfo || !documentInfo.extractedText) {
    return "";
  }
  
  const { extractedText } = documentInfo;
  
  // First, try to identify the main body content based on the template's structure
  // This would be between "Position" and "Sincerely"
  let mainContent = "";
  const mainContentMatch = extractedText.match(/Position[\s\n\r]+(.*?)[\s\n\r]+Sincerely,?/is);
  
  if (mainContentMatch && mainContentMatch[1]) {
    mainContent = mainContentMatch[1].trim();
    
    // If we found the main content, and it's substantive (not just "Salaysay Content" placeholder)
    if (mainContent.length > 20 && !mainContent.match(/^Salaysay Content/i)) {
      // Return a condensed version if it's very long
      if (mainContent.length > 150) {
        return mainContent.substring(0, 147) + "...";
      }
      return mainContent;
    }
  }
  
  // If we didn't find the main content using the template structure,
  // try other patterns to extract excuse
  const excusePatterns = [
    /(?:apologize|apology|sorry|regret)\s+for\s+([^.;:]{10,150})/i,
    /(?:excuse|reason|explanation)\s+(?:is|for)\s+([^.;:]{10,150})/i,
    /(?:regarding|concerning|about)\s+([^.;:]{10,150})/i,
    /(?:request|ask)\s+(?:your|for)\s+(?:consideration|understanding)\s+(?:for|regarding)\s+([^.;:]{10,150})/i,
    /I(?:'m| am)?\s+writing\s+(?:to\s+)?(?:you\s+)?(?:about|regarding|concerning)\s+([^.;:]{10,150})/i,
    /recent\s+behavior\s+in\s+your\s+class/i
  ];
  
  // Check each pattern
  for (const pattern of excusePatterns) {
    const match = extractedText.match(pattern);
    if (match) {
      // Get the matched excuse
      const matchedExcuse = match[1] || match[0];
      if (matchedExcuse && matchedExcuse.trim().length > 5) {
        return matchedExcuse.trim();
      }
    }
  }
  
  // If no specific excuse found, check for content between salutation and signature
  const generalContentMatch = extractedText.match(/Dear\s+[^,\n\r]*,?[\s\n\r]+(.*?)[\s\n\r]+(?:Sincerely|Respectfully)/is);
  if (generalContentMatch && generalContentMatch[1]) {
    const content = generalContentMatch[1].trim();
    if (content.length > 20) {
      // Return a condensed version if very long
      if (content.length > 150) {
        return content.substring(0, 147) + "...";
      }
      return content;
    }
  }
  
  return "";
}

export default extractDocumentInfo;
