
// Define the structure for the extracted information
export interface ExtractedDocumentInfo {
  studentNumber?: string;
  senderName?: string;
  date?: string;
  natureOfExcuse?: string;
  addressee?: string;
  course?: string;     // New field for course/subject
  section?: string;    // New field for section
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Extracts structured information from a text document using regex patterns
 * @param text - The text content to analyze
 * @returns Structured information extracted from the document
 */
export async function extractDocumentInfo(text: string): Promise<ExtractedDocumentInfo> {
  try {
    // Initialize results
    const result: ExtractedDocumentInfo = {
      confidence: 'low'
    };
    
    // Clean up the text
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    console.log('First 500 chars of clean text:', cleanText.substring(0, 500));
    
    // Extract student number using various common formats
    const studentNumberPatterns = [
      /Student\s*(?:Number|ID|No)?[:\s]*([0-9]{2}-[0-9]{5}-[0-9]{3})/i,    // Student Number: XX-XXXXX-XXX
      /Student\s*(?:Number|ID|No)?[:\s]*([0-9]{2}-[0-9]{5})/i,             // Student Number: XX-XXXXX
      /Student\s*(?:Number|ID|No)?[:\s]*([0-9]{9})/i,                      // Student Number: XXXXXXXXX
      /Student\s*(?:Number|ID|No)?[:\s]*([0-9]{7})/i,                      // Student Number: XXXXXXX
      /\bID(?:\s*(?:Number|No|#|)):?\s*([0-9-]+)/i,                        // ID Number: XXXXXX
      /\b\d{2}-\d{5}-\d{3}\b/g,                                            // XX-XXXXX-XXX format (anywhere)
      /\b\d{2}-\d{5}\b/g,                                                  // XX-XXXXX format (anywhere)
      /\b\d{9}\b/g,                                                        // XXXXXXXXX format (anywhere) 
      /\b\d{7}\b/g,                                                        // XXXXXXX format (anywhere)
    ];
    
    for (const pattern of studentNumberPatterns) {
      // For patterns with capturing groups
      if (pattern.toString().includes('(')) {
        const match = pattern.exec(cleanText);
        if (match && match[1]) {
          result.studentNumber = match[1].trim();
          break;
        }
      } else {
        // For patterns without capturing groups
        const matches = cleanText.match(pattern);
        if (matches && matches.length > 0) {
          result.studentNumber = matches[0].trim();
          break;
        }
      }
    }
    
    // Enhanced name extraction with specific format patterns
    const namePatterns = [
      /Name:\s*([A-Za-z\s.]+(?:\s[A-Za-z]\.)?\s*[A-Za-z]+)/i,  // Name: First Middle Last
      /Name:\s*([A-Za-z]+,\s*[A-Za-z\s.]+)/i,                 // Name: Last, First Middle
      /Sincerely,\s*([A-Za-z\s.]+)\s*$/im,                    // Sincerely, Name (at end of line)
      /^([A-Za-z\s.]+)\s*Signature/im,                        // Name before "Signature"
      /Signature\s*([A-Za-z\s.]+)/im,                         // Name after "Signature"
      /Signature[\s\S]{1,100}Name:\s*([A-Za-z\s.]+)/im,       // Name after Signature block
    ];
    
    for (const pattern of namePatterns) {
      const match = pattern.exec(cleanText);
      if (match && match[1]) {
        const name = match[1].trim();
        if (name.length >= 2 && !name.toLowerCase().includes('signature')) {
          result.senderName = name;
          break;
        }
      }
    }
    
    // If still no name found, look specifically for name field at bottom of letter
    if (!result.senderName) {
      const bottomNamePattern = /Name:?\s*([A-Za-z\s.]+L\.\s*[A-Za-z]+)/i;
      const match = bottomNamePattern.exec(cleanText);
      if (match && match[1]) {
        result.senderName = match[1].trim();
      }
    }
    
    // Extract date using various formats
    const datePatterns = [
      /Date:?\s*([A-Za-z]+\s+\d{1,2},?\s*\d{4})/i,                // Date: Month Day, Year
      /\b(\d{1,2}\s+[A-Za-z]+\s+\d{4})\b/,                        // Day Month Year
      /\b([A-Za-z]+\s+\d{1,2},?\s*\d{4})\b/,                      // Month Day, Year
      /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/,                           // MM/DD/YYYY or DD/MM/YYYY
      /\b(\d{4}-\d{2}-\d{2})\b/,                                 // YYYY-MM-DD
    ];
    
    for (const pattern of datePatterns) {
      const match = pattern.exec(cleanText);
      if (match && match[1]) {
        result.date = match[1].trim();
        break;
      }
    }
    
    // Extract addressee (who the letter is addressed to)
    const addresseePatterns = [
      /Dear\s+([^,\n.]+)[,\n.]/i,                                // Dear Someone,
      /Attention:?\s*([A-Za-z\s.]+)/i,                          // Attention: Someone
      /To:?\s*([A-Za-z\s.]+)/i,                                // To: Someone
    ];
    
    for (const pattern of addresseePatterns) {
      const match = pattern.exec(cleanText);
      if (match && match[1]) {
        const addressee = match[1].trim();
        if (addressee.length >= 2) {
          result.addressee = addressee;
          break;
        }
      }
    }
    
    // If no specific addressee found, check for job title after "Dear"
    if (!result.addressee) {
      const titlePattern = /Dear\s+[^,\n.]+[,\n.][\s\S]{0,50}([A-Za-z\s]+Professor|Teacher|Dean|Director)/i;
      const match = titlePattern.exec(cleanText);
      if (match && match[1]) {
        result.addressee = match[1].trim();
      }
    }
    
    // Extract course/subject information - improved for common formats
    const coursePatterns = [
      /Course\/Subject:?\s*([A-Za-z0-9\s&.,-]+\d+\s*-\s*\d+)/i, // Course/Subject: XXX000 - 00
      /Course\/Subject:?\s*([A-Za-z0-9\s&.,-]+)/i,              // Course/Subject: Any text
      /\b(?:Course|Subject)\s*:\s*([A-Za-z0-9\s&.,-]+)/i,       // Course: or Subject: Any text
      /\b([A-Z]{2,5}\d{3}[A-Z]?\s*-\s*\d+)\b/,                  // CS322 - 18, CSCI101 - 5, etc.
    ];
    
    for (const pattern of coursePatterns) {
      const match = pattern.exec(cleanText);
      if (match && match[1]) {
        const course = match[1].trim();
        if (course.length >= 2) {
          result.course = course;
          break;
        }
      }
    }
    
    // Extract section information - improved for common formats
    const sectionPatterns = [
      /Section:?\s*([A-Za-z0-9\s.-]+)/i,                       // Section: Any text
      /\bSection\s*:\s*([A-Za-z0-9\s.-]+)/i,                   // Section: Any text (strict colon)
      /\b([0-9][A-Z]{3,4}\s*-\s*\d+)\b/,                        // 3BSCS - 2, 2BSIT - 4, etc.
      /\b([A-Z]{3,4}\s*-\s*\d+)\b/,                            // BSCS - 2, BSIT - 4, etc.
    ];
    
    for (const pattern of sectionPatterns) {
      const match = pattern.exec(cleanText);
      if (match && match[1]) {
        const section = match[1].trim();
        if (section.length >= 1) {
          result.section = section;
          break;
        }
      }
    }
    
    // Extract nature of excuse
    const excusePatterns = [
      /apologize\s+for\s+([^.]+)/i,                           // apologize for [excuse]
      /regret\s+to\s+inform\s+you\s+that\s+([^.]+)/i,         // regret to inform you that [excuse]
      /writing\s+to\s+(?:sincerely\s+)?(?:apologize|explain)\s+([^.]+)/i, // writing to apologize/explain [excuse]
      /I\s+am\s+writing\s+to\s+([^.]+)/i,                     // I am writing to [excuse]
    ];
    
    for (const pattern of excusePatterns) {
      const match = pattern.exec(cleanText);
      if (match && match[1]) {
        const excuse = match[1].trim();
        if (excuse.length > 10) {
          result.natureOfExcuse = excuse;
          break;
        }
      }
    }
    
    // If no excuse found, look for paragraphs after "Dear" but before "Sincerely"
    if (!result.natureOfExcuse) {
      const bodyMatch = /Dear[^.]+\.(.+)Sincerely,/si.exec(cleanText);
      if (bodyMatch && bodyMatch[1]) {
        // Get the first 1-2 sentences of the body
        const bodySentences = bodyMatch[1].split(/[.!?]/).filter(s => s.trim().length > 0);
        if (bodySentences.length > 0) {
          result.natureOfExcuse = bodySentences[0].trim();
          if (bodySentences.length > 1 && result.natureOfExcuse.length < 50) {
            result.natureOfExcuse += '. ' + bodySentences[1].trim();
          }
        }
      }
    }
    
    // Calculate confidence level based on how many fields were extracted
    let extractedCount = 0;
    if (result.studentNumber) extractedCount++;
    if (result.date) extractedCount++;
    if (result.natureOfExcuse) extractedCount++;
    if (result.senderName) extractedCount++;
    if (result.addressee) extractedCount++;
    if (result.course) extractedCount++;
    if (result.section) extractedCount++;
    
    if (extractedCount >= 5) {
      result.confidence = 'high';
    } else if (extractedCount >= 3) {
      result.confidence = 'medium';
    } else {
      result.confidence = 'low';
    }
    
    // Log extraction results for debugging
    console.log('Extraction attempt results:', {
      foundStudentNumber: result.studentNumber,
      foundSenderName: result.senderName,
      foundDate: result.date,
      foundExcuse: result.natureOfExcuse ? result.natureOfExcuse.substring(0, 50) + '...' : null,
      foundAddressee: result.addressee,
      foundCourse: result.course,
      foundSection: result.section,
      confidence: result.confidence
    });
    
    return result;
    
  } catch (error) {
    console.error('Error extracting document information:', error);
    return { confidence: 'low' };
  }
}
