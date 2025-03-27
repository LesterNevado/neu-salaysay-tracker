
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

    // Prepare the prompt for information extraction
    const prompt = `
    Extract the following information from this salaysay (excuse letter) content:
    1. Student Number (format usually like: 2021-12345 or similar ID)
    2. Date (when the incident/excuse occurred)
    3. Nature of Excuse (brief description of the reason)

    Respond only with a JSON object with these keys:
    {
      "studentNumber": "extracted student number or null if not found",
      "date": "extracted date or null if not found",
      "natureOfExcuse": "extracted excuse description or null if not found",
      "confidence": "high, medium, or low based on how clear the information was"
    }

    Here is the document text:
    ${text.substring(0, 4000)} // Limit text to avoid token limits
    `;

    // Make the API call
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 500,
    });

    // Parse the response
    const content = response.choices[0]?.message?.content || '{}';
    const extractedInfo = JSON.parse(content) as ExtractedDocumentInfo;
    
    return {
      studentNumber: extractedInfo.studentNumber || undefined,
      date: extractedInfo.date || undefined,
      natureOfExcuse: extractedInfo.natureOfExcuse || undefined,
      confidence: extractedInfo.confidence || 'low',
    };
  } catch (error) {
    console.error('Error extracting information using AI:', error);
    return { confidence: 'low' };
  }
}
