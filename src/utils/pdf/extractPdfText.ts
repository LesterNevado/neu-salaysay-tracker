
import * as pdfParse from 'pdf-parse';

/**
 * Extracts text content from a PDF file
 * @param file - PDF file to extract text from
 * @returns The extracted text content
 */
export async function extractPdfText(file: File): Promise<string> {
  try {
    // Convert the File to an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Parse the PDF
    const data = await pdfParse(buffer);
    
    // Return the text content
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}
