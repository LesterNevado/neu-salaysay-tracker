
import { extractTextFromPdf } from "../pdf/extractPdfText";
import enhanceDocumentInfo from "./determineViolationType";
import { ViolationType } from "../../types/database.types";

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
    const text = await extractTextFromPdf(file);
    
    // Basic info extraction
    let documentInfo: DocumentInfo = {
      extractedText: text,
      pdfTitle: file.name,
      submissionDate: new Date().toISOString(),
    };

    // Extract student ID (assumed format: numbers)
    const studentIdMatch = text.match(/\b\d{8,10}\b/);
    if (studentIdMatch) {
      documentInfo.studentId = studentIdMatch[0];
    }

    // Extract student name (simple approach - can be enhanced)
    const nameMatch = text.match(/(?:I|My name is|This is)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/);
    if (nameMatch) {
      documentInfo.studentName = nameMatch[1];
    }

    // Extract course code (format: typically letters followed by numbers)
    const courseMatch = text.match(/\b[A-Z]{2,4}\s*\d{3,4}\b/);
    if (courseMatch) {
      documentInfo.courseCode = courseMatch[0];
    }

    // Enhance document info with violation type and nature of excuse
    return enhanceDocumentInfo(documentInfo);
  } catch (error) {
    console.error("Error extracting document info:", error);
    return {
      extractedText: "Error extracting text from document",
    };
  }
}

export default extractDocumentInfo;
