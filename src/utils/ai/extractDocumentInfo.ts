
// Define the structure for the extracted information
export interface ExtractedDocumentInfo {
  studentNumber?: string;
  senderName?: string;
  date?: string;
  natureOfExcuse?: string;
  addressee?: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Extracts structured information from a text document using regex patterns
 * Supports both English and Tagalog documents
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
      // Tagalog patterns
      /\bkabilang\s+sa\s+([A-Za-z0-9-]{5,15})/i,  // "kabilang sa XXX-XXX"
      /\bEstudyante(?:\s+(?:Numero|Num|#|)):?\s*([0-9-]+)/i, // "Estudyante Numero: XXXXXX"
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
    
    // Look for student number pattern in format "XCE-X" in Tagalog letters
    if (!result.studentNumber) {
      const courseCodeMatch = /\b\d{1,2}[A-Z]{2,3}-\d{1}\b/g.exec(cleanText);
      if (courseCodeMatch) {
        result.studentNumber = courseCodeMatch[0];
      }
    }
    
    // Extract sender name
    // Look for common signature patterns in formal letters
    const senderNamePatterns = [
      // English patterns
      /Sincerely,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,  // "Sincerely, Name"
      /Respectfully,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,  // "Respectfully, Name"
      /Yours truly,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,  // "Yours truly, Name"
      /Regards,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,  // "Regards, Name"
      /From:?\s*([A-Za-z\s.]+?)(?:\r?\n|,|\d|$)/i,  // "From: Name"
      /Submitted by:?\s*([A-Za-z\s.]+?)(?:\r?\n|,|\d|$)/i,  // "Submitted by: Name"
      
      // Tagalog patterns
      /Gumagalang,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,  // "Gumagalang, Name"
      /Lubos na gumagalang,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,  // "Lubos na gumagalang, Name"
      /Taos-puso,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,  // "Taos-puso, Name"
      /Sumasainyo,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,  // "Sumasainyo, Name"
      /Nagpapahalaga,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,  // "Nagpapahalaga, Name"
      /Maraming Salamat po[.,]?\s*(?:\n+|.+\n+)([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,  // "Maraming Salamat po..." followed eventually by a name
      /Ang inyong kapatid sa Panginoon,\s*(?:\n+|.+\n+)([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,  // "Ang inyong kapatid sa Panginoon," followed by name
      /Lubos na nagpapasalamat,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,  // "Lubos na nagpapasalamat, Name"
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
    
    // Specific pattern for Tagalog letters - look for the name after the signature line
    if (!result.senderName) {
      const afterSignatureLine = /^[_\-]+\s*\n+\s*([A-Za-z\s.]+)$/im;
      const nameMatch = afterSignatureLine.exec(cleanText);
      if (nameMatch && nameMatch[1]) {
        result.senderName = nameMatch[1].trim();
      }
    }
    
    // Look for "Ako po si [name]" pattern at beginning of letter
    if (!result.senderName) {
      const akoPoSiPattern = /Ako\s+po\s+si\s+([A-Za-z\s.]+?)(?:,|\s+\w+\s+sa|\s+kabilang)/i;
      const akoPoSiMatch = akoPoSiPattern.exec(cleanText);
      if (akoPoSiMatch && akoPoSiMatch[1]) {
        result.senderName = akoPoSiMatch[1].trim();
      }
    }
    
    // Extract date using various formats
    // Try to find dates in various formats
    const datePatterns = [
      // English date patterns
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
      
      // Tagalog date patterns
      // Tagalog month names
      /\b(?:Enero|Pebrero|Marso|Abril|Mayo|Hunyo|Hulyo|Agosto|Setyembre|Oktubre|Nobyembre|Disyembre)\s+\d{1,2}(?:,|\s)\s*\d{4}\b/gi,
      
      // Day Tagalog month year (e.g., "27 Enero 2025")
      /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:Enero|Pebrero|Marso|Abril|Mayo|Hunyo|Hulyo|Agosto|Setyembre|Oktubre|Nobyembre|Disyembre)\s+\d{4}\b/gi,
      
      // Petsa: pattern
      /\bPetsa:?\s*([A-Za-z0-9,\s]+\d{4})/i,
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
    
    // Enhanced addressee extraction
    // Focus heavily on salutation patterns 
    const addresseePatterns = [
      // English patterns
      /Dear\s+(?:(?:Mr|Mrs|Ms|Dr|Prof|Sir|Madam|Teacher|Professor|Dean|Director|Principal)\.?\s+)?([A-Za-z\s.,]+?)(?:,|;|\r?\n|$)/i,  // "Dear [Title] Name,"
      /To:?\s+([A-Za-z\s.,]+?)(?:\r?\n|,|;|$)/i,  // "To: Name"
      /Attn:?\s+([A-Za-z\s.,]+?)(?:\r?\n|,|;|$)/i,  // "Attn: Name"
      /Attention:?\s+([A-Za-z\s.,]+?)(?:\r?\n|,|;|$)/i,  // "Attention: Name"
      /Addressed to:?\s+([A-Za-z\s.,]+?)(?:\r?\n|,|;|$)/i,  // "Addressed to: Name"
      /For the attention of:?\s+([A-Za-z\s.,]+?)(?:\r?\n|,|;|$)/i,  // "For the attention of: Name"
      
      // Tagalog patterns
      /Minamahal\s+(?:(?:G|Ginang|Gng|Ginoong|Bb|Binibini|Dr|Prop|Propesor|Dekano|Direktor|Prinsipal)\.?\s+)?([A-Za-z\s.,]+?)(?:,|;|\r?\n|$)/i,  // "Minamahal [Title] Name,"
      /Sa\s+(?:(?:G|Ginang|Gng|Ginoong|Bb|Binibini|Dr|Prop|Propesor|Dekano|Direktor|Prinsipal)\.?\s+)?([A-Za-z\s.,]+?)(?:,|;|\r?\n|$)/i,  // "Sa [Title] Name,"
      /Para kay:?\s+([A-Za-z\s.,]+?)(?:\r?\n|,|;|$)/i,  // "Para kay: Name"
      /Kay:?\s+([A-Za-z\s.,]+?)(?:\r?\n|,|;|$)/i,  // "Kay: Name"
      /Kapatid\s+na\s+([A-Za-z\s.,]+?)(?:,|;|\r?\n|$)/i,  // "Kapatid na Name,"
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
    
    // Extract generic addressee forms for both English and Tagalog
    if (!result.addressee) {
      const genericAddresseePattern = /(?:Dear|Minamahal)\s+(?:Sir|Madam|Sir\/Madam|Ma'am|Sir\/Ma'am|Ginoo|Ginang|Binibini|Ginoo\/Ginang)(?:,|;|\r?\n|$)/i;
      const genericMatch = genericAddresseePattern.exec(cleanText);
      if (genericMatch) {
        result.addressee = genericMatch[0].replace(/[,;]$/, '').trim();
      }
    }
    
    // Extract nature of excuse
    // Look for common phrases/patterns in excuse letters in both English and Tagalog
    const excuseKeywords = [
      // English keywords
      "unable to attend", "could not attend", "missed", "absent", "absence",
      "apologize", "sorry", "regret", "excuse", "reason", "explanation",
      "due to", "because of", "unfortunately", "illness", "medical", "family",
      "emergency", "incident", "problem", "issue", "situation", "circumstances",
      
      // Tagalog keywords
      "hindi nakapasok", "hindi nakadalo", "lumiban", "absent", "pagliban",
      "humihingi ng paumanhin", "patawad", "patawarin", "dahilan", "paliwanag",
      "dahil sa", "sanhi ng", "karamdaman", "sakit", "pamilya", "kagipitan",
      "emergency", "insidente", "problema", "sitwasyon", "kalagayan",
      "hindi nakaayon", "hindi nakarating", "hindi nakasipot", "hindi nakapunta"
    ];
    
    const excuseIndicators = [
      // English patterns
      /I (?:am writing to |would like to |wish to |want to |hereby |)(?:sincerely |humbly |)(?:apologize|regret|explain)(.*?)(?:\.|\n)/i,
      /(?:This is |I am |This serves as |)(?:a |an |)(?:letter of |formal |)(?:apology|excuse)(.*?)(?:\.|\n)/i,
      /(?:I |We |)(?:was |were |am |are |)(?:unable|not able)(.*?)(?:\.|\n)/i,
      /(?:due to|because of|on account of)(.*?)(?:\.|\n)/i,
      /(?:reason|explanation|justification)(.*?)(?:\.|\n)/i,
      /nature of excuse:?(.*?)(?:\.|\n)/i,
      
      // Tagalog patterns
      /Ako (?:po |)(?:ay |)(?:humihingi ng |nais |gusto |)(?:taos |lubos |)(?:paumanhin|pasensya|patawad)(.*?)(?:\.|\n)/i,
      /(?:Ito |Ako |Nagsisilbi |)(?:po |)(?:ay |)(?:isang |)(?:liham ng |pormal na |)(?:paumanhin|paliwanag|paghingi ng tawad)(.*?)(?:\.|\n)/i,
      /(?:Ako |Kami |)(?:po |)(?:ay |)(?:hindi nakaabot|hindi nakapunta|hindi nakapasok|lumiban)(.*?)(?:\.|\n)/i,
      /(?:dahil sa|sanhi ng|dala ng)(.*?)(?:\.|\n)/i,
      /(?:dahilan|paliwanag|pagpapatunay)(.*?)(?:\.|\n)/i,
      /uri ng dahilan:?(.*?)(?:\.|\n)/i,
      /nagsasalaysay ukol sa(.*?)(?:\.|\n)/i,
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
    
    if (extractedCount >= 3) {
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
      confidence: result.confidence
    });
    
    return result;
    
  } catch (error) {
    console.error('Error extracting document information:', error);
    return { confidence: 'low' };
  }
}
