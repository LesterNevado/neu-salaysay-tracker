
// Define the structure for the extracted information
export interface ExtractedDocumentInfo {
  studentNumber?: string;
  date?: string;
  natureOfExcuse?: string;
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
    
    // Extract date using various formats
    // Try to find dates in various formats
    const datePatterns = [
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
    
    if (extractedCount === 3) {
      result.confidence = 'high';
    } else if (extractedCount === 2) {
      result.confidence = 'medium';
    } else {
      result.confidence = 'low';
    }
    
    // Log sample of extracted text for debugging
    console.log('Extraction attempt results:', {
      foundStudentNumber: !!result.studentNumber,
      foundDate: !!result.date,
      foundExcuse: !!result.natureOfExcuse,
      confidence: result.confidence
    });
    
    return result;
    
  } catch (error) {
    console.error('Error extracting document information:', error);
    return { confidence: 'low' };
  }
}
