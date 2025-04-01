
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
    
    // Improved addressee extraction - First look for a name at the beginning of the letter
    // In many Tagalog letters, the addressee is simply a name on its own line near the top
    let possibleAddressee = null;
    const potentialAddresseeLines = lines.slice(0, 10); // Examine first 10 lines
    
    // First, look specifically for 'Orlan Sanchez' or any other name at the top
    for (let i = 0; i < potentialAddresseeLines.length; i++) {
      const line = potentialAddresseeLines[i].trim();
      
      // Skip empty lines, dates, or known non-addressee content
      if (line.length < 2 || 
          /\d{1,2}\/\d{1,2}\/\d{4}/.test(line) || 
          /^(Dear|To|Attn|Sa|Kay|Para kay|Minamahal na|Ginoo|Ginang|Binibini)/i.test(line)) {
        continue;
      }
      
      // If just a name is on a line by itself (typically 2-4 words)
      if (/^[A-Za-z\s\.]{3,50}$/.test(line) && line.split(/\s+/).length <= 4 && !/University|College|School|Department/i.test(line)) {
        possibleAddressee = line;
        break;
      }
    }
    
    // If we found a name directly, use it as addressee
    if (possibleAddressee) {
      result.addressee = possibleAddressee;
    } else {
      // Try traditional patterns if name not found directly
      const addresseePatterns = [
        // English patterns
        /Dear\s+(?:(?:Mr|Mrs|Ms|Dr|Prof|Sir|Madam|Teacher|Professor|Dean|Director|Principal)\.?\s+)?([A-Za-z\s.,]+?)(?:,|;|\r?\n|$)/i,
        /To:?\s+([A-Za-z\s.,]+?)(?:\r?\n|,|;|$)/i,
        
        // Tagalog patterns - more specific to common Tagalog letter formats
        /Kay\s+(?:(?:G|Ginang|Gng|Ginoong|Bb|Binibini|Dr|Prop|Propesor)\.?\s+)?([A-Za-z\s.,]+?)(?:,|;|\r?\n|$)/i,
        /Para kay\s+(?:(?:G|Ginang|Gng|Ginoong|Bb|Binibini|Dr|Prop|Propesor)\.?\s+)?([A-Za-z\s.,]+?)(?:,|;|\r?\n|$)/i,
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
      /Ako\s+po\s+si\s+kapatid\s+na\s+([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
      /Ako\s+po\s+si\s+kapatid\s+([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
      /Ako\s+(?:po\s+)?(?:ay\s+)?si\s+([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
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
    
    // Try to extract "kapatid na" format, which is common in Tagalog letters
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
        // English patterns
        /Sincerely,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,
        /Respectfully,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,
        
        // Tagalog patterns - enhanced
        /Gumagalang,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,
        /Lubos na gumagalang,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,
        /Taos-puso,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,
        /Sumasainyo,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,
        /Nagpapahalaga,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,
        /Lubos na nagpapasalamat,\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,
        /Ang inyong (?:lingkod|kapatid)(?: sa Panginoon)?[,:]?\s*([A-Za-z\s.]+?)(?:\r?\n|\d|$)/i,
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
    
    // Extract date using various formats
    const datePatterns = [
      // English date patterns
      /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,|\s)\s*\d{4}\b/gi,
      /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
      
      // Tagalog date patterns
      /\b(?:Enero|Pebrero|Marso|Abril|Mayo|Hunyo|Hulyo|Agosto|Setyembre|Oktubre|Nobyembre|Disyembre)\s+\d{1,2}(?:,|\s)\s*\d{4}\b/gi,
      /\bPetsa:?\s*([A-Za-z0-9,\s]+\d{4})/i,
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
    
    // Extract nature of excuse with improved Tagalog support
    const excuseKeywords = [
      // Tagalog keywords - expanded
      "hindi nakapasok", "hindi nakadalo", "lumiban", "pagliban",
      "humihingi ng paumanhin", "patawad", "patawarin", "dahilan", "paliwanag",
      "dahil sa", "sanhi ng", "karamdaman", "sakit", "pamilya", "kagipitan",
      "hindi nakarating", "hindi nakasipot", "hindi nakapunta",
      "pagkakasala", "pagkakamali", "pagkukulang", "hindi nakapagsumite",
      "pagsuway", "hindi nasunod", "hindi natupad"
    ];
    
    const excuseIndicators = [
      // Tagalog patterns - enhanced
      /Ako (?:po |)(?:ay |)(?:humihingi ng |nais |gusto |)(?:taos |lubos |)(?:paumanhin|pasensya|patawad)(.*?)(?:\.|\n)/i,
      /(?:Ito |Ako |Nagsisilbi |)(?:po |)(?:ay |)(?:isang |)(?:liham ng |pormal na |)(?:paumanhin|paliwanag|paghingi ng tawad)(.*?)(?:\.|\n)/i,
      /(?:Ako |Kami |)(?:po |)(?:ay |)(?:hindi nakaabot|hindi nakapunta|hindi nakapasok|lumiban)(.*?)(?:\.|\n)/i,
      /(?:dahil sa|sanhi ng|dala ng)(.*?)(?:\.|\n)/i,
      // Additional specific Tagalog patterns
      /dahil sa aking(.*?)(?:pagkakasala|pagkakamali|pagkukulang)(?:\.|\n)/i,
      /dahil sa aking nagawang(.*?)(?:\.|\n)/i,
      /nagsasalaysay ukol sa(.*?)(?:\.|\n)/i,
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
    
    // If no excuse found with patterns, try finding the most relevant sentence
    if (!result.natureOfExcuse) {
      const sentences = cleanText.split(/\.|\n/).filter(s => s.trim().length > 0);
      
      for (const sentence of sentences) {
        if (excuseKeywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
          result.natureOfExcuse = sentence.trim();
          break;
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
