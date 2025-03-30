
import * as pdfjsLib from 'pdfjs-dist';
import { GlobalWorkerOptions } from 'pdfjs-dist';

// Set the worker source path (necessary for PDF.js to work in the browser)
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Extracts text content from a PDF file with improved layout preservation
 * @param file - PDF file to extract text from
 * @returns The extracted text content
 */
export async function extractPdfText(file: File): Promise<string> {
  try {
    // Convert the File to an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load the PDF using PDF.js
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    // Extract text from all pages
    let fullText = '';
    
    // Loop through each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      
      // Get text content
      const textContent = await page.getTextContent();
      
      // Process text with better layout preservation
      let lastY = null;
      let lastX = 0;
      let text = '';
      let lineTexts = [];
      
      // First pass: group items by their vertical position (lines)
      for (const item of textContent.items) {
        if ('str' in item && 'transform' in item) {
          const x = item.transform[4]; // Horizontal position
          const y = item.transform[5]; // Vertical position
          
          // Detect new line
          if (lastY === null || Math.abs(y - lastY) > 3) {
            // Process previous line if it exists
            if (lineTexts.length > 0) {
              text += lineTexts.join(' ') + '\n';
              lineTexts = [];
            }
            
            lineTexts.push(item.str);
          } else {
            // Same line, but check for horizontal space
            if (x - lastX > 10) {
              lineTexts.push(' ' + item.str); // Add space for horizontal gap
            } else {
              lineTexts.push(item.str);
            }
          }
          
          lastY = y;
          lastX = x + item.width || 0;
        }
      }
      
      // Add the last line if any
      if (lineTexts.length > 0) {
        text += lineTexts.join(' ') + '\n';
      }
      
      // Handle key-value pairs frequently found in forms (like "Name: John Smith")
      text = text.replace(/([A-Za-z]+):\s*\n\s*([A-Za-z0-9].+)/g, '$1: $2');
      
      fullText += text + '\n'; // Add extra newlines between pages
    }
    
    // Clean up the text - remove excessive whitespace while preserving paragraphs
    fullText = fullText
      .replace(/\n{3,}/g, '\n\n')      // Replace 3+ newlines with 2
      .replace(/\s{2,}/g, ' ')         // Replace 2+ spaces with 1
      .trim();                         // Trim leading/trailing whitespace
    
    // Log sample for debugging
    console.log('Extracted text sample (first 500 chars):', fullText.substring(0, 500));
    console.log('Extracted text sample (last 500 chars):', fullText.substring(Math.max(0, fullText.length - 500)));
    
    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}
