
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
    
    // Split text into lines for line-by-line analysis
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
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
      // Course-section pattern (e.g., 2CE-3)
      /\b\d{1,2}[A-Z]{2,3}-\d{1}\b/g,  // e.g., 2CE-3, 4IT-1
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
      /[Kk]apatid [nN]a\s+([A-Za-z\s.]+?)(?:,|;|\r?\n|$)/i,  // "Kapatid na Name"
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
    
    // Look for "Kapatid na [name]" pattern in signature (common in religious/fraternal contexts)
    if (!result.senderName) {
      const kapatidNaPattern = /(?:Ang )?(?:[Ii]yong|[Aa]ng inyong)? [Kk]apatid(?: na| sa Panginoon)?[,:]?\s+([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i;
      const kapatidMatch = kapatidNaPattern.exec(cleanText);
      if (kapatidMatch && kapatidMatch[1]) {
        result.senderName = kapatidMatch[1].trim();
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
    
    // Enhanced addressee extraction with improved Tagalog support
    // First, try to find addressee at the top of the letter (before the body)
    // In many Tagalog letters, addressee is simply a name on its own line near the top
    let possibleAddressee = null;
    
    // Check if the addressee is in the first few lines of the document
    const firstFewLines = lines.slice(0, 10); // Examine first 10 lines
    
    for (let i = 0; i < firstFewLines.length; i++) {
      const line = firstFewLines[i].trim();
      
      // Skip empty lines, dates, or salutation words
      if (line.length < 2 || 
          /\d{1,2}\/\d{1,2}\/\d{4}/.test(line) || 
          /^(Dear|To|Attn|Sa|Kay|Para kay|Minamahal na|Ginoo|Ginang|Binibini)/i.test(line)) {
        continue;
      }
      
      // If just a name is on a line by itself (1-3 words, only alphabetic)
      if (/^[A-Za-z\s\.]{2,40}$/.test(line) && line.split(/\s+/).length <= 3) {
        possibleAddressee = line;
        break;
      }
      
      // Check for name followed by title or designation
      const nameTitleMatch = /^([A-Za-z\s\.]{2,30})(?:,|\s+)(?:Department Chair|Professor|Dean|Teacher|Chair|Coordinator|Guro|Propesor|Dekano)/i.exec(line);
      if (nameTitleMatch) {
        possibleAddressee = nameTitleMatch[1].trim();
        break;
      }
    }
    
    // If we found a name directly, use it as addressee
    if (possibleAddressee) {
      result.addressee = possibleAddressee;
    } else {
      // If not found directly, try traditional patterns
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
    }
    
    // Extract generic addressee forms for both English and Tagalog
    if (!result.addressee) {
      const genericAddresseePattern = /(?:Dear|Minamahal)\s+(?:Sir|Madam|Sir\/Madam|Ma'am|Sir\/Ma'am|Ginoo|Ginang|Binibini|Ginoo\/Ginang)(?:,|;|\r?\n|$)/i;
      const genericMatch = genericAddresseePattern.exec(cleanText);
      if (genericMatch) {
        result.addressee = genericMatch[0].replace(/[,;]$/, '').trim();
      }
    }
    
    // Enhanced extraction of nature of excuse with improved Tagalog support
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
      "hindi nakaayon", "hindi nakarating", "hindi nakasipot", "hindi nakapunta",
      "nagawang pagkakasala", "pagkakamali", "pagkukulang", "hindi nakapagsumite",
      "pagsuway", "hindi nasunod", "hindi natupad"
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
      // Additional Tagalog patterns
      /dahil sa aking nagawang(.*?)(?:\.|\n)/i,
      /dahil sa aking(.*?)(?:pagkakasala|pagkakamali|pagkukulang)(?:\.|\n)/i,
    ];
    
    // Try to find the excuse based on keyword context
    for (const pattern of excuseIndicators) {
      const match = pattern.exec(cleanText);
      if (match && match[1]) {
        // Limit to reasonable length
        const excuseText = match[1].trim();
        if (excuseText.length > 5 && excuseText.length < 400) {
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
    
    // Search for direct Tagalog phrases indicating the nature of the excuse
    if (!result.natureOfExcuse) {
      // Look for phrases like "dahil sa [reason]"
      const dahilSaPattern = /dahil sa ([^\.]+)/i;
      const dahilMatch = dahilSaPattern.exec(cleanText);
      if (dahilMatch && dahilMatch[1] && dahilMatch[1].length > 5) {
        result.natureOfExcuse = `dahil sa ${dahilMatch[1].trim()}`;
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
