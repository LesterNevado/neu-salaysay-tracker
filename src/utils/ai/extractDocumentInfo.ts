
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
    
    // Enhanced addressee extraction for both English and Tagalog letters
    // First, check for formal name patterns at the top of the letter
    let possibleAddressee = null;
    
    // Check first 8 lines for a standalone name (like "Orlan Sanchez" or "Prof. Smith")
    for (let i = 0; i < Math.min(8, lines.length); i++) {
      const line = lines[i].trim();
      
      // Skip lines that are empty, dates, or clearly part of a greeting
      if (line.length < 2 || 
          /\d{1,2}\/\d{1,2}\/\d{4}/.test(line) || 
          /^(Ako po si|Ako ay si|Sumasainyo|Gumagalang|Lubos na gumagalang|Sa pamamagitan|Liham ito|Para kay|Mahal na|Ito ay|Isang|Ang aking|Sa inyo|I am|This is|Dear|Sincerely|Date|Re:|Subject|To Whom It May Concern)/i.test(line)) {
        continue;
      }
      
      // Look for typical names (1-4 words, mainly letters)
      if (/^[A-Za-z\s\.]{2,40}$/.test(line) && 
          line.split(/\s+/).length <= 4 && 
          !/University|College|School|Department|Petsa|Date|Taon|Year|Buwan|Month/i.test(line)) {
        possibleAddressee = line;
        break;
      }
    }
    
    if (possibleAddressee) {
      result.addressee = possibleAddressee;
    } else {
      // Fall back to traditional patterns if direct name detection fails
      const addresseePatterns = [
        // Tagalog patterns
        /\b(?:G|Ginang|Gng|Ginoong|Bb|Binibini|Dr|Prop|Propesor)\.?\s+([A-Za-z\s.,]+?)(?:,|;|\r?\n|$)/i,
        /\bKay\s+([A-Za-z\s.,]+?)(?:,|;|\r?\n|$)/i,
        /\bPara kay\s+([A-Za-z\s.,]+?)(?:,|;|\r?\n|$)/i,
        /\bMahal kong\s+([A-Za-z\s.,]+?)(?:,|;|\r?\n|$)/i,
        
        // English patterns - improved for better matching
        /Dear\s+(?:(?:Mr|Mrs|Ms|Dr|Prof|Sir|Madam|Teacher|Professor|Dean|Director|Principal)\.?\s+)?([A-Za-z\s.,]+?)(?:,|;|\r?\n|$)/i,
        /To:?\s+([A-Za-z\s.,]+?)(?:\r?\n|,|;|$)/i,
        /Attention:?\s+([A-Za-z\s.,]+?)(?:\r?\n|,|;|$)/i,
        /To Whom It May Concern:?\s+([A-Za-z\s.,]+?)(?:\r?\n|,|;|$)/i,
        /(?:Prof|Dr|Mr|Mrs|Ms)\.?\s+([A-Za-z\s.,]+?)(?:,|;|\r?\n|$)/i,
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
    }
    
    // Enhanced sender name extraction for both English and Tagalog
    // First, look for common Tagalog patterns
    const senderPatterns = [
      // Tagalog patterns
      /Ako\s+po\s+si\s+([A-Za-z\s\.]+?)(?:,|\s+\w+\s+sa|\s+kabilang|\.|$)/i,
      /Ako\s+po\s+ang\s+iyong\s+kapatid\s+na\s+si\s+([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
      /Ako\s+(?:po\s+)?si\s+kapatid\s+na\s+([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
      /Ako\s+(?:po\s+)?si\s+kapatid\s+([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
      /Ako\s+(?:po\s+)?(?:ay\s+)?si\s+([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
      /Galing\s+(?:po\s+)?kay\s+([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
      /kapatid\s+na\s+([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
      
      // English patterns - added for better English document support
      /I am\s+([A-Za-z\s\.]+?)(?:,|\.|\s|and I am|$)/i,
      /My name is\s+([A-Za-z\s\.]+?)(?:,|\.|\s|and I am|$)/i, 
      /This letter is from\s+([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
      /Sincerely,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,
      /Respectfully,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,
      /Yours truly,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,
      /Regards,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,
      /Yours sincerely,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,
    ];
    
    for (const pattern of senderPatterns) {
      const match = pattern.exec(cleanText);
      if (match && match[1]) {
        const name = match[1].trim();
        if (name.length >= 2) {
          result.senderName = name;
          break;
        }
      }
    }
    
    // If still no sender, look for Tagalog specific patterns
    if (!result.senderName) {
      const kapatidPatterns = [
        /(?:Ako po si |)kapatid na ([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
        /Ako po ang iyong kapatid na si ([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
      ];
      
      for (const pattern of kapatidPatterns) {
        const match = pattern.exec(cleanText);
        if (match && match[1]) {
          const name = match[1].trim();
          if (name.length >= 2) {
            result.senderName = name;
            break;
          }
        }
      }
    }
    
    // If still no sender, check signature patterns at the end of the document
    if (!result.senderName) {
      // Check the last 10 lines for potential signatures
      const lastLines = lines.slice(-10);
      for (const line of lastLines) {
        if (/^[A-Za-z\s\.]{2,40}$/.test(line) && 
            line.split(/\s+/).length <= 4 && 
            !/Sincerely|Regards|Truly|Thank/i.test(line)) {
          result.senderName = line.trim();
          break;
        }
      }
    }
    
    // IMPROVED DATE EXTRACTION: Enhanced for both English and Tagalog formats
    // First try to find standalone date lines (common in formal letters)
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      
      // Check for English date formats
      const englishDateRegex = [
        // Standard English date formats
        /^(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,|\s)\s*\d{4}$/i,
        /^\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)(?:,|\s)\s*\d{4}$/i,
        /^\d{1,2}\/\d{1,2}\/\d{4}$/,
        /^\d{1,2}-\d{1,2}-\d{4}$/,
        // Formatted date with prefixes
        /^Date:\s*([A-Za-z0-9,\s]+\d{4})$/i,
      ];
      
      // Check for Tagalog date formats
      const tagalogDateRegex = [
        /^Petsa:?\s*([A-Za-z0-9,\s]+\d{4})$/i,
        /^Araw:?\s*([A-Za-z0-9,\s]+\d{4})$/i,
        /^Ika-(\d{1,2}\s+(?:ng\s+)?(?:Enero|Pebrero|Marso|Abril|Mayo|Hunyo|Hulyo|Agosto|Setyembre|Oktubre|Nobyembre|Disyembre),?\s*\d{4})$/i,
        /^(\d{1,2}\s+(?:ng\s+)?(?:Enero|Pebrero|Marso|Abril|Mayo|Hunyo|Hulyo|Agosto|Setyembre|Oktubre|Nobyembre|Disyembre),?\s*\d{4})$/i,
      ];
      
      // Try English formats first
      for (const regex of englishDateRegex) {
        if (regex.test(line)) {
          if (regex.toString().includes('Date:')) {
            const match = /Date:\s*(.+)$/i.exec(line);
            if (match && match[1]) {
              result.date = match[1].trim();
              break;
            }
          } else {
            result.date = line;
            break;
          }
        }
      }
      
      // If no English date found, try Tagalog formats
      if (!result.date) {
        for (const regex of tagalogDateRegex) {
          const match = regex.exec(line);
          if (match) {
            result.date = match[1] ? match[1].trim() : line.trim();
            break;
          }
        }
      }
      
      if (result.date) break;
    }
    
    // If no standalone date line was found, search within the text
    if (!result.date) {
      const datePatterns = [
        // English date formats with labels
        /Date:?\s*([A-Za-z0-9,\s]+\d{4})/i,
        /Dated\s+(?:this\s+)?(\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December),?\s*\d{4})/i,
        // Common English date formats
        /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:,|\s)\s*\d{4}\b/i,
        /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December)(?:,|\s)\s*\d{4}\b/i,
        /\b\d{1,2}\/\d{1,2}\/\d{4}\b/,
        
        // Tagalog date formats with labels
        /Petsa:?\s*([A-Za-z0-9,\s]+\d{4})/i,
        /Araw:?\s*([A-Za-z0-9,\s]+\d{4})/i,
        // Tagalog month patterns
        /\b(?:Enero|Pebrero|Marso|Abril|Mayo|Hunyo|Hulyo|Agosto|Setyembre|Oktubre|Nobyembre|Disyembre)\s+\d{1,2}(?:,|\s)\s*\d{4}\b/i,
        /\b\d{1,2}\s+(?:ng\s+)?(?:Enero|Pebrero|Marso|Abril|Mayo|Hunyo|Hulyo|Agosto|Setyembre|Oktubre|Nobyembre|Disyembre)(?:,|\s)\s*\d{4}\b/i,
      ];
      
      for (const pattern of datePatterns) {
        const matches = cleanText.match(pattern);
        if (matches && matches.length > 0) {
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
    
    // NEW: Search for incident date specifically
    if (!result.date) {
      const incidentDatePatterns = [
        /incident\s+(?:occurred|date|on):?\s*([A-Za-z0-9,\s]+\d{4})/i,
        /date\s+of\s+incident:?\s*([A-Za-z0-9,\s]+\d{4})/i,
        /on\s+(\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December)(?:,|\s)\s*\d{4})/i,
      ];
      
      for (const pattern of incidentDatePatterns) {
        const match = pattern.exec(cleanText);
        if (match && match[1]) {
          result.date = match[1].trim();
          break;
        }
      }
    }
    
    // IMPROVED EXCUSE EXTRACTION - Enhanced for both English and Tagalog
    // List of keywords that indicate excuse sections
    const excuseKeywords = [
      // Tagalog keywords
      "hindi nakapasok", "hindi nakadalo", "lumiban", "pagliban",
      "humihingi ng paumanhin", "patawad", "patawarin", "dahilan", "paliwanag",
      "dahil sa", "sanhi ng", "karamdaman", "sakit", "pamilya", "kagipitan",
      "hindi nakarating", "hindi nakasipot", "hindi nakapunta",
      "pagkakasala", "pagkakamali", "pagkukulang", "hindi nakapagsumite",
      "pagsuway", "hindi nasunod", "hindi natupad", "nagawang pagkakasala",
      
      // English keywords - expanded for better excuse detection
      "absence", "apologize", "apology", "excuse", "reason", "unable", 
      "could not", "was not able", "missed", "regret", "sorry",
      "due to", "because of", "caused by", "resulted from", "account of",
      "explanation", "behavior", "conduct", "incident", "action", "issue",
      "cheating", "plagiarism", "misconduct", "violation", "inappropriate",
      "failed to", "did not", "neglected to", "overlooked", "forgot to"
    ];
    
    // Try to find excuse paragraphs - IMPROVED FOR ENGLISH
    const excuseIndicators = [
      // Tagalog patterns
      /Ako (?:po |)(?:ay |)(?:humihingi ng |nais |gusto |)(?:taos |lubos |)(?:paumanhin|pasensya|patawad)(.*?)(?:\.|\n)/i,
      /(?:Ito |Ako |Nagsisilbi |)(?:po |)(?:ay |)(?:isang |)(?:liham ng |pormal na |)(?:paumanhin|paliwanag|paghingi ng tawad)(.*?)(?:\.|\n)/i,
      /(?:dahil sa|sanhi ng|dala ng)(.*?)(?:\.|\n)/i,
      /dahil sa aking(.*?)(?:pagkakasala|pagkakamali|pagkukulang)(?:\.|\n)/i,
      
      // English patterns - enhanced for better excuse recognition
      /I (?:would like to |am |)(?:sincerely |formally |)(?:apologize|explain|address)(.*?)(?:\.|\n)/i,
      /I regret to inform you(.*?)(?:\.|\n)/i,
      /This (?:letter |)is (?:to |)(?:apologize|explain|address|inform)(.*?)(?:\.|\n)/i,
      /I am writing (?:this letter |)to (?:apologize|explain|address)(.*?)(?:\.|\n)/i,
      /The reason for my(.*?)was(?:\.|\n)/i,
      /Due to(.*?)(?:\.|\n)/i,
      /I was unable to(.*?)(?:\.|\n)/i,
      /I could not(.*?)(?:\.|\n)/i,
      /I missed(.*?)(?:\.|\n)/i,
      /I failed to(.*?)(?:\.|\n)/i,
      /reason for my(.*?)(?:\.|\n)/i,
      /regarding my(.*?)(?:\.|\n)/i,
      /in reference to my(.*?)(?:\.|\n)/i,
      /I am writing to address(.*?)(?:\.|\n)/i,
      /I would like to address(.*?)(?:\.|\n)/i,
    ];
    
    // Try to find the excuse based on patterns
    for (const pattern of excuseIndicators) {
      const match = pattern.exec(cleanText);
      if (match && match[1]) {
        const excuseText = match[1].trim();
        if (excuseText.length > 5 && excuseText.length < 400) {
          result.natureOfExcuse = excuseText;
          break;
        }
      }
    }
    
    // If no excuse found with patterns, try looking for sentences with excuse keywords
    if (!result.natureOfExcuse) {
      // Special case for Tagalog "dahil sa aking nagawang pagkakasala" pattern
      if (cleanText.includes("dahil sa aking nagawang pagkakasala")) {
        result.natureOfExcuse = "dahil sa aking nagawang pagkakasala";
      } else {
        // Split into sentences and look for keywords
        const sentences = cleanText.split(/\.|\n/).filter(s => s.trim().length > 0);
        
        for (const sentence of sentences) {
          if (excuseKeywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
            result.natureOfExcuse = sentence.trim();
            break;
          }
        }
      }
    }
    
    // Look for specific sections often found in formal excuse letters
    if (!result.natureOfExcuse) {
      // Check for sections that typically contain the excuse
      const sectionHeaders = [
        /Subject:(.+?)(?:\n|$)/i,
        /Re:(.+?)(?:\n|$)/i,
        /Regarding:(.+?)(?:\n|$)/i,
        /Reason:(.+?)(?:\n|$)/i,
        /Purpose:(.+?)(?:\n|$)/i,
        /Matter:(.+?)(?:\n|$)/i,
      ];
      
      for (const header of sectionHeaders) {
        const match = header.exec(cleanText);
        if (match && match[1] && match[1].trim().length > 5) {
          result.natureOfExcuse = match[1].trim();
          break;
        }
      }
    }
    
    // NEW: Try to extract excuses from paragraphs if still not found
    // This tackles cases where the excuse is described in a paragraph without standard patterns
    if (!result.natureOfExcuse) {
      // Split text into paragraphs
      const paragraphs = cleanText.split(/\n\s*\n/).filter(p => p.trim().length > 20);
      
      // Look for paragraphs with multiple excuse keywords
      for (const paragraph of paragraphs) {
        const keywordMatches = excuseKeywords.filter(keyword => 
          paragraph.toLowerCase().includes(keyword)
        );
        
        if (keywordMatches.length >= 2) {
          // Found a paragraph with multiple excuse keywords
          // Extract a reasonable portion to use as the excuse
          const words = paragraph.split(/\s+/);
          if (words.length > 10) {
            result.natureOfExcuse = words.slice(0, 30).join(' ') + 
              (words.length > 30 ? '...' : '');
          } else {
            result.natureOfExcuse = paragraph;
          }
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
    
    console.log('Extraction results:', {
      studentNumber: result.studentNumber,
      senderName: result.senderName,
      addressee: result.addressee,
      date: result.date,
      natureOfExcuse: result.natureOfExcuse,
      confidence: result.confidence
    });
    
    return result;
    
  } catch (error) {
    console.error('Error extracting document information:', error);
    return { confidence: 'low' };
  }
}
