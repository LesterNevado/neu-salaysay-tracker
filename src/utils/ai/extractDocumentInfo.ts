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
    
    // Look for student number as a standalone line at the end of the document (common in letters)
    if (!result.studentNumber) {
      for (let i = lines.length - 1; i >= Math.max(0, lines.length - 5); i--) {
        const line = lines[i].trim();
        const numberMatch = line.match(/^\d{2}-\d{5}-\d{3}$|^\d{2}-\d{5}$|^\d{9}$/);
        if (numberMatch) {
          result.studentNumber = line;
          break;
        }
      }
    }
    
    // Look for specific formats like XX-XXXXX-XXX standalone on a line
    if (!result.studentNumber) {
      for (const line of lines) {
        if (/^\d{2}-\d{5}-\d{3}$/.test(line.trim())) {
          result.studentNumber = line.trim();
          break;
        }
      }
    }
    
    // Enhanced addressee extraction for both English and Tagalog letters
    // First, check for formal name patterns at the top of the letter
    let possibleAddressee = null;
    
    // Check first 8 lines for a "Dear X" pattern, very common in formal English letters
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      
      // Look for "Dear X" pattern
      const dearMatch = /^Dear\s+([^,]+)/.exec(line);
      if (dearMatch && dearMatch[1]) {
        possibleAddressee = dearMatch[1].trim();
        break;
      }
      
      // Skip lines that are empty, dates, or clearly part of a greeting
      if (line.length < 2 || 
          /\d{1,2}\/\d{1,2}\/\d{4}/.test(line) || 
          /^(Ako po si|Ako ay si|Sumasainyo|Gumagalang|Lubos na gumagalang|Sa pamamagitan|Liham ito|Para kay|Mahal na|Ito ay|Isang|Ang aking|Sa inyo|I am|This is|Sincerely|Date|Re:|Subject|To Whom It May Concern)/i.test(line)) {
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
    
    // IMPROVED SENDER NAME EXTRACTION - PRIORITIZE "SINCERELY" PATTERN
    // First, explicitly look for the "Sincerely," pattern followed by a name on the next line
    let foundSenderInSignature = false;
    
    // Look for "Sincerely," and then name on the next line (common format)
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim().toLowerCase();
      
      if (line === 'sincerely,' || line === 'sincerely') {
        // Check the next line for a name
        const nextLine = lines[i + 1].trim();
        
        // Skip if next line is empty or clearly not a name
        if (nextLine.length < 2 || /^\d/.test(nextLine)) continue;
        
        // If it looks like a name (1-3 words, mostly letters)
        if (/^[A-Za-z\s\.]{2,40}$/.test(nextLine) && 
            nextLine.split(/\s+/).length <= 3 &&
            !/university|college|school|department/i.test(nextLine)) {
          result.senderName = nextLine;
          foundSenderInSignature = true;
          break;
        }
      }
    }
    
    // If not found with the above method, try more signature patterns
    if (!foundSenderInSignature) {
      const sincerelySignaturePatterns = [
        /Sincerely,?\s*\r?\n\s*([A-Za-z\s\.]+?)(?:\r?\n|\s*$)/i,  // "Sincerely," followed by name on next line
        /Sincerely,?\s*([A-Za-z\s\.]+?)(?:\r?\n|\s*$)/i,  // "Sincerely, Name"
        /Sincerely yours,?\s*\r?\n\s*([A-Za-z\s\.]+?)(?:\r?\n|\s*$)/i,
        /Sincerely yours,?\s*([A-Za-z\s\.]+?)(?:\r?\n|\s*$)/i,
        /Yours sincerely,?\s*\r?\n\s*([A-Za-z\s\.]+?)(?:\r?\n|\s*$)/i,
        /Yours sincerely,?\s*([A-Za-z\s\.]+?)(?:\r?\n|\s*$)/i,
        /Yours truly,?\s*\r?\n\s*([A-Za-z\s\.]+?)(?:\r?\n|\s*$)/i,
        /Yours truly,?\s*([A-Za-z\s\.]+?)(?:\r?\n|\s*$)/i,
        /Respectfully,?\s*\r?\n\s*([A-Za-z\s\.]+?)(?:\r?\n|\s*$)/i,
        /Respectfully,?\s*([A-Za-z\s\.]+?)(?:\r?\n|\s*$)/i,
        /Respectfully submitted,?\s*\r?\n\s*([A-Za-z\s\.]+?)(?:\r?\n|\s*$)/i,
        /Respectfully submitted,?\s*([A-Za-z\s\.]+?)(?:\r?\n|\s*$)/i,
        /Respectfully yours,?\s*\r?\n\s*([A-Za-z\s\.]+?)(?:\r?\n|\s*$)/i,
        /Respectfully yours,?\s*([A-Za-z\s\.]+?)(?:\r?\n|\s*$)/i,
      ];
      
      for (const pattern of sincerelySignaturePatterns) {
        const match = pattern.exec(text); // Use original text with line breaks
        if (match && match[1]) {
          const name = match[1].trim();
          if (name.length >= 2 && 
              !/\b(thank you|considering|appreciate)\b/i.test(name) && 
              name.split(/\s+/).length <= 4) {
            result.senderName = name;
            foundSenderInSignature = true;
            break;
          }
        }
      }
    }
    
    // If still not found, look for the next non-empty line after "Sincerely" in the last few lines
    if (!foundSenderInSignature) {
      const lastFewLines = lines.slice(-10);  // Look at last 10 lines
      for (let i = 0; i < lastFewLines.length - 1; i++) {
        const line = lastFewLines[i].trim();
        if (/^Sincerely,?$/i.test(line)) {
          // Find next non-empty line
          for (let j = i + 1; j < lastFewLines.length; j++) {
            const nameLine = lastFewLines[j].trim();
            if (nameLine.length > 0) {
              // Check if it looks like a name (not student number, course code, etc.)
              if (!/^\d/.test(nameLine) && 
                  !/[A-Za-z]{2,5}-\d/.test(nameLine) && 
                  nameLine.split(/\s+/).length <= 3) {
                result.senderName = nameLine;
                foundSenderInSignature = true;
                break;
              }
            }
          }
          if (foundSenderInSignature) break;
        }
      }
    }
    
    // If still not found, try other patterns as fallback
    if (!foundSenderInSignature) {
      // Check other signature patterns
      const otherSignaturePatterns = [
        // English patterns
        /I am\s+([A-Za-z\s\.]+?)(?:,|\.|\s|and I am|$)/i,
        /My name is\s+([A-Za-z\s\.]+?)(?:,|\.|\s|and I am|$)/i, 
        /This letter is from\s+([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
        
        // Tagalog patterns
        /Ako\s+po\s+si\s+([A-Za-z\s\.]+?)(?:,|\s+\w+\s+sa|\s+kabilang|\.|$)/i,
        /Ako\s+po\s+ang\s+iyong\s+kapatid\s+na\s+si\s+([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
        /Ako\s+(?:po\s+)?si\s+kapatid\s+na\s+([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
        /Ako\s+(?:po\s+)?si\s+kapatid\s+([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
        /Ako\s+(?:po\s+)?(?:ay\s+)?si\s+([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
        /Galing\s+(?:po\s+)?kay\s+([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
        /kapatid\s+na\s+([A-Za-z\s\.]+?)(?:,|\.|\s|$)/i,
      ];
      
      for (const pattern of otherSignaturePatterns) {
        const match = pattern.exec(cleanText);
        if (match && match[1]) {
          const name = match[1].trim();
          if (name.length >= 2 && name.split(/\s+/).length <= 4) {
            result.senderName = name;
            break;
          }
        }
      }
    }
    
    // IMPROVED DATE EXTRACTION: Enhanced for English format dates at the top of the letter
    // First check for a standalone date at the top of the document (very common in formal letters)
    let foundStandaloneDate = false;
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].trim();
      
      // Skip empty lines or short lines
      if (line.length < 4) continue;
      
      // Check common English date formats (e.g., "March 27, 2025")
      if (/^(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:,|\s)\s*\d{4}$/i.test(line)) {
        result.date = line;
        foundStandaloneDate = true;
        break;
      }
      
      // Check for format 27 March 2025
      if (/^\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)(?:,|\s)\s*\d{4}$/i.test(line)) {
        result.date = line;
        foundStandaloneDate = true;
        break;
      }
      
      // Check for numeric formats (MM/DD/YYYY or DD/MM/YYYY)
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(line) || /^\d{1,2}-\d{1,2}-\d{4}$/.test(line)) {
        result.date = line;
        foundStandaloneDate = true;
        break;
      }
    }
    
    // If no standalone date found, look for dates within the text
    if (!foundStandaloneDate) {
      const datePatterns = [
        // Common English date formats
        /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:,|\s)\s*\d{4}\b/i,
        /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December)(?:,|\s)\s*\d{4}\b/i,
        /\b\d{1,2}\/\d{1,2}\/\d{4}\b/,
        /\b\d{1,2}-\d{1,2}-\d{4}\b/,
        
        // Date with labels
        /Date:?\s*([A-Za-z0-9,\s]+\d{4})/i,
        /Dated\s+(?:this\s+)?(\d{1,2}(?:st|nd|rd|th)?\s+(?:of\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December),?\s*\d{4})/i,
        
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
    
    // Look for incident date specifically if still not found
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
    
    // IMPROVED EXCUSE EXTRACTION - Academic misconduct apology specific patterns
    // First, look for apologize patterns common in academic misconduct letters
    const apologyPatterns = [
      // Very specific pattern from sample (prioritize this exact text pattern)
      /apologize for my actions related to inappropriate behavior and cheating in your Software Engineering \d+ class/i,
      
      // More generic patterns for academic misconduct/cheating
      /apologize for my actions related to (?:.*?)(?:inappropriate|cheating|academic|misconduct|dishonest|behavior)/i,
      /apologize for (?:.*?)(?:cheating|academic|misconduct|dishonest|copying|plagiarism)/i,
      /I (?:would like to |am |)(?:sincerely |formally |)apologize for (.{10,100})/i,
    ];
    
    for (const pattern of apologyPatterns) {
      const match = pattern.exec(cleanText);
      if (match) {
        // Extract full apology sentence if possible
        const apologyPos = cleanText.indexOf(match[0]);
        if (apologyPos >= 0) {
          // Extract the whole sentence containing the apology
          const sentenceStart = cleanText.lastIndexOf('.', apologyPos) + 1;
          const sentenceEnd = cleanText.indexOf('.', apologyPos + match[0].length);
          
          if (sentenceEnd > sentenceStart) {
            const sentence = cleanText.substring(sentenceStart, sentenceEnd).trim();
            result.natureOfExcuse = sentence;
            break;
          } else {
            // If we can't find the sentence boundaries, use the match
            result.natureOfExcuse = match[0].trim();
            break;
          }
        } else {
          // Fallback to using the match itself
          result.natureOfExcuse = match[0].trim();
          break;
        }
      }
    }
    
    // If we didn't find a specific apology using the patterns above, look for sentences with apology context
    if (!result.natureOfExcuse) {
      // Look for the first sentence containing apologize and cheating/behavior
      const sentences = cleanText.split(/\.|\n/).filter(s => s.trim().length > 10);
      
      for (const sentence of sentences) {
        if (
          /apologize/i.test(sentence) && 
          (/cheating|academic|inappropriate|behavior|misconduct|integrity|dishonest/i.test(sentence))
        ) {
          result.natureOfExcuse = sentence.trim();
          break;
        }
      }
    }
    
    // If still no excuse found, try a more general approach to find explanation paragraphs
    if (!result.natureOfExcuse) {
      const excuseIndicators = [
        // English patterns - explicitly targeting apology contexts
        /I (?:would like to |am |)(?:sincerely |formally |)(?:apologize|explain|address)(.*?)(?:\.|\n)/i,
        /I regret to inform you(.*?)(?:\.|\n)/i,
        /This (?:letter |)is (?:to |)(?:apologize|explain|address|inform)(.*?)(?:\.|\n)/i,
        /I am writing (?:this letter |)to (?:apologize|explain|address)(.*?)(?:\.|\n)/i,
        /The reason for my(.*?)(?:\.|\n)/i,
        /Due to(.*?)(?:\.|\n)/i,
        /I was unable to(.*?)(?:\.|\n)/i,
        /I could not(.*?)(?:\.|\n)/i,
        /I missed(.*?)(?:\.|\n)/i,
        /I failed to(.*?)(?:\.|\n)/i,
        
        // Tagalog patterns
        /Ako (?:po |)(?:ay |)(?:humihingi ng |nais |gusto |)(?:taos |lubos |)(?:paumanhin|pasensya|patawad)(.*?)(?:\.|\n)/i,
        /(?:Ito |Ako |Nagsisilbi |)(?:po |)(?:ay |)(?:isang |)(?:liham ng |pormal na |)(?:paumanhin|paliwanag|paghingi ng tawad)(.*?)(?:\.|\n)/i,
        /(?:dahil sa|sanhi ng|dala ng)(.*?)(?:\.|\n)/i,
      ];
      
      for (const pattern of excuseIndicators) {
        const match = pattern.exec(cleanText);
        if (match && match[1]) {
          const excuseText = match[0].trim(); // Use full match for context
          if (excuseText.length > 10 && excuseText.length < 400) {
            result.natureOfExcuse = excuseText;
            break;
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
