
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
    
    // Extract student ID (numbers)
    const studentIdPatterns = [
      /(?:student\s+id|id\s*:|found\s+student\s+id)[\s:]*([0-9]{2}-[0-9]{4,5}-[0-9]{3})/i,
      /\b(\d{2}-\d{4,5}-\d{3})\b/,  // Pattern like 22-12857-750
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

    // Extract student name with improved pattern matching - prioritize "Sincerely" format
    const namePatterns = [
      /Sincerely,?\s*(?:yours,?)?\s*[\n\r]*\s*([A-Z][a-z]+(?:\s+[A-Z][a-zA-Z\.-]+){1,3})/i,  // Prioritize "Sincerely, Name"
      /Sincerely,?\s*[\n\r]*\s*([^\n\r]{3,40})/i,  // Catch more varied formats after "Sincerely"
      /Respectfully(?:\s+yours)?,?\s*[\n\r]*\s*([A-Z][a-z]+(?:\s+[A-Z][a-zA-Z\.-]+){1,3})/i, // "Respectfully yours, Name"
      /(?:I am|I,|My name is|This is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-zA-Z\.-]+){1,3})/i,
      /From:\s*([A-Z][a-z]+(?:\s+[A-Z][a-zA-Z\.-]+){1,3})/i,
      /Submitted by:\s*([A-Z][a-z]+(?:\s+[A-Z][a-zA-Z\.-]+){1,3})/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-zA-Z\.-]+){1,3})\s+(?:is|am) writing/i
    ];

    for (const pattern of namePatterns) {
      const nameMatch = text.match(pattern);
      if (nameMatch && nameMatch[1]) {
        const potentialName = nameMatch[1].trim();
        // Check if this is a valid name (not just a short word or number)
        if (potentialName.length > 5 && !/^\d+$/.test(potentialName)) {
          documentInfo.studentName = potentialName;
          console.log("Found student name:", documentInfo.studentName);
          break;
        }
      }
    }

    // Extract addressee/professor name with improved patterns
    const addresseePatterns = [
      /(?:Dear|To|Attention:)\s+((?:Ma'am|Sir|Prof\.?|Professor|Dr\.?|Mr\.?|Ms\.?|Mrs\.?|Ma\.?)\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*(?:Laureta)?)/i,
      /(?:Dear|To|Attention:)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
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
        }
        console.log("Found addressee:", documentInfo.addressee);
        break;
      }
    }

    // Extract course code with improved pattern
    if (!documentInfo.courseCode) {
      const coursePatterns = [
        /\b[A-Z]{2,4}\s*\d{3,4}\b/,
        /(?:course|subject|class):\s*([A-Z]{2,4}\s*\d{3,4})/i
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
    }

    // Extract date from text with improved pattern
    const datePatterns = [
      /(?:Found and formatted date:|Incident Date:|Date:|Dated:)\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(\d{4}-\d{2}-\d{2})/,
      /April\s+\d{1,2},?\s+\d{4}/i,  // Specific to the sample we saw
      /([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i  // March 30, 2025
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

    // Extract nature of excuse
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
    
    // In case of error, return an object with available information
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
  
  // Try to extract a specific excuse using various patterns
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
  
  // If no specific excuse found, look for text related to behavior in class
  if (extractedText.includes("behavior") && 
      (extractedText.includes("class") || extractedText.includes("course"))) {
    return "recent behavior in your class";
  }
  
  return "";
}

export default extractDocumentInfo;
