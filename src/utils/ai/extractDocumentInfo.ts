
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
    
    // Extract student number using various common formats
    // Format patterns: 20XX-XXXXX, XX-XXXXX-XXX, XXXXXXXXX
    const studentNumberPatterns = [
      /\b\d{2}-\d{5}-\d{3}\b/g,  // XX-XXXXX-XXX format
      /\b\d{4}-\d{5}\b/g,        // XXXX-XXXXX format
      /\b\d{9}\b/g,              // XXXXXXXXX format (9 digits)
      /\b\d{7}\b/g,              // XXXXXXX format (7 digits)
      /\b\d{2}-\d{5}-\d{3}\b/g,  // XX-XXXXX-XXX format
      /\b\d{2}-\d{5}\b/g,        // XX-XXXXX format
      /\bStudent(?:\s+(?:Number|ID|No|#|)):?\s*([0-9-]+)/i,  // "Student Number: XXXXXX"
      /\bID(?:\s+(?:Number|No|#|)):?\s*([0-9-]+)/i,          // "ID Number: XXXXXX"
    ];
    
    for (const pattern of studentNumberPatterns) {
      const matches = cleanText.match(pattern);
      if (matches && matches.length > 0) {
        // If the pattern has a capturing group (like the last two patterns)
        if (pattern.toString().includes('(')) {
          const match = pattern.exec(cleanText);
          if (match && match[1]) {
            result.studentNumber = match[1].trim();
            break;
          }
        } else {
          result.studentNumber = matches[0].trim();
          break;
        }
      }
    }
    
    // Extract sender name with enhanced format recognition
    // Look for common signature patterns and name formats
    const senderNamePatterns = [
      // Standard signature patterns
      /Sincerely,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,  // "Sincerely, Name"
      /Respectfully,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,  // "Respectfully, Name"
      /Yours truly,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,  // "Yours truly, Name"
      /Regards,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,  // "Regards, Name"
      /From:?\s*([A-Za-z\s.]+?)(?:\r?\n|,|\d|$)/i,  // "From: Name"
      /Submitted by:?\s*([A-Za-z\s.]+?)(?:\r?\n|,|\d|$)/i,  // "Submitted by: Name"
      
      // New patterns for different name formats
      /Name:?\s*([A-Za-z\s.,]+?)(?:\r?\n|,|$)/i,  // "Name: John M. Doe" or "Name: Doe, John M."
      /\bStudent:?\s*([A-Za-z\s.,]+?)(?:\r?\n|,|\d|$)/i,  // "Student: John M. Doe"
      /\bSubmitter:?\s*([A-Za-z\s.,]+?)(?:\r?\n|,|\d|$)/i,  // "Submitter: John M. Doe"
      
      // Look for name patterns (Surname, First Name MI)
      /([A-Za-z]+,\s+[A-Za-z]+(?:\s+[A-Za-z]\.?)?)(?:\r?\n|,|\d|$)/i,  // "Doe, John M."
    ];
    
    for (const pattern of senderNamePatterns) {
      const match = pattern.exec(cleanText);
      if (match && match[1]) {
        const name = match[1].trim();
        // Verify it's a name (at least 2 characters, not just whitespace)
        if (name.length >= 2) {
          result.senderName = name;
          break;
        }
      }
    }
    
    // If sender name wasn't found by patterns, try to find it before student number
    if (!result.senderName && result.studentNumber) {
      const studentNumberPos = cleanText.indexOf(result.studentNumber);
      if (studentNumberPos > 0) {
        // Check the 100 characters before the student number
        const precedingText = cleanText.substring(Math.max(0, studentNumberPos - 100), studentNumberPos).trim();
        
        // Look for name patterns (First MI Last) or (Last, First MI) format
        const namePatterns = [
          /([A-Za-z]+\s+(?:[A-Z]\.?\s+)?[A-Za-z]+)(?:\r?\n|$)/,  // "John M. Doe" or "John Doe"
          /([A-Za-z]+,\s+[A-Za-z]+(?:\s+[A-Z]\.?)?)(?:\r?\n|$)/  // "Doe, John M."
        ];
        
        for (const pattern of namePatterns) {
          const nameMatch = pattern.exec(precedingText);
          if (nameMatch && nameMatch[1]) {
            result.senderName = nameMatch[1].trim();
            break;
          }
        }
      }
    }
    
    // Extract date using various formats
    // Try to find dates in various formats
    const datePatterns = [
      // Month at beginning of document (e.g., "March 27, 2025" at top)
      /^(?:[^\n]*?\n){0,3}[^\n]*?((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,|\s)\s*\d{4})/i,
      
      // Month name, day, year (e.g., "March 27, 2025" or "March 27 2025")
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,|\s)\s*\d{4}\b/gi,
      
      // Day month name year (e.g., "27 March 2025" or "27th of March 2025")
      /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi,
      
      // MM/DD/YYYY or DD/MM/YYYY
      /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
      
      // YYYY-MM-DD (ISO format)
      /\b\d{4}-\d{2}-\d{2}\b/g,
      
      // MM-DD-YYYY or DD-MM-YYYY
      /\b\d{1,2}-\d{1,2}-\d{4}\b/g,
      
      // Date: pattern
      /\bDate:?\s*([A-Za-z0-9,\s]+\d{4})/i,
    ];
    
    for (const pattern of datePatterns) {
      // For the first pattern (date at beginning), we use a special approach
      if (pattern.toString().includes('^(?:[^\\n]*?\\n){0,3}')) {
        const match = pattern.exec(cleanText);
        if (match && match[1]) {
          result.date = match[1].trim();
          break;
        }
      } else {
        const matches = cleanText.match(pattern);
        if (matches && matches.length > 0) {
          // If the pattern has a capturing group (like the last pattern)
          if (pattern.toString().includes('(')) {
            const match = pattern.exec(cleanText);
            if (match && match[1]) {
              result.date = match[1].trim();
              break;
            }
          } else {
            result.date = matches[0].trim();
            break;
          }
        }
      }
    }
    
    // If date is still not found, try to find dates in very specific formats at the beginning
    if (!result.date) {
      // Try to get the first few lines and look for a date
      const firstLines = cleanText.split('\n').slice(0, 5).join(' ');
      const dateMatch = /\b(?:\d{1,2}[-\/]?\d{1,2}[-\/]?\d{4}|\d{4}[-\/]?\d{1,2}[-\/]?\d{1,2}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,|\s)?\s*\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/i.exec(firstLines);
      if (dateMatch) {
        result.date = dateMatch[0].trim();
      }
    }
    
    // Enhanced addressee extraction
    // Focus heavily on salutation patterns 
    const addresseePatterns = [
      // Updated salutation patterns with stronger focus on "Dear" pattern
      /Dear\s+(?:(?:Mr|Mrs|Ms|Dr|Prof|Sir|Madam|Teacher|Professor|Dean|Director|Principal)\.?\s+)?([A-Za-z\s.,]+?)(?:,|;|\r?\n|$)/i,  // "Dear [Title] Name,"
      
      // Other salutation patterns
      /To:?\s+([A-Za-z\s.,]+?)(?:\r?\n|,|;|$)/i,  // "To: Name"
      /Attn:?\s+([A-Za-z\s.,]+?)(?:\r?\n|,|;|$)/i,  // "Attn: Name"
      /Attention:?\s+([A-Za-z\s.,]+?)(?:\r?\n|,|;|$)/i,  // "Attention: Name"
      /Addressed to:?\s+([A-Za-z\s.,]+?)(?:\r?\n|,|;|$)/i,  // "Addressed to: Name"
      /For the attention of:?\s+([A-Za-z\s.,]+?)(?:\r?\n|,|;|$)/i,  // "For the attention of: Name"
    ];
    
    // Try each pattern
    for (const pattern of addresseePatterns) {
      const match = pattern.exec(cleanText);
      if (match && match[1]) {
        const addressee = match[1].trim();
        // Verify it's a name (at least 2 characters, not just whitespace)
        if (addressee.length >= 2) {
          result.addressee = addressee;
          break;
        }
      }
    }
    
    // Extract specifically "Dear Sir/Madam" or variations like "Dear Sir/Ma'am" if no specific name was found
    if (!result.addressee) {
      const genericAddresseePattern = /Dear\s+(?:Sir|Madam|Sir\/Madam|Ma'am|Sir\/Ma'am)(?:,|;|\r?\n|$)/i;
      const genericMatch = genericAddresseePattern.exec(cleanText);
      if (genericMatch) {
        result.addressee = genericMatch[0].replace(/[,;]$/, '').trim();
      }
    }
    
    // If addressee still not found, look for titles followed by names near the beginning
    if (!result.addressee) {
      // Get the first 500 characters to look for addressee
      const initialText = cleanText.substring(0, 500);
      const titlePatterns = /(?:Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.|Professor|Dean|Director|Principal|Sir|Madam|Teacher)\s+([A-Za-z\s.,]{2,30}?)(?:,|;|\r?\n|$)/i;
      
      const match = titlePatterns.exec(initialText);
      if (match && match[1]) {
        result.addressee = match[1].trim();
      }
    }
    
    // NEW: Extract Course/Subject information
    const coursePatterns = [
      /\b(?:Course|Subject)(?:\s*)\b[:;]?\s*([A-Za-z0-9\s&.,-]+?)(?:\r?\n|,|;|$)/i,  // "Course: Computer Science"
      /\b(?:for|in|on|my)\s+(?:the\s+)?(?:course|class|subject)\s+(?:of\s+)?(?:"|')?([A-Za-z0-9\s&.,-]+?)(?:"|')?(?:\r?\n|,|;|$)/i,  // "...for the course Computer Science"
      /\bCS\s*\d{3}[A-Z]?\b/i,  // CS101, CS201N format
      /\b[A-Z]{2,4}\s*\d{2,4}[A-Z]?\b/i,  // CSCI101, MATH101, ENG101 format
    ];
    
    for (const pattern of coursePatterns) {
      const match = pattern.exec(cleanText);
      if (match && match[1]) {
        const course = match[1].trim();
        // Verify it's a valid course name/code (at least 2 characters)
        if (course.length >= 2) {
          result.course = course;
          break;
        }
      } else if (pattern.toString().includes('\\b[A-Z]{2,4}')) {
        // Special case for course codes without capture groups
        const matches = cleanText.match(pattern);
        if (matches && matches.length > 0) {
          result.course = matches[0].trim();
          break;
        }
      }
    }
    
    // NEW: Extract Section information
    const sectionPatterns = [
      /\bSection(?:\s*)\b[:;]?\s*([A-Za-z0-9\s.-]+?)(?:\r?\n|,|;|$)/i,  // "Section: A"
      /\b(?:in|from)\s+(?:the\s+)?(?:section|block)\s+(?:"|')?([A-Za-z0-9\s.-]+?)(?:"|')?(?:\r?\n|,|;|$)/i,  // "...in the section A-1"
      /\bBlock\s+([A-Za-z0-9-]+)(?:\r?\n|,|;|$)/i,  // "Block A"
      /\s+(?:section|sec\.)\s+([A-Za-z0-9-]+)(?:\r?\n|,|;|$)/i,  // "...section A1"
    ];
    
    for (const pattern of sectionPatterns) {
      const match = pattern.exec(cleanText);
      if (match && match[1]) {
        const section = match[1].trim();
        // Verify it's a valid section (at least 1 character)
        if (section.length >= 1) {
          result.section = section;
          break;
        }
      }
    }
    
    // Extract nature of excuse
    // Look for common phrases/patterns in excuse letters
    const excuseKeywords = [
      "unable to attend", "could not attend", "missed", "absent", "absence",
      "apologize", "sorry", "regret", "excuse", "reason", "explanation",
      "due to", "because of", "unfortunately", "illness", "medical", "family",
      "emergency", "incident", "problem", "issue", "situation", "circumstances"
    ];
    
    const excuseIndicators = [
      /I (?:am writing to |would like to |wish to |want to |hereby |)(?:sincerely |humbly |)(?:apologize|regret|explain)(.*?)(?:\.|\n)/i,
      /(?:This is |I am |This serves as |)(?:a |an |)(?:letter of |formal |)(?:apology|excuse)(.*?)(?:\.|\n)/i,
      /(?:I |We |)(?:was |were |am |are |)(?:unable|not able)(.*?)(?:\.|\n)/i,
      /(?:due to|because of|on account of)(.*?)(?:\.|\n)/i,
      /(?:reason|explanation|justification)(.*?)(?:\.|\n)/i,
      /nature of excuse:?(.*?)(?:\.|\n)/i
    ];
    
    // Try to find the excuse based on keyword context
    for (const pattern of excuseIndicators) {
      const match = pattern.exec(cleanText);
      if (match && match[1]) {
        // Limit to reasonable length
        const excuseText = match[1].trim();
        if (excuseText.length > 10 && excuseText.length < 200) {
          result.natureOfExcuse = excuseText;
          break;
        }
      }
    }
    
    // If no excuse found with patterns, try finding sentences with excuse keywords
    if (!result.natureOfExcuse) {
      const sentences = cleanText.split(/\.|\n/).filter(s => s.trim().length > 0);
      
      for (const sentence of sentences) {
        // Check if sentence contains any excuse keywords
        if (excuseKeywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
          // Use this sentence as the nature of excuse
          result.natureOfExcuse = sentence.trim();
          break;
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
    
    if (extractedCount >= 4) {
      result.confidence = 'high';
    } else if (extractedCount >= 2) {
      result.confidence = 'medium';
    } else {
      result.confidence = 'low';
    }
    
    // Log sample of extracted text for debugging
    console.log('Extraction attempt results:', {
      foundStudentNumber: !!result.studentNumber,
      foundSenderName: !!result.senderName,
      foundDate: !!result.date,
      foundExcuse: !!result.natureOfExcuse,
      foundAddressee: !!result.addressee,
      foundCourse: !!result.course,
      foundSection: !!result.section,
      confidence: result.confidence
    });
    
    return result;
    
  } catch (error) {
    console.error('Error extracting document information:', error);
    return { confidence: 'low' };
  }
}
