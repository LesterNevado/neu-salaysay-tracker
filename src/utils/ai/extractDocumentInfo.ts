
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
    
    // IMPROVED: Addressee extraction for Tagalog letters
    // First, check for "Orlan Sanchez" or similar names at the top of the letter
    // This is optimized based on the typical Tagalog letter format where the addressee is at the top
    let possibleAddressee = null;
    
    // Check first 8 lines for a standalone name (like "Orlan Sanchez")
    for (let i = 0; i < Math.min(8, lines.length); i++) {
      const line = lines[i].trim();
      
      // Skip lines that are empty, dates, or clearly part of a greeting
      if (line.length < 2 || 
          /\d{1,2}\/\d{1,2}\/\d{4}/.test(line) || 
          /^(Ako po si|Ako ay si|Sumasainyo|Gumagalang|Lubos na gumagalang|Sa pamamagitan|Liham ito|Para kay|Mahal na|Ito ay|Isang|Ang aking|Sa inyo)/i.test(line)) {
        continue;
      }
      
      // Look for typical Filipino names (1-4 words, mainly letters)
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
        // Tagalog patterns - more specific
        /\b(?:G|Ginang|Gng|Ginoong|Bb|Binibini|Dr|Prop|Propesor)\.?\s+([A-Za-z\s.,]+?)(?:,|;|\r?\n|$)/i,
        /\bKay\s+([A-Za-z\s.,]+?)(?:,|;|\r?\n|$)/i,
        /\bPara kay\s+([A-Za-z\s.,]+?)(?:,|;|\r?\n|$)/i,
        /\bMahal kong\s+([A-Za-z\s.,]+?)(?:,|;|\r?\n|$)/i,
        
        // English patterns
        /Dear\s+(?:(?:Mr|Mrs|Ms|Dr|Prof|Sir|Madam|Teacher|Professor|Dean|Director|Principal)\.?\s+)?([A-Za-z\s.,]+?)(?:,|;|\r?\n|$)/i,
        /To:?\s+([A-Za-z\s.,]+?)(?:\r?\n|,|;|$)/i,
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
    
    // Extract sender name - improved for Tagalog letters
    // First, look for the "Ako po si..." pattern that's common in Tagalog letters
    const akoPoSiPatterns = [
      /Ako\s+po\s+si\s+([A-Za-z\s\.]+?)(?:,|\s+\w+\s+sa|\s+kabilang|\.|$)/i,
      /Ako\s+po\s+ang\s+iyong\s+kapatid\s+na\s+si\s+([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
      /Ako\s+(?:po\s+)?si\s+kapatid\s+na\s+([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
      /Ako\s+(?:po\s+)?si\s+kapatid\s+([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
      /Ako\s+(?:po\s+)?(?:ay\s+)?si\s+([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
      // Additional common Tagalog patterns
      /Galing\s+(?:po\s+)?kay\s+([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
      /kapatid\s+na\s+([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
    ];
    
    for (const pattern of akoPoSiPatterns) {
      const match = pattern.exec(cleanText);
      if (match && match[1]) {
        const name = match[1].trim();
        if (name.length >= 2) {
          result.senderName = name;
          break;
        }
      }
    }
    
    // If no match found, try to extract "kapatid na" format
    if (!result.senderName) {
      const kapatidPatterns = [
        /(?:Ako po si |)kapatid na ([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
        /Ako po ang iyong kapatid na si ([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
        /kapatid na ([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
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
    
    // If still no sender, look for common signature patterns
    if (!result.senderName) {
      const senderNamePatterns = [
        // Tagalog patterns - enhanced
        /Gumagalang,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,
        /Lubos na gumagalang,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,
        /Taos-puso,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,
        /Sumasainyo,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,
        /Nagpapahalaga,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,
        /Lubos na nagpapasalamat,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,
        /Ang inyong (?:lingkod|kapatid)(?: sa Panginoon)?[,:]?\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,
        
        // English patterns
        /Sincerely,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,
        /Respectfully,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,
      ];
      
      for (const pattern of senderNamePatterns) {
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
    
    // IMPROVED: Extract date using extended patterns for Tagalog letters
    const datePatterns = [
      // Specific Tagalog date formats
      /\bPetsa:?\s*([A-Za-z0-9,\s]+\d{4})/i,
      /\bPetsa:?\s*(\d{1,2}\s+(?:Enero|Pebrero|Marso|Abril|Mayo|Hunyo|Hulyo|Agosto|Setyembre|Oktubre|Nobyembre|Disyembre),?\s*\d{4})/i,
      /\bAraw:?\s*([A-Za-z0-9,\s]+\d{4})/i,
      /\bIka-(\d{1,2}\s+(?:ng\s+)?(?:Enero|Pebrero|Marso|Abril|Mayo|Hunyo|Hulyo|Agosto|Setyembre|Oktubre|Nobyembre|Disyembre),?\s*\d{4})/i,
      /\b(\d{1,2}\s+(?:ng\s+)?(?:Enero|Pebrero|Marso|Abril|Mayo|Hunyo|Hulyo|Agosto|Setyembre|Oktubre|Nobyembre|Disyembre),?\s*\d{4})\b/i,
      
      // English date patterns
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,|\s)\s*\d{4}\b/gi,
      /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
      /\bDate:?\s*([A-Za-z0-9,\s]+\d{4})/i,
      
      // Tagalog month names
      /\b(?:Enero|Pebrero|Marso|Abril|Mayo|Hunyo|Hulyo|Agosto|Setyembre|Oktubre|Nobyembre|Disyembre)\s+\d{1,2}(?:,|\s)\s*\d{4}\b/gi,
    ];
    
    // Look through the first 10 lines for standalone date patterns
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      
      // Check if line contains only a date (common in formal letters)
      for (const pattern of datePatterns) {
        const matches = line.match(pattern);
        if (matches && matches.length > 0) {
          if (pattern.toString().includes('(')) {
            const match = pattern.exec(line);
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
      
      if (result.date) break;
    }
    
    // If date not found in standalone lines, try the entire text
    if (!result.date) {
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
    
    // Extract nature of excuse with improved Tagalog support
    const excuseKeywords = [
      // Tagalog keywords - expanded
      "hindi nakapasok", "hindi nakadalo", "lumiban", "pagliban",
      "humihingi ng paumanhin", "patawad", "patawarin", "dahilan", "paliwanag",
      "dahil sa", "sanhi ng", "karamdaman", "sakit", "pamilya", "kagipitan",
      "hindi nakarating", "hindi nakasipot", "hindi nakapunta",
      "pagkakasala", "pagkakamali", "pagkukulang", "hindi nakapagsumite",
      "pagsuway", "hindi nasunod", "hindi natupad", "nagawang pagkakasala"
    ];
    
    const excuseIndicators = [
      // Tagalog patterns - enhanced for better excuse extraction
      /Ako (?:po |)(?:ay |)(?:humihingi ng |nais |gusto |)(?:taos |lubos |)(?:paumanhin|pasensya|patawad)(.*?)(?:\.|\n)/i,
      /(?:Ito |Ako |Nagsisilbi |)(?:po |)(?:ay |)(?:isang |)(?:liham ng |pormal na |)(?:paumanhin|paliwanag|paghingi ng tawad)(.*?)(?:\.|\n)/i,
      /(?:Ako |Kami |)(?:po |)(?:ay |)(?:hindi nakaabot|hindi nakapunta|hindi nakapasok|lumiban)(.*?)(?:\.|\n)/i,
      /(?:dahil sa|sanhi ng|dala ng)(.*?)(?:\.|\n)/i,
      // Additional specific Tagalog patterns for excuse extraction
      /dahil sa aking(.*?)(?:pagkakasala|pagkakamali|pagkukulang)(?:\.|\n)/i,
      /dahil sa aking nagawang(.*?)(?:\.|\n)/i,
      /nagsasalaysay ukol sa(.*?)(?:\.|\n)/i,
      // Very specific pattern: dahil sa...
      /dahil sa aking nagawang pagkakasala/i,
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
    
    // If no excuse found with patterns, try extracting directly from the text
    if (!result.natureOfExcuse) {
      // Look specifically for "dahil sa aking nagawang pagkakasala" pattern
      if (cleanText.includes("dahil sa aking nagawang pagkakasala")) {
        result.natureOfExcuse = "dahil sa aking nagawang pagkakasala";
      } else {
        const sentences = cleanText.split(/\.|\n/).filter(s => s.trim().length > 0);
        
        for (const sentence of sentences) {
          if (excuseKeywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
            result.natureOfExcuse = sentence.trim();
            break;
          }
        }
      }
    }
    
    // Search for direct Tagalog phrases indicating the nature of the excuse
    if (!result.natureOfExcuse) {
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
