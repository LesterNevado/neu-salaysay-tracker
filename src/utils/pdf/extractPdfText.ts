
import * as pdfjsLib from 'pdfjs-dist';
import { GlobalWorkerOptions } from 'pdfjs-dist';

// Set the worker source path (necessary for PDF.js to work in the browser)
GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Extracts text content from a PDF file
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
      const textContent = await page.getTextContent();
      
      // Concatenate the text items
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
        
      fullText += pageText + '\n';
    }
    
    // Return the text content
    return fullText;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}
