
import OpenAI from 'openai';

// Define the structure for the extracted information
export interface ExtractedDocumentInfo {
  studentNumber?: string;
  date?: string;
  natureOfExcuse?: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Extracts structured information from a text document using AI
 * @param text - The text content to analyze
 * @returns Structured information extracted from the document
 */
export async function extractDocumentInfo(text: string): Promise<ExtractedDocumentInfo> {
  try {
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      dangerouslyAllowBrowser: true, // Note: In production, you should use a backend service
    });

    // Create a more detailed prompt with examples and specific format instructions
    const prompt = `
    Extract the following information from this salaysay (excuse letter) content:

    1. Student Number: Look for patterns like XX-XXXXX-XXX, XXXXXXXX, or any numeric identifier that appears to be a student ID.
       - Common formats: 20XX-XXXXX, XX-XXXXX-XXX, XXXXXXXXX
       - It's often found near the student's name or at the end of the letter.
       - Example: "22-12857-750", "2021-12345", "201912345"

    2. Date: Find when the letter was written or when the incident occurred.
       - Look for dates in formats like "March 27, 2025", "27/03/2025", "03-27-2025"
       - It's typically at the top of the letter or mentioned in the content.
       - If multiple dates exist, prioritize the one that appears to be the incident date.

    3. Nature of Excuse: Determine the primary reason for the excuse.
       - Look for descriptions of academic misconduct, absences, late submissions, etc.
       - Scan for key phrases like "apologize for", "regret to inform", "unable to attend"
       - Summarize the main issue in a brief phrase (e.g., "Academic misconduct - cheating", "Absence due to illness")

    Respond ONLY with a JSON object with these keys:
    {
      "studentNumber": "extracted student number or null if not found",
      "date": "extracted date or null if not found",
      "natureOfExcuse": "extracted excuse description or null if not found",
      "confidence": "high, medium, or low based on how clear the information was"
    }

    Here is the document text:
    ${text.substring(0, 4000)} // Limit text to avoid token limits
    `;

    // Make the API call with more specific instructions
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2, // Lower temperature for more deterministic results
      max_tokens: 500,
    });

    // Parse the response
    const content = response.choices[0]?.message?.content || '{}';
    
    // Handle potential JSON parsing errors
    let extractedInfo: ExtractedDocumentInfo;
    try {
      extractedInfo = JSON.parse(content) as ExtractedDocumentInfo;
    } catch (error) {
      console.error('Error parsing JSON response from AI:', error);
      console.log('Raw AI response:', content);
      return { confidence: 'low' };
    }
    
    // Clean up and validate the extracted information
    const result: ExtractedDocumentInfo = {
      studentNumber: extractedInfo.studentNumber && extractedInfo.studentNumber !== 'null' 
        ? extractedInfo.studentNumber.trim() 
        : undefined,
      date: extractedInfo.date && extractedInfo.date !== 'null' 
        ? extractedInfo.date.trim() 
        : undefined,
      natureOfExcuse: extractedInfo.natureOfExcuse && extractedInfo.natureOfExcuse !== 'null' 
        ? extractedInfo.natureOfExcuse.trim() 
        : undefined,
      confidence: extractedInfo.confidence || 'low',
    };
    
    // Adjust confidence based on how many fields were successfully extracted
    const extractedFieldCount = [result.studentNumber, result.date, result.natureOfExcuse].filter(Boolean).length;
    if (extractedFieldCount === 0) {
      result.confidence = 'low';
    } else if (extractedFieldCount === 1) {
      result.confidence = result.confidence === 'high' ? 'medium' : 'low';
    } else if (extractedFieldCount === 2 && result.confidence === 'low') {
      result.confidence = 'medium';
    }
    
    return result;
  } catch (error) {
    console.error('Error extracting information using AI:', error);
    return { confidence: 'low' };
  }
}
