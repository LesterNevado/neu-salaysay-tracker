import { extractPdfText } from "../pdf/extractPdfText";
import enhanceDocumentInfo from "./determineViolationType";
import { ViolationType } from "../../types/database.types";
import { format, parse } from "date-fns";
import { TAGALOG_VIOLATION_TYPES } from "@/components/upload/types";

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
  language?: "English" | "Tagalog";
}

/**
 * Determines if a document is in Tagalog based on key phrases
 * @param text The extracted text from the document
 */
function detectLanguage(text: string): "English" | "Tagalog" {
  // Tagalog key phrases to look for
  const tagalogPhrases = [
    "Kapatid na", 
    "inyong", 
    "Kapatid sa", 
    "Pangino", 
    "Petsa", 
    "Seksyon", 
    "Kurso", 
    "Numero ng Mag-aaral",
    "Ang inyong Kapatid sa Panginoon",
    "nagpapasalamat",
    "pagkakulang",
    "dahil sa"
  ];
  
  // Count occurrences of Tagalog phrases
  const tagalogMatches = tagalogPhrases.filter(phrase => 
    text.toLowerCase().includes(phrase.toLowerCase())
  ).length;
  
  // If we have multiple Tagalog phrases, it's likely a Tagalog document
  return tagalogMatches >= 2 ? "Tagalog" : "English";
}

/**
 * Clean a potential name by removing any numbers and extra spaces
 */
function cleanName(name: string): string {
  // Remove any numbers
  const nameWithoutNumbers = name.replace(/\d+/g, '');
  
  // Remove extra spaces and trim
  return nameWithoutNumbers
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Extract 1-2 sentences from a longer text
 * @param text The text to extract from
 */
function extractFirstSentences(text: string, maxSentences: number = 2): string {
  if (!text) return "";
  
  // Define sentence-ending patterns including period, exclamation, question mark
  const sentenceEndingPattern = /[.!?]+["']?\s/g;
  
  // Find sentence endings
  const matches = [...text.matchAll(sentenceEndingPattern)];
  
  if (matches.length === 0) {
    // If no sentence endings found, return first 150 chars with ellipsis if needed
    return text.length > 150 ? text.substring(0, 147) + "..." : text;
  }
  
  // If we have fewer sentences than requested, use all of them
  const sentencesToUse = Math.min(maxSentences, matches.length);
  
  // Get the end position of the nth sentence
  const endIndex = matches[sentencesToUse - 1].index + matches[sentencesToUse - 1][0].length;
  
  return text.substring(0, endIndex).trim();
}

/**
 * Determine Tagalog violation type based on content
 * @param text The extracted text to analyze
 */
function determineTagalogViolationType(text: string): ViolationType {
  // Keywords for different violation types in Tagalog
  const keywordMap: Record<ViolationType, string[]> = {
    "Attendance": ["pagpasok", "hindi nakapasok", "absent", "hindi makakapasok", "hindi makapunta", "pagliban", "hindi makadalo"],
    "Technical": ["computer", "laptop", "internet", "wifi", "kuryente", "brownout", "technical", "gadget", "cellphone", "nawala", "nasira", "nasiraan", "problema sa device"],
    "Academic": ["exam", "quiz", "project", "thesis", "takdang-aralin", "assignment", "hindi matapos", "hindi nagawa", "pasahan", "requirement", "hindi makapag-submit"],
    "Transport": ["trapik", "traffic", "masira ang sasakyan", "masiraan ng", "baha", "ulan", "transportasyon", "biyahe", "naabutan ng ulan", "nawalan ng masasakyan", "walang masakyan"],
    "Family": ["pamilya", "kasal", "libing", "namatay", "birthday", "kapatid", "nanay", "tatay", "magulang", "kamag-anak", "emerhensiyang pampamilya"],
    "Medical": ["sakit", "lagnat", "ubo", "sipon", "hospital", "klinika", "doktor", "check-up", "nagkasakit", "naospital", "hindi maganda ang pakiramdam", "hindi makakaattend dahil"],
    "Other": []
  };

  // Convert text to lowercase for case-insensitive matching
  const lowerText = text.toLowerCase();
  
  // Check each violation type for keywords
  for (const [type, keywords] of Object.entries(keywordMap)) {
    if (type === "Other") continue; // Skip "Other" as it's our fallback
    
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return type as ViolationType;
      }
    }
  }
  
  // If no specific violation type is detected, return "Other"
  return "Other";
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
    
    // Detect language
    const language = detectLanguage(text);
    console.log("Detected language:", language);
    
    // Create basic document info object
    let documentInfo: DocumentInfo = {
      extractedText: text,
      pdfTitle: file.name,
      submissionDate: format(new Date(), 'MMMM d, yyyy'),
      language: language
    };
    
    // Extract information based on detected language
    if (language === "Tagalog") {
      documentInfo = extractTagalogDocumentInfo(text, documentInfo);
    } else {
      documentInfo = extractEnglishDocumentInfo(text, documentInfo);
    }

    // If we found a student name, clean it to remove any numbers
    if (documentInfo.studentName) {
      documentInfo.studentName = cleanName(documentInfo.studentName);
      console.log("Cleaned student name:", documentInfo.studentName);
    }

    // For Tagalog documents, determine the violation type based on the extracted nature of excuse
    if (language === "Tagalog" && documentInfo.natureOfExcuse) {
      documentInfo.violationType = determineTagalogViolationType(documentInfo.natureOfExcuse);
      console.log("Determined Tagalog violation type:", documentInfo.violationType);
    } else {
      // Enhance the document info for English documents
      documentInfo = enhanceDocumentInfo(documentInfo);
    }
    
    console.log("Enhanced document info:", documentInfo);
    
    // Log the extraction results
    console.log("Extraction results:", {
      studentNumber: documentInfo.studentId,
      senderName: documentInfo.studentName,
      addressee: documentInfo.addressee,
      date: documentInfo.submissionDate,
      natureOfExcuse: documentInfo.natureOfExcuse,
      confidence: "high",
      language: documentInfo.language
    });
    
    return documentInfo;
  } catch (error) {
    console.error("Error in extractDocumentInfo:", error);
    
    // In case of error, return object with available information
    const baseInfo: DocumentInfo = {
      extractedText: "Error extracting text from document",
      pdfTitle: file.name,
      submissionDate: format(new Date(), 'MMMM d, yyyy'),
      language: "English" // Default to English on error
    };

    console.log("Using partial values due to error:", baseInfo);
    return baseInfo;
  }
}

/**
 * Extract information from Tagalog documents
 */
function extractTagalogDocumentInfo(text: string, baseInfo: DocumentInfo): DocumentInfo {
  console.log("Extracting information from Tagalog document");
  
  // Extract student ID (Numero ng Mag-aaral or Student Number)
  const studentIdPatterns = [
    /Student\s+Number\s*[:(]?\s*([0-9X]{2}-[0-9X]{4,7}-[0-9X]{3})/i,
    /Numero ng Mag-aaral\s*[:(]?\s*([0-9X]{2}-[0-9X]{4,7}-[0-9X]{3})/i,
    /\b(\d{2}-\d{4,7}-\d{3})\b/,  // Pattern like 22-12857-750
    /\(([X]{2}-[X]{5,6}-[X]{3})\)/i,  // Pattern for the placeholder (XX-XXXXX-XXX)
  ];
  
  for (const pattern of studentIdPatterns) {
    const studentIdMatch = text.match(pattern);
    if (studentIdMatch) {
      baseInfo.studentId = studentIdMatch[1] || studentIdMatch[0];
      console.log("Found student ID:", baseInfo.studentId);
      break;
    }
  }

  // Extract student name (Pangalan ng Mag-aaral or Sender Name)
  // First look for patterns specific to the Tagalog template
  const namePatterns = [
    /Ang inyong Kapatid sa Panginoon,[\s\r\n]+([\w\s]+)/i,
    /Sender Name[\s\r\n]+([\w\s]+)/i,
    /Pangalan ng Mag-aaral[\s\r\n:]+([^\r\n]+)/i,
  ];
  
  for (const pattern of namePatterns) {
    const nameMatch = text.match(pattern);
    if (nameMatch && nameMatch[1]) {
      const potentialName = nameMatch[1].trim()
        .replace(/[\r\n]+/g, ' ')  // Replace line breaks with spaces
        .replace(/\s{2,}/g, ' ');  // Replace multiple spaces with one
      
      if (potentialName.length > 3 && !/^\d+$/.test(potentialName)) {
        baseInfo.studentName = potentialName;
        console.log("Found sender name:", baseInfo.studentName);
        break;
      }
    }
  }
  
  // If no sender name found, try looking specifically after "Ang inyong" or "Kapatid sa"
  if (!baseInfo.studentName) {
    const lines = text.split(/[\r\n]+/).filter(line => line.trim().length > 0);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("Ang inyong") || lines[i].includes("Kapatid sa")) {
        // Check next line for potential name
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (nextLine.length > 3 && !/^\d/.test(nextLine)) {
            baseInfo.studentName = nextLine;
            console.log("Found sender name from line after salutation:", baseInfo.studentName);
            break;
          }
        }
      }
    }
  }

  // Extract addressee from "Kapatid na [Name]"
  const addresseePatterns = [
    /Kapatid na[\s\r\n]+([^\r\n,]+)/i,
    /Position[\s\r\n]+([^\r\n,]+)/i
  ];
  
  for (const pattern of addresseePatterns) {
    const addresseeMatch = text.match(pattern);
    if (addresseeMatch && addresseeMatch[1]) {
      baseInfo.addressee = addresseeMatch[1].trim().replace(/[,.]+$/, '');
      console.log("Found addressee:", baseInfo.addressee);
      break;
    }
  }

  // Extract date (Petsa)
  const datePatterns = [
    /Petsa[\s\r\n]*:?[\s\r\n]*([^\r\n]+)/i,
    /Date[\s\r\n]*:?[\s\r\n]*([^\r\n]+)/i,
    /(\d{1,2}\/\d{1,2}\/\d{4})/,
    /(\d{4}-\d{2}-\d{2})/
  ];
  
  for (const pattern of datePatterns) {
    const dateMatch = text.match(pattern);
    if (dateMatch && dateMatch[1]) {
      try {
        const dateStr = dateMatch[1].trim();
        let parsedDate;
        
        // Try different date formats
        if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
          parsedDate = parse(dateStr, 'MM/dd/yyyy', new Date());
        } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          parsedDate = parse(dateStr, 'yyyy-MM-dd', new Date());
        } else if (dateStr.includes(',')) {
          parsedDate = parse(dateStr, 'MMMM d, yyyy', new Date());
        } else {
          parsedDate = parse(dateStr, 'MMMM d yyyy', new Date());
        }
        
        if (!isNaN(parsedDate.getTime())) {
          baseInfo.submissionDate = format(parsedDate, 'MMMM d, yyyy');
          console.log("Found date:", baseInfo.submissionDate);
          break;
        }
      } catch (error) {
        console.warn("Error parsing date:", error);
        continue;
      }
    }
  }

  // Extract section information
  const sectionPatterns = [
    /Section\s+\(If included\)[\s\r\n]*:?[\s\r\n]*([^\r\n]+)/i,
    /Seksyon[\s\r\n]*:?[\s\r\n]*([^\r\n]+)/i
  ];
  
  for (const pattern of sectionPatterns) {
    const sectionMatch = text.match(pattern);
    if (sectionMatch && sectionMatch[1]) {
      baseInfo.section = sectionMatch[1].trim();
      console.log("Found section:", baseInfo.section);
      break;
    }
  }
  
  // Extract nature of excuse - improved to get only 1-2 sentences
  baseInfo.natureOfExcuse = extractTagalogExcuseNature(text);
  console.log("Extracted nature of excuse:", baseInfo.natureOfExcuse);
  
  return baseInfo;
}

/**
 * Extract nature of excuse from Tagalog documents - improved to exclude the addressee line
 */
function extractTagalogExcuseNature(text: string): string {
  // Look for text that comes after the first few lines but before the signature
  // This approach better handles the actual content without including the addressee
  const contentLines = text.split(/[\r\n]+/);
  let contentStarted = false;
  let contentText = [];
  let addresseeFound = false;
  
  for (let i = 0; i < contentLines.length; i++) {
    const line = contentLines[i].trim();
    
    // Skip empty lines
    if (!line) continue;
    
    // Detect when we've found the addressee line (e.g., "Kapatid na Guro" or just "Guro")
    if (!addresseeFound && (line.match(/^Kapatid na/i) || line.match(/^Guro/i) || line.match(/^Position/i))) {
      addresseeFound = true;
      continue; // Skip this line as it's the addressee
    }
    
    // Start collecting content after the addressee is found and we have a non-addressee line
    if (addresseeFound && !contentStarted) {
      // Skip lines that contain only an addressee name or position title
      if (line.length < 20 && !line.includes(" ")) {
        continue;
      }
      contentStarted = true;
    }
    
    // Collect content until we hit a closing line
    if (contentStarted) {
      // Stop when we reach the signature lines
      if (line.match(/^Ang inyong/i) || line.match(/^Salamat po/i) || line.match(/^Sumasainyo/i) || 
          line.match(/^Lubos na gumagalang/i) || line.match(/^Nagpapasalamat/i)) {
        break;
      }
      
      contentText.push(line);
    }
  }
  
  // Join the content lines and extract the first 1-2 sentences
  if (contentText.length > 0) {
    const joinedContent = contentText.join(" ");
    return extractFirstSentences(joinedContent, 2);
  }
  
  // Fallback to the original approach if the above didn't yield results
  const contentMatch = text.match(/(?:Kapatid na[^\n]*|Guro)[^\n]*[\r\n]+(.*?)(?:[\r\n]+Ang inyong|[\r\n]+Salamat po|[\r\n]+Sumasainyo)/is);
  
  if (contentMatch && contentMatch[1]) {
    const content = contentMatch[1].trim();
    if (content.length > 20) {
      return extractFirstSentences(content, 2);
    }
  }
  
  return "";
}

/**
 * Extract information from English documents - using the original extractDocumentInfo logic
 */
function extractEnglishDocumentInfo(text: string, baseInfo: DocumentInfo): DocumentInfo {
  console.log("Extracting information from English document");
  
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
      baseInfo.studentId = studentIdMatch[1] || studentIdMatch[0];
      console.log("Found student ID:", baseInfo.studentId);
      break;
    }
  }

  // Extract student name - Focus precisely on what comes immediately after "Sincerely,"
  const namePatterns = [
    // Pattern specifically looking for name after "Sincerely," and a comma
    /Sincerely,[\s\r\n]+([A-Z][a-z]+(?:[\s\r\n]+[A-Z][a-z\.-]+){0,3})(?![\s\r\n]+(?:hope|for|your|understanding|thank|you))/i,
    
    // Alternative with complimentary close followed by name
    /(?:Respectfully|Regards|Yours truly|Thank you),[\s\r\n]+([A-Z][a-z]+(?:[\s\r\n]+[A-Z][a-z\.-]+){0,3})(?![\s\r\n]+(?:hope|for|your|understanding|thank|you))/i,
  ];

  let foundName = false;
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      // Clean up the potential name
      let potentialName = match[1].trim()
        .replace(/[\r\n]+/g, ' ')  // Replace line breaks with spaces
        .replace(/\s{2,}/g, ' ');  // Replace multiple spaces with one
      
      // Filter out common phrases that might be misidentified as names
      if (
        potentialName.length > 3 && 
        !/^\d+$/.test(potentialName) && 
        !/^(Sincerely|Respectfully|Regards|Thank you)$/i.test(potentialName) &&
        !/hope for your|thank you for|appreciate your|sincerely|respectfully/i.test(potentialName)
      ) {
        baseInfo.studentName = potentialName;
        console.log("Found sender name after complimentary close:", baseInfo.studentName);
        foundName = true;
        break;
      }
    }
  }

  // If no name found, try a more reliable line-by-line approach
  if (!foundName) {
    const lines = text.split(/[\r\n]+/).filter(line => line.trim().length > 0);
    let sincerelyIndex = -1;
    
    // First, find the line with "Sincerely,"
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().match(/^Sincerely,$/i) || lines[i].trim().match(/^Respectfully,$/i)) {
        sincerelyIndex = i;
        break;
      }
    }
    
    // If found, check the next non-empty line for a name
    if (sincerelyIndex !== -1 && sincerelyIndex + 1 < lines.length) {
      const nextLine = lines[sincerelyIndex + 1].trim();
      
      // Check if it looks like a name (not containing excluded phrases)
      if (nextLine.length > 3 && 
          !/^\d/.test(nextLine) && 
          !/hope for your|thank you for|appreciate your|sincerely|respectfully/i.test(nextLine)) {
        baseInfo.studentName = nextLine;
        console.log("Found sender name on line after 'Sincerely,':", baseInfo.studentName);
        foundName = true;
      }
    }
  }

  // If still no name found, try backup patterns
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
          baseInfo.studentName = potentialName;
          console.log("Found student name using backup pattern:", baseInfo.studentName);
          break;
        }
      }
    }
  }

  // Extract addressee
  const addresseePatterns = [
    // Template format - specifically find "Dear Addressee"
    /Dear[\s\n\r]+((?:Ma'am|Sir|Prof\.?|Professor|Dr\.?|Mr\.?|Ms\.?|Ma\.?)[^,\n\r]*)/i,
    
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
        baseInfo.addressee = addresseeMatch[0].trim();
      } else if (addresseeMatch[1]) {
        baseInfo.addressee = addresseeMatch[1].trim();
        // Remove any trailing commas or periods
        baseInfo.addressee = baseInfo.addressee.replace(/[,.]+$/, '');
      }
      console.log("Found addressee:", baseInfo.addressee);
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
      baseInfo.courseCode = matchedText.trim();
      console.log("Found course code:", baseInfo.courseCode);
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
      baseInfo.section = sectionMatch[1].trim();
      console.log("Found section:", baseInfo.section);
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
        } else if (dateStr.includes(',')) {
          parsedDate = parse(dateStr, 'MMMM d, yyyy', new Date());
        } else {
          parsedDate = parse(dateStr, 'MMMM d yyyy', new Date());
        }
        
        if (!isNaN(parsedDate.getTime())) {
          baseInfo.submissionDate = format(parsedDate, 'MMMM d, yyyy');
          console.log("Found and formatted date:", baseInfo.submissionDate);
          break;
        }
      } catch (error) {
        console.warn("Error parsing date:", error);
        continue; // Try the next pattern
      }
    }
  }

  // Extract nature of excuse - improved to get only 1-2 sentences
  baseInfo.natureOfExcuse = extractEnglishExcuseNature(text);
  console.log("Extracted nature of excuse:", baseInfo.natureOfExcuse);
  
  return baseInfo;
}

/**
 * Extract the nature of excuse from English documents - improved to get only 1-2 sentences
 */
function extractEnglishExcuseNature(text: string): string {
  // First, try to identify the main body content based on the template's structure
  // This would be between "Position" and "Sincerely"
  const mainContentMatch = text.match(/Position[\s\n\r]+(.*?)[\s\n\r]+Sincerely,?/is);
  
  if (mainContentMatch && mainContentMatch[1]) {
    const mainContent = mainContentMatch[1].trim();
    
    // If we found the main content, and it's substantive
    if (mainContent.length > 20 && !mainContent.match(/^Salaysay Content/i)) {
      // Extract only the first 1-2 sentences
      return extractFirstSentences(mainContent, 2);
    }
  }
  
  // If we didn't find the main content using the template structure,
  // try other patterns to extract excuse
  const excusePatterns = [
    /(?:apologize|apology|sorry|regret)\s+for\s+([^.;:]{10,150}[.!?])/i,
    /(?:excuse|reason|explanation)\s+(?:is|for)\s+([^.;:]{10,150}[.!?])/i,
    /(?:regarding|concerning|about)\s+([^.;:]{10,150}[.!?])/i,
    /(?:request|ask)\s+(?:your|for)\s+(?:consideration|understanding)\s+(?:for|regarding)\s+([^.;:]{10,150}[.!?])/i,
    /I(?:'m| am)?\s+writing\s+(?:to\s+)?(?:you\s+)?(?:about|regarding|concerning)\s+([^.;:]{10,150}[.!?])/i
  ];
  
  // Check each pattern
  for (const pattern of excusePatterns) {
    const match = text.match(pattern);
    if (match) {
      // Get the matched excuse
      const matchedExcuse = match[1] || match[0];
      if (matchedExcuse && matchedExcuse.trim().length > 5) {
        return extractFirstSentences(matchedExcuse.trim(), 1);
      }
    }
  }
  
  // If no specific excuse found, check for content between salutation and signature
  const generalContentMatch = text.match(/Dear\s+[^,\n\r]*,?[\s\n\r]+(.*?)[\s\n\r]+(?:Sincerely|Respectfully)/is);
  if (generalContentMatch && generalContentMatch[1]) {
    const content = generalContentMatch[1].trim();
    if (content.length > 20) {
      // Extract only first 1-2 sentences
      return extractFirstSentences(content, 2);
    }
  }
  
  return "";
}

export default extractDocumentInfo;
