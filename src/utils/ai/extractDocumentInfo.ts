
import { extractPdfText } from "../pdf/extractPdfText";
import enhanceDocumentInfo from "./determineViolationType";
import { ViolationType } from "../../types/database.types";
import { format } from "date-fns";

export interface DocumentInfo {
  extractedText: string;
  studentId?: string;
  studentName?: string;
  courseCode?: string;
  violationType?: ViolationType;
  pdfTitle?: string;
  natureOfExcuse?: string;
  submissionDate?: string;
}

/**
 * Extract information from a PDF document
 */
export async function extractDocumentInfo(file: File): Promise<DocumentInfo> {
  try {
    console.log("Starting document info extraction for:", file.name);
    
    // Extract text from PDF
    const text = await extractPdfText(file);
    console.log("Extracted text:", text);
    
    // Create basic document info object
    let documentInfo: DocumentInfo = {
      extractedText: text,
      pdfTitle: file.name,
      submissionDate: format(new Date(), 'MM/dd/yyyy'),
      natureOfExcuse: "for my absences in your Application Development class"
    };
    
    // Extract student ID (numbers)
    const studentIdMatch = text.match(/\b\d{8,10}\b/);
    if (studentIdMatch) {
      documentInfo.studentId = studentIdMatch[0];
      console.log("Found student ID:", documentInfo.studentId);
    }

    // Extract student name with improved pattern matching
    const namePatterns = [
      /(?:I|My name is|This is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
      /From:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
      /Submitted by:\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i
    ];

    for (const pattern of namePatterns) {
      const nameMatch = text.match(pattern);
      if (nameMatch && nameMatch[1]) {
        documentInfo.studentName = nameMatch[1].trim();
        console.log("Found student name:", documentInfo.studentName);
        break;
      }
    }

    // Extract course code with improved pattern
    const coursePatterns = [
      /\b[A-Z]{2,4}\s*\d{3,4}\b/,
      /(?:course|subject|class):\s*([A-Z]{2,4}\s*\d{3,4})/i
    ];

    for (const pattern of coursePatterns) {
      const courseMatch = text.match(pattern);
      if (courseMatch) {
        documentInfo.courseCode = courseMatch[0];
        console.log("Found course code:", documentInfo.courseCode);
        break;
      }
    }

    // Extract date from text with improved pattern
    const datePatterns = [
      /(?:Date:|Dated:)\s*([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(\d{4}-\d{2}-\d{2})/
    ];

    for (const pattern of datePatterns) {
      const dateMatch = text.match(pattern);
      if (dateMatch && dateMatch[1]) {
        const parsedDate = new Date(dateMatch[1]);
        if (!isNaN(parsedDate.getTime())) {
          documentInfo.submissionDate = format(parsedDate, 'MM/dd/yyyy');
          console.log("Found and formatted date:", documentInfo.submissionDate);
          break;
        }
      }
    }

    // Enhance the document info
    const enhancedInfo = enhanceDocumentInfo(documentInfo);
    console.log("Enhanced document info:", enhancedInfo);
    
    // Double-check that we have the natureOfExcuse
    if (!enhancedInfo.natureOfExcuse) {
      console.warn("Nature of excuse is missing after enhancement, using default");
      enhancedInfo.natureOfExcuse = "for my absences in your Application Development class";
    }
    
    return enhancedInfo;
  } catch (error) {
    console.error("Error in extractDocumentInfo:", error);
    
    // Even in case of error, return an object with default values
    return {
      extractedText: "Error extracting text from document",
      pdfTitle: file.name,
      submissionDate: format(new Date(), 'MM/dd/yyyy'),
      natureOfExcuse: "for my absences in your Application Development class",
      violationType: "Other"
    };
  }
}

export default extractDocumentInfo;
